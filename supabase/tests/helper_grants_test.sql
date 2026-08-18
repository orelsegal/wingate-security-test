-- ═══════════════════════════════════════════════════════════════════
-- HELPER FUNCTION GRANTS — local test. Run against a local stack only.
--
-- Proves the five things the fix has to be true for:
--
--   1. anon cannot EXECUTE any helper
--   2. authenticated cannot EXECUTE an internal helper
--   3. authenticated CAN execute app_current_student_id and
--      app_can_review_submission, because RLS policies call them
--   4. submit_task still reaches its normal permission path, i.e. the
--      revokes did not break the SECURITY DEFINER chain behind it
--   5. the teacher inbox still reads through RLS
--
-- Everything runs in one transaction and is rolled back.
-- ═══════════════════════════════════════════════════════════════════
begin;

create temporary table t_res (n int generated always as identity, ok boolean, label text);
-- the behavioural tests below run after `set local role authenticated`, so the
-- results table has to be writable from that role too. Identity columns need
-- no separate sequence grant.
grant insert, select on t_res to authenticated;

create or replace function pg_temp.note(p_ok boolean, p_label text) returns void
language sql as $$ insert into t_res (ok, label) values (p_ok, p_label); $$;

-- ── 1 · anon cannot execute ANY helper ─────────────────────────────
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('app_idem_begin','app_idem_store','app_submission_subject',
                      'app_log_submission_event','forbid_change',
                      'app_current_student_id','app_can_review_submission')
    and has_function_privilege('anon', p.oid, 'EXECUTE');
  perform pg_temp.note(v_bad is null,
    coalesce('anon can still execute: ' || v_bad, 'anon cannot execute any helper'));
end $$;

-- ── 2 · authenticated cannot execute an INTERNAL helper ────────────
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('app_idem_begin','app_idem_store','app_submission_subject',
                      'app_log_submission_event','forbid_change')
    and has_function_privilege('authenticated', p.oid, 'EXECUTE');
  perform pg_temp.note(v_bad is null,
    coalesce('authenticated can still execute internal: ' || v_bad,
             'authenticated cannot execute any internal helper'));
end $$;

-- and PUBLIC likewise
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('app_idem_begin','app_idem_store','app_submission_subject',
                      'app_log_submission_event','forbid_change')
    and has_function_privilege('public', p.oid, 'EXECUTE');
  perform pg_temp.note(v_bad is null,
    coalesce('PUBLIC can still execute internal: ' || v_bad,
             'PUBLIC cannot execute any internal helper'));
end $$;

-- ── 3 · authenticated CAN execute the two policy helpers ───────────
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('app_current_student_id','app_can_review_submission')
    and not has_function_privilege('authenticated', p.oid, 'EXECUTE');
  perform pg_temp.note(v_bad is null,
    coalesce('policy helper lost authenticated EXECUTE: ' || v_bad,
             'authenticated can execute both policy helpers'));
end $$;

-- ── the fixtures, for the two behavioural tests ────────────────────
create temporary table t_ids (k text primary key, v uuid);
grant select on t_ids to authenticated;

do $$
declare
  v_subj uuid; v_stu uuid; v_teacher uuid; v_stu_rec uuid;
  v_grp uuid; v_task uuid; v_sub uuid;
begin
  v_stu := gen_random_uuid(); v_teacher := gen_random_uuid();
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         u::text || '@test.local', 'x', now(), now(), now()
  from unnest(array[v_stu, v_teacher]) u;

  insert into public.subjects (subject_name) values ('ספרות-grants') returning id into v_subj;

  insert into public.students (full_name, class_name, sport, overall_status, completion_percent)
  values ('תמר בדיקה','יא-grants','ריצה','green',0) returning id into v_stu_rec;

  update public.profiles set linked_student_id = v_stu_rec where id = v_stu;

  -- app_log_submission_event refuses an actor with no role, so both sides of
  -- the flow need one.
  insert into public.user_roles (user_id, role) values
    (v_teacher, 'teacher'), (v_stu, 'student')
    on conflict do nothing;

  insert into public.learning_groups (name, subject_id, academic_year_start)
  values ('קבוצת grants', v_subj, 2026) returning id into v_grp;
  insert into public.learning_group_teachers (group_id, teacher_user_id) values (v_grp, v_teacher);
  insert into public.learning_group_students (group_id, student_id) values (v_grp, v_stu_rec);

  insert into public.learning_tasks (subject_id, external_app, external_key, title)
  values (v_subj, 'literature-30', 'station-5-grants', 'בדיקת הרשאות') returning id into v_task;

  insert into t_ids (k, v) values
    ('stu', v_stu), ('teacher', v_teacher), ('task', v_task), ('stu_rec', v_stu_rec);
end $$;

-- ── 4 · submit_task still works end to end as a student ────────────
-- This is the real proof that revoking the helpers did not break the
-- SECURITY DEFINER chain: submit_task calls app_idem_begin,
-- app_current_student_id, app_log_submission_event and app_idem_store,
-- none of which the caller may execute directly any more.
do $$
declare v_stu uuid; v_task uuid; v_sub uuid; v_again uuid; v_n int;
begin
  select v into v_stu  from t_ids where k = 'stu';
  select v into v_task from t_ids where k = 'task';

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_stu, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- the student may NOT call the helpers directly
  begin
    perform public.app_idem_begin('direct-call-probe-1', 'submit_task');
    perform pg_temp.note(false, 'a student could call app_idem_begin directly');
  exception when insufficient_privilege then
    perform pg_temp.note(true, 'a student cannot call app_idem_begin directly');
  end;

  begin
    perform public.app_idem_store('direct-call-probe-2', 'submit_task', gen_random_uuid(), '{}'::jsonb);
    perform pg_temp.note(false, 'a student could call app_idem_store directly');
  exception when insufficient_privilege then
    perform pg_temp.note(true, 'a student cannot call app_idem_store directly');
  end;

  -- but the front door still opens
  v_sub := public.submit_task(v_task, '{"formula":"בדיקה"}'::jsonb, 'grants-test-key-0001');
  perform pg_temp.note(v_sub is not null, 'submit_task still returns a submission id');

  -- and the helpers it called internally really did their work
  select count(*) into v_n from public.submission_versions where submission_id = v_sub;
  perform pg_temp.note(v_n = 1, 'submit_task wrote exactly one version');

  -- idempotency still holds, which means app_idem_store wrote a receipt
  v_again := public.submit_task(v_task, '{"formula":"בדיקה"}'::jsonb, 'grants-test-key-0001');
  perform pg_temp.note(v_again = v_sub, 'a replayed key returns the same submission');

  select count(*) into v_n from public.submissions where task_id = v_task;
  perform pg_temp.note(v_n = 1, 'the replay created no second submission');

  -- app_current_student_id is callable, because policies need it
  perform pg_temp.note(public.app_current_student_id() is not null,
                       'a student can call app_current_student_id');

  reset role;
  insert into t_ids (k, v) values ('sub', v_sub);
end $$;

-- ── 5 · the teacher inbox still reads through RLS ──────────────────
do $$
declare v_teacher uuid; v_sub uuid; v_n int; v_can boolean;
begin
  select v into v_teacher from t_ids where k = 'teacher';
  select v into v_sub     from t_ids where k = 'sub';

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_teacher, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- the policy helper is callable by the teacher
  v_can := public.app_can_review_submission(v_sub);
  perform pg_temp.note(v_can, 'a teacher can call app_can_review_submission and it says yes');

  -- and the actual inbox query returns the row
  select count(*) into v_n
  from public.submissions s
  where s.status in ('awaiting_review', 'resubmitted_awaiting');
  perform pg_temp.note(v_n = 1, 'the teacher inbox still returns the submission');

  select count(*) into v_n from public.submission_versions;
  perform pg_temp.note(v_n = 1, 'the teacher still reads the submitted version');

  -- but not the internal helpers
  begin
    perform public.app_submission_subject(v_sub);
    perform pg_temp.note(false, 'a teacher could call app_submission_subject directly');
  exception when insufficient_privilege then
    perform pg_temp.note(true, 'a teacher cannot call app_submission_subject directly');
  end;

  reset role;
end $$;

-- ── the five public RPCs are unchanged ─────────────────────────────
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('submit_task','resubmit','return_for_revision',
                      'approve_submission','save_ai_feedback_draft')
    and (has_function_privilege('anon', p.oid, 'EXECUTE')
      or not has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  perform pg_temp.note(v_bad is null,
    coalesce('a public RPC changed shape: ' || v_bad,
             'the five public RPCs are unchanged: anon no, authenticated yes'));
end $$;

-- ── report ─────────────────────────────────────────────────────────
select n, case when ok then 'PASS' else 'FAIL' end as result, label from t_res order by n;

do $$
declare v_fail int;
begin
  select count(*) into v_fail from t_res where not ok;
  if v_fail > 0 then
    raise exception '% test(s) FAILED', v_fail;
  end if;
  raise notice 'ALL % HELPER GRANT TESTS PASSED', (select count(*) from t_res);
end $$;

rollback;
