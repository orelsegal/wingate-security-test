-- ═══════════════════════════════════════════════════════════════════════════
-- LIVE-QA PRECHECK · SELECT בלבד · פרויקט flfemffhswlpgpbvhuvy
-- אין DDL, אין טבלאות זמניות, אין כתיבה מכל סוג.
-- מייל תלמידת הבדיקה מופיע פעמיים (שאילתות 1 ו-2): "החלף הכל" על
-- FILL-TEST-EMAIL-HERE בטוח ועובד.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1 · תלמידת הבדיקה: זהות, קישור, שורת students
with qa_p as (select lower('FILL-TEST-EMAIL-HERE') as em)
select
  left(u.email, 4) || '…'                          as מייל,
  u.email_confirmed_at is not null                  as מאומתת,
  p.linked_student_id is not null                   as יש_קישור,
  s.full_name                                       as שם_התלמידה,
  s.class_name                                      as כיתה
from qa_p, auth.users u
left join public.profiles p on p.id = u.id
left join public.students s on s.id = p.linked_student_id
where lower(u.email) = (select em from qa_p);

-- 2 · שיוכי הקבוצות הפעילים של תלמידת הבדיקה (צפוי: 0 שורות אם חסר השיוך)
with qa_p as (select lower('FILL-TEST-EMAIL-HERE') as em)
select g.name as קבוצה, sub.subject_name as מקצוע, gs.left_at is null as פעיל
from qa_p, auth.users u
join public.profiles p on p.id = u.id
join public.learning_group_students gs on gs.student_id = p.linked_student_id
join public.learning_groups g on g.id = gs.group_id
join public.subjects sub on sub.id = g.subject_id
where lower(u.email) = (select em from qa_p);

-- 3 · קבוצות במקצוע ספרות (המזהה הקנוני שאושר)
select g.id, g.name, g.status,
  (select count(*) from public.learning_group_students
    where group_id = g.id and left_at is null) as תלמידות_פעילות,
  (select count(*) from public.learning_group_teachers
    where group_id = g.id and left_at is null) as מורות_פעילות
from public.learning_groups g
where g.subject_id = 'c42ab83c-1b60-409f-b30e-f23d56174ed4';

-- 4 · התפקידים של orelman@gmail.com
select r.role::text as תפקיד
from auth.users u join public.user_roles r on r.user_id = u.id
where lower(u.email) = lower('orelman@gmail.com')
order by 1;

-- 5 · הקבוצות ש-orelman משויכת אליהן כמורה
select g.name as קבוצה_שאני_מורה_בה, gt.role_in_group, gt.left_at is null as פעיל
from auth.users u
join public.learning_group_teachers gt on gt.teacher_user_id = u.id
join public.learning_groups g on g.id = gt.group_id
where lower(u.email) = lower('orelman@gmail.com');
