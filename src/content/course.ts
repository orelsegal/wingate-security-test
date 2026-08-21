import type { Course } from "../data/types";

/**
 * ── קובץ התוכן היחיד של האפליקציה ──────────────────────────────────────────
 *
 * כל מה שהמוצר מציג מגיע מכאן: מספר היחידות, מספר התחנות בכל יחידה,
 * שדות התשובה, מה חובה ומה לא. רכיבי הליבה לא יודעים כלום על המקצוע.
 *
 * התוכן כאן הוא תוכן דוגמה מזערי בלבד — לא חומר לימוד אמיתי.
 */
export const course: Course = {
  id: "demo-course",
  title: "מסלול דוגמה",
  intro: "תבנית עבודה להדגמה. התוכן כאן הוא טקסט דוגמה בלבד.",
  units: [
    {
      id: "u1",
      title: "יחידת דוגמה 1",
      subtitle: "היכרות עם מבנה המסלול",
      goal: "להבין איך נראית יחידה: כמה תחנות יש בה ואיך מגישים אותה.",
      steps: [
        {
          id: "u1s1",
          title: "תחנת פתיחה",
          prompt: "טקסט הדגמה: כתבי בכמה מילים מה את מצפה למצוא במסלול הזה.",
          hint: "אין תשובה נכונה. זו תחנת דוגמה לבדיקת התבנית.",
          fields: [
            {
              id: "expectation",
              label: "מה את מצפה למצוא כאן?",
              type: "long",
              required: true,
              minChars: 10,
              placeholder: "כמה משפטים קצרים…",
            },
          ],
        },
        {
          id: "u1s2",
          title: "תחנת בחירה",
          prompt: "טקסט הדגמה: בחרי אפשרות אחת והסבירי אותה במשפט.",
          fields: [
            {
              id: "pick",
              label: "אפשרות",
              type: "choice",
              required: true,
              options: ["אפשרות א׳", "אפשרות ב׳", "אפשרות ג׳"],
            },
            {
              id: "why",
              label: "למה בחרת בה?",
              type: "short",
              placeholder: "משפט אחד",
            },
          ],
        },
      ],
    },
    {
      id: "u2",
      title: "יחידת דוגמה 2",
      subtitle: "שדות תשובה",
      goal: "לראות איך נראים סוגי שדות שונים באותה תחנה.",
      steps: [
        {
          id: "u2s1",
          title: "תחנת טקסט קצר",
          prompt: "טקסט הדגמה: מלאי שני שדות קצרים.",
          fields: [
            { id: "a", label: "שדה חובה", type: "short", required: true, placeholder: "טקסט קצר" },
            { id: "b", label: "שדה רשות", type: "short", placeholder: "אפשר להשאיר ריק" },
          ],
        },
        {
          id: "u2s2",
          title: "תחנת טקסט ארוך",
          prompt: "טקסט הדגמה: כתבי פסקה קצרה.",
          hint: "לפחות 20 תווים כדי שהתחנה תיחשב מלאה.",
          fields: [
            {
              id: "para",
              label: "פסקה",
              type: "long",
              required: true,
              minChars: 20,
              help: "הטקסט נשמר אוטומטית גם אם יוצאים מהמסך.",
            },
          ],
        },
        {
          id: "u2s3",
          title: "תחנת סיכום",
          prompt: "טקסט הדגמה: סכמי במשפט אחד מה עשית ביחידה הזו.",
          fields: [{ id: "summary", label: "סיכום", type: "short", required: true }],
        },
      ],
    },
    {
      id: "u3",
      title: "יחידת דוגמה 3",
      subtitle: "הגשה ובדיקה",
      goal: "להדגים את המסלול: הגשה, החזרה לתיקון, הגשה מחדש ואישור.",
      steps: [
        {
          id: "u3s1",
          title: "תחנת עבודה",
          prompt: "טקסט הדגמה: כתבי תשובה כלשהי ושלחי לבדיקה.",
          fields: [
            { id: "work", label: "התשובה שלך", type: "long", required: true, minChars: 10 },
          ],
        },
        {
          id: "u3s2",
          title: "תחנת בדיקה עצמית",
          prompt: "טקסט הדגמה: מה היית משפרת בתשובה שלך?",
          fields: [{ id: "improve", label: "שיפור אפשרי", type: "short" }],
        },
      ],
    },
    {
      id: "u4",
      title: "יחידת דוגמה 4",
      subtitle: "סיום המסלול",
      goal: "לוודא שהיחידה האחרונה נסגרת נכון.",
      steps: [
        {
          id: "u4s1",
          title: "תחנת סיום",
          prompt: "טקסט הדגמה: משפט סיום למסלול.",
          fields: [{ id: "closing", label: "משפט סיום", type: "short", required: true }],
        },
      ],
    },
  ],
};
