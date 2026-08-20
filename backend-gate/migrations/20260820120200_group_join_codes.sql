-- ─────────────────────────────────────────────────────────────────────────────
-- הצטרפות בקוד כיתה · additive, idempotent, app-agnostic
--
-- המסלול: מורה פעילה מייצרת קוד לקבוצה שלה, התלמידה נכנסת עם Google, מזינה
-- את הקוד פעם אחת, נוצרת בקשה ממתינה שה-group_id שלה נגזר בשרת מהקוד,
-- והמורה של אותה קבוצה מאשרת.
--
-- מה נשען על הקיים ולא נבנה מחדש:
--   • access_requests היא טבלת הבקשות. לא נוצרה טבלת בקשות מקבילה.
--   • יצירת students, הקישור ל-profiles דרך הדגל המוגן, והוספה ל-
--     learning_group_students נעשים באותם צעדים בדיוק כמו ב-approve_access.
--   • app_audit רושם את ההחלטה.
--
-- סטייה אחת שאני מסמן במפורש ומבקש עליה אישור:
--   approve_access דורש app_can_grant, שמאפשר הענקת תפקיד student ל-admin
--   ול-super_admin בלבד. הדרישה כאן היא שהמורה של הקבוצה תאשר. לא הרחבתי
--   את app_can_grant, כי זה היה נותן לכל מורה להעניק תפקיד student בכל
--   מקום. במקום זה יש כאן approve_group_join צר: מורה פעילה של אותה קבוצה
--   בלבד, לאותה בקשה בלבד, ורק לתפקיד student. אין דרך להעניק דרכו תפקיד
--   אחר או להוסיף לקבוצה אחרת.
-- ─────────────────────────────────────────────────────────────────────────────

-- ללא תלות ב-pgcrypto: הפונקציות כאן רצות עם search_path נעול, ו-pgcrypto
-- יושב בסכימה שונה בין סביבות. sha256, encode, convert_to ו-gen_random_uuid
-- כולם ב-pg_catalog וזמינים תמיד.

-- ── קודי הצטרפות ──────────────────────────────────────────────────────────
-- הקוד עצמו אינו נשמר. נשמר hash בלבד, ולכן דליפה של הטבלה אינה מאפשרת
-- להצטרף. הקוד מוצג למורה פעם אחת, ברגע היצירה.
create table if not exists public.group_join_codes (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.learning_groups(id) on delete restrict,
  code_hash   text not null unique,
  created_by  uuid not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  revoked_by  uuid,
  constraint join_code_ttl check (expires_at > created_at)
);

create index if not exists idx_gjc_group on public.group_join_codes (group_id)
  where revoked_at is null;

alter table public.group_join_codes enable row level security;

-- קישור בקשה לקבוצה. נפרד מ-access_requests כדי לא לשנות טבלה קיימת.
create table if not exists public.access_request_groups (
  request_id  uuid primary key references public.access_requests(id) on delete restrict,
  group_id    uuid not null references public.learning_groups(id) on delete restrict,
  code_id     uuid references public.group_join_codes(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.access_request_groups enable row level security;

-- ── קריאה ─────────────────────────────────────────────────────────────────
-- מורה פעילה רואה את הקודים של הקבוצה שלה. תלמידה אינה רואה קודים כלל.
drop policy if exists gjc_read_teacher on public.group_join_codes;
create policy gjc_read_teacher on public.group_join_codes
  for select using (public.app_can_manage_group_materials(group_id));

drop policy if exists arg_read_teacher on public.access_request_groups;
create policy arg_read_teacher on public.access_request_groups
  for select using (public.app_can_manage_group_materials(group_id));

revoke all on table public.group_join_codes      from public, anon, authenticated;
revoke all on table public.access_request_groups from public, anon, authenticated;
grant select on table public.group_join_codes      to authenticated;
grant select on table public.access_request_groups to authenticated;

-- ── יצירת קוד ─────────────────────────────────────────────────────────────
-- מחזיר את הקוד בגלוי פעם אחת בלבד. ברירת מחדל 14 יום.
create or replace function public.create_group_join_code(p_group uuid, p_days integer default 14)
returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_code text; v_exp timestamptz;
begin
  if not public.app_can_manage_group_materials(p_group) then
    raise exception 'not_authorized'
      using hint = 'only an active teacher of that group can issue a code';
  end if;
  if p_days is null or p_days < 1 or p_days > 120 then
    raise exception 'invalid_ttl' using hint = 'between 1 and 120 days';
  end if;

  -- שמונה תווים מתוך UUID אקראי. 0 ו-1 מוחלפים כדי שלא יתבלבלו עם O ו-I.
  v_code := substr(translate(upper(replace(gen_random_uuid()::text, '-', '')), '01', 'GH'), 1, 8);
  v_exp  := now() + make_interval(days => p_days);

  insert into public.group_join_codes (group_id, code_hash, created_by, expires_at)
  values (p_group, encode(sha256(convert_to(v_code, 'UTF8')), 'hex'), auth.uid(), v_exp);

  return query select v_code, v_exp;
end;
$$;

-- ── ביטול קוד ─────────────────────────────────────────────────────────────
create or replace function public.revoke_group_join_code(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_group uuid;
begin
  select group_id into v_group from public.group_join_codes where id = p_id;
  if v_group is null then raise exception 'code_not_found'; end if;
  if not public.app_can_manage_group_materials(v_group) then raise exception 'not_authorized'; end if;

  update public.group_join_codes
     set revoked_at = now(), revoked_by = auth.uid()
   where id = p_id and revoked_at is null;
end;
$$;

-- ── מימוש קוד על ידי התלמידה ──────────────────────────────────────────────
-- דורש session. הקוד נפתר בשרת, ולכן הלקוח אינו בוחר קבוצה. קוד שגוי,
-- פג או מבוטל מחזיר את אותה שגיאה בדיוק, בלי לרמוז אם הקבוצה קיימת.
create or replace function public.redeem_group_join_code(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_code record; v_req uuid; v_existing uuid;
begin
  if v_uid is null then
    raise exception 'not_signed_in'
      using hint = 'sign in with Google before entering a class code';
  end if;
  if p_code is null or length(btrim(p_code)) = 0 then
    raise exception 'invalid_code';
  end if;

  select * into v_code
    from public.group_join_codes
   where code_hash = encode(sha256(convert_to(upper(btrim(p_code)), 'UTF8')), 'hex')
     and revoked_at is null
     and expires_at > now();

  if v_code.id is null then
    raise exception 'invalid_code'
      using hint = 'the code is wrong, expired, or no longer active';
  end if;

  -- בקשה ממתינה קיימת לאותה קבוצה: מחזירים אותה, בלי ליצור כפילות.
  select ar.id into v_existing
    from public.access_requests ar
    join public.access_request_groups arg on arg.request_id = ar.id
   where ar.user_id = v_uid and ar.status = 'pending' and arg.group_id = v_code.group_id;
  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.access_requests (user_id, requested_role, note, status)
  values (v_uid, 'student', 'הצטרפות בקוד כיתה', 'pending')
  returning id into v_req;

  insert into public.access_request_groups (request_id, group_id, code_id)
  values (v_req, v_code.group_id, v_code.id);

  return v_req;
end;
$$;

-- ── אישור על ידי מורת הקבוצה ──────────────────────────────────────────────
-- צר בכוונה: תפקיד student בלבד, הקבוצה נלקחת מהבקשה ולא מהקלט, והמאשרת
-- חייבת להיות מורה פעילה של אותה קבוצה. אין כאן דרך להעניק תפקיד אחר.
create or replace function public.approve_group_join(
  p_request uuid, p_student_name text default null, p_class text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_req record; v_group uuid; v_student uuid;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;

  select ar.*, arg.group_id into v_req
    from public.access_requests ar
    join public.access_request_groups arg on arg.request_id = ar.id
   where ar.id = p_request
   for update;

  if v_req.id is null then raise exception 'request_not_found'; end if;
  v_group := v_req.group_id;

  if not public.app_can_manage_group_materials(v_group) then
    raise exception 'not_authorized'
      using hint = 'only an active teacher of that group can approve this request';
  end if;
  if v_req.user_id = v_uid then raise exception 'cannot_self_grant'; end if;
  if v_req.requested_role <> 'student' then raise exception 'unsupported_role'; end if;
  if v_req.status = 'approved' then return v_req.user_id; end if;   -- retry בטוח
  if v_req.status <> 'pending' then raise exception 'already_decided'; end if;

  insert into public.user_roles (user_id, role) values (v_req.user_id, 'student')
  on conflict do nothing;

  select p.linked_student_id into v_student from public.profiles p where p.id = v_req.user_id;

  if v_student is null then
    if p_student_name is null or length(btrim(p_student_name)) = 0 then
      raise exception 'student_name_required';
    end if;
    insert into public.students (full_name, class_name, sport, overall_status, completion_percent)
    values (btrim(p_student_name), coalesce(p_class, ''), '', 'green', 0)
    returning id into v_student;
    -- אותו מסלול מוגן שבו משתמש approve_access, ולא עקיפה שלו.
    perform set_config('app.allow_profile_link_write', 'on', true);
    update public.profiles set linked_student_id = v_student where id = v_req.user_id;
    perform set_config('app.allow_profile_link_write', 'off', true);
  end if;

  -- תלמידה שכבר מקושרת מקבלת שיוך קבוצה בלבד. אין students כפול.
  insert into public.learning_group_students (group_id, student_id)
  values (v_group, v_student)
  on conflict do nothing;

  update public.access_requests
     set status = 'approved', decided_by = v_uid, decided_at = now()
   where id = p_request;

  perform public.app_audit(
    v_uid, v_req.user_id, 'approve_group_join',
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'approved', 'group_id', v_group, 'student_id', v_student)
  );

  return v_req.user_id;
end;
$$;

revoke all on function public.create_group_join_code(uuid, integer) from public, anon;
revoke all on function public.revoke_group_join_code(uuid)          from public, anon;
revoke all on function public.redeem_group_join_code(text)          from public, anon;
revoke all on function public.approve_group_join(uuid, text, text)  from public, anon;

grant execute on function public.create_group_join_code(uuid, integer) to authenticated;
grant execute on function public.revoke_group_join_code(uuid)          to authenticated;
grant execute on function public.redeem_group_join_code(text)          to authenticated;
grant execute on function public.approve_group_join(uuid, text, text)  to authenticated;
