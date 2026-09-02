-- Canonical bridge from the shared personal-code gateway into the live Wingate
-- learning schema. The gateway creates the matching Supabase auth user first;
-- this function only links an already-existing UUID to a student and class.
--
-- Source of truth: orelsegal/wingate-security-test.
-- App repositories must not fork this migration.

create table if not exists public.wingate_external_groups (
  app_id text not null,
  external_class_id text not null,
  group_id uuid not null references public.learning_groups(id) on delete restrict,
  teacher_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (app_id, external_class_id),
  unique (group_id),
  constraint wingate_external_groups_app_check
    check (app_id in ('history-9', 'english-roadmap')),
  constraint wingate_external_groups_class_check
    check (length(btrim(external_class_id)) between 1 and 160)
);

alter table public.wingate_external_groups enable row level security;
revoke all on table public.wingate_external_groups from public, anon, authenticated;

create or replace function public.wingate_provision_student(
  p_app_id text,
  p_student_id uuid,
  p_student_name text,
  p_class_id text,
  p_class_name text,
  p_teacher_email text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app_id text := btrim(coalesce(p_app_id, ''));
  v_student_name text := regexp_replace(btrim(coalesce(p_student_name, '')), '\s+', ' ', 'g');
  v_class_id text := btrim(coalesce(p_class_id, ''));
  v_class_name text := regexp_replace(btrim(coalesce(p_class_name, '')), '\s+', ' ', 'g');
  v_teacher_email text := lower(btrim(coalesce(p_teacher_email, '')));
  v_teacher uuid;
  v_subject uuid;
  v_group uuid;
  v_existing_teacher uuid;
  v_linked_student uuid;
  v_year integer;
begin
  if v_app_id not in ('history-9', 'english-roadmap') then
    raise exception 'unsupported_app';
  end if;
  if p_student_id is null or not exists (
    select 1 from auth.users where id = p_student_id
  ) then
    raise exception 'student_auth_user_missing';
  end if;
  if length(v_student_name) < 1 or length(v_student_name) > 120 then
    raise exception 'student_name_invalid';
  end if;
  if length(v_class_id) < 1 or length(v_class_id) > 160 then
    raise exception 'class_id_invalid';
  end if;
  if length(v_class_name) < 1 or length(v_class_name) > 120 then
    raise exception 'class_name_invalid';
  end if;
  if v_teacher_email = '' then
    raise exception 'teacher_email_missing';
  end if;

  select u.id into v_teacher
  from auth.users u
  join public.user_roles ur
    on ur.user_id = u.id and ur.role = 'teacher'::public.app_role
  where lower(u.email) = v_teacher_email
  order by u.id
  limit 1;
  if v_teacher is null then
    raise exception 'teacher_identity_missing';
  end if;

  select lt.subject_id into v_subject
  from public.learning_tasks lt
  where lt.external_app = v_app_id and lt.active
  order by lt.subject_id
  limit 1;
  if v_subject is null then
    raise exception 'subject_scope_missing';
  end if;

  -- One transaction-level lock per external class prevents two first logins
  -- from creating parallel groups before either mapping row exists.
  perform pg_advisory_xact_lock(hashtextextended(v_app_id || chr(31) || v_class_id, 0));

  select weg.group_id, weg.teacher_user_id
    into v_group, v_existing_teacher
  from public.wingate_external_groups weg
  where weg.app_id = v_app_id and weg.external_class_id = v_class_id
  for update;

  if v_group is null then
    v_year := extract(year from current_date)::integer
      - case when extract(month from current_date) < 8 then 1 else 0 end;

    insert into public.learning_groups (
      name, subject_id, grade_code, academic_year_start, status, created_by
    ) values (
      v_class_name,
      v_subject,
      case when v_app_id = 'history-9' then 'ט' else null end,
      v_year,
      'active',
      v_teacher
    ) returning id into v_group;

    insert into public.wingate_external_groups (
      app_id, external_class_id, group_id, teacher_user_id
    ) values (v_app_id, v_class_id, v_group, v_teacher);

    insert into public.learning_group_teachers (
      group_id, teacher_user_id, role_in_group, added_by
    ) values (v_group, v_teacher, 'lead', v_teacher)
    on conflict do nothing;
  elsif v_existing_teacher is distinct from v_teacher then
    raise exception 'external_class_owner_conflict';
  elsif not exists (
    select 1 from public.learning_groups lg
    where lg.id = v_group and lg.subject_id = v_subject and lg.status = 'active'
  ) then
    raise exception 'external_class_scope_conflict';
  end if;

  insert into public.students (
    id, full_name, class_name, sport, overall_status, completion_percent
  ) values (
    p_student_id, v_student_name, v_class_name, '', 'green', 0
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        class_name = excluded.class_name;

  insert into public.profiles (id, full_name)
  values (p_student_id, v_student_name)
  on conflict (id) do update
    set full_name = excluded.full_name,
        updated_at = now();

  select linked_student_id into v_linked_student
  from public.profiles
  where id = p_student_id
  for update;

  if v_linked_student is not null and v_linked_student is distinct from p_student_id then
    raise exception 'student_identity_conflict';
  end if;

  perform set_config('app.allow_profile_link_write', 'on', true);
  update public.profiles
  set linked_student_id = p_student_id, updated_at = now()
  where id = p_student_id;
  perform set_config('app.allow_profile_link_write', 'off', true);

  insert into public.user_roles (user_id, role)
  values (p_student_id, 'student'::public.app_role)
  on conflict do nothing;

  insert into public.learning_group_students (group_id, student_id, added_by)
  values (v_group, p_student_id, v_teacher)
  on conflict do nothing;

  return jsonb_build_object(
    'student_id', p_student_id,
    'group_id', v_group,
    'app_id', v_app_id
  );
end;
$$;

revoke all on function public.wingate_provision_student(text, uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.wingate_provision_student(text, uuid, text, text, text, text)
  to service_role;
