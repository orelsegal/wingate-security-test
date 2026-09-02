\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'teacher.one@wingate.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'teacher.two@wingate.invalid'),
  ('20000000-0000-4000-8000-000000000001', 'wingate.20000000-0000-4000-8000-000000000001@students.invalid');

insert into public.profiles (id, full_name) values
  ('10000000-0000-4000-8000-000000000001', 'מורה אחת'),
  ('10000000-0000-4000-8000-000000000002', 'מורה שתיים');

insert into public.user_roles (user_id, role) values
  ('10000000-0000-4000-8000-000000000001', 'teacher'),
  ('10000000-0000-4000-8000-000000000002', 'teacher');

insert into public.subjects (id, subject_name) values
  ('30000000-0000-4000-8000-000000000001', 'היסטוריה');

insert into public.learning_tasks (subject_id, external_app, active) values
  ('30000000-0000-4000-8000-000000000001', 'history-9', true);

select public.wingate_provision_student(
  'history-9',
  '20000000-0000-4000-8000-000000000001',
  'תלמידת QA',
  'qa-class-9',
  'ט QA',
  'teacher.one@wingate.invalid'
);

-- Idempotent replay must not duplicate any operational row.
select public.wingate_provision_student(
  'history-9',
  '20000000-0000-4000-8000-000000000001',
  'תלמידת QA',
  'qa-class-9',
  'ט QA',
  'teacher.one@wingate.invalid'
);

do $$
declare
  v_student integer;
  v_profile integer;
  v_groups integer;
  v_memberships integer;
  v_teachers integer;
begin
  select count(*) into v_student from public.students
   where id = '20000000-0000-4000-8000-000000000001'
     and full_name = 'תלמידת QA';
  select count(*) into v_profile from public.profiles
   where id = '20000000-0000-4000-8000-000000000001'
     and linked_student_id = id;
  select count(*) into v_groups from public.wingate_external_groups
   where app_id = 'history-9' and external_class_id = 'qa-class-9';
  select count(*) into v_memberships from public.learning_group_students
   where student_id = '20000000-0000-4000-8000-000000000001';
  select count(*) into v_teachers from public.learning_group_teachers
   where teacher_user_id = '10000000-0000-4000-8000-000000000001';

  if (v_student, v_profile, v_groups, v_memberships, v_teachers) <> (1, 1, 1, 1, 1) then
    raise exception 'provision_contract_failed: %, %, %, %, %',
      v_student, v_profile, v_groups, v_memberships, v_teachers;
  end if;
end
$$;

-- The same external class cannot silently move to another teacher.
do $$
begin
  perform public.wingate_provision_student(
    'history-9',
    '20000000-0000-4000-8000-000000000001',
    'תלמידת QA',
    'qa-class-9',
    'ט QA',
    'teacher.two@wingate.invalid'
  );
  raise exception 'expected_owner_conflict';
exception
  when others then
    if sqlerrm = 'expected_owner_conflict' then raise; end if;
    if sqlerrm <> 'external_class_owner_conflict' then raise; end if;
end
$$;

-- Browser roles may never call the bridge.
do $$
begin
  set local role authenticated;
  perform public.wingate_provision_student(
    'history-9',
    '20000000-0000-4000-8000-000000000001',
    'תלמידת QA',
    'qa-class-9',
    'ט QA',
    'teacher.one@wingate.invalid'
  );
  reset role;
  raise exception 'expected_permission_denied';
exception
  when insufficient_privilege then
    reset role;
end
$$;

select 'PASS wingate_provision_student' as result;
