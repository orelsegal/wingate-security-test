-- ─────────────────────────────────────────────────────────────────────────────
-- טיוטת תלמידה בשרת · additive, idempotent
--
-- מה הפער: חוזה ההגשות הקיים (submissions / submission_versions / submit_task)
-- מטפל בהגשה בלבד. אין בו מקום לשמור עבודה לפני הגשה, ולכן טיוטה חיה היום
-- על המכשיר בלבד.
--
-- מה תוקן בסבב הזה, אחרי סקירת הקוד:
--   1. מניעת הדריסה אטומית. במקום קריאה ואז כתיבה, שתי פעולות שאפשר להיכנס
--      ביניהן, יש UPDATE אחד שהתנאי על revision הוא חלק ממנו. השורה ננעלת
--      על ידי ה-UPDATE, ולכן שני חיבורים מקבילים אינם יכולים שניהם לעבור.
--   2. הגרסה היא revision bigint ולא חותמת זמן. חותמת זמן אינה ETag.
--   3. אין NULL שמדלג על הבדיקה. שמירה ראשונה מצהירה expected_revision = 0.
--   4. הרשאה: התלמידה חייבת להיות רשומה פעילה בקבוצה פעילה שהמקצוע שלה הוא
--      המקצוע של המשימה. תלמידה מחוץ להיקף אינה יוצרת, קוראת או מעדכנת.
--   5. מצבי ההגשה נאכפים לפי מטריצה מפורשת, ולא לפי מצב אחד.
--   6. תקרת גודל מוצהרת ל-JSON. קבצים אינם נכנסים לטיוטה.
--
-- לא נגעתי ב-submit_task, resubmit, return_for_revision, approve_submission
-- ובשום טבלה קיימת. ה-DROP-ים היחידים בקובץ מסירים חתימות קודמות של
-- הפונקציות שהקובץ הזה עצמו יצר בגרסאות מוקדמות שלו, ותו לא.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── תקרת גודל ─────────────────────────────────────────────────────────────
-- 64KB לטקסט מובנה. הטיוטה מחזיקה תשובות כתובות; קבצים חיים ב-Storage
-- ואינם מקודדים לתוך JSON. מרוכז כאן כדי שיהיה מקום אחד לשנות בו.
create or replace function public.app_draft_max_bytes()
returns integer language sql immutable set search_path = '' as $$ select 65536 $$;

-- ── חסימת משתמש מושעה ─────────────────────────────────────────────────────
-- עזר משותף לכל ה-RPCs החדשים. משתמש שקיימת לו שורת profile עם suspended_at
-- אינו פעיל, ולא משנה מה ה-role שלו ומה ה-session מחזיק. fail-closed:
-- הבדיקה רצה בשרת בתוך כל פעולה, ואינה תלויה ב-UI.
create or replace function public.app_actor_not_suspended()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
     and not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.suspended_at is not null
     );
$$;

create table if not exists public.task_drafts (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.learning_tasks(id) on delete restrict,
  student_id  uuid not null references public.students(id) on delete restrict,
  content     jsonb not null default '{}'::jsonb,
  revision    bigint not null default 0,
  updated_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),   -- לתצוגה ולאודיט בלבד
  unique (task_id, student_id),
  constraint task_drafts_content_is_object check (jsonb_typeof(content) = 'object'),
  constraint task_drafts_content_size check (octet_length(content::text) <= 65536)
);

create index if not exists idx_task_drafts_student on public.task_drafts (student_id);

-- טור revision נוסף גם אם הטבלה כבר נוצרה בגרסה קודמת של הקובץ.
alter table public.task_drafts add column if not exists revision bigint not null default 0;

alter table public.task_drafts enable row level security;

-- ── היקף התלמידה ──────────────────────────────────────────────────────────
-- רשומה פעילה בקבוצה פעילה שהמקצוע שלה הוא המקצוע של המשימה. אותה תבנית
-- שכבר משמשת את חוזה ההגשה, מרוכזת לפונקציה אחת כדי שלא יהיו שתי גרסאות.
create or replace function public.app_student_in_task_scope(p_student uuid, p_task uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.learning_tasks lt
    join public.learning_groups lg
      on lg.subject_id = lt.subject_id and lg.status = 'active'
    join public.learning_group_students lgs
      on lgs.group_id = lg.id and lgs.student_id = p_student and lgs.left_at is null
    where lt.id = p_task and lt.active
  );
$$;

-- ── מטריצת מצבי ההגשה ─────────────────────────────────────────────────────
-- ערכי submission_status הקיימים במסד, ומה מותר בכל אחד:
--
--   אין הגשה כלל          → מותר ליצור ולעדכן טיוטה
--   submitted             → אסור. ההגשה בדרך לבדיקה
--   awaiting_review       → אסור. ההגשה אצל המורה
--   resubmitted_awaiting  → אסור. ההגשה החוזרת אצל המורה
--   returned_for_revision → מותר. זה בדיוק הרגע שבו התלמידה מתקנת
--   approved              → אסור. אין עקיפה של החלטת מורה דרך טיוטה
--
-- מחזירה NULL כשמותר, או את שם המצב החוסם.
create or replace function public.app_draft_block_reason(p_student uuid, p_task uuid)
returns text language sql stable security definer set search_path = '' as $$
  select s.status::text
  from public.submissions s
  where s.task_id = p_task
    and s.student_id = p_student
    and s.status::text in ('submitted', 'awaiting_review', 'resubmitted_awaiting', 'approved')
  limit 1;
$$;

-- קריאה: רק הטיוטה של התלמידה עצמה, ורק בהיקף שלה.
drop policy if exists td_read_own on public.task_drafts;
create policy td_read_own on public.task_drafts
  for select using (
    public.app_actor_not_suspended()
    and student_id = public.app_current_student_id()
    and public.app_student_in_task_scope(student_id, task_id)
  );

-- כתיבה עוברת אך ורק דרך ה-RPC.
revoke all on table public.task_drafts from public, anon, authenticated;
grant select on table public.task_drafts to authenticated;

-- ── שמירת טיוטה · אטומית ──────────────────────────────────────────────────
-- p_expected_revision הוא מספר הגרסה שהלקוח מחזיק. 0 = "אני יוצרת עכשיו".
-- הצלחה מחזירה את הגרסה החדשה. גרסה ישנה מחזירה draft_conflict.
create or replace function public.save_task_draft(
  p_task uuid, p_content jsonb, p_expected_revision bigint
) returns bigint language plpgsql security definer set search_path = '' as $$
declare v_student uuid; v_new bigint; v_exists boolean; v_block text;
begin
  if not public.app_actor_not_suspended() then
    raise exception 'account_suspended';
  end if;
  v_student := public.app_current_student_id();
  if v_student is null then
    raise exception 'no_student_identity'
      using hint = 'this account is not linked to a student record';
  end if;

  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'expected_revision_required'
      using hint = 'send 0 for the first save, otherwise the revision you last received';
  end if;

  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'invalid_content';
  end if;

  if octet_length(p_content::text) > public.app_draft_max_bytes() then
    raise exception 'content_too_large'
      using hint = 'drafts hold written answers only; files belong in storage';
  end if;

  if not exists (select 1 from public.learning_tasks where id = p_task and active) then
    raise exception 'task_not_found';
  end if;

  if not public.app_student_in_task_scope(v_student, p_task) then
    raise exception 'not_in_scope'
      using hint = 'this student is not enrolled in an active group for this subject';
  end if;

  v_block := public.app_draft_block_reason(v_student, p_task);
  if v_block is not null then
    raise exception 'draft_locked_by_submission'
      using detail = v_block,
            hint = 'the submission is with the teacher or already approved';
  end if;

  select true into v_exists
  from public.task_drafts where task_id = p_task and student_id = v_student;

  if v_exists then
    -- עדכון אטומי: התנאי על revision הוא חלק מאותה פקודה שמעדכנת, ולכן
    -- אין חלון בין הבדיקה לכתיבה.
    update public.task_drafts
       set content = p_content,
           revision = revision + 1,
           updated_by = auth.uid(),
           updated_at = now()
     where task_id = p_task
       and student_id = v_student
       and revision = p_expected_revision
     returning revision into v_new;

    if v_new is null then
      raise exception 'draft_conflict'
        using hint = 'this draft was saved elsewhere; reload and try again';
    end if;
    return v_new;
  end if;

  if p_expected_revision <> 0 then
    raise exception 'draft_conflict'
      using hint = 'no draft exists yet; the first save must declare revision 0';
  end if;

  -- יצירה. שני חיבורים שיוצרים בו זמנית: אחד מצליח, השני נופל על המפתח
  -- הייחודי ומקבל את אותה שגיאה מוצהרת, ולא דריסה שקטה.
  begin
    insert into public.task_drafts (task_id, student_id, content, revision, updated_by)
    values (p_task, v_student, p_content, 1, auth.uid())
    returning revision into v_new;
  exception when unique_violation then
    raise exception 'draft_conflict'
      using hint = 'a draft was created at the same moment; reload and try again';
  end;

  return v_new;
end;
$$;

-- ── קריאת טיוטה ────────────────────────────────────────────────────────────
-- צורת ההחזרה השתנתה (נוסף revision), ולכן החתימה הישנה מוסרת קודם.
drop function if exists public.get_task_draft(uuid);
create or replace function public.get_task_draft(p_task uuid)
returns table (content jsonb, revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_student uuid;
begin
  if not public.app_actor_not_suspended() then
    raise exception 'account_suspended';
  end if;
  v_student := public.app_current_student_id();
  if v_student is null then raise exception 'no_student_identity'; end if;
  if not public.app_student_in_task_scope(v_student, p_task) then
    raise exception 'not_in_scope';
  end if;
  return query
    select d.content, d.revision, d.updated_at
    from public.task_drafts d
    where d.task_id = p_task and d.student_id = v_student;
end;
$$;

-- ── הסרת חתימות ישנות ─────────────────────────────────────────────────────
-- גרסאות קודמות של הקובץ יצרו חתימות אחרות. הן נמחקות במפורש, כדי שלא
-- תישאר חתימה ישנה שאפשר לקרוא לה ולעקוף את בדיקת ההתנגשות.
drop function if exists public.save_task_draft(uuid, jsonb);
drop function if exists public.save_task_draft(uuid, jsonb, timestamptz);

revoke all on function public.save_task_draft(uuid, jsonb, bigint) from public, anon;
revoke all on function public.get_task_draft(uuid) from public, anon;
-- עזרים פנימיים: נקראים רק מתוך פונקציות definer או מתוך policies.
-- מה שמשמש RLS policy חייב EXECUTE ל-authenticated, כי ה-policy מוערך
-- בהקשר המשתמש השואל. השאר אינם נחשפים ללקוח כלל.
revoke all on function public.app_student_in_task_scope(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_actor_not_suspended() from public, anon, authenticated;
revoke all on function public.app_draft_block_reason(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_draft_max_bytes() from public, anon, authenticated;

grant execute on function public.save_task_draft(uuid, jsonb, bigint) to authenticated;
grant execute on function public.get_task_draft(uuid) to authenticated;
grant execute on function public.app_student_in_task_scope(uuid, uuid) to authenticated;  -- RLS
grant execute on function public.app_actor_not_suspended() to authenticated;              -- RLS
