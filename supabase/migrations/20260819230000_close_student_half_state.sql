-- ═══════════════════════════════════════════════════════════════════
-- CLOSE THE STUDENT HALF-STATE
--
-- Live QA proved that granting role=student through grant_role creates
-- a student with no students row and no linked_student_id: the UI shows
-- a healthy chip, submission fails NOT_LINKED, and request_access then
-- refuses already_authorized, locking the repair path
-- (docs/access-control-gap-student-link.md).
--
-- Server-side closure, additive only:
--   1. grant_role refuses p_role='student' with a message that points
--      to the full approval path (approve_access creates the students
--      row and the link atomically). revoke_role is untouched, so the
--      controlled repair of existing half-states still works.
--   2. admin_list_users returns linked_student boolean, so the screen
--      can show the truth instead of inferring it.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.grant_role(p_target uuid, p_role public.app_role)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_before jsonb;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  if p_target = v_uid then raise exception 'cannot_self_grant'; end if;
  if p_role = 'student' then
    raise exception 'student_requires_approval_flow'
      using hint = 'a student is created only through approve_access, which also creates and links the students row';
  end if;
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

-- שינוי טיפוס תוצאה אינו אפשרי דרך CREATE OR REPLACE: חובה DROP ואז CREATE,
-- ולכן ההרשאות מוענקות מחדש מפורשות מיד אחרי.
drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (
  user_id uuid, email text, full_name text,
  roles public.app_role[], suspended_at timestamptz,
  linked_student boolean
) language sql stable security definer set search_path = '' as $$
  select u.id, u.email, p.full_name,
         coalesce(array_agg(ur.role) filter (where ur.role is not null), '{}'),
         p.suspended_at,
         p.linked_student_id is not null
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_roles ur on ur.user_id = u.id
  where public.app_is_access_admin(auth.uid())
  group by u.id, u.email, p.full_name, p.suspended_at, p.linked_student_id
  order by u.email;
$$;

revoke all on function public.grant_role(uuid, public.app_role) from public, anon;
grant execute on function public.grant_role(uuid, public.app_role) to authenticated;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

do $$
begin
  raise notice 'student half-state closed: grant_role refuses student; admin_list_users exposes linked_student.';
end $$;
