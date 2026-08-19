-- ═══════════════════════════════════════════════════════════════════
-- PILOT GRADE GATE — local behavioural test. One transaction, rolled back.
--
-- Boundaries proven: 84 refuses to approve, 85 approves and unlocks,
-- 100 approves, a shadow grade never unlocks, a manual unlock needs a
-- reason and teacher scope, a replayed idempotency key does nothing
-- twice, an out-of-scope teacher can neither see, grade nor unlock, and
-- a raised threshold does not revoke an existing unlock.
-- ═══════════════════════════════════════════════════════════════════
begin;

create temporary table t_res (n int generated always as identity, ok boolean, label text);
grant insert, select on t_res to authenticated;
create or replace function pg_temp.note(b boolean, t text) returns void
language sql as $$ insert into t_res (ok,label) values ($1,$2); $$;

create temporary table ids (k text primary key, v uuid);
grant select on ids to authenticated;

-- ── fixtures: subject, group, teacher-in-scope, far teacher, two students ──
do $$
declare
  v_subj uuid; v_grp uuid; v_task uuid;
  v_teacher uuid := gen_random_uuid();
  v_far     uuid := gen_random_uuid();
  v_stu     uuid := gen_random_uuid();
  v_stu2    uuid := gen_random_uuid();
  v_rec uuid; v_rec2 uuid;
begin
  insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
  select u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',u::text||'@t',now(),now()
  from unnest(array[v_teacher,v_far,v_stu,v_stu2]) u;

  insert into public.subjects (subject_name) values ('ספרות-gate') returning id into v_subj;
  insert into public.students (full_name,class_name,sport,overall_status,completion_percent)
  values ('פיילוט א','יא','ריצה','green',0) returning id into v_rec;
  insert into public.students (full_name,class_name,sport,overall_status,completion_percent)
  values ('פיילוט ב','יא','שחייה','green',0) returning id into v_rec2;
  update public.profiles set linked_student_id=v_rec  where id=v_stu;
  update public.profiles set linked_student_id=v_rec2 where id=v_stu2;
  insert into public.user_roles (user_id, role) values
    (v_teacher,'teacher'), (v_far,'teacher'), (v_stu,'student'), (v_stu2,'student')
    on conflict do nothing;

  insert into public.learning_groups (name, subject_id, academic_year_start, status)
  values ('קבוצת gate', v_subj, 2026, 'active') returning id into v_grp;
  insert into public.learning_group_teachers (group_id, teacher_user_id) values (v_grp, v_teacher);
  insert into public.learning_group_students (group_id, student_id) values (v_grp, v_rec), (v_grp, v_rec2);

  -- no task threshold → the system default 85 must apply
  insert into public.learning_tasks (subject_id, external_app, external_key, title)
  values (v_subj, 'literature-30', 'station-5-gate', 'תחנת שער') returning id into v_task;

  insert into public.pilot_members (student_id, note) values (v_rec, 'פיילוט');

  insert into ids values ('subj',v_subj),('task',v_task),('teacher',v_teacher),('far',v_far),
    ('stu',v_stu),('stu2',v_stu2),('rec',v_rec),('rec2',v_rec2);
end $$;

-- helper: submit as a student
create or replace function pg_temp.submit(p_user uuid, p_key text) returns uuid
language plpgsql as $$
declare v_out uuid; v_task uuid;
begin
  select i.v into v_task from ids i where i.k = 'task';
  perform set_config('request.jwt.claims', json_build_object('sub',p_user,'role','authenticated')::text, true);
  set local role authenticated;
  v_out := public.submit_task(v_task, '{"formula":"עבודה"}'::jsonb, p_key);
  reset role;
  return v_out;
end $$;

-- ── 84 · below the resolved default of 85 ──────────────────────────
do $$
declare v_sub uuid; v_teacher uuid; v_n int;
begin
  v_sub := pg_temp.submit((select v from ids where k='stu'), 'gate-key-000000001');
  insert into ids values ('sub', v_sub);
  select v into v_teacher from ids where k='teacher';
  perform set_config('request.jwt.claims', json_build_object('sub',v_teacher,'role','authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.grade_and_approve(v_sub, 84, 'כמעט', 'gate-approve-84-0001');
    perform pg_temp.note(false, '84: אושר למרות סף 85');
  exception when others then
    perform pg_temp.note(sqlerrm like '%score_below_threshold%', '84 נדחה: '||sqlerrm);
  end;
  reset role;
  select count(*) into v_n from public.gate_unlocks;
  perform pg_temp.note(v_n = 0, 'אחרי 84: אפס unlocks');
end $$;

-- ── החזרה לתיקון + הגשה מחדש ───────────────────────────────────────
do $$
declare v_sub uuid; v_teacher uuid; v_stu uuid; v_rev int;
begin
  select v into v_sub from ids where k='sub';
  select v into v_teacher from ids where k='teacher';
  select v into v_stu from ids where k='stu';
  perform set_config('request.jwt.claims', json_build_object('sub',v_teacher,'role','authenticated')::text, true);
  set local role authenticated;
  perform public.return_for_revision(v_sub, 'חסר נימוק — 84', 'gate-return-0001');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub',v_stu,'role','authenticated')::text, true);
  set local role authenticated;
  v_rev := public.resubmit(v_sub, '{"formula":"עבודה מתוקנת"}'::jsonb, 'gate-resubmit-0001');
  reset role;
  perform pg_temp.note(v_rev = 2, 'הוגש מחדש: revision 2');
end $$;

-- ── 85 · בדיוק על הסף — מאשר ופותח ─────────────────────────────────
do $$
declare v_sub uuid; v_teacher uuid; v_n int; v_score int;
begin
  select v into v_sub from ids where k='sub';
  select v into v_teacher from ids where k='teacher';
  perform set_config('request.jwt.claims', json_build_object('sub',v_teacher,'role','authenticated')::text, true);
  set local role authenticated;
  perform public.grade_and_approve(v_sub, 85, 'עבודה טובה', 'gate-approve-85-0001');
  -- idempotency: אותו מפתח שוב — כלום לא קורה פעמיים
  perform public.grade_and_approve(v_sub, 85, 'עבודה טובה', 'gate-approve-85-0001');
  reset role;
  select count(*) into v_n from public.gate_unlocks where method='threshold';
  perform pg_temp.note(v_n = 1, '85 פתח בדיוק unlock אחד (גם אחרי replay)');
  select count(*) into v_n from public.grades where kind='authoritative';
  perform pg_temp.note(v_n = 1, 'ציון מוסמך אחד (גם אחרי replay)');
  select score into v_score from public.gate_unlocks limit 1;
  perform pg_temp.note(v_score = 85, 'ה-unlock נושא את הציון');
  select count(*) into v_n from public.submissions where status='approved';
  perform pg_temp.note(v_n = 1, 'ההגשה approved');
end $$;

-- ── מונוטוניות · העלאת הסף אינה מבטלת פתיחה ────────────────────────
do $$
declare v_n int;
begin
  update public.learning_tasks set pass_threshold = 95
   where id = (select v from ids where k='task');
  select count(*) into v_n from public.gate_unlocks;
  perform pg_temp.note(v_n = 1, 'הסף עלה ל-95 וה-unlock נשאר');
  begin
    delete from public.gate_unlocks;
    perform pg_temp.note(false, 'DELETE על unlocks הצליח');
  exception when others then
    perform pg_temp.note(true, 'unlocks הם append-only: '||left(sqlerrm,40));
  end;
  update public.learning_tasks set pass_threshold = null
   where id = (select v from ids where k='task');
end $$;

-- ── shadow grade · לעולם אינו פותח ─────────────────────────────────
do $$
declare v_sub2 uuid; v_teacher uuid; v_n int;
begin
  v_sub2 := pg_temp.submit((select v from ids where k='stu2'), 'gate-key-000000002');
  insert into ids values ('sub2', v_sub2);
  select v into v_teacher from ids where k='teacher';
  -- ציון צל נכתב ישירות (כפי ש-AI עתידי יכתוב) — בלי RPC פתיחה
  insert into public.grades (submission_id, revision, score, kind, graded_by)
  values (v_sub2, 1, 100, 'shadow', v_teacher);
  select count(*) into v_n from public.gate_unlocks
   where student_id = (select v from ids where k='rec2');
  perform pg_temp.note(v_n = 0, 'ציון צל 100 לא פתח דבר');
end $$;

-- ── פתיחה ידנית · חובת נימוק והיקף ─────────────────────────────────
do $$
declare v_teacher uuid; v_far uuid; v_task uuid; v_rec2 uuid; v_n int;
begin
  select v into v_teacher from ids where k='teacher';
  select v into v_far from ids where k='far';
  select v into v_task from ids where k='task';
  select v into v_rec2 from ids where k='rec2';

  perform set_config('request.jwt.claims', json_build_object('sub',v_teacher,'role','authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.manual_gate_unlock(v_task, v_rec2, '  ', 'gate-manual-0000');
    perform pg_temp.note(false, 'פתיחה ידנית בלי נימוק עברה');
  exception when others then
    perform pg_temp.note(sqlerrm like '%reason_required%', 'נימוק ריק נדחה');
  end;
  perform public.manual_gate_unlock(v_task, v_rec2, 'הנגשה בהחלטת רכזת', 'gate-manual-0001');
  reset role;
  select count(*) into v_n from public.gate_unlocks where method='manual' and reason is not null;
  perform pg_temp.note(v_n = 1, 'פתיחה ידנית מתועדת עם נימוק ושחקן');

  -- מורה מחוץ להיקף: לא רואה, לא מציינת, לא פותחת
  perform set_config('request.jwt.claims', json_build_object('sub',v_far,'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.submissions;
  perform pg_temp.note(v_n = 0, 'מורה זרה אינה רואה הגשות');
  select count(*) into v_n from public.gate_unlocks;
  perform pg_temp.note(v_n = 0, 'מורה זרה אינה רואה unlocks');
  begin
    perform public.grade_and_approve((select v from ids where k='sub2'), 90, 'x', 'gate-far-0001');
    perform pg_temp.note(false, 'מורה זרה הצליחה לצייّן');
  exception when others then
    perform pg_temp.note(true, 'מורה זרה נחסמה מציון');
  end;
  begin
    perform public.manual_gate_unlock(v_task, v_rec2, 'ניסיון', 'gate-far-0002');
    perform pg_temp.note(false, 'מורה זרה הצליחה לפתוח ידנית');
  exception when others then
    perform pg_temp.note(sqlerrm like '%not_your_student%', 'מורה זרה נחסמה מפתיחה ידנית');
  end;
  reset role;
end $$;

-- ── 100 · מעל הסף ─────────────────────────────────────────────────
do $$
declare v_sub2 uuid; v_teacher uuid; v_n int;
begin
  select v into v_sub2 from ids where k='sub2';
  select v into v_teacher from ids where k='teacher';
  perform set_config('request.jwt.claims', json_build_object('sub',v_teacher,'role','authenticated')::text, true);
  set local role authenticated;
  perform public.grade_and_approve(v_sub2, 100, 'מצוין', 'gate-approve-100-01');
  reset role;
  -- unlock כבר קיים ידנית — on conflict do nothing, נשאר manual
  select count(*) into v_n from public.gate_unlocks
   where student_id=(select v from ids where k='rec2');
  perform pg_temp.note(v_n = 1, '100: עדיין שורת unlock אחת (המונוטוניות שמרה על הידנית)');
  select count(*) into v_n from public.grades where kind='authoritative' and score=100;
  perform pg_temp.note(v_n = 1, 'ציון 100 מוסמך נרשם');
end $$;

-- ── קריאת התלמידה · מה larutz יראה ─────────────────────────────────
do $$
declare v_stu uuid; v_n int;
begin
  select v into v_stu from ids where k='stu';
  perform set_config('request.jwt.claims', json_build_object('sub',v_stu,'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.gate_unlocks;
  perform pg_temp.note(v_n = 1, 'תלמידת פיילוט רואה את ה-unlock שלה בלבד');
  select count(*) into v_n from public.pilot_members;
  perform pg_temp.note(v_n = 1, 'התלמידה רואה את חברות הפיילוט שלה');
  select count(*) into v_n from public.grades;
  perform pg_temp.note(v_n >= 1, 'התלמידה רואה את הציונים שלה');
  select count(*) into v_n from public.teacher_reviews;
  perform pg_temp.note(v_n >= 1, 'התלמידה רואה את המשוב שלה');
  reset role;
end $$;

-- ── תלמידה מחוץ לפיילוט · אינה חברה, ולא נחסם לה דבר במסד ─────────
do $$
declare v_stu2 uuid; v_n int;
begin
  select v into v_stu2 from ids where k='stu2';
  perform set_config('request.jwt.claims', json_build_object('sub',v_stu2,'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.pilot_members;
  perform pg_temp.note(v_n = 0, 'תלמידה מחוץ לפיילוט: אין שורת חברות — הלקוח שומר התנהגות קיימת');
  reset role;
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, label from t_res order by n;
do $$ declare f int; begin
  select count(*) into f from t_res where not ok;
  if f>0 then raise exception '% FAILED', f; end if;
  raise notice 'ALL % PILOT GATE TESTS PASSED', (select count(*) from t_res);
end $$;
rollback;
