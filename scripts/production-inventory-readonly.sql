-- ═══════════════════════════════════════════════════════════════════════════
-- INVENTORY · קריאה בלבד · פרויקט flfemffhswlpgpbvhuvy
--
-- מריצים ב-SQL Editor לפני יצירת משתמשים אמיתיים. לא כותב דבר.
-- מיילים מוצגים מוסווים (3 תווים ראשונים + דומיין) — לא כתובות מלאות.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1 · זהויות auth: כמה, אילו ספקים, כמה מאומתות
select 'auth users' as מדד, count(*)::text as ערך from auth.users
union all
select 'מאומתי מייל', count(*)::text from auth.users where email_confirmed_at is not null
union all
select 'ספקים בשימוש',
       coalesce(string_agg(distinct i.provider, ', '), 'אין') from auth.identities i;

-- 2 · תפקידים קיימים — ספירה לפי תפקיד, בלי מיילים
select role::text as תפקיד, count(*) as כמות
from public.user_roles group by role order by 2 desc;

-- 3 · פרופילים ושיוכים
select 'profiles' as מדד, count(*)::text as ערך from public.profiles
union all
select 'מקושרים לתלמידה (linked_student_id)', count(*)::text
  from public.profiles where linked_student_id is not null
union all
select 'students', count(*)::text from public.students
union all
select 'קבוצות למידה (learning_groups)', count(*)::text from public.learning_groups
union all
select 'שיוכי מורה-קבוצה', count(*)::text from public.learning_group_teachers
union all
select 'שיוכי תלמידה-קבוצה', count(*)::text from public.learning_group_students;

-- 4 · המצב סביב משימת הפיילוט
select 'משימת literature-30/station-5' as מדד,
       case when exists (select 1 from public.learning_tasks
                         where external_app='literature-30' and external_key='station-5' and active)
            then 'קיימת ופעילה' else 'חסרה!' end as ערך
union all
select 'הגשות', count(*)::text from public.submissions
union all
select 'סקירות מורה', count(*)::text from public.teacher_reviews;

-- 5 · טבלאות הפיילוט. הסקריפט רץ ראשון, לפני ההתקנה, ולכן אסור לו
--     להניח שהן קיימות: קודם דיווח קיום, ואז ספירות רק למה שקיים.
select t as טבלת_פיילוט,
       case when to_regclass('public.'||t) is not null then 'קיימת' else 'טרם הותקנה' end as מצב
from unnest(array['pilot_members','grades','gate_unlocks','access_requests','role_audit']) t;

do $$
declare t text; n bigint;
begin
  foreach t in array array['pilot_members','grades','gate_unlocks','access_requests','role_audit'] loop
    if to_regclass('public.'||t) is not null then
      execute format('select count(*) from public.%I', t) into n;
      raise notice '% · % שורות', t, n;
    end if;
  end loop;
end $$;

-- 6 · בעלת המערכת — קיום זהות מאומתת למייל הבעלים, מוסווה, בלי לחשוף אחרים
select left(u.email, 3) || '…@' || split_part(u.email, '@', 2) as מייל_מוסווה,
       (u.email_confirmed_at is not null) as מאומת,
       exists (select 1 from public.user_roles r
               where r.user_id = u.id and r.role::text = 'super_admin') as כבר_super_admin
from auth.users u
where lower(u.email) = lower('orelman@gmail.com');
