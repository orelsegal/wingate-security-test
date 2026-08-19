-- ═══════════════════════════════════════════════════════════════════════════
-- LIVE-QA FINAL SETUP · סקריפט אטומי אחד · פרויקט flfemffhswlpgpbvhuvy
--
-- 1. מאמת שלחשבון הבדיקה יש linked_student_id (עצירה אם לא).
-- 2. יוצר קבוצת ספרות פעילה "ספרות 30% · פיילוט QA" רק אם אין קבוצת
--    ספרות פעילה כלל.
-- 3. משייך את תלמידת הבדיקה לקבוצה אם אין שיוך פעיל.
-- 4. מוסיף teacher ל-orelman@gmail.com בתוספת בלבד. שום תפקיד אינו מוסר,
--    ויש assertion שמוכיח שקבוצת התפקידים לפני מוכלת בזו שאחרי.
-- 5. משייך את orelman כמורת הקבוצה אם אין שיוך פעיל.
-- 6. audit: פעולת התפקיד ב-role_audit; פעולות הקבוצה ב-lg_log של תחום
--    הקבוצות. idempotent דרך בדיקות קיום (left_at is null), עם האינדקסים
--    uq_lgs_active / uq_lgt_active / user_roles_user_id_role_key כרשת
--    ביטחון. כל ה-assertions רצים בתוך הטרנזקציה לפני COMMIT: כל כשל
--    מגלגל הכול לאחור.
-- 7. בסוף טבלת סיום אחת שבה כל הבדיקות חייבות להיות true.
-- 8. אין UNDO מודפס, אין backfill, אין AI.
--
-- מייל תלמידת הבדיקה מופיע פעמיים (בבלוק ובטבלת הסיום): "החלף הכל" על
-- FILL-TEST-EMAIL-HERE בטוח.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

do $do$
declare
  v_email   constant text := lower('FILL-TEST-EMAIL-HERE');
  v_subject constant uuid := 'c42ab83c-1b60-409f-b30e-f23d56174ed4'; -- ספרות, המזהה שאושר
  v_gname   constant text := 'ספרות 30% · פיילוט QA';
  v_test    uuid; v_student uuid; v_orel uuid; v_group uuid;
  v_n int; v_roles_before text[];
begin
  -- ── אימותי קדם ────────────────────────────────────────────────────────
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'PRE-CHECK · יש למלא בראש הבלוק מייל תקין של תלמידת הבדיקה.';
  end if;
  if not exists (select 1 from public.subjects
                 where id = v_subject and subject_name like '%ספרות%') then
    raise exception 'PRE-CHECK · מזהה מקצוע הספרות אינו תואם. עצירה.';
  end if;

  select count(*), (array_agg(u.id))[1] into v_n, v_test
  from auth.users u where lower(u.email) = v_email;
  if v_n <> 1 then
    raise exception 'PRE-CHECK · % זהויות auth למייל הבדיקה (נדרש בדיוק 1).', v_n;
  end if;

  -- 1 · הקישור חייב להתקיים
  select p.linked_student_id into v_student from public.profiles p where p.id = v_test;
  if v_student is null or not exists (select 1 from public.students where id = v_student) then
    raise exception 'PRE-CHECK · לחשבון הבדיקה אין linked_student_id תקין. עצירה בלי שינוי.';
  end if;

  select count(*), (array_agg(u.id))[1] into v_n, v_orel
  from auth.users u
  where lower(u.email) = lower('orelman@gmail.com') and u.email_confirmed_at is not null;
  if v_n <> 1 then
    raise exception 'PRE-CHECK · % זהויות מאומתות ל-orelman@gmail.com (נדרש בדיוק 1).', v_n;
  end if;
  if not exists (select 1 from public.user_roles
                 where user_id = v_orel and role::text = 'super_admin') then
    raise exception 'PRE-CHECK · super_admin חסרה לזהות הזאת. עצירה: כנראה זו לא הזהות הנכונה.';
  end if;
  select coalesce(array_agg(role::text order by role::text), '{}')
    into v_roles_before from public.user_roles where user_id = v_orel;

  -- 2 · קבוצת ספרות פעילה: שימוש בקיימת, יצירה רק אם אין אף אחת
  select count(*), (array_agg(g.id))[1] into v_n, v_group
  from public.learning_groups g
  where g.subject_id = v_subject and g.status = 'active';
  if v_n > 1 then
    raise exception 'PRE-CHECK · % קבוצות ספרות פעילות. יש לבחור מפורשות ולעדכן את הסקריפט.', v_n;
  elsif v_n = 0 then
    insert into public.learning_groups (name, subject_id, academic_year_start, status)
    values (v_gname, v_subject, 2026, 'active')
    returning id into v_group;
    perform public.lg_log(v_group, 'group_created', 'group', v_group,
                          null, jsonb_build_object('name', v_gname, 'via', 'owner_sql_live_qa'));
  end if;

  -- 3 · שיוך תלמידת הבדיקה, אם אין שיוך פעיל
  if not exists (select 1 from public.learning_group_students
                 where group_id = v_group and student_id = v_student and left_at is null) then
    insert into public.learning_group_students (group_id, student_id)
    values (v_group, v_student);
    perform public.lg_log(v_group, 'student_added', 'student', v_student,
                          null, jsonb_build_object('via', 'owner_sql_live_qa'));
  end if;

  -- 4 · teacher לאורל, בתוספת בלבד, עם audit תפקידים
  if not exists (select 1 from public.user_roles
                 where user_id = v_orel and role::text = 'teacher') then
    insert into public.user_roles (user_id, role) values (v_orel, 'teacher');
    insert into public.role_audit (actor, target, action, before, after)
    values (v_orel, v_orel, 'role_granted',
            to_jsonb(v_roles_before),
            (select to_jsonb(array_agg(role::text order by role::text))
             from public.user_roles where user_id = v_orel));
  end if;

  -- 5 · אורל כמורת הקבוצה, אם אין שיוך פעיל
  if not exists (select 1 from public.learning_group_teachers
                 where group_id = v_group and teacher_user_id = v_orel and left_at is null) then
    insert into public.learning_group_teachers (group_id, teacher_user_id)
    values (v_group, v_orel);
    perform public.lg_log(v_group, 'teacher_added', 'teacher', v_orel,
                          null, jsonb_build_object('via', 'owner_sql_live_qa'));
  end if;

  -- 6 · assertions לפני COMMIT: כל כשל מגלגל הכול לאחור ──────────────────
  if not exists (select 1 from public.learning_groups
                 where id = v_group and subject_id = v_subject and status = 'active') then
    raise exception 'ASSERT · אין קבוצת ספרות פעילה. הכול גולגל לאחור.';
  end if;
  if not exists (select 1 from public.learning_group_students
                 where group_id = v_group and student_id = v_student and left_at is null) then
    raise exception 'ASSERT · תלמידת הבדיקה אינה משויכת. הכול גולגל לאחור.';
  end if;
  if not exists (select 1 from public.user_roles
                 where user_id = v_orel and role::text = 'teacher') then
    raise exception 'ASSERT · תפקיד teacher חסר. הכול גולגל לאחור.';
  end if;
  -- שום תפקיד קודם לא הוסר
  if exists (select 1 from unnest(v_roles_before) rb(r)
             where not exists (select 1 from public.user_roles
                               where user_id = v_orel and role::text = rb.r)) then
    raise exception 'ASSERT · תפקיד קיים נעלם. הכול גולגל לאחור.';
  end if;
  if not exists (select 1 from public.learning_group_teachers
                 where group_id = v_group and teacher_user_id = v_orel and left_at is null) then
    raise exception 'ASSERT · אורל אינה מורת הקבוצה. הכול גולגל לאחור.';
  end if;

  raise notice 'FINAL SETUP OK · group=% student=% orel=%', v_group, v_student, v_orel;
end $do$;

-- 7 · טבלת הסיום: כל השורות חייבות להיות true ─────────────────────────────
with qa_p as (select lower('FILL-TEST-EMAIL-HERE') as em)
select 1 as סדר, 'לחשבון הבדיקה יש linked_student_id' as בדיקה,
  exists (select 1 from auth.users u join public.profiles p on p.id = u.id
          where lower(u.email) = (select em from qa_p)
            and p.linked_student_id is not null) as תקין
union all
select 2, 'קיימת קבוצת ספרות פעילה אחת בדיוק',
  (select count(*) from public.learning_groups
   where subject_id = 'c42ab83c-1b60-409f-b30e-f23d56174ed4' and status = 'active') = 1
union all
select 3, 'תלמידת הבדיקה משויכת לקבוצה (פעיל)',
  exists (select 1 from auth.users u
          join public.profiles p on p.id = u.id
          join public.learning_group_students gs
            on gs.student_id = p.linked_student_id and gs.left_at is null
          join public.learning_groups g on g.id = gs.group_id
          where lower(u.email) = (select em from qa_p)
            and g.subject_id = 'c42ab83c-1b60-409f-b30e-f23d56174ed4')
union all
select 4, 'ל-orelman יש teacher וגם super_admin (ו-admin לא נגרע)',
  (select count(distinct r.role) from public.user_roles r
   join auth.users u on u.id = r.user_id
   where lower(u.email) = lower('orelman@gmail.com')
     and r.role::text in ('teacher','super_admin')) = 2
union all
select 5, 'orelman מורת קבוצת הספרות (פעיל)',
  exists (select 1 from auth.users u
          join public.learning_group_teachers gt
            on gt.teacher_user_id = u.id and gt.left_at is null
          join public.learning_groups g on g.id = gt.group_id
          where lower(u.email) = lower('orelman@gmail.com')
            and g.subject_id = 'c42ab83c-1b60-409f-b30e-f23d56174ed4')
order by סדר;

commit;
