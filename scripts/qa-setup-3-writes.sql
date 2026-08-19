-- ═══════════════════════════════════════════════════════════════════════════
-- LIVE-QA SETUP · שלושה שינויים לוגיים · פרויקט flfemffhswlpgpbvhuvy
--
--   1. שיוך תלמידת הבדיקה לקבוצת הספרות הפעילה.
--   2. תפקיד teacher ל-orelman@gmail.com (בלי לגעת ב-super_admin).
--   3. שיוך orelman@gmail.com כמורת הקבוצה (role_in_group ברירת מחדל 'teacher').
--
-- בפועל עד חמש פעולות INSERT: שלוש הרשומות + עד שתי שורות role_audit
-- לשתי פעולות התפקיד. שום UPDATE ושום DELETE.
--
-- בטיחות:
--   · טרנזקציה אחת. כל המזהים נשלפים לפי מייל ולפי מזהה מקצוע הספרות
--     שאושר, עם עצירה על 0 או יותר מהתאמה אחת. אף UUID אינו מומצא.
--   · אם אין קבוצת ספרות פעילה, הסקריפט עוצר. יצירת קבוצה היא החלטה
--     נפרדת שתתקבל אחרי פלט ה-precheck, בקובץ נפרד.
--   · idempotent דרך בדיקות קיום מפורשות (לא ON CONFLICT: לטבלאות
--     הקבוצות אין unique constraint על הצמד, רק אינדקסים חלקיים).
--     גיבוי ברמת הסכימה, שמות מאומתים מהסכימה:
--       learning_group_students · אינדקס ייחודי חלקי uq_lgs_active
--         על (group_id, student_id) where left_at is null
--       learning_group_teachers · uq_lgt_active
--         על (group_id, teacher_user_id) where left_at is null
--       user_roles · constraint ייחודי user_roles_user_id_role_key
--         על (user_id, role)
--   · שער אימות בתוך הטרנזקציה: שלוש העובדות נבדקות לפני ה-COMMIT,
--     וכל כשל מרים exception שמגלגל לאחור את הכול. ה-SELECT שבסוף
--     הוא תצוגה בלבד.
--   · ביטול: בסוף ההרצה מודפסות שורות UNDO רק עבור רשומות שהסקריפט
--     הזה יצר בפועל בהרצה הזאת. מה שהיה קיים קודם אינו מקבל שורת
--     ביטול ואין למחוק אותו.
--
-- מייל תלמידת הבדיקה מופיע פעמיים (בבלוק ובתצוגה): "החלף הכל" על
-- FILL-TEST-EMAIL-HERE בטוח; בדיקת המילוי היא תבנית מייל ואינה תלויה
-- ב-placeholder.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

do $do$
declare
  v_email   constant text := lower('FILL-TEST-EMAIL-HERE');
  v_subject constant uuid := 'c42ab83c-1b60-409f-b30e-f23d56174ed4'; -- ספרות, המזהה שאושר
  v_test    uuid;   -- auth user של תלמידת הבדיקה
  v_student uuid;   -- שורת students המקושרת
  v_orel    uuid;   -- auth user של orelman@gmail.com
  v_group   uuid;   -- קבוצת הספרות
  v_n       int;
  v_made_membership boolean := false;
  v_made_role       boolean := false;
  v_made_scope      boolean := false;
begin
  -- ── אימותי קדם: הכול חד-משמעי או שעוצרים בלי שום שינוי ────────────────
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
    raise exception 'PRE-CHECK · אין קבוצת ספרות פעילה. עצירה. יצירת קבוצה תוכרע בנפרד אחרי פלט ה-precheck.';
  elsif v_n > 1 then
    raise exception 'PRE-CHECK · % קבוצות ספרות פעילות. יש לבחור מזהה קבוצה מפורשות ולעדכן את הסקריפט.', v_n;
  end if;

  -- ── שינוי 1 · שיוך תלמידת הבדיקה לקבוצה ───────────────────────────────
  if not exists (select 1 from public.learning_group_students
                 where group_id = v_group and student_id = v_student
                   and left_at is null) then
    insert into public.learning_group_students (group_id, student_id)
    values (v_group, v_student);
    v_made_membership := true;
  end if;

  -- ── שינוי 2 · תפקיד teacher לאורל, בתוספת בלבד ────────────────────────
  -- (הענקה עצמית חסומה ב-RPC במכוון; זו פעולת בעלים מפורשת, ולכן היא
  --  נרשמת ידנית באותו יומן שכל הענקה נרשמת בו)
  if not exists (select 1 from public.user_roles
                 where user_id = v_orel and role::text = 'teacher') then
    insert into public.user_roles (user_id, role) values (v_orel, 'teacher');
    insert into public.role_audit (actor, target, action, before, after)
    values (v_orel, v_orel, 'role_granted', null,
            jsonb_build_object('role', 'teacher', 'via', 'owner_sql_live_qa'));
    v_made_role := true;
  end if;

  -- ── שינוי 3 · אורל כמורת הקבוצה ───────────────────────────────────────
  if not exists (select 1 from public.learning_group_teachers
                 where group_id = v_group and teacher_user_id = v_orel
                   and left_at is null) then
    insert into public.learning_group_teachers (group_id, teacher_user_id)
    values (v_group, v_orel);
    insert into public.role_audit (actor, target, action, before, after)
    values (v_orel, v_orel, 'teacher_group_assigned', null,
            jsonb_build_object('group_id', v_group, 'via', 'owner_sql_live_qa'));
    v_made_scope := true;
  end if;

  -- ── שער אימות: שלוש העובדות, בתוך הטרנזקציה, לפני COMMIT ──────────────
  if not exists (select 1 from public.learning_group_students
                 where group_id = v_group and student_id = v_student
                   and left_at is null) then
    raise exception 'ASSERT FAILED · תלמידת הבדיקה אינה בקבוצה. הכול גולגל לאחור.';
  end if;
  if not exists (select 1 from public.user_roles
                 where user_id = v_orel and role::text = 'teacher')
     or not exists (select 1 from public.user_roles
                 where user_id = v_orel and role::text = 'super_admin') then
    raise exception 'ASSERT FAILED · חסר teacher או super_admin לאורל. הכול גולגל לאחור.';
  end if;
  if not exists (select 1 from public.learning_group_teachers
                 where group_id = v_group and teacher_user_id = v_orel
                   and left_at is null) then
    raise exception 'ASSERT FAILED · אורל אינה מורת הקבוצה. הכול גולגל לאחור.';
  end if;

  -- ── ביטול מדויק: רק מה שנוצר בהרצה הזאת ───────────────────────────────
  raise notice 'SETUP OK · group=% student=% orel=%', v_group, v_student, v_orel;
  if v_made_membership then
    raise notice 'UNDO · delete from public.learning_group_students where group_id=''%'' and student_id=''%'';', v_group, v_student;
  else
    raise notice 'UNDO · שיוך התלמידה היה קיים קודם, אין שורת ביטול.';
  end if;
  if v_made_role then
    raise notice 'UNDO · delete from public.user_roles where user_id=''%'' and role=''teacher'';', v_orel;
  else
    raise notice 'UNDO · תפקיד teacher היה קיים קודם, אין שורת ביטול.';
  end if;
  if v_made_scope then
    raise notice 'UNDO · delete from public.learning_group_teachers where group_id=''%'' and teacher_user_id=''%'';', v_group, v_orel;
  else
    raise notice 'UNDO · שיוך המורה היה קיים קודם, אין שורת ביטול.';
  end if;
end $do$;

-- ── תצוגה בלבד (השער האמיתי כבר נאכף למעלה, בתוך הטרנזקציה) ──────────────
with qa_p as (select lower('FILL-TEST-EMAIL-HERE') as em)
select 'תלמידת הבדיקה בקבוצת ספרות פעילה' as בדיקה,
  exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    join public.learning_group_students gs
      on gs.student_id = p.linked_student_id and gs.left_at is null
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
    join public.learning_group_teachers gt
      on gt.teacher_user_id = u.id and gt.left_at is null
    join public.learning_groups g on g.id = gt.group_id
    where lower(u.email) = lower('orelman@gmail.com')
      and g.subject_id = 'c42ab83c-1b60-409f-b30e-f23d56174ed4'
  );

commit;
