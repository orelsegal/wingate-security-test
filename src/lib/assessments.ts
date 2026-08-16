/**
 * רכיבי הערכה, ציונים ושקלול — הלוגיקה של סביבת העבודה.
 *
 * הכול כאן טהור וניתן לבדיקה. הכללים:
 *   • ציון נשמר כטקסט כלשונו. "85", "פטור" וריק הם דברים שונים.
 *   • ריק = לא הוזן. לעולם לא אפס ולא "נכשל".
 *   • השקלול מחושב רק מרכיבים פעילים עם משקל > 0 ועם ציון מספרי,
 *     והוא תמיד מציג את המכנה שלו — כמה מהמשקל בפועל נכנס לחישוב.
 *   • השקלול אינו משנה את רמזור הלמידה. הרמזור נשאר כפי שהוזן, עד
 *     שחוקי הרמזור המקוריים של עינת יאומתו מולה.
 */

export const COMPONENT_KINDS = ["מבדק", "משימה", "מבחן", "מתכונת"] as const;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];

export interface AssessmentComponent {
  id: string;
  subject_id: string;
  class_name: string | null;
  kind: ComponentKind;
  name: string;
  due_date: string | null;
  weight: number;
  is_active: boolean;
}

export interface AssessmentScore {
  id?: string;
  component_id: string;
  student_id: string;
  score: string | null;
  submitted: boolean;
  note: string | null;
}

/** ציון מספרי בלבד נכנס לשקלול; כל השאר נשמר ומוצג אך אינו מחושב. */
export const numericScore = (v: string | null | undefined): number | null => {
  if (v == null) return null;
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export interface Weighted {
  /** הציון המשוקלל, או null כשאין ולו רכיב אחד מחושב */
  value: number | null;
  /** סכום המשקלים שנכנסו בפועל */
  usedWeight: number;
  /** סכום המשקלים של כל הרכיבים הפעילים */
  totalWeight: number;
  /** רכיבים פעילים שאין להם ציון מספרי */
  missing: number;
}

/** ממוצע משוקלל על המשקל שנכנס בפועל — לא על 100 מדומיינים. */
export function weightedGrade(
  components: AssessmentComponent[],
  scoresByComponent: Map<string, AssessmentScore | undefined>,
): Weighted {
  const active = components.filter(c => c.is_active && c.weight > 0);
  const totalWeight = active.reduce((n, c) => n + c.weight, 0);
  let sum = 0, used = 0, missing = 0;
  active.forEach(c => {
    const n = numericScore(scoresByComponent.get(c.id)?.score);
    if (n == null) { missing++; return; }
    sum += n * c.weight;
    used += c.weight;
  });
  return {
    value: used > 0 ? Math.round((sum / used) * 10) / 10 : null,
    usedWeight: used,
    totalWeight,
    missing,
  };
}

/** תקינות הגדרת המשקלים — מוצגת למורה, לא נאכפת בשקט. */
export interface WeightCheck { sum: number; ok: boolean; message: string | null }
export function checkWeights(components: AssessmentComponent[]): WeightCheck {
  const sum = components.filter(c => c.is_active).reduce((n, c) => n + c.weight, 0);
  const rounded = Math.round(sum * 100) / 100;
  if (rounded === 100) return { sum: rounded, ok: true, message: null };
  if (rounded === 0) return { sum: rounded, ok: false, message: "לא הוגדרו משקלים, ולכן אין ציון משוקלל." };
  return {
    sum: rounded,
    ok: false,
    message: rounded < 100
      ? `סכום המשקלים ${rounded}% — חסרים ${Math.round((100 - rounded) * 100) / 100}% להגדרה מלאה.`
      : `סכום המשקלים ${rounded}% — חריגה של ${Math.round((rounded - 100) * 100) / 100}% מעל 100%.`,
  };
}

/** מצב שמירה לכל תא — בלי הצלחה מדומה */
export type SaveState = "idle" | "saving" | "saved" | "error";
export const cellKey = (componentId: string, studentId: string) => `${componentId}:${studentId}`;
