-- ─────────────────────────────────────────────────────────────────────────────
-- בדיקות שער · טיוטות · חומרים · אחסון · הצטרפות בקוד כיתה
--
-- הרצה:
--   docker exec -i pgpilot psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < supabase/tests/_storage_harness.sql
--   docker exec -i pgpilot psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < supabase/tests/20260820_gate_tests.sql
--
-- הכל בטרנזקציה שנגמרת ב-ROLLBACK. הזהות מדומה דרך request.jwt.claims,
-- בדיוק כמו ש-auth.uid() קורא אותה, ולכן זו ההתנהגות האמיתית של השרת.
-- בדיקות ה-concurrency בשני חיבורים נפרדים יושבות בקובץ הנפרד
-- 20260820_concurrency.sh, כי psql אחד אינו יכול לפתוח שתי טרנזקציות.
-- ─────────────────────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

begin;

create or replace function pg_temp.act(p_uid uuid) returns void language plpgsql as $$
begin
  if p_uid is null then
    perform set_config('request.jwt.claims', null, true);
    perform set_config('role', 'anon', true);
  else
    perform set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
end $$;

create or replace function pg_temp.chk(p_name text, p_ok boolean) returns void language plpgsql as $$
begin
  raise notice '%  %', case when p_ok then 'PASS' else 'FAIL' end, p_name;
  if not p_ok then raise exception 'GATE TEST FAILED: %', p_name; end if;
end $$;

create or replace function pg_temp.denied(p_sql text) returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  return true;
end $$;

-- מחזירה את שם השגיאה, כדי שאפשר יהיה לבדוק שגיאה מסוימת ולא "נכשל איכשהו"
create or replace function pg_temp.err(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return '(no error)';
exception when others then
  return sqlerrm;
end $$;

-- ── שחקנים ────────────────────────────────────────────────────────────────
create temporary table t_ids (k text primary key, v uuid);
insert into t_ids (k, v)
select k, gen_random_uuid() from unnest(array[
  'subject_a','subject_b','group_a1','group_a2','group_b',
  'teacher_a1','teacher_a2','teacher_left','teacher_b','admin','super',
  'stud_a','stud_a2','stud_b','stud_out',
  'user_a','user_a2','user_b','user_out','user_new',
  'user_susp','teacher_susp','user_noprofile',
  'task_a','task_a2','task_b'
]) as k;
grant select on t_ids to public;
create or replace function pg_temp.id(k text) returns uuid
language sql stable security definer as $$ select v from t_ids where t_ids.k = $1 $$;

insert into auth.users (id, instance_id, aud, role, email)
select v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', k || '@gate.test'
from t_ids where k like 'user_%' or k like 'teacher_%' or k in ('admin','super')
on conflict (id) do nothing;

insert into public.subjects (id, subject_name) values
  (pg_temp.id('subject_a'), 'בדיקה · מקצוע א'), (pg_temp.id('subject_b'), 'בדיקה · מקצוע ב')
on conflict (id) do nothing;

-- שתי קבוצות באותו מקצוע, כדי לבדוק בידוד בין קבוצות
insert into public.learning_groups (id, name, subject_id, academic_year_start, status) values
  (pg_temp.id('group_a1'), 'בדיקה · א1', pg_temp.id('subject_a'), 2026, 'active'),
  (pg_temp.id('group_a2'), 'בדיקה · א2', pg_temp.id('subject_a'), 2026, 'active'),
  (pg_temp.id('group_b'),  'בדיקה · ב',  pg_temp.id('subject_b'), 2026, 'active')
on conflict (id) do nothing;

insert into public.learning_group_teachers (group_id, teacher_user_id, role_in_group, left_at) values
  (pg_temp.id('group_a1'), pg_temp.id('teacher_a1'),   'lead',    null),
  (pg_temp.id('group_a2'), pg_temp.id('teacher_a2'),   'lead',    null),
  (pg_temp.id('group_a1'), pg_temp.id('teacher_left'), 'teacher', now() - interval '1 day'),
  (pg_temp.id('group_b'),  pg_temp.id('teacher_b'),    'lead',    null)
on conflict do nothing;

insert into public.students (id, full_name, class_name, sport) values
  (pg_temp.id('stud_a'),   'בדיקה · תלמידה א',  'בדיקה', 'בדיקה'),
  (pg_temp.id('stud_a2'),  'בדיקה · תלמידה א2', 'בדיקה', 'בדיקה'),
  (pg_temp.id('stud_b'),   'בדיקה · תלמידה ב',  'בדיקה', 'בדיקה'),
  (pg_temp.id('stud_out'), 'בדיקה · לא משויכת', 'בדיקה', 'בדיקה')
on conflict (id) do nothing;

insert into public.learning_group_students (group_id, student_id, left_at) values
  (pg_temp.id('group_a1'), pg_temp.id('stud_a'),  null),
  (pg_temp.id('group_a2'), pg_temp.id('stud_a2'), null),
  (pg_temp.id('group_b'),  pg_temp.id('stud_b'),  null)
on conflict do nothing;

-- מושעים: תלמידה עם שיוך מלא ומורה משויכת, שתיהן עם suspended_at.
-- user_noprofile הוא חשבון בלי שורת profile כלל, לבדיקת ה-rollback.
insert into public.profiles (id, linked_student_id, suspended_at) values
  (pg_temp.id('user_susp'), pg_temp.id('stud_a'), now()),
  (pg_temp.id('teacher_susp'), null, now())
on conflict (id) do update set suspended_at = excluded.suspended_at, linked_student_id = excluded.linked_student_id;
insert into public.learning_group_teachers (group_id, teacher_user_id, role_in_group, left_at) values
  (pg_temp.id('group_a1'), pg_temp.id('teacher_susp'), 'teacher', null)
on conflict do nothing;
insert into public.user_roles (user_id, role) values
  (pg_temp.id('user_susp'), 'student'), (pg_temp.id('teacher_susp'), 'teacher')
on conflict do nothing;

insert into public.profiles (id, linked_student_id) values
  (pg_temp.id('user_a'),   pg_temp.id('stud_a')),
  (pg_temp.id('user_a2'),  pg_temp.id('stud_a2')),
  (pg_temp.id('user_b'),   pg_temp.id('stud_b')),
  (pg_temp.id('user_out'), pg_temp.id('stud_out')),
  (pg_temp.id('user_new'), null)
on conflict (id) do update set linked_student_id = excluded.linked_student_id;

insert into public.user_roles (user_id, role) values
  (pg_temp.id('teacher_a1'), 'teacher'), (pg_temp.id('teacher_a2'), 'teacher'),
  (pg_temp.id('teacher_left'), 'teacher'), (pg_temp.id('teacher_b'), 'teacher'),
  (pg_temp.id('admin'), 'admin'),
  (pg_temp.id('user_a'), 'student'), (pg_temp.id('user_a2'), 'student'),
  (pg_temp.id('user_b'), 'student'), (pg_temp.id('user_out'), 'student')
on conflict do nothing;

insert into public.learning_tasks (id, subject_id, external_app, external_key, title, active) values
  (pg_temp.id('task_a'),  pg_temp.id('subject_a'), 'gate-test', 'task-a',  'בדיקה · משימה א', true),
  (pg_temp.id('task_a2'), pg_temp.id('subject_a'), 'gate-test', 'task-a2', 'בדיקה · משימה א2', true),
  (pg_temp.id('task_b'),  pg_temp.id('subject_b'), 'gate-test', 'task-b',  'בדיקה · משימה ב', true)
on conflict (id) do nothing;
insert into t_ids (k, v) values ('task_a2p', gen_random_uuid()) on conflict do nothing;
insert into public.learning_tasks (id, subject_id, external_app, external_key, title, active) values
  (pg_temp.id('task_a2p'), pg_temp.id('subject_a'), 'gate-test', 'task-a2p', 'בדיקה · מסלול ספרות', true)
on conflict (id) do nothing;

-- ═══ 1 · זהות נגזרת מהשרת ═══════════════════════════════════════════════
select pg_temp.chk('1 · save_task_draft takes no client-supplied student',
  (select pg_get_function_arguments(oid) from pg_proc where proname='save_task_draft')
   = 'p_task uuid, p_content jsonb, p_expected_revision bigint');

select pg_temp.act(pg_temp.id('user_a'));
select pg_temp.chk('2 · identity resolves from auth.uid() and linked_student_id',
  public.app_current_student_id() = pg_temp.id('stud_a'));

-- ═══ 2 · היקף התלמידה ═══════════════════════════════════════════════════
select pg_temp.chk('3 · a student in scope may save',
  public.save_task_draft(pg_temp.id('task_a'), '{"a":"1"}'::jsonb, 0) = 1);

select pg_temp.act(pg_temp.id('user_b'));
select pg_temp.chk('4 · a student of another subject cannot save',
  pg_temp.err($q$select public.save_task_draft(pg_temp.id('task_a'),'{"x":1}'::jsonb,0)$q$)
    like '%not_in_scope%');

select pg_temp.chk('5 · a student of another subject cannot read',
  pg_temp.err($q$select * from public.get_task_draft(pg_temp.id('task_a'))$q$)
    like '%not_in_scope%');

-- תלמידה שאינה רשומה לאף קבוצה
select pg_temp.act(pg_temp.id('user_out'));
select pg_temp.chk('6 · an unenrolled student cannot save',
  pg_temp.err($q$select public.save_task_draft(pg_temp.id('task_a'),'{"x":1}'::jsonb,0)$q$)
    like '%not_in_scope%');

-- ═══ 3 · בידוד בין תלמידות ══════════════════════════════════════════════
select pg_temp.act(pg_temp.id('user_a2'));
select public.save_task_draft(pg_temp.id('task_a'), '{"a":"student a2"}'::jsonb, 0);
select pg_temp.chk('7 · a student does not see another student draft',
  (select count(*) from public.task_drafts where student_id = pg_temp.id('stud_a')) = 0);

select pg_temp.act(pg_temp.id('user_a'));
select pg_temp.chk('8 · the other save did not overwrite the first',
  (select content->>'a' from public.get_task_draft(pg_temp.id('task_a'))) = '1');

select pg_temp.chk('9 · direct table writes are denied',
  pg_temp.denied($q$insert into public.task_drafts (task_id, student_id, content)
                    values (pg_temp.id('task_a'), pg_temp.id('stud_b'), '{}'::jsonb)$q$));

-- ═══ 4 · revision ═══════════════════════════════════════════════════════
select pg_temp.chk('10 · a stale revision is rejected with draft_conflict',
  pg_temp.err($q$select public.save_task_draft(pg_temp.id('task_a'),'{"a":"stale"}'::jsonb,0)$q$)
    like '%draft_conflict%');

select pg_temp.chk('11 · the rejected save changed nothing',
  (select content->>'a' from public.get_task_draft(pg_temp.id('task_a'))) = '1');

select pg_temp.chk('12 · retrying with the current revision succeeds',
  public.save_task_draft(pg_temp.id('task_a'), '{"a":"2"}'::jsonb, 1) = 2);

select pg_temp.chk('13 · a first save that claims a non-zero revision is rejected',
  pg_temp.err($q$select public.save_task_draft(pg_temp.id('task_a2'),'{"a":"x"}'::jsonb,5)$q$)
    like '%draft_conflict%');

-- ═══ 5 · תקרת payload ═══════════════════════════════════════════════════
select pg_temp.chk('14 · an oversized payload is rejected',
  pg_temp.err(format($q$select public.save_task_draft(pg_temp.id('task_a'),
    jsonb_build_object('a', repeat('x', 70000)), 2)$q$)) like '%content_too_large%');

-- ═══ 6 · מטריצת מצבי ההגשה ══════════════════════════════════════════════
select public.submit_task(pg_temp.id('task_a'), '{"answer":"snapshot"}'::jsonb, 'gate-idem-1') as sub_id \gset

select pg_temp.chk('15 · awaiting_review blocks draft writes',
  pg_temp.err($q$select public.save_task_draft(pg_temp.id('task_a'),'{"a":"late"}'::jsonb,2)$q$)
    like '%draft_locked_by_submission%');

reset role;
update public.submissions set status = 'returned_for_revision' where id = :'sub_id';
select pg_temp.act(pg_temp.id('user_a'));
select pg_temp.chk('16 · returned_for_revision allows the student to work again',
  public.save_task_draft(pg_temp.id('task_a'), '{"a":"fixed"}'::jsonb, 2) = 3);

reset role;
update public.submissions set status = 'approved' where id = :'sub_id';
select pg_temp.act(pg_temp.id('user_a'));
select pg_temp.chk('17 · approved blocks draft writes',
  pg_temp.err($q$select public.save_task_draft(pg_temp.id('task_a'),'{"a":"after"}'::jsonb,3)$q$)
    like '%draft_locked_by_submission%');

reset role;
update public.submissions set status = 'resubmitted_awaiting' where id = :'sub_id';
select pg_temp.act(pg_temp.id('user_a'));
select pg_temp.chk('18 · resubmitted_awaiting blocks draft writes',
  pg_temp.err($q$select public.save_task_draft(pg_temp.id('task_a'),'{"a":"after"}'::jsonb,3)$q$)
    like '%draft_locked_by_submission%');

reset role;
update public.submissions set status = 'returned_for_revision' where id = :'sub_id';

-- ═══ 7 · anon ═══════════════════════════════════════════════════════════
select pg_temp.act(null);
select pg_temp.chk('19 · anon cannot save a draft',
  pg_temp.denied($q$select public.save_task_draft(pg_temp.id('task_a'),'{}'::jsonb,0)$q$));
select pg_temp.chk('20 · anon holds no EXECUTE on the new functions',
  (select count(*) from information_schema.role_routine_grants
    where routine_name in ('save_task_draft','get_task_draft','create_task_material',
                           'finalize_task_material','set_material_state',
                           'create_group_join_code','redeem_group_join_code','approve_group_join')
      and grantee in ('anon','public')) = 0);

-- ═══ 8 · הרשאת מורה ═════════════════════════════════════════════════════
select pg_temp.act(pg_temp.id('teacher_a1'));
select pg_temp.chk('21 · an active teacher is scoped to her own group',
  public.app_can_manage_group_materials(pg_temp.id('group_a1')));
select pg_temp.chk('22 · she is not scoped to another group in the same subject',
  not public.app_can_manage_group_materials(pg_temp.id('group_a2')));

select pg_temp.act(pg_temp.id('teacher_left'));
select pg_temp.chk('23 · a teacher with left_at set is refused',
  not public.app_can_manage_group_materials(pg_temp.id('group_a1')));

select pg_temp.act(pg_temp.id('admin'));
select pg_temp.chk('24 · admin without a teaching assignment is refused',
  not public.app_can_manage_group_materials(pg_temp.id('group_a1')));
select pg_temp.chk('25 · admin sees no student drafts',
  (select count(*) from public.task_drafts) = 0);

-- ═══ 9 · חומרים · יצירה והרשאה ══════════════════════════════════════════
select pg_temp.act(pg_temp.id('teacher_a1'));
select m.material_id as mat_link from public.create_task_material(
  pg_temp.id('task_a'), pg_temp.id('group_a1'), 'קישור בדיקה', null, 'link', 'https://example.org/ok') m \gset

select pg_temp.chk('26 · a teacher creates material in her own group',
  (select count(*) from public.task_materials where id = :'mat_link') = 1);

select pg_temp.chk('27 · a dangerous url scheme is refused',
  pg_temp.err($q$select * from public.create_task_material(pg_temp.id('task_a'),
    pg_temp.id('group_a1'),'bad',null,'link','javascript:alert(1)')$q$) like '%invalid_url%');

select pg_temp.chk('28 · creating in another group is refused',
  pg_temp.err($q$select * from public.create_task_material(pg_temp.id('task_a'),
    pg_temp.id('group_a2'),'x',null,'link','https://example.org/y')$q$) like '%not_authorized%');

-- קבוצה ומשימה משני מקצועות שונים: ההרשאה לקבוצה תקינה, ולכן השגיאה
-- המדויקת היא scope_mismatch ולא not_authorized.
select pg_temp.chk('29 · a group and a task from different subjects are refused',
  pg_temp.err($q$select * from public.create_task_material(pg_temp.id('task_b'),
    pg_temp.id('group_a1'),'x',null,'link','https://example.org/y')$q$) like '%scope_mismatch%');

-- ═══ 10 · confused deputy ═══════════════════════════════════════════════
select pg_temp.act(pg_temp.id('teacher_a2'));
select m.material_id as mat_a2 from public.create_task_material(
  pg_temp.id('task_a'), pg_temp.id('group_a2'), 'של הקבוצה השנייה', null, 'link', 'https://example.org/a2') m \gset

select pg_temp.act(pg_temp.id('teacher_a1'));
select pg_temp.chk('30 · an authorized task plus a foreign material id is refused',
  pg_temp.err(format($q$select public.update_task_material_meta(%L::uuid,'hijacked',null)$q$, :'mat_a2'))
    like '%not_authorized%');

select pg_temp.chk('31 · publishing a foreign material is refused',
  pg_temp.err(format($q$select public.set_material_state(%L::uuid,'published')$q$, :'mat_a2'))
    like '%not_authorized%');

select pg_temp.chk('32 · moving a material needs rights on both ends',
  pg_temp.err(format($q$select public.move_task_material(%L::uuid, pg_temp.id('task_a'), pg_temp.id('group_a1'))$q$, :'mat_a2'))
    like '%not_authorized%');

-- ═══ 11 · מחזור חיים של קובץ ════════════════════════════════════════════
select m.material_id as mat_pdf, m.upload_path as path_pdf from public.create_task_material(
  pg_temp.id('task_a'), pg_temp.id('group_a1'), 'מסמך בדיקה', 'תיאור', 'pdf', null) m \gset

select pg_temp.chk('33 · publishing before finalize is refused',
  pg_temp.err(format($q$select public.set_material_state(%L::uuid,'published')$q$, :'mat_pdf'))
    like '%not_finalized%');

select pg_temp.chk('34 · finalizing with no uploaded object is refused',
  pg_temp.err(format($q$select public.finalize_task_material(%L::uuid, %L)$q$, :'mat_pdf', :'path_pdf'))
    like '%object_missing%');

select pg_temp.chk('35 · an arbitrary storage path is refused',
  pg_temp.err(format($q$select public.finalize_task_material(%L::uuid, %L)$q$,
    :'mat_pdf', 'someone-else/00000000-0000-0000-0000-000000000000'))
    like '%path_not_allocated%');

-- העלאה דרך המדיניות עצמה, ולא בעקיפתה
-- ההעלאה נעשית דרך המדיניות עצמה, ולא בעקיפתה.
with uploaded as (
  insert into storage.objects (bucket_id, name, owner, metadata)
  values ('task-materials', :'path_pdf', pg_temp.id('teacher_a1'),
          jsonb_build_object('size', 1024, 'mimetype', 'application/pdf'))
  returning 1
)
select pg_temp.chk('36 · a teacher may upload to her allocated path',
  (select count(*) from uploaded) = 1);

select pg_temp.chk('37 · a teacher may not upload into another material folder',
  pg_temp.denied(format($q$insert into storage.objects (bucket_id,name,owner,metadata)
    values ('task-materials', %L, pg_temp.id('teacher_a1'), '{}'::jsonb)$q$,
    :'mat_a2' || '/00000000-0000-0000-0000-000000000001')));

select pg_temp.chk('38 · a guessed path outside any material is refused',
  pg_temp.denied($q$insert into storage.objects (bucket_id,name,owner,metadata)
    values ('task-materials','00000000-0000-0000-0000-000000000000/11111111-1111-1111-1111-111111111111',
            pg_temp.id('teacher_a1'), '{}'::jsonb)$q$));

select pg_temp.chk('39 · finalize accepts the real object',
  public.finalize_task_material(:'mat_pdf', :'path_pdf')::text = 'ready');

select pg_temp.chk('40 · publish works once finalized',
  public.set_material_state(:'mat_pdf','published')::text = 'published');

-- MIME וגודל
select m.material_id as mat_bad, m.upload_path as path_bad from public.create_task_material(
  pg_temp.id('task_a'), pg_temp.id('group_a1'), 'תמונה', null, 'image', null) m \gset
insert into storage.objects (bucket_id, name, owner, metadata)
values ('task-materials', :'path_bad', pg_temp.id('teacher_a1'),
        jsonb_build_object('size', 1024, 'mimetype', 'application/zip'));
select pg_temp.chk('41 · a disallowed mime type is refused',
  pg_temp.err(format($q$select public.finalize_task_material(%L::uuid,%L)$q$, :'mat_bad', :'path_bad'))
    like '%mime_not_allowed%');

reset role;
update storage.objects set metadata = jsonb_build_object('size', 20*1024*1024, 'mimetype','image/png')
 where name = :'path_bad';
select pg_temp.act(pg_temp.id('teacher_a1'));
select pg_temp.chk('42 · a file over the kind limit is refused',
  pg_temp.err(format($q$select public.finalize_task_material(%L::uuid,%L)$q$, :'mat_bad', :'path_bad'))
    like '%file_too_large%');

-- ═══ 12 · החלפה ושמירת היסטוריה ═════════════════════════════════════════
select public.request_material_replacement(:'mat_pdf') as path_new \gset
insert into storage.objects (bucket_id, name, owner, metadata)
values ('task-materials', :'path_new', pg_temp.id('teacher_a1'),
        jsonb_build_object('size', 2048, 'mimetype', 'application/pdf'));
select public.finalize_task_material(:'mat_pdf', :'path_new');

select pg_temp.chk('43 · replacement keeps a full snapshot of the previous version',
  (select count(*) from public.task_material_revisions
    where material_id = :'mat_pdf' and storage_path = :'path_pdf'
      and title is not null and kind is not null and file_size is not null) = 1);

-- שני האובייקטים קיימים: הישן לא נדרס. הספירה מבנית, ולכן ללא הקשר שחקן.
reset role;
select pg_temp.chk('44 · replacement wrote a new object rather than overwriting',
  (select count(*) from storage.objects where bucket_id='task-materials'
     and name in (:'path_pdf', :'path_new')) = 2);
select pg_temp.act(pg_temp.id('teacher_a1'));

-- ═══ 13 · מה תלמידה רואה ════════════════════════════════════════════════
select public.set_material_state(:'mat_pdf','published');
select pg_temp.act(pg_temp.id('user_a'));
select pg_temp.chk('45 · a student in the group sees published material',
  (select count(*) from public.task_materials where id = :'mat_pdf') = 1);

select pg_temp.act(pg_temp.id('user_a2'));
select pg_temp.chk('46 · a student in another group of the same subject does not',
  (select count(*) from public.task_materials where id = :'mat_pdf') = 0);

select pg_temp.act(pg_temp.id('teacher_a1'));
select public.set_material_state(:'mat_pdf','unpublished');
select pg_temp.act(pg_temp.id('user_a'));
select pg_temp.chk('47 · unpublished material disappears for the student',
  (select count(*) from public.task_materials where id = :'mat_pdf') = 0);

select pg_temp.act(pg_temp.id('teacher_a1'));
select pg_temp.chk('48 · unpublish did not delete the row',
  (select state::text from public.task_materials where id = :'mat_pdf') = 'unpublished');
select public.set_material_state(:'mat_pdf','published');

-- ═══ 14 · קריאת האובייקט · הבסיס ל-signed URL ═══════════════════════════
select pg_temp.act(pg_temp.id('user_a'));
select pg_temp.chk('49 · an entitled student can read the object row, so a signed url can be issued',
  (select count(*) from storage.objects
    where bucket_id='task-materials' and name = :'path_new') = 1);

select pg_temp.act(pg_temp.id('user_a2'));
select pg_temp.chk('50 · a student outside the group cannot, so no signed url is possible',
  (select count(*) from storage.objects
    where bucket_id='task-materials' and name = :'path_new') = 0);

select pg_temp.act(pg_temp.id('teacher_b'));
select pg_temp.chk('51 · a teacher of another subject cannot read the object',
  (select count(*) from storage.objects
    where bucket_id='task-materials' and name = :'path_new') = 0);

reset role;
select pg_temp.chk('52 · the bucket is private',
  (select not public from storage.buckets where id='task-materials'));

-- ═══ 15 · ההגשה אינה זזה ════════════════════════════════════════════════
select pg_temp.act(pg_temp.id('user_a'));
select pg_temp.chk('53 · replacing material left the submitted snapshot byte-identical',
  (select content->>'answer' from public.submission_versions
    where submission_id = :'sub_id' and revision = 1) = 'snapshot');

-- ═══ 16 · הצטרפות בקוד כיתה ═════════════════════════════════════════════
select pg_temp.act(pg_temp.id('teacher_a1'));
select c.code as join_code from public.create_group_join_code(pg_temp.id('group_a1'), 14) c \gset

select pg_temp.chk('53a · code format: 13 chars from the safe alphabet, ~64 bits',
  :'join_code' ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{13}$');

select pg_temp.chk('54 · the plaintext code is not stored',
  (select count(*) from public.group_join_codes where code_hash = :'join_code') = 0);

select pg_temp.act(pg_temp.id('teacher_b'));
select pg_temp.chk('55 · a teacher of another group cannot issue a code for it',
  pg_temp.err($q$select * from public.create_group_join_code(pg_temp.id('group_a1'),14)$q$)
    like '%not_authorized%');

select pg_temp.act(null);
select pg_temp.chk('56 · redeeming without a session is refused',
  pg_temp.denied(format($q$select public.redeem_group_join_code(%L)$q$, :'join_code')));

select pg_temp.act(pg_temp.id('user_new'));
select pg_temp.chk('57 · a wrong code returns the uniform null, revealing nothing',
  public.redeem_group_join_code('ZZZZZZZZZZZZZ') is null);

select public.redeem_group_join_code(:'join_code') as req_id \gset
select pg_temp.chk('58 · redeeming creates one pending request',
  (select count(*) from public.access_requests where id = :'req_id' and status='pending') = 1);

select pg_temp.chk('59 · redeeming twice does not duplicate the request',
  public.redeem_group_join_code(:'join_code') = :'req_id');

-- הקישור בין הבקשה לקבוצה נקרא על ידי מורת הקבוצה, שהיא מי שרשאית לראותו.
select pg_temp.act(pg_temp.id('teacher_a1'));
select pg_temp.chk('60 · the group is derived on the server, not sent by the client',
  (select group_id from public.access_request_groups where request_id = :'req_id')
    = pg_temp.id('group_a1'));
select pg_temp.act(pg_temp.id('user_new'));

select pg_temp.chk('61 · no student role was granted before approval',
  (select count(*) from public.user_roles
    where user_id = pg_temp.id('user_new') and role='student') = 0);

select pg_temp.act(pg_temp.id('teacher_b'));
select pg_temp.chk('62 · a teacher of another group cannot approve',
  pg_temp.err(format($q$select public.approve_group_join(%L::uuid,'שם בדיקה','בדיקה')$q$, :'req_id'))
    like '%not_authorized%');

select pg_temp.act(pg_temp.id('admin'));
select pg_temp.chk('63 · an admin without a teaching assignment cannot approve',
  pg_temp.err(format($q$select public.approve_group_join(%L::uuid,'שם בדיקה','בדיקה')$q$, :'req_id'))
    like '%not_authorized%');

select pg_temp.act(pg_temp.id('teacher_a1'));
select pg_temp.chk('64 · the group teacher approves',
  public.approve_group_join(:'req_id', 'תלמידה חדשה לבדיקה', 'בדיקה') = pg_temp.id('user_new'));

reset role;
select pg_temp.chk('65 · approval linked a student and granted the role together',
  (select linked_student_id is not null from public.profiles where id = pg_temp.id('user_new'))
  and (select count(*) from public.user_roles where user_id = pg_temp.id('user_new') and role='student') = 1);

select pg_temp.chk('66 · approval added an active group membership',
  (select count(*) from public.learning_group_students lgs
    join public.profiles p on p.linked_student_id = lgs.student_id
   where p.id = pg_temp.id('user_new') and lgs.group_id = pg_temp.id('group_a1')
     and lgs.left_at is null) = 1);

select pg_temp.chk('67 · approval is recorded in the audit trail',
  (select count(*) from public.role_audit
    where action = 'approve_group_join' and target = pg_temp.id('user_new')) >= 1);

-- תלמידה שכבר מקושרת מקבלת שיוך בלבד, בלי students כפול
select pg_temp.act(pg_temp.id('teacher_a1'));
select c.code as code2 from public.create_group_join_code(pg_temp.id('group_a1'), 7) c \gset
select pg_temp.act(pg_temp.id('user_b'));
select public.redeem_group_join_code(:'code2') as req2 \gset
select pg_temp.act(pg_temp.id('teacher_a1'));
select public.approve_group_join(:'req2', null, null);
reset role;
select pg_temp.chk('68 · an already linked student gets only a new membership',
  (select linked_student_id from public.profiles where id = pg_temp.id('user_b')) = pg_temp.id('stud_b')
  and (select count(*) from public.learning_group_students
        where student_id = pg_temp.id('stud_b')) = 2);

-- קוד מבוטל ופג
select pg_temp.act(pg_temp.id('teacher_a1'));
select c.code as code3 from public.create_group_join_code(pg_temp.id('group_a1'), 3) c \gset
select g.id as code3_id from public.group_join_codes g
 where g.code_hash = encode(sha256(convert_to(:'code3','UTF8')),'hex') \gset
select public.revoke_group_join_code(:'code3_id');
select pg_temp.act(pg_temp.id('user_out'));
select pg_temp.chk('69 · a revoked code returns the same uniform null',
  public.redeem_group_join_code(:'code3') is null);

reset role;
-- הזזת הקוד לעבר. גם created_at זז, כי האילוץ דורש expires_at > created_at.
update public.group_join_codes
   set created_at = now() - interval '10 days',
       expires_at = now() - interval '1 day',
       revoked_at = null
 where id = :'code3_id';
select pg_temp.act(pg_temp.id('user_out'));
select pg_temp.chk('70 · an expired code returns the same uniform null',
  public.redeem_group_join_code(:'code3') is null);


-- ═══ 18 · חומר שפורסם נשאר גלוי בזמן החלפה ═══════════════════════════════
-- mat_pdf פורסם עם path_new. מבקשים החלפה: התלמידה חייבת להמשיך לראות את
-- החומר ולקרוא את האובייקט הישן, עד ש-finalize של המחליף מצליח.
select pg_temp.act(pg_temp.id('teacher_a1'));
select public.request_material_replacement(:'mat_pdf') as path_rep2 \gset

select pg_temp.act(pg_temp.id('user_a'));
select pg_temp.chk('77 · published material is still visible during replacement',
  (select count(*) from public.task_materials where id = :'mat_pdf' and state = 'published') = 1);
select pg_temp.chk('78 · the old object is still readable during replacement',
  (select count(*) from storage.objects
    where bucket_id='task-materials' and name = :'path_new') = 1);

-- finalize של המחליף, ואז הנתיב מתחלף אטומית
select pg_temp.act(pg_temp.id('teacher_a1'));
insert into storage.objects (bucket_id, name, owner, metadata)
values ('task-materials', :'path_rep2', pg_temp.id('teacher_a1'),
        jsonb_build_object('size', 4096, 'mimetype', 'application/pdf'));
select pg_temp.chk('79 · finalize keeps a published material published, on the new file',
  public.finalize_task_material(:'mat_pdf', :'path_rep2')::text = 'published');
select pg_temp.chk('80 · the active path swapped to the new object',
  (select storage_path from public.task_materials where id = :'mat_pdf') = :'path_rep2');
select pg_temp.chk('81 · the outgoing version got a full snapshot',
  (select count(*) from public.task_material_revisions
    where material_id = :'mat_pdf' and storage_path = :'path_new') = 1);

-- ═══ 19 · רק הנתיב שהוקצה, בדיוק ═════════════════════════════════════════
select public.request_material_replacement(:'mat_pdf') as path_rep3 \gset
select pg_temp.chk('82 · a different uuid under the same material folder is refused',
  pg_temp.denied(format($q$insert into storage.objects (bucket_id,name,owner,metadata)
    values ('task-materials', %L, pg_temp.id('teacher_a1'), '{}'::jsonb)$q$,
    :'mat_pdf' || '/' || gen_random_uuid()::text)));
with u as (
  insert into storage.objects (bucket_id, name, owner, metadata)
  values ('task-materials', :'path_rep3', pg_temp.id('teacher_a1'),
          jsonb_build_object('size', 1000, 'mimetype', 'application/pdf'))
  returning 1
)
select pg_temp.chk('83 · the exact allocated path is accepted', (select count(*) from u) = 1);
select public.finalize_task_material(:'mat_pdf', :'path_rep3');
select pg_temp.chk('84 · re-uploading to a finalized path is refused',
  pg_temp.denied(format($q$insert into storage.objects (bucket_id,name,owner,metadata)
    values ('task-materials', %L, pg_temp.id('teacher_a1'), '{}'::jsonb)$q$, :'path_rep3')));
select pg_temp.chk('85 · finalize cannot be replayed on a consumed path',
  pg_temp.err(format($q$select public.finalize_task_material(%L::uuid, %L)$q$, :'mat_pdf', :'path_rep3'))
    like '%path_not_allocated%');

-- נתיב שהוקצה לחומר של מורה אחרת
select pg_temp.act(pg_temp.id('teacher_a2'));
select m.material_id as mat_other, m.upload_path as path_other from public.create_task_material(
  pg_temp.id('task_a'), pg_temp.id('group_a2'), 'קובץ של האחרת', null, 'pdf', null) m \gset
select pg_temp.act(pg_temp.id('teacher_a1'));
select pg_temp.chk('86 · a path allocated to another teacher material is refused',
  pg_temp.denied(format($q$insert into storage.objects (bucket_id,name,owner,metadata)
    values ('task-materials', %L, pg_temp.id('teacher_a1'), '{}'::jsonb)$q$, :'path_other')));

-- ═══ 20 · משתמשים מושעים ═════════════════════════════════════════════════
select pg_temp.act(pg_temp.id('user_susp'));
select pg_temp.chk('87 · a suspended student cannot save a draft',
  pg_temp.err($q$select public.save_task_draft(pg_temp.id('task_a'),'{"x":1}'::jsonb,0)$q$)
    like '%account_suspended%');
select pg_temp.chk('88 · a suspended student cannot read drafts',
  pg_temp.denied($q$select * from public.get_task_draft(pg_temp.id('task_a'))$q$));
select pg_temp.chk('89 · a suspended student sees no published materials',
  (select count(*) from public.task_materials) = 0);
select pg_temp.chk('90 · a suspended student cannot submit',
  pg_temp.err($q$select public.submit_task(pg_temp.id('task_a'),'{"a":1}'::jsonb,'idem-susp')$q$)
    like '%account_suspended%');

select pg_temp.act(pg_temp.id('teacher_susp'));
select pg_temp.chk('91 · a suspended teacher is not an active group teacher',
  not public.app_is_active_group_teacher(pg_temp.id('group_a1')));
select pg_temp.chk('92 · a suspended teacher cannot create material',
  pg_temp.err($q$select * from public.create_task_material(pg_temp.id('task_a'),
    pg_temp.id('group_a1'),'x',null,'link','https://example.org/s')$q$) like '%not_authorized%');
select pg_temp.act(pg_temp.id('user_susp'));
select pg_temp.chk('92a · a suspended account gets the uniform null on redeem',
  public.redeem_group_join_code('ANYCODEATALL2') is null);
select pg_temp.act(pg_temp.id('teacher_susp'));
select pg_temp.chk('93 · a suspended teacher cannot issue a class code',
  pg_temp.err($q$select * from public.create_group_join_code(pg_temp.id('group_a1'),7)$q$)
    like '%not_authorized%');

-- ═══ 21 · rate limit על מימוש קוד ════════════════════════════════════════
-- את הקוד לקבוצה a2 מייצרת המורה שלה
select pg_temp.act(pg_temp.id('teacher_a2'));
select c.code as rl_code from public.create_group_join_code(pg_temp.id('group_a2'), 7) c \gset
select pg_temp.act(pg_temp.id('user_out'));
-- אחד עשר ניסיונות שגויים ממלאים את החלון, וכולם נרשמים
select count(*) from (
  select public.redeem_group_join_code('WRONGCODE' || g) from generate_series(1, 11) g) x;
reset role;
select pg_temp.chk('94a · failed attempts persist in the rate log',
  (select count(*) from public.join_code_attempts
    where user_id = pg_temp.id('user_out')) >= 11);
select pg_temp.act(pg_temp.id('user_out'));
select pg_temp.chk('94 · after the window fills, even the correct code gets the uniform null',
  public.redeem_group_join_code(:'rl_code') is null);

-- ═══ 22 · approve בלי profile · rollback מלא ═════════════════════════════
select pg_temp.act(pg_temp.id('teacher_a1'));
select c.code as np_code from public.create_group_join_code(pg_temp.id('group_a1'), 7) c \gset
-- טריגר הפלטפורמה יוצר שורת profile לכל משתמש חדש. מוחקים אותה במכוון
-- כדי לדמות את המצב השבור שהשומר מגן מפניו.
reset role;
delete from public.profiles where id = pg_temp.id('user_noprofile');
select pg_temp.act(pg_temp.id('user_noprofile'));
select public.redeem_group_join_code(:'np_code') as np_req \gset
select pg_temp.act(pg_temp.id('teacher_a1'));
select pg_temp.chk('95 · approving an account with no profile row fails',
  pg_temp.err(format($q$select public.approve_group_join(%L::uuid,'שם לבדיקה','ט')$q$, :'np_req'))
    like '%profile_missing%');
reset role;
select pg_temp.chk('96 · the failed approval left no role behind',
  (select count(*) from public.user_roles
    where user_id = pg_temp.id('user_noprofile')) = 0);
select pg_temp.chk('97 · the failed approval left no orphan student or membership',
  (select count(*) from public.students st
    where st.full_name = 'שם לבדיקה') = 0
  and (select count(*) from public.role_audit
    where target = pg_temp.id('user_noprofile') and action = 'approve_group_join') = 0);
select pg_temp.chk('98 · the request is still pending, not half-approved',
  (select status::text from public.access_requests where id = :'np_req') = 'pending');

-- ═══ 23 · שומר ההגשה ═════════════════════════════════════════════════════
reset role;
update public.learning_tasks set submission_enabled = false where id = pg_temp.id('task_a2');
select pg_temp.act(pg_temp.id('user_a2'));
select pg_temp.chk('99 · a content target refuses submit',
  pg_temp.err($q$select public.submit_task(pg_temp.id('task_a2'),'{"a":1}'::jsonb,'idem-content')$q$)
    like '%submission_not_enabled%');
select pg_temp.chk('100 · a content target still allows drafts',
  public.save_task_draft(pg_temp.id('task_a2'), '{"a":"work"}'::jsonb, 0) = 1);

-- יעד הגשה בהיקף: עובד (זה גם מסלול ספרות 30: default true + תלמידה רשומה)
select pg_temp.chk('101 · an enabled target in scope accepts submit (literature-30 path)',
  (select public.submit_task(pg_temp.id('task_a2p'),'{"a":"ok"}'::jsonb,'idem-lit30') is not null));

-- מחוץ להיקף
select pg_temp.act(pg_temp.id('user_out'));
select pg_temp.chk('102 · submit outside an active scope is refused',
  pg_temp.err($q$select public.submit_task(pg_temp.id('task_a'),'{"a":1}'::jsonb,'idem-oos')$q$)
    like '%not_in_scope%');

-- ═══ 24 · הקשחה ═════════════════════════════════════════════════════════
reset role;
select pg_temp.chk('71 · every new function is security definer with a locked search_path',
  (select count(*) from pg_proc
    where proname in ('save_task_draft','get_task_draft','app_student_in_task_scope',
                      'app_draft_block_reason','create_task_material','update_task_material_meta',
                      'move_task_material','request_material_replacement','finalize_task_material',
                      'set_material_state','app_can_manage_group_materials','app_student_sees_material',
                      'create_group_join_code','revoke_group_join_code','redeem_group_join_code',
                      'approve_group_join','app_is_active_group_teacher','app_actor_not_suspended')
      and prosecdef and 'search_path=""' = any(proconfig)) = 18);

select pg_temp.chk('72 · RLS is on for every new table',
  (select count(*) from pg_tables
    where tablename in ('task_drafts','task_materials','task_material_revisions',
                        'group_join_codes','access_request_groups','join_code_attempts')
      and rowsecurity) = 6);

select pg_temp.chk('73 · authenticated has no direct write grant on the new tables',
  (select count(*) from information_schema.role_table_grants
    where table_name in ('task_drafts','task_materials','task_material_revisions',
                         'group_join_codes','access_request_groups','join_code_attempts')
      and grantee='authenticated' and privilege_type in ('INSERT','UPDATE','DELETE')) = 0);

select pg_temp.chk('74 · no superseded save_task_draft signature is still callable',
  (select count(*) from pg_proc where proname='save_task_draft') = 1);

select pg_temp.chk('75 · no superseded upsert_task_material remains',
  (select count(*) from pg_proc where proname='upsert_task_material') = 0);

select pg_temp.chk('76 · there is no client update or delete policy on the bucket objects',
  (select count(*) from pg_policies
    where schemaname='storage' and tablename='objects'
      and cmd in ('UPDATE','DELETE') and policyname like 'tm_%') = 0);

rollback;
