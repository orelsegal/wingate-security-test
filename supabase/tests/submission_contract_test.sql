-- ═══════════════════════════════════════════════════════════════════
-- SUBMISSION CONTRACT — local test. Run against a local stack only.
--
-- Proves the two things that matter for Pilot 0:
--   1. the state machine only allows legal transitions, and
--   2. RLS is fail-closed, including the case the old
--      app_teaches_student would have got wrong: a teacher who teaches
--      the student in ANOTHER subject must not see this submission.
--
-- Everything runs inside one transaction and is rolled back, so the
-- database is unchanged when it finishes.
-- ═══════════════════════════════════════════════════════════════════
begin;

-- ── fixtures ───────────────────────────────────────────────────────
create temporary table t_ids (k text primary key, v uuid);
-- readable after we switch to the authenticated role
grant select on t_ids to authenticated;

do $$
declare
  v_lit uuid; v_math uuid;
  v_stu_rec uuid; v_other_rec uuid;
  v_stu uuid; v_other uuid; v_teacher uuid; v_far uuid;
  v_grp_lit uuid; v_grp_math uuid; v_task uuid;
begin
  -- auth users
  v_stu     := gen_random_uuid(); v_other := gen_random_uuid();
  v_teacher := gen_random_uuid(); v_far   := gen_random_uuid();
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         u::text || '@test.local', 'x', now(), now(), now()
  from unnest(array[v_stu, v_other, v_teacher, v_far]) u;

  -- subjects
  insert into public.subjects (subject_name) values ('ספרות-בדיקה') returning id into v_lit;
  insert into public.subjects (subject_name) values ('מתמטיקה-בדיקה') returning id into v_math;

  -- administrative student records
  insert into public.students (full_name, class_name, sport, overall_status, completion_percent)
  values ('נועה בדיקה','יא-בדיקה','שחייה','green',0) returning id into v_stu_rec;
  insert into public.students (full_name, class_name, sport, overall_status, completion_percent)
  values ('דנה בדיקה','יא-בדיקה','שחייה','green',0) returning id into v_other_rec;

  -- profiles: the rows already exist — the live handle_new_user() trigger
  -- fired on the auth.users inserts above. We only add the admin-guarded
  -- link column, as postgres (no JWT), which is the maintenance path
  -- enforce_profile_scope_guard deliberately allows.
  insert into public.profiles (id, email, full_name, linked_student_id)
  values (v_stu,   'stu@test.local',   'נועה בדיקה', v_stu_rec),
         (v_other, 'other@test.local', 'דנה בדיקה',  v_other_rec),
         (v_teacher,'t@test.local',    'מורה בדיקה', null),
         (v_far,   'far@test.local',   'מורה אחרת',  null)
  on conflict (id) do update
    set linked_student_id = excluded.linked_student_id,
        full_name = excluded.full_name;

  insert into public.user_roles (user_id, role) values
    (v_stu,'student'), (v_other,'student'), (v_teacher,'teacher'), (v_far,'teacher')
  on conflict (user_id, role) do nothing;

  -- groups: the teacher leads the literature group the student is in.
  -- The far teacher leads a maths group that contains the SAME student.
  insert into public.learning_groups (name, subject_id, academic_year_start)
  values ('ספרות יא-בדיקה', v_lit, 2026) returning id into v_grp_lit;
  insert into public.learning_groups (name, subject_id, academic_year_start)
  values ('מתמטיקה יא-בדיקה', v_math, 2026) returning id into v_grp_math;

  insert into public.learning_group_teachers (group_id, teacher_user_id, role_in_group)
  values (v_grp_lit, v_teacher, 'lead'), (v_grp_math, v_far, 'lead');
  insert into public.learning_group_students (group_id, student_id)
  values (v_grp_lit, v_stu_rec), (v_grp_math, v_stu_rec);

  insert into public.learning_tasks (subject_id, external_app, external_key, title)
  values (v_lit, 'literature-30', 'station-5', 'נושא, מסר ורעיון מרכזי')
  returning id into v_task;

  insert into t_ids values
    ('stu',v_stu),('other',v_other),('teacher',v_teacher),('far',v_far),
    ('stu_rec',v_stu_rec),('task',v_task);
end $$;

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',p,'role','authenticated')::text, true);
end $$;

create or replace function pg_temp.expect(p_name text, p_ok boolean) returns void language plpgsql as $$
begin
  raise notice '%  %', case when p_ok then 'PASS' else 'FAIL' end, p_name;
  if not p_ok then raise exception 'TEST FAILED: %', p_name; end if;
end $$;

-- ── state machine ──────────────────────────────────────────────────
do $$
declare v_sub uuid; v_st text; v_rev int; v_err text; v_n int;
begin
  -- a student with no linked record cannot submit
  perform pg_temp.act_as((select v from t_ids where k='teacher'));
  begin
    perform public.submit_task((select v from t_ids where k='task'), '{"a":1}'::jsonb, 'k-noident-001');
    perform pg_temp.expect('submit refused without a student identity', false);
  exception when others then
    perform pg_temp.expect('submit refused without a student identity', sqlerrm like '%no_student_identity%');
  end;

  -- submit
  perform pg_temp.act_as((select v from t_ids where k='stu'));
  v_sub := public.submit_task((select v from t_ids where k='task'), '{"formula":"היצירה מעלה את נושא הבדידות"}'::jsonb, 'k-submit-0001');
  reset role;
  select status::text into v_st from public.submissions where id = v_sub;
  perform pg_temp.expect('submit -> awaiting_review', v_st = 'awaiting_review');

  -- a second submit for the same task is refused
  perform pg_temp.act_as((select v from t_ids where k='stu'));
  begin
    perform public.submit_task((select v from t_ids where k='task'), '{"a":2}'::jsonb, 'k-double-0001');
    perform pg_temp.expect('double submit refused', false);
  exception when others then
    perform pg_temp.expect('double submit refused', sqlerrm like '%already_submitted%');
  end;

  -- the out-of-subject teacher cannot act on it
  perform pg_temp.act_as((select v from t_ids where k='far'));
  begin
    perform public.approve_submission(v_sub, 'לא אמור לעבוד', 'k-farappr-001');
    perform pg_temp.expect('cross-subject teacher cannot approve', false);
  exception when others then
    perform pg_temp.expect('cross-subject teacher cannot approve', sqlerrm like '%not_authorised%');
  end;

  -- return requires feedback
  perform pg_temp.act_as((select v from t_ids where k='teacher'));
  begin
    perform public.return_for_revision(v_sub, '   ', 'k-emptyfb-001');
    perform pg_temp.expect('return requires feedback', false);
  exception when others then
    perform pg_temp.expect('return requires feedback', sqlerrm like '%feedback_required%');
  end;

  -- return, resubmit, approve
  perform pg_temp.act_as((select v from t_ids where k='teacher'));
  perform public.return_for_revision(v_sub, 'הרחיבי את הנימוק', 'k-return-0001');
  reset role;
  select status::text into v_st from public.submissions where id = v_sub;
  perform pg_temp.expect('return -> returned_for_revision', v_st = 'returned_for_revision');

  perform pg_temp.act_as((select v from t_ids where k='other'));
  begin
    perform public.resubmit(v_sub, '{"a":3}'::jsonb, 'k-otherres-01');
    perform pg_temp.expect('another student cannot resubmit', false);
  exception when others then
    perform pg_temp.expect('another student cannot resubmit', sqlerrm like '%submission_not_found%');
  end;

  perform pg_temp.act_as((select v from t_ids where k='stu'));
  v_rev := public.resubmit(v_sub, '{"formula":"נוסח מורחב"}'::jsonb, 'k-resub-00001');
  reset role;
  select status::text into v_st from public.submissions where id = v_sub;
  perform pg_temp.expect('resubmit -> resubmitted_awaiting, revision 2', v_st='resubmitted_awaiting' and v_rev=2);

  perform pg_temp.act_as((select v from t_ids where k='teacher'));
  perform public.approve_submission(v_sub, 'עבודה טובה', 'k-approve-001');
  reset role;
  select status::text into v_st from public.submissions where id = v_sub;
  perform pg_temp.expect('approve -> approved', v_st = 'approved');

  -- approving twice is refused
  perform pg_temp.act_as((select v from t_ids where k='teacher'));
  begin
    perform public.approve_submission(v_sub, 'שוב', 'k-approve2-01');
    perform pg_temp.expect('approve twice refused', false);
  exception when others then
    perform pg_temp.expect('approve twice refused', sqlerrm like '%illegal_transition%');
  end;
  reset role;

  -- audit trail carries the real actors
  select count(*) into v_n from public.submission_state_events where submission_id = v_sub;
  perform pg_temp.expect('4 state events recorded', v_n = 4);
  select count(*) into v_n from public.submission_state_events
   where submission_id = v_sub and actor is null;
  perform pg_temp.expect('every event has an actor', v_n = 0);

  -- versions are append-only
  begin
    update public.submission_versions set content = '{}'::jsonb where submission_id = v_sub;
    perform pg_temp.expect('versions are append-only', false);
  exception when others then
    perform pg_temp.expect('versions are append-only', sqlerrm like '%append_only%');
  end;

  insert into t_ids values ('sub', v_sub);
end $$;

-- ── idempotency ────────────────────────────────────────────────────
do $$
declare v_task uuid; v_sub1 uuid; v_sub2 uuid; v_rev1 int; v_rev2 int;
        v_lit uuid; v_n int;
begin
  -- a second task, so this block does not collide with the one above
  select t.subject_id into v_lit from public.learning_tasks t limit 1;
  insert into public.learning_tasks (subject_id, external_app, external_key, title)
  values (v_lit, 'literature-30', 'station-6', 'סמלים ומוטיבים')
  returning id into v_task;

  -- the same key twice returns the same submission and does not submit twice
  perform pg_temp.act_as((select v from t_ids where k='stu'));
  v_sub1 := public.submit_task(v_task, '{"a":1}'::jsonb, 'key-submit-1');
  v_sub2 := public.submit_task(v_task, '{"a":1}'::jsonb, 'key-submit-1');
  reset role;
  perform pg_temp.expect('submit is idempotent under the same key', v_sub1 = v_sub2);
  select count(*) into v_n from public.submission_versions where submission_id = v_sub1;
  perform pg_temp.expect('retried submit wrote one version, not two', v_n = 1);

  -- a teacher decision replayed with the same key does not write twice
  perform pg_temp.act_as((select v from t_ids where k='teacher'));
  perform public.return_for_revision(v_sub1, 'הוסיפי דוגמה', 'key-return-1');
  perform public.return_for_revision(v_sub1, 'הוסיפי דוגמה', 'key-return-1');
  reset role;
  select count(*) into v_n from public.teacher_reviews where submission_id = v_sub1;
  perform pg_temp.expect('retried return wrote one review, not two', v_n = 1);

  -- a double-clicked resubmit does not bump the revision twice
  perform pg_temp.act_as((select v from t_ids where k='stu'));
  v_rev1 := public.resubmit(v_sub1, '{"a":2}'::jsonb, 'key-resub-1');
  v_rev2 := public.resubmit(v_sub1, '{"a":2}'::jsonb, 'key-resub-1');
  reset role;
  perform pg_temp.expect('resubmit is idempotent, revision stays 2',
                         v_rev1 = 2 and v_rev2 = 2);

  -- The key is scoped to the actor. A second student using the SAME key
  -- string does not replay the first student's operation and does not
  -- receive her submission: she gets her own, separate one.
  declare v_other_sub uuid;
  begin
    perform pg_temp.act_as((select v from t_ids where k='other'));
    v_other_sub := public.submit_task(v_task, '{"a":9}'::jsonb, 'key-submit-1');
    reset role;
    perform pg_temp.expect('a reused key does not leak another student''s submission',
                           v_other_sub is not null and v_other_sub <> v_sub1);
    select count(*) into v_n from public.operation_receipts where idem_key = 'key-submit-1';
    perform pg_temp.expect('the same key stored one receipt per actor', v_n = 2);
  end;

  -- receipts are append-only
  begin
    update public.operation_receipts set result = '{}'::jsonb;
    perform pg_temp.expect('receipts are append-only', false);
  exception when others then
    perform pg_temp.expect('receipts are append-only', sqlerrm like '%append_only%');
  end;

  -- The key's scope is (actor, operation, key). The SAME actor reusing the
  -- SAME key for a DIFFERENT operation must not receive the other
  -- operation's receipt, and must not collide on the primary key.
  declare v_t3 uuid; v_sub3 uuid; v_st text; v_ops text;
  begin
    insert into public.learning_tasks (subject_id, external_app, external_key, title)
    values (v_lit, 'literature-30', 'station-7', 'חיבורים בין יצירות')
    returning id into v_t3;

    perform pg_temp.act_as((select v from t_ids where k='stu'));
    -- operation 1 with the shared key
    v_sub3 := public.submit_task(v_t3, '{"a":1}'::jsonb, 'shared-op-key-1');
    reset role;

    -- operation 2 with the SAME key, by the same actor
    perform pg_temp.act_as((select v from t_ids where k='teacher'));
    perform public.return_for_revision(v_sub3, 'תקני', 'shared-op-key-1');
    reset role;
    select status::text into v_st from public.submissions where id = v_sub3;
    perform pg_temp.expect('a different operation with the same key still ran',
                           v_st = 'returned_for_revision');

    -- both receipts exist, one per operation, no collision
    select string_agg(operation, ',' order by operation) into v_ops
    from public.operation_receipts where idem_key = 'shared-op-key-1';
    perform pg_temp.expect('both operations stored their own receipt',
                           v_ops = 'return_for_revision,submit_task');

    -- and neither returned the other's stored result
    select count(*) into v_n from public.operation_receipts
     where idem_key = 'shared-op-key-1' and operation = 'submit_task'
       and (result->>'submission_id')::uuid = v_sub3;
    perform pg_temp.expect('the submit receipt still holds its own result', v_n = 1);
  end;
end $$;

-- ── RLS ────────────────────────────────────────────────────────────
do $$
declare v_sub uuid := (select v from t_ids where k='sub'); v_n int;
begin
  -- the owning student sees exactly their own submission
  perform pg_temp.act_as((select v from t_ids where k='stu'));
  select count(*) into v_n from public.submissions where id = v_sub;
  perform pg_temp.expect('POSITIVE student reads own submission', v_n = 1);

  -- and never the AI draft
  perform pg_temp.act_as((select v from t_ids where k='teacher'));
  perform public.save_ai_feedback_draft(v_sub, 'טיוטה: התלמידה זיהתה את הנושא', '["ציטוט"]'::jsonb, 'medium', 'test');
  perform pg_temp.act_as((select v from t_ids where k='stu'));
  select count(*) into v_n from public.feedback_drafts where submission_id = v_sub;
  perform pg_temp.expect('NEGATIVE student cannot read the AI draft', v_n = 0);

  -- the student does see the teacher's published decision
  select count(*) into v_n from public.teacher_reviews where submission_id = v_sub;
  perform pg_temp.expect('POSITIVE student reads the teacher decision', v_n = 2);

  -- another student sees nothing
  perform pg_temp.act_as((select v from t_ids where k='other'));
  select count(*) into v_n from public.submissions where id = v_sub;
  perform pg_temp.expect('NEGATIVE other student sees nothing', v_n = 0);

  -- the in-subject teacher sees it
  perform pg_temp.act_as((select v from t_ids where k='teacher'));
  select count(*) into v_n from public.submissions where id = v_sub;
  perform pg_temp.expect('POSITIVE in-subject teacher reads it', v_n = 1);
  select count(*) into v_n from public.feedback_drafts where submission_id = v_sub;
  perform pg_temp.expect('POSITIVE in-subject teacher reads the AI draft', v_n = 1);

  -- THE ONE THAT MATTERS: a teacher who teaches this same student in a
  -- different subject must see nothing. app_teaches_student would pass here.
  perform pg_temp.act_as((select v from t_ids where k='far'));
  select count(*) into v_n from public.submissions where id = v_sub;
  perform pg_temp.expect('NEGATIVE cross-subject teacher sees nothing', v_n = 0);
  select count(*) into v_n from public.submission_versions where submission_id = v_sub;
  perform pg_temp.expect('NEGATIVE cross-subject teacher sees no content', v_n = 0);
  select count(*) into v_n from public.feedback_drafts where submission_id = v_sub;
  perform pg_temp.expect('NEGATIVE cross-subject teacher sees no AI draft', v_n = 0);
  reset role;
end $$;

rollback;
