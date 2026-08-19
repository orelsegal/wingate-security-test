-- ═══════════════════════════════════════════════════════════════════════════
-- LIVE-QA PRECHECK · קריאה בלבד · פרויקט flfemffhswlpgpbvhuvy
-- ממלאים את מייל תלמידת הבדיקה בשורה אחת למטה ומריצים. לא כותב דבר.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── כאן ממלאים: המייל של תלמידת הבדיקה ──
drop table if exists qa_p;
create temp table qa_p as select lower('FILL-TEST-EMAIL-HERE') as em;

-- 1 · תלמידת הבדיקה: זהות, קישור, שורת students
select
  left(u.email, 4) || '…'                          as מייל,
  u.email_confirmed_at is not null                  as מאומתת,
  p.linked_student_id is not null                   as יש_קישור,
  s.full_name                                       as שם_התלמידה,
  s.class_name                                      as כיתה
from auth.users u
left join public.profiles p on p.id = u.id
left join public.students s on s.id = p.linked_student_id
where lower(u.email) = (select em from qa_p);

-- 2 · שיוכי הקבוצות של תלמידת הבדיקה (צפוי: 0 שורות אם חסר השיוך)
select g.name as קבוצה, sub.subject_name as מקצוע
from auth.users u
join public.profiles p on p.id = u.id
join public.learning_group_students gs on gs.student_id = p.linked_student_id
join public.learning_groups g on g.id = gs.group_id
join public.subjects sub on sub.id = g.subject_id
where lower(u.email) = (select em from qa_p);

-- 3 · קבוצות במקצוע ספרות (המזהה הקנוני שאושר)
select g.id, g.name, g.status,
  (select count(*) from public.learning_group_students where group_id = g.id) as תלמידות,
  (select count(*) from public.learning_group_teachers where group_id = g.id) as מורות
from public.learning_groups g
where g.subject_id = 'c42ab83c-1b60-409f-b30e-f23d56174ed4';

-- 4 · התפקידים והשיוכים של orelman@gmail.com
select r.role::text as תפקיד
from auth.users u join public.user_roles r on r.user_id = u.id
where lower(u.email) = lower('orelman@gmail.com')
order by 1;

select g.name as קבוצה_שאני_מורה_בה
from auth.users u
join public.learning_group_teachers gt on gt.teacher_user_id = u.id
join public.learning_groups g on g.id = gt.group_id
where lower(u.email) = lower('orelman@gmail.com');

drop table if exists qa_p;
