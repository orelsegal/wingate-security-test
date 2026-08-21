# איך מקימים מקצוע חדש מהתבנית

## הדרך המהירה

```bash
node scripts/new-subject.mjs ../wingate-math --name "מתמטיקה" --accent "#2F5FA6" --badge "35%"
cd ../wingate-math
npm install
npm run icons
npm run dev
```

הסקריפט מעתיק את התבנית (בלי `node_modules`, `dist`, `.git`, `docs`), מעדכן את
`package.json` ואת ה־manifest, כותב `src/content/theme.ts` חדש ומחליף את
`src/content/course.ts` בשלד ריק — כדי שלא ייגרר תוכן הדוגמה.

אפשר גם בלי הסקריפט:

```bash
npx degit <repo-url> wingate-math    # העתקה בלי היסטוריית git
```

## מה עורכים אחר כך

### 1. `src/content/course.ts` — כל התוכן

```ts
units: [
  {
    id: "u1",
    title: "שם היחידה",
    subtitle: "שורה קצרה",      // רשות
    goal: "מה עושים ביחידה",     // רשות
    steps: [
      {
        id: "u1s1",
        title: "שם התחנה",
        prompt: "מה מבקשים מהתלמידה",
        hint: "רמז קצר",          // רשות
        fields: [
          { id: "a", label: "התשובה שלך", type: "long", required: true, minChars: 20 },
          { id: "b", label: "בחירה", type: "choice", options: ["א", "ב"], required: true },
          { id: "c", label: "משפט קצר", type: "short" },
        ],
      },
    ],
  },
]
```

- `type`: `short` (שורה), `long` (פסקה), `choice` (בחירה יחידה).
- `required` + `minChars` קובעים מתי אפשר להגיש.
- מספר היחידות ומספר התחנות נגזרים מהמערכים — אין מספר קבוע בקוד.

### 2. `src/content/theme.ts` — מיתוג המקצוע

שם המקצוע, תג אחוזים, אייקון, צבע אחד (`accent` + גרסה בהירה וכהה),
ומטאפורת המילים (`יחידה` / `תחנה` — אפשר לשנות ל"פרק" / "משימה" וכו').
כל שאר הצבעים משותפים לכל המקצועות ולא נוגעים בהם.

### 3. `src/content/students.ts`

רשימת התלמידות להדגמה. באפליקציה אמיתית הרשימה תגיע משכבת הנתונים.

### 4. אייקונים

`npm run icons` מייצר את אייקוני ה־PWA מקוד. הצבעים נמצאים בראש
`scripts/make-icons.mjs`.

## חיבור לנתונים אמיתיים

`src/data/types.ts` מגדיר את `DataAdapter` — כל מה שהמסכים יודעים לעשות:
קריאת התקדמות, שמירת טיוטה, הגשה, החזרה לתיקון, אישור ופתיחת יחידה.

התבנית מגיעה עם `localAdapter` (אחסון בדפדפן) להדגמה. חיבור אמיתי =
מימוש נוסף של אותו interface והחלפה של שורה אחת ב־`src/data/AppProvider.tsx`:

```ts
const data = createLocalAdapter(course, demoStudents);   // ← להחליף כאן
```

המסכים לא משתנים.

## מה לא לשנות בלי סיבה

`src/core/**` הוא ליבה גנרית: סטטוסים, נעילה/פתיחה, שלמות תחנה ורכיבי UI.
אם משהו במקצוע דורש שינוי שם — קודם בודקים אם אפשר לפתור אותו בקובץ התוכן או ב־theme.
