# תוכנית החלה: `20260815100000_narrow_rls_hardening.sql`

תאריך: 2026-08-15. מסמך ביצוע קצר להחלת מיגרציית האבטחה על ה־DB החי. ההחלה דורשת את סיסמת ה־DB ולכן מבוצעת על ידי אוראל בלבד.

## סביבה ומצב נוכחי (אומת)

- **פרויקט:** Supabase `flfemffhswlpgpbvhuvy` (Lovable Cloud) · pooler: `aws-0-eu-central-1.pooler.supabase.com:5432`.
- **המנגנון הקנוני בפרויקט זה** (לפי היסטוריית ההחלות של יולי, למשל `wingate_parent_read_policies.txt` ו־`wingate_admin_status_migration.txt`): הרצת קובץ SQL עם `psql` ישירות מול ה־pooler, עם `-v ON_ERROR_STOP=1`. אין CLI מקושר ואין רישום ב־schema_migrations — כך הוחלו גם המיגרציות הידניות הקודמות.
- **מה המיגרציה עושה:** policies בלבד (DROP/CREATE), פונקציית טריגר אחת, טריגר אחד, ו־CREATE OR REPLACE ל־`claim_pending_invite`. **אין** מחיקת נתונים, **אין** שינוי roles, **אין** שינוי מבנה טבלאות. ניתנת להרצה חוזרת (IF EXISTS / OR REPLACE).
- **בדיקות מקומיות:** חלה נקי על כל 46 המיגרציות בהרנס מקומי; 11 בדיקות הרשאה עברו (כולל מסלול ההזמנה); בלוק self-check בתוך הקובץ מאמת את מצב הסיום.

## שלב 1 · Preflight (קריאה בלבד)

```bash
psql "host=aws-0-eu-central-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.flfemffhswlpgpbvhuvy sslmode=require" -c "
select policyname from pg_policies where tablename='profiles' and policyname='Users can update own profile';
select count(*) as wide_open_teacher_policies from pg_policies where policyname in ('Teachers can view all roadmap progress','Teachers view all custom values');
select proname from pg_proc where proname in ('is_teacher_of_student','has_role','claim_pending_invite');"
```

מצופה: ה־policy הישן קיים; `wide_open_teacher_policies = 2`; שלוש הפונקציות קיימות. אם משהו שונה, לעצור ולבדוק.

## שלב 2 · החלה

```bash
psql "host=aws-0-eu-central-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.flfemffhswlpgpbvhuvy sslmode=require" -v ON_ERROR_STOP=1 -f "$HOME/wingate-security-test/supabase/migrations/20260815100000_narrow_rls_hardening.sql"
```

הקובץ נכשל-מוקדם על כל שגיאה, ובסופו self-check שמוודא שהטריגר קיים ושה־policies הרחבים הוסרו. אם ההרצה הסתיימה בלי שגיאה — ההחלה שלמה.

## שלב 3 · Post-checks (קריאה בלבד)

```bash
psql "host=aws-0-eu-central-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.flfemffhswlpgpbvhuvy sslmode=require" -c "
select tgname from pg_trigger where tgname='protect_profile_link_columns';
select policyname from pg_policies where tablename in ('student_roadmap_progress','student_custom_values') and policyname like 'Teachers%';"
```

מצופה: הטריגר קיים; policies של מורים הם רק בגרסת "their group".

## שלב 4 · QA הרשאות בחי (בחשבונות ה־QA שלך)

1. הורה (`orelman+qa-parent@gmail.com`): עריכת פרופיל רגילה עובדת; ניסיון שינוי `linked_student_id` נכשל; רואה רק את הילד המקושר.
2. תלמיד: אינו יכול לשנות את שדות ה־scope שלו.
3. מורה עם קבוצה: רואה/מעדכן רק תלמידי קבוצותיו ב־roadmap/custom values; מורה בלי קבוצה: 0.
4. admin: עריכת קישורי פרופיל ועבודה רגילה נשמרות.
5. הזמנה חדשה (invite→claim) עובדת עד הסוף.
6. גישה ישירה ב־URL אינה עוקפת (הנתונים ריקים/חסומים בשרת).

## Rollback (רק אם התגלתה תקלה)

להריץ את הבלוק הבא (מחזיר את המצב הקודם במדויק; אינו מוחק נתונים):

```sql
DROP TRIGGER IF EXISTS protect_profile_link_columns ON public.profiles;
DROP FUNCTION IF EXISTS public.enforce_profile_scope_guard();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Teachers view their group roadmap progress" ON public.student_roadmap_progress;
CREATE POLICY "Teachers can view all roadmap progress" ON public.student_roadmap_progress FOR SELECT TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role));
DROP POLICY IF EXISTS "Admins insert roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Admins update roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Admins delete roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Teachers insert group roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Teachers update group roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Teachers delete group roadmap progress" ON public.student_roadmap_progress;
CREATE POLICY "Admins and teachers can insert roadmap progress" ON public.student_roadmap_progress FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Admins and teachers can update roadmap progress" ON public.student_roadmap_progress FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Admins and teachers can delete roadmap progress" ON public.student_roadmap_progress FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

DROP POLICY IF EXISTS "Teachers view their group custom values" ON public.student_custom_values;
CREATE POLICY "Teachers view all custom values" ON public.student_custom_values FOR SELECT TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role));
DROP POLICY IF EXISTS "Admins insert custom values" ON public.student_custom_values;
DROP POLICY IF EXISTS "Admins update custom values" ON public.student_custom_values;
DROP POLICY IF EXISTS "Teachers insert group custom values" ON public.student_custom_values;
DROP POLICY IF EXISTS "Teachers update group custom values" ON public.student_custom_values;
CREATE POLICY "Admins/teachers insert custom values" ON public.student_custom_values FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Admins/teachers update custom values" ON public.student_custom_values FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- claim_pending_invite: הגרסה החדשה תואמת לאחור (הדגל מיותר בלי הטריגר); אין צורך לשחזר.
```

## אחרי הצלחה

מיזוג `feat/demo-slice-security-glossary-tanakh` ל־`main` + פריסה קנונית מ־main (Vercel auto-deploy). עד אז אין למזג.
