-- ═══════════════════════════════════════════════════════════════════════════
-- LIVE-QA SETUP · שלוש הכתיבות המינימליות · פרויקט flfemffhswlpgpbvhuvy
--
-- מה הסקריפט עושה, ורק את זה:
--   1. משייך את תלמידת הבדיקה לקבוצת הספרות.
--   2. מוסיף תפקיד teacher ל-orelman@gmail.com (בלי לגעת ב-super_admin).
--   3. משייך את orelman@gmail.com כמורת הקבוצה.
--
-- בטיחות: טרנזקציה אחת; כל המזהים נשלפים לפי מייל/מקצוע ונבדקים לחד-
-- משמעיות (0 או יותר מ-1 התאמות = עצירה בלי שום שינוי); בטוח להרצה
-- כפולה; לא נוגע באף משתמש אחר; שתי פעולות התפקיד נרשמות ב-role_audit;
-- ובסוף שאילתת אימות שמדפיסה את שלוש העובדות.
--
-- ROLLBACK מדויק (אם תרצי לבטל אחרי הרצה):
--   delete from learning_group_students where group_id=<gid> and student_id=<sid>;
--   delete from user_roles where user_id=<orel_uid> and role='teacher';
--   delete from learning_group_teachers where group_id=<gid> and teacher_user_id=<orel_uid>;
--   (המזהים מודפסים באימות שבסוף ההרצה)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── כאן ממלאים: המייל של תלמידת הבדיקה (פעם אחת, כאן בלבד) ──
drop table if exists qa_p;
create temp table qa_p as select lower('FILL-TEST-EMAIL-HERE') as em;

begin;

do $do$
declare
  v_subject constant uuid := 'c42ab83c-1b60-409f-b30e-f23d56174ed4'; -- ספרות, המזהה שאושר
  v_test    uuid;   -- auth user של תלמידת הבדיקה
  v_student uuid;   -- שורת students המקושרת
  v_orel    uuid;   -- auth user של orelman@gmail.com
  v_group   uuid;   -- קבוצת הספרות
  v_n       int;
begin
  -- ── אימותי קדם: הכול חד-משמעי או שעוצרים ──────────────────────────────
  if not exists (select 1 from public.subjects
                 where id = v_subject and subject_name like '%ספרות%') then
    raise exception 'PRE-CHECK · מזהה מקצוע הספרות אינו תואם. עצירה.';
  end if;

  if (select em from qa_p) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'PRE-CHECK · יש למלא בראש הקובץ מייל תקין של תלמידת הבדיקה.';
  end if;
  select count(*), (array_agg(u.id))[1] into v_n, v_test
  from auth.users u where lower(u.email) = (select em from qa_p);
  if v_n <> 1 then
    raise exception 'PRE-CHECK · % זהויות auth למייל הבדיקה (נדרש בדיוק 1).', v_n;
  end if;

  select p.linked_student_id into v_student
  from public.profiles p where p.id = v_test;
  if v_student is null then
    raise exception 'PRE-CHECK · לתלמידת הבדיקה אין linked_student_id. יש לאשר אותה קודם במסך ניהול הגישה.';
  end if;
  if not exists (select 1 from public.students s where s.id = v_student) then
    raise exception 'PRE-CHECK · linked_student_id מצביע על שורת students שאינה קיימת.';
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

  select count(*), (array_agg(g.id))[1] into v_n, v_group
  from public.learning_groups g
  where g.subject_id = v_subject and g.status = 'active';
  if v_n = 0 then
    raise exception 'PRE-CHECK · אין קבוצת ספרות פעילה. יש ליצור קבוצה קודם (משפט אופציונלי בתחתית הקובץ), ואז להריץ שוב.';
  elsif v_n > 1 then
    raise exception 'PRE-CHECK · % קבוצות ספרות פעילות. יש לבחור מזהה קבוצה מפורשות ולעדכן את הסקריפט.', v_n;
  end if;

  -- ── הכתיבה 1 · שיוך תלמידת הבדיקה לקבוצה ──────────────────────────────
  insert into public.learning_group_students (group_id, student_id)
  values (v_group, v_student)
  on conflict do nothing;

  -- ── הכתיבה 2 · תפקיד teacher לאורל, בתוספת בלבד ──────────────────────
  -- (הענקה עצמית חסומה ב-RPC במכוון; זו פעולת בעלים מפורשת, ולכן היא
  --  נרשמת ידנית באותו יומן שכל הענקה נרשמת בו)
  if not exists (select 1 from public.user_roles
                 where user_id = v_orel and role::text = 'teacher') then
    insert into public.user_roles (user_id, role) values (v_orel, 'teacher');
    insert into public.role_audit (actor, target, action, before, after)
    values (v_orel, v_orel, 'role_granted', null,
            jsonb_build_object('role', 'teacher', 'via', 'owner_sql_live_qa'));
  end if;

  -- ── הכתיבה 3 · אורל כמורת הקבוצה ─────────────────────────────────────
  if not exists (select 1 from public.learning_group_teachers
                 where group_id = v_group and teacher_user_id = v_orel) then
    insert into public.learning_group_teachers (group_id, teacher_user_id)
    values (v_group, v_orel);
    insert into public.role_audit (actor, target, action, before, after)
    values (v_orel, v_orel, 'teacher_group_assigned', null,
            jsonb_build_object('group_id', v_group, 'via', 'owner_sql_live_qa'));
  end if;

  raise notice 'SETUP DONE · group=% student=% orel=%', v_group, v_student, v_orel;
end $do$;

-- ── אימות אחרי הפעולה: שלוש שורות, שלושתן חייבות להיות true ───────────────
select 'תלמידת הבדיקה בקבוצת ספרות' as בדיקה,
  exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    join public.learning_group_students gs on gs.student_id = p.linked_student_id
    join public.learning_groups g on g.id = gs.group_id
    where lower(u.email) = (select em from qa_p)
      and g.subject_id = 'c42ab83c-1b60-409f-b30e-f23d56174ed4'
  ) as תקין
union all
select 'ל-orelman יש teacher וגם super_admin',
  (select count(distinct r.role) from public.user_roles r
   join auth.users u on u.id = r.user_id
   where lower(u.email) = lower('orelman@gmail.com')
     and r.role::text in ('teacher','super_admin')) = 2
union all
select 'orelman מורת קבוצת הספרות',
  exists (
    select 1 from auth.users u
    join public.learning_group_teachers gt on gt.teacher_user_id = u.id
    join public.learning_groups g on g.id = gt.group_id
    where lower(u.email) = lower('orelman@gmail.com')
      and g.subject_id = 'c42ab83c-1b60-409f-b30e-f23d56174ed4'
  );

commit;
drop table if exists qa_p;

-- ═══════════════════════════════════════════════════════════════════════════
-- אופציונלי, רק אם ה-PRE-CHECK עצר על "אין קבוצת ספרות פעילה":
-- להסיר את ההערה, להריץ פעם אחת, ואז להריץ את הסקריפט הראשי שוב.
--
-- insert into public.learning_groups (name, subject_id, academic_year_start, status)
-- select 'ספרות 30% · פיילוט', 'c42ab83c-1b60-409f-b30e-f23d56174ed4', 2026, 'active'
-- where not exists (select 1 from public.learning_groups
--                   where subject_id = 'c42ab83c-1b60-409f-b30e-f23d56174ed4' and status = 'active');
-- ═══════════════════════════════════════════════════════════════════════════
