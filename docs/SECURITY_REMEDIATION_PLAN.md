# תוכנית טיפול אבטחה — wingate-security-test

תאריך: 2026-08-15. מסמך תכנון וטיפול; מתעד מה תוקן בפרוסה הנוכחית, מה ממתין, ומה דורש גישה שאינה קיימת בסביבה זו.

## 1. תוקן בפרוסה זו (migration `20260815100000_narrow_rls_hardening.sql`)

| ממצא | תיקון | בדיקה |
|---|---|---|
| הסלמת הרשאות דרך `profiles` UPDATE (אין `WITH CHECK`; כל משתמש יכול לשכתב `linked_student_id`/`linked_sport` ולקרוא ציוני/בגרות ילד אחר) | Policy עם `WITH CHECK` + טריגר `protect_profile_link_columns` שחוסם שינוי עמודות scope לכל מי שאינו admin; מסלול `claim_pending_invite` נשמר דרך דגל טרנזקציוני | הרנס RLS מקומי: T1–T4 PASS (חסימה, admin מותר, invite עובד) |
| מורים רואים/כותבים `student_roadmap_progress` של כל תלמיד | Policies מוגבלים ל־`is_teacher_of_student()` (fail-closed) | T5–T8 PASS |
| מורים רואים/כותבים `student_custom_values` של כל תלמיד | אותו scope | T9 PASS |
| רגרסיה: הורה/תלמיד | ללא שינוי התנהגות | T10–T11 PASS |

**סטטוס החלה על ה־DB החי: ממתין.** בסביבה זו אין Supabase CLI ואין הרשאות DB (רק anon key). ההחלה דורשת אחת מהדרכים:
- Supabase Dashboard → SQL Editor → הדבקת תוכן ה־migration והרצתה (פרויקט `flfemffhswlpgpbvhuvy`), או
- `supabase db push` לאחר `supabase login` במכונה מורשית, או
- החלה דרך Lovable אם היא מסנכרנת migrations.

עד ההחלה, הפרצות פעילות ב־production. ההרצה המקומית (`scripts/rls-harness/run.sh`) מוכיחה שה־migration חלה נקי על כל 46 המיגרציות הקיימות.

## 2. מספרי זהות בהיסטוריית Git (ללא history rewrite, לפי הנחיה)

- **ב־HEAD:** `supabase/migrations/20260714113214...sql` מכיל ~89 מספרי זהות אמיתיים לצד שמות מלאים (נתוני בגרות). קבצי dry-run מאוחרים מכילים נתוני דמה בלבד ("בדיקת דמה", 05000000xx).
- **ב־bundle הנפרס: לא קיימים.** Vite אורז רק את `src/` + `public/`; תיקיית `supabase/` אינה חלק מה־build (אומת בבדיקת ה־dist בפרוסה זו).
- **תוכנית (דורשת החלטה ותיאום, לא בוצעה):**
  1. לוודא שה־repo פרטי ומצומצם הרשאות (הוא פרטי כיום).
  2. להוציא נתוני seed אמיתיים מהמיגרציות: העברת ה־backfill לקובץ מחוץ ל־repo או ל־storage מוגן, והחלפת המיגרציה בגרסה נטולת PII.
  3. רק לאחר מכן, ובחלון מתואם: טיהור היסטוריה (BFG/filter-repo) + force-push מתואם עם Lovable, או ארכוב ה־repo ופתיחת repo נקי. **לא בוצע** כי נאסר history rewrite בפרוסה זו.

## 3. Edge Functions (לא ניתן לתקן מכאן — דורש פריסת Supabase Functions)

ממצאים (בקוד, `supabase/functions/*`): `Access-Control-Allow-Origin: *` בכולן; אין אימות JWT ואין בדיקת role באף פונקציה; כולן חותמות עם `LOVABLE_API_KEY` משותף; `civics-check` מחזירה משוב AI ישירות לתלמיד ללא אישור מורה; `daily-quiz-generate` מפרסמת תוכן AI אוטומטית.

תיקון נדרש (כשתהיה גישת פריסה): אימות `Authorization` מול Supabase Auth + בדיקת role, צמצום CORS לדומיינים של האפליקציה, תיעוד/שמירת פלט AI, ושער אישור מורה לפני חשיפת משוב לתלמיד.

**מה כן נעשה בפרוסה זו (צד לקוח, נפרס ב־Vercel):** בדיקת האזרחות מסומנת במפורש כהתנסות/דמו לא מחייב ואינה מוצגת כתהליך הערכה מחובר; אין קריאת AI חדשה; `AIInsightsPanel` שונה כך שלא יוצג כ־AI (זו היוריסטיקה סטטית).

## 4. דליפת PII ב־`wa.me`

שלושה מוקדים העבירו שם תלמיד/סטטוס/הערות/תוכן AI בתוך URL חיצוני (`DataExportTools`, `BagrutGradingPage`, `TeacherAIAssistant`). תוקן בפרוסה זו: הוסרו קישורי `wa.me`; הזרימה החדשה היא Preview פנימי + העתקה ידנית ללא פתיחת ערוץ חיצוני וללא PII ב־URL (ראו `SendUpdateDialog`).

## 5. לא טופל בפרוסה זו (מחוץ לתחום, מתועד)

- `activity_logs` אינו tamper-evident (זהות מדווחת מהלקוח; admin יכול לערוך/למחוק).
- מסלולי dev/admin עם שער UI בלבד (`/admin/builder`, `/play/daily/admin`, `/bagrut-grading`) — הנתונים מוגנים ב־RLS אך ראוי route-guard תפקידי.
- enum חי עם ערך `developer` שאינו קיים במיגרציות (drift שנוצר מחוץ ל־git) — ליישר במיגרציה ייעודית.
- קוד מורה משותף / Firebase משותף באפליקציות האחיות — מחוץ ל־repo זה.
