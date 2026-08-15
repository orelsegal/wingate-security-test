-- LIVE permission QA for 20260815100000 — runs AFTER the migration is applied.
-- Impersonates the real QA accounts (orelman+qa-*) at the SQL layer, inside a
-- single transaction that ends in ROLLBACK: nothing is ever committed, no data
-- is changed, no PII is printed (counts and PASS/FAIL notices only).
\set ON_ERROR_STOP on

begin;

-- ── resolve QA identities (ids only, never printed) ────────────────
create temp table qa_ids on commit drop as
select
  (select id from auth.users where email = 'orelman+qa-parent@gmail.com')  as parent_id,
  (select id from auth.users where email = 'orelman+qa-student@gmail.com') as student_id,
  (select id from auth.users where email = 'orelman+qa-teacher@gmail.com') as teacher_id,
  (select u.id from auth.users u join public.user_roles r on r.user_id = u.id
    where r.role = 'admin' limit 1) as admin_id;
grant select on qa_ids to authenticated;

do $$
declare q record;
begin
  select * into q from qa_ids;
  if q.parent_id is null or q.student_id is null or q.teacher_id is null or q.admin_id is null then
    raise exception 'SETUP FAILED: a QA account is missing (parent=% student=% teacher=% admin=%)',
      q.parent_id is not null, q.student_id is not null, q.teacher_id is not null, q.admin_id is not null;
  end if;
  raise notice 'SETUP OK: all QA identities resolved';
end $$;

-- ── seed synthetic rows for scope probes (rolled back at the end) ──
insert into public.students (id, full_name, class_name, sport) values
  ('00000000-0000-4000-a000-00000000aa01', 'בדיקת הרשאות א', 'ט', 'הרנס-חי'),
  ('00000000-0000-4000-a000-00000000aa02', 'בדיקת הרשאות ב', 'ט', 'הרנס-חי');
insert into public.subjects (id, subject_name)
  values ('00000000-0000-4000-9000-00000000aa01', 'הרנס-חי מקצוע')
  on conflict (subject_name) do nothing;
insert into public.subject_roadmaps (id, subject_id, topic_name, order_index) values
  ('00000000-0000-4000-b000-00000000aa01', '00000000-0000-4000-9000-00000000aa01', 'נושא חי', 1);
insert into public.student_roadmap_progress (student_id, roadmap_item_id, completed) values
  ('00000000-0000-4000-a000-00000000aa01', '00000000-0000-4000-b000-00000000aa01', true),
  ('00000000-0000-4000-a000-00000000aa02', '00000000-0000-4000-b000-00000000aa01', true);
insert into public.student_custom_values (student_id, field_key, value) values
  ('00000000-0000-4000-a000-00000000aa01', 'live_qa_field', '"a"'::jsonb),
  ('00000000-0000-4000-a000-00000000aa02', 'live_qa_field', '"b"'::jsonb);

-- ══ Q1 · parent cannot re-point linked_student_id / linked_sport ══
select set_config('request.jwt.claims',
  json_build_object('sub', (select parent_id from qa_ids))::text, true);
set local role authenticated;
do $$
declare n int;
begin
  begin
    update public.profiles set linked_student_id = '00000000-0000-4000-a000-00000000aa01'
      where id = auth.uid();
    raise exception 'Q1 FAILED: parent re-pointed linked_student_id';
  exception when others then
    if sqlerrm like '%Q1 FAILED%' then raise; end if;
    if sqlerrm not like '%link_columns_admin_only%' then raise; end if;
    raise notice 'Q1 PASS: parent blocked from changing linked_student_id';
  end;
  begin
    update public.profiles set linked_sport = 'הרנס-חי' where id = auth.uid();
    raise exception 'Q1b FAILED: parent re-pointed linked_sport';
  exception when others then
    if sqlerrm like '%Q1b FAILED%' then raise; end if;
    if sqlerrm not like '%link_columns_admin_only%' then raise; end if;
    raise notice 'Q1b PASS: parent blocked from changing linked_sport';
  end;
  -- ordinary self-edit still works
  update public.profiles set full_name = full_name where id = auth.uid();
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Q1c FAILED: parent ordinary self-update broken (rows=%)', n; end if;
  raise notice 'Q1c PASS: parent ordinary profile edit still works';
end $$;
reset role;

-- ══ Q2 · parent sees only own child ══
select set_config('request.jwt.claims',
  json_build_object('sub', (select parent_id from qa_ids))::text, true);
set local role authenticated;
do $$
declare vis int; own uuid;
begin
  select count(*) into vis from public.students;
  select linked_student_id into own from public.profiles where id = auth.uid();
  if own is null then
    if vis <> 0 then raise exception 'Q2 FAILED: unlinked parent sees % students', vis; end if;
    raise notice 'Q2 PASS (unlinked branch): parent with no link sees 0 students';
  else
    if vis <> 1 then raise exception 'Q2 FAILED: parent sees % students (expected 1)', vis; end if;
    if not exists (select 1 from public.students where id = own) then
      raise exception 'Q2 FAILED: parent cannot read own child';
    end if;
    raise notice 'Q2 PASS: parent sees exactly own child (1 student)';
  end if;
  -- seeded strangers must be invisible
  if exists (select 1 from public.students where sport = 'הרנס-חי') then
    raise exception 'Q2b FAILED: parent sees foreign seeded students';
  end if;
  raise notice 'Q2b PASS: foreign students invisible to parent';
end $$;
reset role;

-- ══ Q3 · student cannot change own scope fields ══
select set_config('request.jwt.claims',
  json_build_object('sub', (select student_id from qa_ids))::text, true);
set local role authenticated;
do $$
begin
  begin
    update public.profiles set linked_student_id = '00000000-0000-4000-a000-00000000aa02'
      where id = auth.uid();
    raise exception 'Q3 FAILED: student re-pointed linked_student_id';
  exception when others then
    if sqlerrm like '%Q3 FAILED%' then raise; end if;
    if sqlerrm not like '%link_columns_admin_only%' then raise; end if;
    raise notice 'Q3 PASS: student blocked from changing scope fields';
  end;
end $$;
reset role;

-- ══ Q4 · teacher scope on roadmap/custom values (adaptive to live groups) ══
-- learning_group_* tables are RPC-only for authenticated, so the group count
-- is computed here as the connection role and passed through a session GUC.
select set_config('qa.teacher_groups', (
  select count(*)::text
  from public.learning_group_teachers t
  join public.learning_groups g on g.id = t.group_id and g.status = 'active'
  where t.teacher_user_id = (select teacher_id from qa_ids) and t.left_at is null
), true);
select set_config('request.jwt.claims',
  json_build_object('sub', (select teacher_id from qa_ids))::text, true);
set local role authenticated;
do $$
declare grp int; vis_r int; vis_c int; bad int;
begin
  grp := current_setting('qa.teacher_groups')::int;

  select count(*) into vis_r from public.student_roadmap_progress;
  select count(*) into vis_c from public.student_custom_values;

  if grp = 0 then
    if vis_r <> 0 or vis_c <> 0 then
      raise exception 'Q4 FAILED: group-less teacher sees roadmap=% custom=%', vis_r, vis_c;
    end if;
    raise notice 'Q4 PASS (fail-closed branch): teacher with no active group sees 0/0';
  else
    -- every visible row must satisfy the scope function
    select count(*) into bad from public.student_roadmap_progress p
      where not public.is_teacher_of_student(auth.uid(), p.student_id);
    if bad <> 0 then raise exception 'Q4 FAILED: % out-of-scope roadmap rows visible', bad; end if;
    select count(*) into bad from public.student_custom_values v
      where not public.is_teacher_of_student(auth.uid(), v.student_id);
    if bad <> 0 then raise exception 'Q4 FAILED: % out-of-scope custom rows visible', bad; end if;
    raise notice 'Q4 PASS (scoped branch): teacher has % active group(s); all visible rows in scope (roadmap=%, custom=%)', grp, vis_r, vis_c;
  end if;

  -- seeded strangers must never be visible/writable either way
  begin
    insert into public.student_roadmap_progress (student_id, roadmap_item_id)
      values ('00000000-0000-4000-a000-00000000aa02', '00000000-0000-4000-b000-00000000aa01');
    raise exception 'Q4b FAILED: teacher wrote roadmap row for out-of-scope student';
  exception when others then
    if sqlerrm like '%Q4b FAILED%' then raise; end if;
    raise notice 'Q4b PASS: out-of-scope roadmap INSERT rejected (%)', substring(sqlerrm for 40);
  end;
end $$;
reset role;

-- ══ Q5 · admin keeps required abilities ══
select set_config('request.jwt.claims',
  json_build_object('sub', (select admin_id from qa_ids))::text, true);
set local role authenticated;
do $$
declare n int;
begin
  update public.profiles set linked_sport = linked_sport
    where id = (select teacher_id from qa_ids);
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Q5 FAILED: admin cannot touch link columns (rows=%)', n; end if;
  raise notice 'Q5 PASS: admin can still manage profile link columns';
  select count(*) into n from public.student_roadmap_progress;
  if n < 2 then raise exception 'Q5b FAILED: admin sees % roadmap rows (expected all incl. seeded)', n; end if;
  raise notice 'Q5b PASS: admin read scope intact';
end $$;
reset role;

-- ══ Q6 · invite-path guard mechanism works live ══
-- The trigger must allow a scope-column write when the transaction-local flag
-- (set inside claim_pending_invite) is present, and block it otherwise (Q3).
select set_config('request.jwt.claims',
  json_build_object('sub', (select student_id from qa_ids))::text, true);
set local role authenticated;
do $$
declare n int;
begin
  -- change to a genuinely DIFFERENT value so the guard comparison fires;
  -- rolled back with everything else at the end of this transaction.
  perform set_config('app.allow_profile_link_write', 'on', true);
  update public.profiles
     set linked_student_id = '00000000-0000-4000-a000-00000000aa01'
   where id = auth.uid();
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Q6 FAILED: flagged link write did not pass (rows=%)', n; end if;
  raise notice 'Q6 PASS: invite-path flag allows the link write (claim flow preserved)';
end $$;
reset role;

-- ══ Q7 · claim_pending_invite live source carries the flag ══
do $$
begin
  if position('app.allow_profile_link_write' in pg_get_functiondef('public.claim_pending_invite()'::regprocedure)) = 0 then
    raise exception 'Q7 FAILED: live claim_pending_invite lacks the guard flag';
  end if;
  raise notice 'Q7 PASS: live claim_pending_invite sets the guard flag';
end $$;

\echo ═══ LIVE QA COMPLETE — rolling everything back (no data changes persist) ═══
rollback;
