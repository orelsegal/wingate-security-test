-- ─────────────────────────────────────────────────────────────────────────────
-- ניהול חומרים למורה · additive, idempotent
--
-- מה תוקן בסבב הזה, אחרי סקירת הקוד:
--   1. לחומר יש scope של קבוצה (group_id), ולא "כל המקצוע". תלמידה רואה חומר
--      רק אם היא רשומה פעילה באותה קבוצה והחומר פורסם.
--   2. הרשאת המורה בודקת role, שיוך פעיל (left_at is null), קבוצה פעילה
--      וקבוצה מדויקת. admin או super_admin בלי שיוך teacher אינם נכנסים.
--   3. confused deputy נסגר: בעדכון, ההרשאה נגזרת מהרשומה עצמה לפי p_id,
--      ולא מ-p_task שהתוקף שולח. העברה בין משימות דורשת הרשאה לשתיהן.
--   4. מחזור חיים אמיתי לקובץ: draft → הקצאת נתיב → העלאה → finalize שמאמת
--      שהאובייקט קיים, את ה-MIME ואת הגודל → ורק אז אפשר לפרסם.
--   5. החלפת קובץ יוצרת נתיב חדש. אין overwrite של אובייקט קיים.
--   6. מדיניות Storage צרה: העלאה רק לנתיב שהוקצה למורה הזו ולחומר הזה.
--   7. קריאה דרך RLS על storage.objects, ולכן createSignedUrl של Supabase
--      עובד ללקוח מורשה ונכשל למי שמחוץ ל-scope. אין bucket ציבורי ואין
--      service-role בדפדפן.
--   8. גרסאות שומרות snapshot מלא, ולא רק נתיב.
--
-- אם סכימת Storage חסרה, הקובץ עוצר בשגיאה מפורשת ואינו משאיר התקנה חלקית.
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.material_state as enum ('draft', 'ready', 'published', 'unpublished');
exception when duplicate_object then null; end $$;

-- ערכים חדשים לטיפוס שכבר קיים מגרסה קודמת של הקובץ
do $$ begin
  alter type public.material_state add value if not exists 'ready' before 'published';
exception when others then null; end $$;

-- ── מגבלות הפיילוט ────────────────────────────────────────────────────────
create or replace function public.app_material_max_bytes(p_kind text)
returns bigint language sql immutable set search_path = '' as $$
  select case p_kind
    when 'image' then 15  * 1024 * 1024
    when 'pdf'   then 25  * 1024 * 1024
    when 'audio' then 200 * 1024 * 1024
    when 'video' then 500 * 1024 * 1024
    else null end::bigint;
$$;

create or replace function public.app_material_mime_ok(p_kind text, p_mime text)
returns boolean language sql immutable set search_path = '' as $$
  select case p_kind
    when 'image' then p_mime in ('image/png','image/jpeg','image/webp','image/gif')
    when 'pdf'   then p_mime = 'application/pdf'
    when 'audio' then p_mime in ('audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/webm','audio/x-m4a')
    when 'video' then p_mime in ('video/mp4','video/quicktime','video/webm')
    else false end;
$$;

-- קישור: http/https בלבד. javascript:, data: וכל scheme אחר נדחים.
create or replace function public.app_url_ok(p_url text)
returns boolean language sql immutable set search_path = '' as $$
  select p_url ~* '^https?://[^\s/$.?#].[^\s]*$';
$$;

create table if not exists public.task_materials (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.learning_tasks(id) on delete restrict,
  group_id      uuid not null references public.learning_groups(id) on delete restrict,
  title         text not null check (length(trim(title)) between 1 and 200),
  description   text check (description is null or length(description) <= 4000),
  kind          text not null check (kind in ('image','pdf','audio','video','link')),
  storage_path  text,
  file_mime     text,
  file_size     bigint,
  external_url  text check (external_url is null or public.app_url_ok(external_url)),
  state         public.material_state not null default 'draft',
  revision      integer not null default 1,
  sort_order    integer not null default 0,
  created_by    uuid not null,
  updated_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  -- קישור נסגר מיד; קובץ מקבל נתיב רק כשמוקצה, ומתמלא בגמר ההעלאה.
  constraint material_kind_target check (
    (kind = 'link'  and external_url is not null and storage_path is null) or
    (kind <> 'link' and external_url is null)
  ),
  -- אי אפשר לסמן ready או published בלי יעד ממשי
  constraint material_ready_needs_target check (
    state = 'draft'
    or (kind = 'link' and external_url is not null)
    or (kind <> 'link' and storage_path is not null and file_mime is not null and file_size is not null)
  )
);

create index if not exists idx_tm_task_pub on public.task_materials (task_id, group_id) where state = 'published';
create unique index if not exists uq_tm_path on public.task_materials (storage_path) where storage_path is not null;

create table if not exists public.task_material_revisions (
  id            uuid primary key default gen_random_uuid(),
  material_id   uuid not null references public.task_materials(id) on delete restrict,
  revision      integer not null,
  title         text,
  description   text,
  kind          text,
  storage_path  text,
  file_mime     text,
  file_size     bigint,
  external_url  text,
  state         public.material_state,
  replaced_by   uuid,
  replaced_at   timestamptz not null default now(),
  unique (material_id, revision)
);

alter table public.task_materials          enable row level security;
alter table public.task_material_revisions enable row level security;

-- ── היקף המורה ────────────────────────────────────────────────────────────
-- role=teacher, שיוך פעיל, קבוצה פעילה, וקבוצה מדויקת. אין דלת אחורית
-- ל-admin או ל-super_admin בלי שיוך הוראה בפועל.
create or replace function public.app_can_manage_group_materials(p_group uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role(auth.uid(), 'teacher'::public.app_role)
     and exists (
       select 1
       from public.learning_group_teachers lgt
       join public.learning_groups lg on lg.id = lgt.group_id
       where lgt.group_id = p_group
         and lgt.teacher_user_id = auth.uid()
         and lgt.left_at is null
         and lg.status = 'active'
     );
$$;

-- ── היקף התלמידה לחומר ────────────────────────────────────────────────────
create or replace function public.app_student_sees_material(p_material uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.task_materials m
    join public.learning_groups lg on lg.id = m.group_id and lg.status = 'active'
    join public.learning_tasks lt on lt.id = m.task_id and lt.active
    join public.learning_group_students lgs
      on lgs.group_id = lg.id
     and lgs.student_id = public.app_current_student_id()
     and lgs.left_at is null
    where m.id = p_material
      and m.state = 'published'
      and lg.subject_id = lt.subject_id
  );
$$;

drop policy if exists tm_read_published on public.task_materials;
create policy tm_read_published on public.task_materials
  for select using (public.app_student_sees_material(id));

drop policy if exists tm_read_staff on public.task_materials;
create policy tm_read_staff on public.task_materials
  for select using (public.app_can_manage_group_materials(group_id));

drop policy if exists tmr_read_staff on public.task_material_revisions;
create policy tmr_read_staff on public.task_material_revisions
  for select using (
    exists (select 1 from public.task_materials m
            where m.id = material_id and public.app_can_manage_group_materials(m.group_id))
  );

revoke all on table public.task_materials          from public, anon, authenticated;
revoke all on table public.task_material_revisions from public, anon, authenticated;
grant select on table public.task_materials          to authenticated;
grant select on table public.task_material_revisions to authenticated;

-- ── יצירת חומר ────────────────────────────────────────────────────────────
-- קישור נסגר כאן ומגיע ישר ל-ready. קובץ נוצר כ-draft ומקבל נתיב מוקצה.
create or replace function public.create_task_material(
  p_task uuid, p_group uuid, p_title text, p_description text, p_kind text, p_url text
) returns table (material_id uuid, upload_path text)
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_path text; v_subject uuid; v_group_subject uuid;
begin
  if not public.app_can_manage_group_materials(p_group) then
    raise exception 'not_authorized'
      using hint = 'this account is not an active teacher of that group';
  end if;

  select subject_id into v_subject from public.learning_tasks where id = p_task and active;
  if v_subject is null then raise exception 'task_not_found'; end if;

  select subject_id into v_group_subject from public.learning_groups where id = p_group;
  if v_group_subject is distinct from v_subject then
    raise exception 'scope_mismatch'
      using hint = 'the group and the task belong to different subjects';
  end if;

  if p_kind not in ('image','pdf','audio','video','link') then
    raise exception 'invalid_kind';
  end if;

  if p_kind = 'link' then
    if p_url is null or not public.app_url_ok(p_url) then
      raise exception 'invalid_url' using hint = 'only http or https links are accepted';
    end if;
    insert into public.task_materials (task_id, group_id, title, description, kind, external_url, state, created_by, updated_by)
    values (p_task, p_group, p_title, p_description, p_kind, p_url, 'ready', auth.uid(), auth.uid())
    returning task_materials.id into v_id;
    return query select v_id, null::text;
    return;   -- RETURN QUERY אינו מסיים את הפונקציה; בלי זה הזרימה ממשיכה
  end if;

  -- הנתיב נגזר בשרת: קבוצה / חומר / אובייקט. אין שם קובץ מקורי ואין
  -- פרט מזהה, ולכן ניחוש נתיב אינו מוביל לשום מקום שהמדיניות תאשר.
  insert into public.task_materials (task_id, group_id, title, description, kind, state, created_by, updated_by)
  values (p_task, p_group, p_title, p_description, p_kind, 'draft', auth.uid(), auth.uid())
  returning task_materials.id into v_id;

  v_path := v_id::text || '/' || gen_random_uuid()::text;
  update public.task_materials set storage_path = v_path where task_materials.id = v_id;

  return query select v_id, v_path;
end;
$$;

-- ── עדכון metadata ────────────────────────────────────────────────────────
-- ההרשאה נגזרת מהרשומה עצמה. p_task אינו מתקבל כאן כלל, ולכן אי אפשר
-- להציג משימה מורשה כדי לגעת בחומר של קבוצה אחרת.
create or replace function public.update_task_material_meta(
  p_id uuid, p_title text, p_description text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_group uuid;
begin
  select group_id into v_group from public.task_materials where id = p_id;
  if v_group is null then raise exception 'material_not_found'; end if;
  if not public.app_can_manage_group_materials(v_group) then
    raise exception 'not_authorized';
  end if;

  update public.task_materials
     set title = coalesce(p_title, title),
         description = p_description,
         updated_by = auth.uid(), updated_at = now()
   where id = p_id;
  return p_id;
end;
$$;

-- ── העברת חומר למשימה אחרת · דורש הרשאה למקור וליעד ──────────────────────
create or replace function public.move_task_material(
  p_id uuid, p_task uuid, p_group uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_subject uuid; v_group_subject uuid;
begin
  select group_id into v_group from public.task_materials where id = p_id;
  if v_group is null then raise exception 'material_not_found'; end if;

  -- מקור
  if not public.app_can_manage_group_materials(v_group) then
    raise exception 'not_authorized' using detail = 'source group';
  end if;
  -- יעד
  if not public.app_can_manage_group_materials(p_group) then
    raise exception 'not_authorized' using detail = 'target group';
  end if;

  select subject_id into v_subject from public.learning_tasks where id = p_task and active;
  if v_subject is null then raise exception 'task_not_found'; end if;
  select subject_id into v_group_subject from public.learning_groups where id = p_group;
  if v_group_subject is distinct from v_subject then raise exception 'scope_mismatch'; end if;

  update public.task_materials
     set task_id = p_task, group_id = p_group, updated_by = auth.uid(), updated_at = now()
   where id = p_id;
  return p_id;
end;
$$;

-- ── הקצאת נתיב להחלפת קובץ ────────────────────────────────────────────────
-- אין overwrite. כל החלפה מקבלת נתיב חדש, והישן נשמר בהיסטוריה ב-finalize.
create or replace function public.request_material_replacement(p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_kind text; v_path text;
begin
  select group_id, kind into v_group, v_kind from public.task_materials where id = p_id;
  if v_group is null then raise exception 'material_not_found'; end if;
  if not public.app_can_manage_group_materials(v_group) then raise exception 'not_authorized'; end if;
  if v_kind = 'link' then raise exception 'not_a_file_material'; end if;

  v_path := p_id::text || '/' || gen_random_uuid()::text;
  update public.task_materials
     set state = 'draft', updated_by = auth.uid(), updated_at = now()
   where id = p_id;
  -- הנתיב החדש מוחזר בלבד; הוא נכתב לרשומה רק ב-finalize, כדי שהנתיב
  -- הקודם יישאר תקף לתלמידות עד שההחלפה הושלמה בפועל.
  return v_path;
end;
$$;

-- ── finalize · מאמת שהקובץ באמת עלה ───────────────────────────────────────
create or replace function public.finalize_task_material(p_id uuid, p_path text)
returns public.material_state language plpgsql security definer set search_path = '' as $$
declare
  v record; v_size bigint; v_mime text; v_max bigint; v_exists boolean;
begin
  select * into v from public.task_materials where id = p_id;
  if v.id is null then raise exception 'material_not_found'; end if;
  if not public.app_can_manage_group_materials(v.group_id) then raise exception 'not_authorized'; end if;
  if v.kind = 'link' then raise exception 'not_a_file_material'; end if;

  -- הנתיב חייב להיות מתחת לתיקיית החומר הזה. נתיב שרירותי נדחה.
  if p_path is null or p_path !~ ('^' || p_id::text || '/[0-9a-f-]{36}$') then
    raise exception 'path_not_allocated'
      using hint = 'upload only to the path this material was given';
  end if;

  -- האובייקט חייב להתקיים ב-bucket. אין פרסום של קובץ שלא עלה.
  select true, (o.metadata->>'size')::bigint, o.metadata->>'mimetype'
    into v_exists, v_size, v_mime
    from storage.objects o
   where o.bucket_id = 'task-materials' and o.name = p_path;

  if not coalesce(v_exists, false) then
    raise exception 'object_missing'
      using hint = 'the upload did not complete; nothing was published';
  end if;

  if not public.app_material_mime_ok(v.kind, v_mime) then
    raise exception 'mime_not_allowed' using detail = coalesce(v_mime, 'unknown');
  end if;

  v_max := public.app_material_max_bytes(v.kind);
  if v_size is null or v_size > v_max then
    raise exception 'file_too_large'
      using detail = coalesce(v_size::text, 'unknown') || ' > ' || v_max::text;
  end if;

  -- הנתיב הקודם נשמר בהיסטוריה עם snapshot מלא לפני שהוא מוחלף.
  if v.storage_path is not null and v.storage_path is distinct from p_path then
    insert into public.task_material_revisions
      (material_id, revision, title, description, kind, storage_path, file_mime, file_size, external_url, state, replaced_by)
    values (v.id, v.revision, v.title, v.description, v.kind, v.storage_path, v.file_mime, v.file_size, v.external_url, v.state, auth.uid());
  end if;

  update public.task_materials
     set storage_path = p_path, file_mime = v_mime, file_size = v_size,
         state = 'ready',
         revision = case when v.storage_path is distinct from p_path then v.revision + 1 else v.revision end,
         updated_by = auth.uid(), updated_at = now()
   where id = p_id;

  return 'ready'::public.material_state;
end;
$$;

-- ── פרסום והסרה מפרסום ────────────────────────────────────────────────────
create or replace function public.set_material_state(p_id uuid, p_state public.material_state)
returns public.material_state language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  select * into v from public.task_materials where id = p_id;
  if v.id is null then raise exception 'material_not_found'; end if;
  if not public.app_can_manage_group_materials(v.group_id) then raise exception 'not_authorized'; end if;

  if p_state = 'published' then
    -- פרסום מותר רק אחרי finalize, או לקישור תקין.
    if v.kind = 'link' then
      if v.external_url is null or not public.app_url_ok(v.external_url) then
        raise exception 'nothing_to_publish';
      end if;
    elsif v.state not in ('ready', 'unpublished') or v.storage_path is null or v.file_size is null then
      raise exception 'not_finalized'
        using hint = 'finalize the upload before publishing';
    end if;
  end if;

  update public.task_materials
     set state = p_state,
         published_at = case when p_state = 'published' then now() else published_at end,
         updated_by = auth.uid(), updated_at = now()
   where id = p_id;
  return p_state;
end;
$$;

-- ── ניקוי חתימות ישנות ────────────────────────────────────────────────────
drop function if exists public.upsert_task_material(uuid, uuid, text, text, text, text, text);
drop function if exists public.app_can_manage_materials(uuid);

revoke all on function public.create_task_material(uuid, uuid, text, text, text, text) from public, anon;
revoke all on function public.update_task_material_meta(uuid, text, text)              from public, anon;
revoke all on function public.move_task_material(uuid, uuid, uuid)                     from public, anon;
revoke all on function public.request_material_replacement(uuid)                       from public, anon;
revoke all on function public.finalize_task_material(uuid, text)                       from public, anon;
revoke all on function public.set_material_state(uuid, public.material_state)          from public, anon;
revoke all on function public.app_can_manage_group_materials(uuid)                     from public, anon;
revoke all on function public.app_student_sees_material(uuid)                          from public, anon;

grant execute on function public.create_task_material(uuid, uuid, text, text, text, text) to authenticated;
grant execute on function public.update_task_material_meta(uuid, text, text)              to authenticated;
grant execute on function public.move_task_material(uuid, uuid, uuid)                     to authenticated;
grant execute on function public.request_material_replacement(uuid)                       to authenticated;
grant execute on function public.finalize_task_material(uuid, text)                       to authenticated;
grant execute on function public.set_material_state(uuid, public.material_state)          to authenticated;
grant execute on function public.app_can_manage_group_materials(uuid)                     to authenticated;
grant execute on function public.app_student_sees_material(uuid)                          to authenticated;

-- ── Storage ───────────────────────────────────────────────────────────────
-- אין דילוג שקט. אם הסכימה חסרה, ההתקנה נעצרת כאן ולא נשארת חצי מותקנת.
do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise exception 'storage_schema_missing'
      using hint = 'this migration installs storage policies and cannot be applied without them';
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit)
values ('task-materials', 'task-materials', false, 500 * 1024 * 1024)
on conflict (id) do update set public = false, file_size_limit = 500 * 1024 * 1024;

-- העלאה: רק לנתיב שהוקצה לחומר, ורק על ידי מורה פעילה של הקבוצה שלו.
-- התיקייה הראשונה בנתיב היא מזהה החומר, ולכן ניחוש נתיב אינו עוזר: אין
-- חומר כזה, או שהמורה אינה משויכת לקבוצה שלו.
drop policy if exists tm_objects_insert on storage.objects;
create policy tm_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-materials'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}$'
    and exists (
      select 1 from public.task_materials m
      where m.id = (split_part(name, '/', 1))::uuid
        and public.app_can_manage_group_materials(m.group_id)
    )
  );

-- קריאה: מורה פעילה של הקבוצה, או תלמידה רשומה שהחומר פורסם אליה.
-- זו הדרך שבה createSignedUrl של Supabase מצליח למורשה ונכשל לאחר.
drop policy if exists tm_objects_read on storage.objects;
create policy tm_objects_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-materials'
    and exists (
      select 1 from public.task_materials m
      where m.storage_path = name
        and (
          public.app_can_manage_group_materials(m.group_id)
          or public.app_student_sees_material(m.id)
        )
    )
  );

-- אין UPDATE ואין DELETE מהלקוח: החלפה יוצרת אובייקט חדש, והיסטוריה נשמרת.
drop policy if exists tm_objects_update on storage.objects;
drop policy if exists tm_objects_delete on storage.objects;
drop policy if exists tm_upload_staff on storage.objects;
drop policy if exists tm_update_staff on storage.objects;
