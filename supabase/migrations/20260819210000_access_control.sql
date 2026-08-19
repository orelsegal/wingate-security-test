-- ═══════════════════════════════════════════════════════════════════════════
-- ACCESS CONTROL · זהות, תפקידים, בקשות גישה ו-audit — הרחבה של הקיים.
--
-- מרחיב את התשתית שכבר חיה בפרודקשן — user_roles, app_role, has_role,
-- profiles — במקום לבנות מערכת מקבילה:
--   · שני ערכי enum חדשים: super_admin, viewer.
--   · access_requests: מייל לא מוכר נכנס ל-pending ואינו מקבל תוכן.
--   · role_audit: כל הענקה, ביטול, אישור, דחייה והשעיה — actor, target,
--     before/after, זמן. append-only.
--   · כללי הענקה: איש אינו מעניק לעצמו; admin אינו מעניק admin או
--     super_admin; רק super_admin מעניקה admin; אין להסיר או להשעות את
--     ה-super_admin האחרונה.
--   · whoami(): התפקיד, ההשעיה והבקשה התלויה — נגזרים בשרת בלבד. שום
--     role/email/scope מה-client אינו מקור הרשאה.
--
-- Bootstrap של בעלת המערכת אינו כאן: הוא SQL פרמטרי נפרד, מופעל ידנית
-- (scripts/bootstrap-super-admin.sql), ואינו רץ בכל login.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · תפקידים חדשים על ה-enum הקיים ─────────────────────────────────────
alter type public.app_role add value if not exists 'super_admin';
alter type public.app_role add value if not exists 'viewer';

-- ── 2 · השעיה — עמודה על profiles הקיים ───────────────────────────────────
alter table public.profiles
  add column if not exists suspended_at timestamptz;

-- ── 3 · בקשות גישה ────────────────────────────────────────────────────────
do $$ begin
  create type public.access_request_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.access_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  requested_role public.app_role,
  note           text,
  status         public.access_request_status not null default 'pending',
  created_at     timestamptz not null default now(),
  decided_by     uuid references auth.users(id),
  decided_at     timestamptz,
  decision_note  text
);
-- בקשה פתוחה אחת לכל משתמש
create unique index if not exists access_requests_one_pending
  on public.access_requests (user_id) where status = 'pending';

-- ── 4 · audit — append-only ───────────────────────────────────────────────
create table if not exists public.role_audit (
  id         uuid primary key default gen_random_uuid(),
  actor      uuid references auth.users(id),
  target     uuid references auth.users(id),
  action     text not null,
  before     jsonb,
  after      jsonb,
  created_at timestamptz not null default now()
);
do $$ begin
  create trigger role_audit_append_only
    before update or delete on public.role_audit
    for each row execute function public.forbid_change();
exception when duplicate_object then null; end $$;

-- ── 5 · עזרי תפקיד ────────────────────────────────────────────────────────
create or replace function public.app_roles_of(p_user uuid)
returns public.app_role[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(ur.role), '{}')
  from public.user_roles ur where ur.user_id = p_user;
$$;

create or replace function public.app_is_super_admin(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles
                 where user_id = p_user and role = 'super_admin');
$$;

-- כמה super_admins פעילים (לא מושעים) יש — שומר האחרונה
create or replace function public.app_active_super_admin_count()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.role = 'super_admin' and p.suspended_at is null;
$$;

create or replace function public.app_audit(
  p_actor uuid, p_target uuid, p_action text, p_before jsonb, p_after jsonb
) returns void language sql security definer set search_path = '' as $$
  insert into public.role_audit (actor, target, action, before, after)
  values (p_actor, p_target, p_action, p_before, p_after);
$$;

-- ── 6 · whoami — מה שהלקוח מקבל, נגזר בשרת ────────────────────────────────
create or replace function public.whoami()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_roles public.app_role[];
  v_susp timestamptz;
  v_pending public.access_request_status;
  v_student uuid;
  v_name text;
begin
  if v_uid is null then return jsonb_build_object('status', 'anonymous'); end if;
  v_roles := public.app_roles_of(v_uid);
  select p.suspended_at, p.linked_student_id, p.full_name
    into v_susp, v_student, v_name
  from public.profiles p where p.id = v_uid;
  select ar.status into v_pending
  from public.access_requests ar
  where ar.user_id = v_uid and ar.status = 'pending' limit 1;

  return jsonb_build_object(
    'status', case
      when v_susp is not null then 'suspended'
      when array_length(v_roles, 1) is null then
        case when v_pending is not null then 'pending' else 'unknown' end
      else 'active' end,
    'roles', to_jsonb(v_roles),
    'name', v_name,
    'linked_student_id', v_student,
    'has_pending_request', v_pending is not null
  );
end;
$$;

-- ── 7 · request_access — מייל לא מוכר מבקש, אינו מעניק לעצמו ──────────────
create or replace function public.request_access(p_role public.app_role, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  -- מי שכבר מחזיק תפקיד אינו זקוק לבקשה
  if array_length(public.app_roles_of(v_uid), 1) is not null then
    raise exception 'already_authorized';
  end if;
  insert into public.access_requests (user_id, requested_role, note)
  values (v_uid, p_role, nullif(trim(p_note), ''))
  on conflict (user_id) where status = 'pending' do nothing;
  perform public.app_audit(v_uid, v_uid, 'access_requested',
    null, jsonb_build_object('requested_role', p_role));
exception when unique_violation then
  null; -- בקשה פתוחה כבר קיימת — אין כפילות
end;
$$;

-- ── 8 · כללי הענקה משותפים ────────────────────────────────────────────────
-- admin מעניק teacher/student/viewer בלבד; super_admin מעניקה הכול;
-- לעולם לא לעצמך.
create or replace function public.app_can_grant(p_actor uuid, p_role public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when public.app_is_super_admin(p_actor) then true
    when exists (select 1 from public.user_roles
                 where user_id = p_actor and role = 'admin')
      then p_role in ('teacher', 'student', 'viewer')
    else false
  end;
$$;

create or replace function public.grant_role(p_target uuid, p_role public.app_role)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_before jsonb;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if p_target = v_uid then raise exception 'cannot_self_grant'; end if;
  if not public.app_can_grant(v_uid, p_role) then
    raise exception 'not_allowed_to_grant_%', p_role;
  end if;
  v_before := to_jsonb(public.app_roles_of(p_target));
  insert into public.user_roles (user_id, role) values (p_target, p_role)
  on conflict do nothing;
  perform public.app_audit(v_uid, p_target, 'role_granted',
    v_before, to_jsonb(public.app_roles_of(p_target)));
end;
$$;

create or replace function public.revoke_role(p_target uuid, p_role public.app_role)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_before jsonb;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if not public.app_can_grant(v_uid, p_role) then
    raise exception 'not_allowed_to_revoke_%', p_role;
  end if;
  -- שומר האחרונה: אי אפשר להסיר את ה-super_admin הפעילה האחרונה
  if p_role = 'super_admin' and public.app_active_super_admin_count() <= 1
     and exists (select 1 from public.user_roles
                 where user_id = p_target and role = 'super_admin') then
    raise exception 'cannot_remove_last_super_admin';
  end if;
  v_before := to_jsonb(public.app_roles_of(p_target));
  delete from public.user_roles where user_id = p_target and role = p_role;
  perform public.app_audit(v_uid, p_target, 'role_revoked',
    v_before, to_jsonb(public.app_roles_of(p_target)));
end;
$$;

-- ── 9 · השעיה וביטולה ─────────────────────────────────────────────────────
create or replace function public.suspend_user(p_target uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if p_target = v_uid then raise exception 'cannot_self_suspend'; end if;
  if not (public.app_is_super_admin(v_uid)
          or exists (select 1 from public.user_roles where user_id = v_uid and role = 'admin')) then
    raise exception 'not_allowed';
  end if;
  -- admin אינו נוגע ב-admin/super_admin
  if not public.app_is_super_admin(v_uid)
     and exists (select 1 from public.user_roles
                 where user_id = p_target and role in ('admin','super_admin')) then
    raise exception 'not_allowed';
  end if;
  if public.app_is_super_admin(p_target) and public.app_active_super_admin_count() <= 1 then
    raise exception 'cannot_remove_last_super_admin';
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;
  update public.profiles set suspended_at = now() where id = p_target and suspended_at is null;
  perform public.app_audit(v_uid, p_target, 'suspended', null,
    jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.unsuspend_user(p_target uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if not (public.app_is_super_admin(v_uid)
          or exists (select 1 from public.user_roles where user_id = v_uid and role = 'admin')) then
    raise exception 'not_allowed';
  end if;
  update public.profiles set suspended_at = null where id = p_target;
  perform public.app_audit(v_uid, p_target, 'unsuspended', null, null);
end;
$$;

-- ── 10 · אישור ודחייה של בקשות ────────────────────────────────────────────
-- אישור תלמידה יכול גם לחבר אותה לרשומת students ולקבוצה — זה חלק
-- מהשיוך שהמנהלת עושה, באותה טרנזקציה ועם אותו audit.
create or replace function public.approve_access(
  p_request uuid, p_role public.app_role,
  p_student_name text default null, p_class text default null, p_group uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_req record; v_student uuid;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if not public.app_can_grant(v_uid, p_role) then
    raise exception 'not_allowed_to_grant_%', p_role;
  end if;
  select * into v_req from public.access_requests where id = p_request for update;
  if v_req is null then raise exception 'request_not_found'; end if;
  if v_req.status = 'approved' then return; end if;   -- retry בטוח
  if v_req.status <> 'pending' then raise exception 'already_decided'; end if;
  if v_req.user_id = v_uid then raise exception 'cannot_self_grant'; end if;

  insert into public.user_roles (user_id, role) values (v_req.user_id, p_role)
  on conflict do nothing;

  if p_role = 'student' then
    select p.linked_student_id into v_student from public.profiles p where p.id = v_req.user_id;
    if v_student is null then
      if p_student_name is null or length(btrim(p_student_name)) = 0 then
        raise exception 'student_name_required';
      end if;
      insert into public.students (full_name, class_name, sport, overall_status, completion_percent)
      values (btrim(p_student_name), coalesce(p_class, ''), '', 'green', 0)
      returning id into v_student;
      -- הקישור מוגן בטריגר protect_profile_link_columns; זה המסלול
      -- המאושר שלו — דגל טרנזקציוני, בדיוק כמו claim_pending_invite.
      perform set_config('app.allow_profile_link_write', 'on', true);
      update public.profiles set linked_student_id = v_student where id = v_req.user_id;
      perform set_config('app.allow_profile_link_write', 'off', true);
    end if;
    if p_group is not null then
      insert into public.learning_group_students (group_id, student_id)
      values (p_group, v_student)
      on conflict do nothing;
    end if;
  end if;

  update public.access_requests
     set status = 'approved', decided_by = v_uid, decided_at = now()
   where id = p_request;
  perform public.app_audit(v_uid, v_req.user_id, 'access_approved',
    jsonb_build_object('requested_role', v_req.requested_role),
    jsonb_build_object('granted_role', p_role, 'group', p_group));
end;
$$;

create or replace function public.reject_access(p_request uuid, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_req record;
begin
  if not (public.app_is_super_admin(v_uid)
          or exists (select 1 from public.user_roles where user_id = v_uid and role = 'admin')) then
    raise exception 'not_allowed';
  end if;
  select * into v_req from public.access_requests where id = p_request for update;
  if v_req is null then raise exception 'request_not_found'; end if;
  if v_req.status = 'rejected' then return; end if;
  if v_req.status <> 'pending' then raise exception 'already_decided'; end if;
  update public.access_requests
     set status = 'rejected', decided_by = v_uid, decided_at = now(),
         decision_note = nullif(trim(p_note), '')
   where id = p_request;
  perform public.app_audit(v_uid, v_req.user_id, 'access_rejected', null,
    jsonb_build_object('note', p_note));
end;
$$;

-- ── 11 · RLS ──────────────────────────────────────────────────────────────
alter table public.access_requests enable row level security;
alter table public.role_audit      enable row level security;
revoke all on public.access_requests, public.role_audit from public, anon, authenticated;
grant select on public.access_requests, public.role_audit to authenticated;

-- מדיניות רצה כמשתמש השואל, ולכן היא בודקת את user_roles שלו ישירות —
-- לא דרך עזר SECURITY DEFINER שנחסם בכוונה ללקוחות.
drop policy if exists ar_read on public.access_requests;
create policy ar_read on public.access_requests
  for select to authenticated
  using ( user_id = auth.uid()
          or exists (select 1 from public.user_roles
                     where user_id = auth.uid() and role in ('admin','super_admin')) );

drop policy if exists ra_read on public.role_audit;
create policy ra_read on public.role_audit
  for select to authenticated
  using ( exists (select 1 from public.user_roles
                  where user_id = auth.uid() and role in ('admin','super_admin')) );

-- ── 12 · הרשאות פונקציה — מפורשות, לפי הלקח ───────────────────────────────
revoke all on function public.app_roles_of(uuid)                    from public, anon, authenticated;
revoke all on function public.app_is_super_admin(uuid)              from public, anon, authenticated;
revoke all on function public.app_active_super_admin_count()        from public, anon, authenticated;
revoke all on function public.app_audit(uuid, uuid, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.app_can_grant(uuid, public.app_role)  from public, anon, authenticated;
revoke all on function public.whoami()                              from public, anon, authenticated;
revoke all on function public.request_access(public.app_role, text) from public, anon, authenticated;
revoke all on function public.grant_role(uuid, public.app_role)     from public, anon, authenticated;
revoke all on function public.revoke_role(uuid, public.app_role)    from public, anon, authenticated;
revoke all on function public.suspend_user(uuid, text)              from public, anon, authenticated;
revoke all on function public.unsuspend_user(uuid)                  from public, anon, authenticated;
revoke all on function public.approve_access(uuid, public.app_role, text, text, uuid) from public, anon, authenticated;
revoke all on function public.reject_access(uuid, text)             from public, anon, authenticated;

grant execute on function public.whoami()                              to authenticated;
grant execute on function public.request_access(public.app_role, text) to authenticated;
grant execute on function public.grant_role(uuid, public.app_role)     to authenticated;
grant execute on function public.revoke_role(uuid, public.app_role)    to authenticated;
grant execute on function public.suspend_user(uuid, text)              to authenticated;
grant execute on function public.unsuspend_user(uuid)                  to authenticated;
grant execute on function public.approve_access(uuid, public.app_role, text, text, uuid) to authenticated;
grant execute on function public.reject_access(uuid, text)             to authenticated;

-- ── 13 · assert ───────────────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.whoami()') is null
     or to_regprocedure('public.grant_role(uuid,public.app_role)') is null then
    raise exception 'access control functions missing';
  end if;
  raise notice 'access control installed: requests, audit, guards, whoami.';
end $$;

-- ── 14 · רשימות למסך הניהול ───────────────────────────────────────────────
-- ללקוח אין דרך להצטרף אל auth.users תחת RLS, ולכן מסך הניהול מקבל את
-- הרשימות דרך שתי פונקציות DEFINER שבודקות בעצמן שהקוראת אדמינית.
-- הן קריאה בלבד; כל פעולה עוברת דרך ה-RPCs הקיימים למעלה.

create or replace function public.app_is_access_admin(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles
                 where user_id = p_user and role in ('admin','super_admin'));
$$;

create or replace function public.admin_list_requests()
returns table (
  id uuid, user_id uuid, email text, full_name text,
  requested_role public.app_role, note text,
  status public.access_request_status, created_at timestamptz
) language sql stable security definer set search_path = '' as $$
  select r.id, r.user_id, u.email, p.full_name,
         r.requested_role, r.note, r.status, r.created_at
  from public.access_requests r
  join auth.users u on u.id = r.user_id
  left join public.profiles p on p.id = r.user_id
  where public.app_is_access_admin(auth.uid())
  order by (r.status = 'pending') desc, r.created_at desc;
$$;

create or replace function public.admin_list_users()
returns table (
  user_id uuid, email text, full_name text,
  roles public.app_role[], suspended_at timestamptz
) language sql stable security definer set search_path = '' as $$
  select u.id, u.email, p.full_name,
         coalesce(array_agg(ur.role) filter (where ur.role is not null), '{}'),
         p.suspended_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_roles ur on ur.user_id = u.id
  where public.app_is_access_admin(auth.uid())
  group by u.id, u.email, p.full_name, p.suspended_at
  order by u.email;
$$;

revoke all on function public.app_is_access_admin(uuid) from public, anon, authenticated;
revoke all on function public.admin_list_requests()     from public, anon, authenticated;
revoke all on function public.admin_list_users()        from public, anon, authenticated;
grant execute on function public.admin_list_requests()  to authenticated;
grant execute on function public.admin_list_users()     to authenticated;
