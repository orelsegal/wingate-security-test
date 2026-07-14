---
name: wingate-mobile-rtl-qa
description: >
  Use this skill to review the Wingate app on mobile with Hebrew RTL behavior.
  Checks layout, spacing, text clipping, button sizes, alignment, scroll behavior,
  icon direction, mobile readability, and overall comfort on a phone screen.
  RTL-first. Hebrew-first. Mobile-first. Does NOT edit code.
triggers:
  - "בדוק מובייל"
  - "בדוק RTL"
  - "בדוק עברית על טלפון"
  - "wingate-mobile-rtl-qa"
  - "mobile rtl"
  - "rtl audit"
---

# Wingate Mobile RTL QA Skill

## מטרה
בדיקת איכות ממשק המשתמש של אפליקציית Wingate על מסכי מובייל עם התמקדות ב-RTL עברי.
הסקיל **קורא ובודק בלבד** — אינו עורך קוד.

---

## שלב 1 — זיהוי המסך לבדיקה

אם המשתמש לא ציין מסך ספציפי, שאל:
> "איזה מסך תרצה לבדוק? (לדוגמה: דשבורד, התחברות, פרופיל, תוכניות אימון)"

אם ציין — המשך ישירות לשלב 2.

---

## שלב 2 — קריאת קבצי המסך

1. מצא את קבצי ה-component הרלוונטיים ב-`src/`
2. קרא את קבצי ה-CSS / Tailwind / styled-components הקשורים
3. אל תגע ב-`auth/`, `firebase/`, `supabase/`, `env`, `routes/`, `package.json`, `database/`

---

## שלב 3 — רשימת בדיקות RTL ומובייל

עבור על כל הסעיפים הבאים:

### יישור ו-RTL
- [ ] `dir="rtl"` מוגדר על האלמנטים הנכונים
- [ ] כל הטקסטים מיושרים לימין (`text-right` / `text-align: right`)
- [ ] Flexbox משתמש ב-`flex-row-reverse` או `direction: rtl` כנדרש
- [ ] אייקונים כיווניים (חצים, נווט, back) הפוכים ב-RTL
- [ ] Padding/Margin: `pr` / `pl` מוחלפים בצדדים הנכונים ב-RTL
- [ ] Grid columns מסודרים מימין לשמאל

### ריווח ומידות על מובייל
- [ ] כפתורים בגובה מינימלי 44px (touch target)
- [ ] שדות קלט בגובה מינימלי 48px
- [ ] Padding פנימי של לחצנים לא קטן מ-12px לכל צד
- [ ] אין אלמנטים שחורגים מגבולות המסך (overflow-x)
- [ ] Bottom navigation / tab bar לא חוסם תוכן

### טקסט וקריאות
- [ ] גודל גופן מינימלי 14px לגוף טקסט, 16px לשדות קלט
- [ ] אין קיצוץ טקסט לא מכוון (`text-overflow: ellipsis`)
- [ ] כותרות לא נחתכות על מסך 375px
- [ ] כפתורים עם תוויות ארוכות בעברית — גלישת שורה או קיצוץ נאות
- [ ] Placeholder בשדות קלט בעברית מיושר לימין

### גלילה
- [ ] גלילה אנכית עובדת על כל המסכים הארוכים
- [ ] אין גלילה אופקית לא מכוונת
- [ ] Sticky headers/footers לא חוסמים תוכן בגלילה

### אייקונים ותמונות
- [ ] אייקוני RTL (back, chevron, arrow) בכיוון הנכון
- [ ] תמונות לא מתכווצות / מתמתחות ב-flex container
- [ ] Logo ו-branding מיושרים נכון ב-RTL

---

## שלב 4 — פורמט הדוח

```
## דוח RTL מובייל — [שם המסך]

### ✅ תקין
- [פירוט מה עובד נכון]

### ⚠️ בעיות קלות
- [פריט] → [הסבר קצר]

### 🔴 בעיות קריטיות
- [פריט] → [הסבר + השפעה על משתמש]

### 📱 המלצות UX מובייל
- [הצעות שיפור שאינן בגדר באג]

### 🚫 לא נבדק (מחוץ לתחום הסקיל)
- auth, database, routing, deployment

### סיכום: ✅ מוכן / 🔴 דורש תיקון לפני שחרור
```

---

## מה אסור לגעת בו

- `src/auth/`, `firebase/`, `supabase/`
- `env`, `.env.*`
- `routes/`, `App.tsx` (routing logic)
- `package.json`, `package-lock.json`
- `database/`, `schema`, `migrations`
- קבצי deployment, CI/CD, CLAUDE.md

---

## הערה חשובה

הסקיל הזה **קורא ומדווח בלבד — אינו מתקן קוד**.
לתיקון ממצאים — השתמש ב-`wingate-safe-implementation`.
