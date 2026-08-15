-- RLS regression tests for 20260815100000_narrow_rls_hardening.sql
-- Runs against the local harness ONLY (see run.sh). Superuser seeds data
-- (bypasses RLS); each test simulates a signed-in client with
-- SET LOCAL ROLE authenticated + a request.jwt.claims GUC, then asserts.
-- Any unexpected error aborts the run (ON_ERROR_STOP in run.sh).

-- ─── seed (superuser) ──────────────────────────────────────────────
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'admin@test.local'),
  ('00000000-0000-4000-8000-00000000000b', 'teacher1@test.local'),
  ('00000000-0000-4000-8000-00000000000c', 'teacher2@test.local'),
  ('00000000-0000-4000-8000-00000000000d', 'parent1@test.local'),
  ('00000000-0000-4000-8000-00000000000e', 'student1@test.local'),
  ('00000000-0000-4000-8000-00000000000f', 'attacker@test.local'),
  ('00000000-0000-4000-8000-000000000010', 'invitee@test.local');

insert into public.user_roles (user_id, role) values
  ('00000000-0000-4000-8000-00000000000a', 'admin'),
  ('00000000-0000-4000-8000-00000000000b', 'teacher'),
  ('00000000-0000-4000-8000-00000000000c', 'teacher'),
  ('00000000-0000-4000-8000-00000000000d', 'parent'),
  ('00000000-0000-4000-8000-00000000000e', 'student'),
  ('00000000-0000-4000-8000-00000000000f', 'parent');

insert into public.subjects (id, subject_name) values
  ('00000000-0000-4000-9000-000000000001', 'הרנס מתמטיקה');

insert into public.students (id, full_name, class_name, sport) values
  ('00000000-0000-4000-a000-000000000001', 'תלמיד הרנס א', 'ט', 'הרנס-סיוף'),
  ('00000000-0000-4000-a000-000000000002', 'תלמיד הרנס ב', 'ט', 'הרנס-שחייה');

insert into public.subject_roadmaps (id, subject_id, topic_name, order_index) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-9000-000000000001', 'נושא 1', 1),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-9000-000000000001', 'נושא 2', 2);

insert into public.learning_groups (id, name, subject_id, academic_year_start) values
  ('00000000-0000-4000-c000-000000000001', 'קבוצת הרנס', '00000000-0000-4000-9000-000000000001', 2026);
insert into public.learning_group_teachers (group_id, teacher_user_id, role_in_group) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-8000-00000000000b', 'lead');
insert into public.learning_group_students (group_id, student_id) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000001');

-- scope links (superuser path: auth.uid() is NULL -> guard passes through)
update public.profiles set linked_student_id = '00000000-0000-4000-a000-000000000001'
  where id in ('00000000-0000-4000-8000-00000000000d', '00000000-0000-4000-8000-00000000000e');

insert into public.student_subject_progress (student_id, subject_id, grade) values
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-9000-000000000001', 88),
  ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-9000-000000000001', 77);

insert into public.student_roadmap_progress (student_id, roadmap_item_id, completed) values
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000001', true),
  ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-b000-000000000001', true);

insert into public.student_custom_values (student_id, field_key, value) values
  ('00000000-0000-4000-a000-000000000001', 'harness_field', '"a"'::jsonb),
  ('00000000-0000-4000-a000-000000000002', 'harness_field', '"b"'::jsonb);

insert into public.pending_invites (email, full_name, role, linked_student_id, created_by, expires_at) values
  ('invitee@test.local', 'מוזמן הרנס', 'student', '00000000-0000-4000-a000-000000000002',
   '00000000-0000-4000-8000-00000000000a', now() + interval '1 day');

commit;

-- ─── T1+T2 · attacker: own-name update allowed, link change blocked ─
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000f"}', true);
set local role authenticated;
do $$
declare n int;
begin
  update public.profiles set full_name = 'שם חדש' where id = auth.uid();
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'T1 FAILED: own-profile name update affected % rows', n; end if;
  raise notice 'T1 PASS: own-profile name update allowed';

  begin
    update public.profiles set linked_student_id = '00000000-0000-4000-a000-000000000001'
      where id = auth.uid();
    raise exception 'T2 FAILED: attacker re-pointed linked_student_id';
  exception
    when others then
      if sqlerrm not like '%link_columns_admin_only%' then raise; end if;
      raise notice 'T2 PASS: linked_student_id change blocked (%)', sqlerrm;
  end;

  begin
    update public.profiles set linked_sport = 'הרנס-סיוף' where id = auth.uid();
    raise exception 'T2b FAILED: attacker re-pointed linked_sport';
  exception
    when others then
      if sqlerrm not like '%link_columns_admin_only%' then raise; end if;
      raise notice 'T2b PASS: linked_sport change blocked';
  end;
end $$;
rollback;

-- ─── T3 · admin may change link columns ────────────────────────────
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a"}', true);
set local role authenticated;
do $$
declare n int;
begin
  update public.profiles set linked_sport = 'הרנס-שחייה'
    where id = '00000000-0000-4000-8000-00000000000b';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'T3 FAILED: admin link update affected % rows', n; end if;
  raise notice 'T3 PASS: admin can change link columns';
end $$;
rollback;

-- ─── T4 · invite claim still links the new profile ─────────────────
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000010"}', true);
set local role authenticated;
do $$
declare v jsonb;
begin
  v := public.claim_pending_invite();
  if v->>'status' <> 'claimed' then
    raise exception 'T4 FAILED: claim status = %', v->>'status';
  end if;
end $$;
reset role;
do $$
declare sid uuid;
begin
  select linked_student_id into sid from public.profiles
    where id = '00000000-0000-4000-8000-000000000010';
  if sid is distinct from '00000000-0000-4000-a000-000000000002' then
    raise exception 'T4 FAILED: invite claim did not link profile (got %)', sid;
  end if;
  raise notice 'T4 PASS: claim_pending_invite links profile through the guard';
end $$;
rollback;

-- ─── T5-T7 · teacher1 scoped to group student only ─────────────────
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.student_roadmap_progress;
  if n <> 1 then raise exception 'T5 FAILED: teacher1 sees % roadmap rows (expected 1)', n; end if;
  select count(*) into n from public.student_roadmap_progress
    where student_id = '00000000-0000-4000-a000-000000000002';
  if n <> 0 then raise exception 'T5 FAILED: teacher1 sees out-of-scope student roadmap'; end if;
  raise notice 'T5 PASS: teacher roadmap SELECT scoped to own group';

  update public.student_roadmap_progress set completed = false
    where student_id = '00000000-0000-4000-a000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'T6 FAILED: teacher1 updated out-of-scope roadmap row'; end if;
  update public.student_roadmap_progress set completed = false
    where student_id = '00000000-0000-4000-a000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'T6 FAILED: teacher1 could not update own-group row'; end if;
  raise notice 'T6 PASS: teacher roadmap UPDATE scoped';

  begin
    insert into public.student_roadmap_progress (student_id, roadmap_item_id)
      values ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-b000-000000000002');
    raise exception 'T7 FAILED: teacher1 inserted roadmap row for out-of-scope student';
  exception
    when insufficient_privilege then
      raise notice 'T7 PASS: out-of-scope roadmap INSERT rejected by RLS';
    when others then
      if sqlerrm like '%T7 FAILED%' then raise; end if;
      raise notice 'T7 PASS: out-of-scope roadmap INSERT rejected (%)', sqlerrm;
  end;
  insert into public.student_roadmap_progress (student_id, roadmap_item_id)
    values ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000002');
  raise notice 'T7b PASS: in-scope roadmap INSERT allowed';
end $$;
rollback;

-- ─── T8 · teacher2 (no active group) sees nothing (fail-closed) ────
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c"}', true);
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.student_roadmap_progress;
  if n <> 0 then raise exception 'T8 FAILED: group-less teacher sees % roadmap rows', n; end if;
  select count(*) into n from public.student_custom_values;
  if n <> 0 then raise exception 'T8 FAILED: group-less teacher sees % custom values', n; end if;
  raise notice 'T8 PASS: teacher without groups sees nothing';
end $$;
rollback;

-- ─── T9 · teacher1 custom values scoped (read + write) ─────────────
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b"}', true);
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.student_custom_values;
  if n <> 1 then raise exception 'T9 FAILED: teacher1 sees % custom values (expected 1)', n; end if;
  begin
    insert into public.student_custom_values (student_id, field_key, value)
      values ('00000000-0000-4000-a000-000000000002', 'harness_field_2', '"x"'::jsonb);
    raise exception 'T9 FAILED: out-of-scope custom-value INSERT allowed';
  exception
    when insufficient_privilege then
      raise notice 'T9 PASS: custom values scoped for teacher';
    when others then
      if sqlerrm like '%T9 FAILED%' then raise; end if;
      raise notice 'T9 PASS: custom values scoped for teacher (%)', sqlerrm;
  end;
end $$;
rollback;

-- ─── T10 · parent reads own child only (unchanged behavior) ────────
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000d"}', true);
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.student_subject_progress
    where student_id = '00000000-0000-4000-a000-000000000001';
  if n <> 1 then raise exception 'T10 FAILED: parent cannot read own child grades'; end if;
  select count(*) into n from public.student_subject_progress
    where student_id = '00000000-0000-4000-a000-000000000002';
  if n <> 0 then raise exception 'T10 FAILED: parent reads another child grades'; end if;
  raise notice 'T10 PASS: parent scope intact';
end $$;
rollback;

-- ─── T11 · student reads own roadmap (unchanged behavior) ──────────
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000e"}', true);
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.student_roadmap_progress
    where student_id = '00000000-0000-4000-a000-000000000001';
  if n < 1 then raise exception 'T11 FAILED: student cannot read own roadmap'; end if;
  select count(*) into n from public.student_roadmap_progress
    where student_id = '00000000-0000-4000-a000-000000000002';
  if n <> 0 then raise exception 'T11 FAILED: student reads another student roadmap'; end if;
  raise notice 'T11 PASS: student scope intact';
end $$;
rollback;

-- ─── cleanup ───────────────────────────────────────────────────────
begin;
delete from public.pending_invites where email = 'invitee@test.local';
delete from public.student_custom_values where field_key like 'harness_field%';
delete from public.student_roadmap_progress where student_id in
  ('00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002');
delete from public.student_subject_progress where student_id in
  ('00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002');
delete from public.learning_group_students where group_id = '00000000-0000-4000-c000-000000000001';
delete from public.learning_group_teachers where group_id = '00000000-0000-4000-c000-000000000001';
delete from public.learning_groups where id = '00000000-0000-4000-c000-000000000001';
delete from public.subject_roadmaps where subject_id = '00000000-0000-4000-9000-000000000001';
delete from public.students where id in
  ('00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002');
delete from public.subjects where id = '00000000-0000-4000-9000-000000000001';
delete from public.user_roles where user_id in (select id from auth.users where email like '%@test.local');
delete from public.profiles where id in (select id from auth.users where email like '%@test.local');
delete from auth.users where email like '%@test.local';
commit;
