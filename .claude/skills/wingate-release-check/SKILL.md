---
name: wingate-release-check
description: >
  Use this skill before any deployment or release of the Wingate app.
  Reviews what changed, classifies release risk, checks whether protected areas
  were touched, verifies build/test results if available, confirms existing
  routes and links are intact, and delivers a clear GO / NO-GO decision.
  Does NOT deploy. Does NOT edit code.
triggers:
  - "לפני דפלוי"
  - "release check"
  - "בדוק לפני שחרור"
  - "wingate-release-check"
  - "deploy check"
  - "האם אפשר לפרסם"
---

# Wingate Release Check Skill

## מטרה
בדיקת בטיחות לפני כל deployment של אפליקציית Wingate.
הסקיל **קורא ובודק בלבד** — אינו פורס, אינו עורך קוד.

---

## שלב 1 — זיהוי מה השתנה

1. הרץ (בקש מהמשתמש או בדוק) `git diff main` / `git status` / `git log --oneline -10`
2. זהה את כל הקבצים שהשתנו מאז הגרסה הקודמת
3. קבץ שינויים לפי קטגוריה:
   - UI / Components
   - Routing / Navigation
   - Auth / Permissions
   - Database / Supabase / Firebase
   - Environment / Config
   - Tests
   - Other

---

## שלב 2 — סיווג סיכון

| רמת סיכון | תנאי |
|---|---|
| 🟢 נמוך | שינויי UI בלבד, אין נגיעה בנתיבים/auth/db |
| 🟡 בינוני | שינויי לוגיקה, routes, hooks, state management |
| 🔴 גבוה | נגיעה ב-auth, Supabase, Firebase, env, permissions, routing כולל |
| 🚨 קריטי | שינויים בסכמת DB, הגדרות אבטחה, deployment config |

---

## שלב 3 — בדיקת אזורים מוגנים

עבור על הרשימה הבאה — סמן ✅ (לא נגעו) או 🔴 (נגעו):

- [ ] `src/auth/` — לוגיקת התחברות והרשמה
- [ ] `supabase/` — schema, migrations, RLS policies
- [ ] `firebase/` — config, rules
- [ ] `.env`, `.env.*`, `env.ts` — משתני סביבה
- [ ] `routes/`, `App.tsx` (routing) — נתיבי ניווט
- [ ] `package.json`, `bun.lock` — dependencies
- [ ] `vercel.json`, CI/CD config — deployment settings
- [ ] `CLAUDE.md` — הוראות הפרויקט

אם **כל** האזורים המוגנים סומנו ✅ — המשך לשלב 4.
אם **אחד או יותר** סומן 🔴 — דווח מיד ושאל את המשתמש לפני שממשיכים.

---

## שלב 4 — בדיקת Build ו-Tests

אם קיימים תוצאות build/test (CI, Vitest, Playwright):
- [ ] Build עבר ללא שגיאות
- [ ] כל הטסטים עברו (או דווח על כמה נכשלו)
- [ ] אין TypeScript errors (`tsc --noEmit`)
- [ ] אין ESLint errors קריטיים

אם תוצאות לא זמינות — ציין זאת בדוח כ-"לא נבדק".

---

## שלב 5 — בדיקת Links ו-Routes

1. סרוק את קבצי ה-routing הקיימים
2. ודא שכל ה-routes הקיימים עדיין מוגדרים
3. ודא שאין links שבורים לדפים שהוסרו
4. בדוק שדפי 404 / error boundaries מוגדרים

---

## שלב 6 — פורמט הדוח הסופי

```
## 🚀 דוח Release Check — Wingate
### תאריך: [תאריך]
### גרסה / Branch: [שם]

---

### 📋 סיכום שינויים
- [רשימת קבצים שהשתנו, מקובצים לפי קטגוריה]

### 🛡️ אזורים מוגנים
- ✅ auth — לא נגעו
- ✅ supabase — לא נגעו
- [וכן הלאה...]

### 🔨 Build & Tests
- Build: ✅ עבר / 🔴 נכשל / ⚠️ לא נבדק
- Tests: ✅ עברו / 🔴 X נכשלו / ⚠️ לא נבדק
- TypeScript: ✅ נקי / 🔴 שגיאות

### 🔗 Routes & Links
- ✅ כל הנתיבים תקינים / 🔴 [פירוט בעיה]

### ⚠️ סיכונים שזוהו
- [פירוט אם יש]

---

### 🟢 GO — בטוח לפרסם
או
### 🔴 NO-GO — אין לפרסם
סיבה: [הסבר ברור]
המלצה: [מה לעשות לפני שממשיכים]
```

---

## מה אסור לגעת בו

- `src/auth/`, `firebase/`, `supabase/`
- `env`, `.env.*`
- `routes/`, `App.tsx`
- `package.json`, `bun.lock`
- `vercel.json`, CI/CD
- `CLAUDE.md`

הסקיל **אינו מפרס ואינו עורך קוד**.
לתיקון בעיות — השתמש ב-`wingate-safe-implementation`.
