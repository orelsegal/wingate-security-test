-- הוספת תפקיד "מאמנטור" ל-app_role.
-- קובץ נפרד בכוונה: PostgreSQL אינו מתיר שימוש בערך enum חדש באותה
-- טרנזקציה שבה הוא נוסף, ולכן ה-policies שמשתמשות בו נמצאות במיגרציה הבאה.
-- אין שינוי בערכים קיימים ואין נגיעה בהרשאות קיימות.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'mentor'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'mentor';
  END IF;
END $$;
