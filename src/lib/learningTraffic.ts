/**
 * רמזור למידה — המודל של עינת, בשפת הפלטפורמה שלנו.
 * ערכי הרמזור הם בדיוק אלה שבקובץ שלה: אדום · צהוב · ירוק.
 * ריק = "לא הוזן" — לעולם לא ירוק, לא תקין ולא 0.
 */

export type Ramzor = "אדום" | "צהוב" | "ירוק";
export const RAMZOR_VALUES: Ramzor[] = ["אדום", "צהוב", "ירוק"];

/** חמשת המקצועות שבקובץ הרמזור */
export const LEARNING_SUBJECTS = ["מתמטיקה", "אנגלית", "לשון", "היסטוריה", "אזרחות"] as const;
export type LearningSubject = (typeof LEARNING_SUBJECTS)[number];

/** סוגי המענה ("תפירת חליפה") כפי שנצפו במסך של עינת — רב־ערכי */
export const HALIFFA_OPTIONS = [
  "מרכז למידה",
  "שיחה עם ההורים",
  "שיחת מאמנטור",
  "שיחת מאמן",
  "שיחת מדריך",
  "חיזוק פנימייה",
] as const;

export interface LearningStatusRow {
  id?: string;
  student_id: string;
  subject_id: string;
  subject_name?: string;
  ramzor: Ramzor | null;
  grades_raw: string | null;
  notes: string | null;
  haliffa: string[];
  haliffa_notes: string | null;
  updated_at?: string;
}

/* ── שפת התצוגה של הרמזור ──────────────────────────────────────────────
   שמות הצבעים ("אדום"/"צהוב"/"ירוק") הם אוצר המילים של הנתונים בלבד —
   כך הם נשמרים ב-learning_status וכך הם מגיעים מהגיליון של עינת.
   בממשק הם לעולם אינם מוצגים: המשתמש רואה רמזור חזותי + ניסוח מקצועי.

   הזיהוי לעולם אינו נשען על צבע בלבד — לכל מצב יש גם סימן צורני ייחודי
   (! – ✓ ?) וגם מילים. הצבעים כאן כהים מהטוקנים הכלליים כדי לעמוד
   בניגודיות מול לבן (מחושב: 6.5 / 4.9 / 4.8 / 5.0 לעומת 4.5 הנדרש). */
export const ramzorMeta: Record<Ramzor | "לא הוזן", {
  /** הניסוח שהמשתמש רואה — לא שם הצבע */
  label: string;
  /** סימן צורני, מזוהה גם בשחור־לבן ובעיוורון צבעים */
  symbol: string;
  /** תיאור מלא לקוראי מסך ול-tooltip */
  aria: string;
  /** רקע העיגול המלא */
  solid: string;
  /** דיו לטקסט על רקע בהיר */
  ink: string;
  /** רקע רך לשבב */
  soft: string;
  /** מסגרת השבב */
  edge: string;
  order: number;
}> = {
  "אדום":    { label: "דורש טיפול",      symbol: "!", aria: "דורש טיפול",      solid: "hsl(0, 72%, 42%)",    ink: "hsl(0, 72%, 38%)",    soft: "hsla(0, 72%, 42%, 0.10)",    edge: "hsla(0, 72%, 42%, 0.28)",    order: 0 },
  "צהוב":    { label: "דורש תשומת לב",   symbol: "–", aria: "דורש תשומת לב",   solid: "hsl(35, 92%, 33%)",   ink: "hsl(35, 92%, 30%)",   soft: "hsla(35, 92%, 33%, 0.10)",   edge: "hsla(35, 92%, 33%, 0.28)",   order: 1 },
  "ירוק":    { label: "במסלול",          symbol: "✓", aria: "במסלול",          solid: "hsl(142, 72%, 30%)",  ink: "hsl(142, 72%, 27%)",  soft: "hsla(142, 72%, 30%, 0.10)",  edge: "hsla(142, 72%, 30%, 0.28)",  order: 2 },
  "לא הוזן": { label: "לא הוזן",         symbol: "?", aria: "לא הוזן — אין מידע", solid: "hsl(215, 12%, 45%)", ink: "hsl(215, 14%, 38%)", soft: "hsla(215, 12%, 45%, 0.10)", edge: "hsla(215, 12%, 45%, 0.28)", order: 3 },
};

export const metaFor = (r: Ramzor | null | undefined) => ramzorMeta[r ?? "לא הוזן"];

/** ספירה פר תלמיד — הבסיס לכרטיס ולסיכום הרוחבי. */
export interface RamzorTally { אדום: number; צהוב: number; ירוק: number; "לא הוזן": number }

export const tally = (rows: Pick<LearningStatusRow, "ramzor">[]): RamzorTally => {
  const t: RamzorTally = { "אדום": 0, "צהוב": 0, "ירוק": 0, "לא הוזן": 0 };
  rows.forEach(r => { t[r.ramzor ?? "לא הוזן"]++; });
  return t;
};

/** הסיבה למצב, בלשון המקור בלבד — אין ניסוח מומצא. */
export const reasonFor = (r: LearningStatusRow): string[] => {
  const out: string[] = [];
  if (r.notes?.trim()) out.push(r.notes.trim());
  if (r.grades_raw?.trim()) out.push(`ציונים: ${r.grades_raw.trim()}`);
  if (r.haliffa?.length) out.push(`מענה: ${r.haliffa.join(" · ")}`);
  if (r.haliffa_notes?.trim()) out.push(r.haliffa_notes.trim());
  return out;
};

/* ── מפת הבגרות: הספים המאומתים מהמסך של עינת ──
   אדום 12+ חסרים · צהוב 10–11 · ירוק עד 9.
   הספים כאן הם תצורה, לא קבועים מפוזרים בקוד. */
export const BAGRUT_THRESHOLDS = { red: 12, yellowMin: 10, yellowMax: 11 } as const;

export type BagrutBand = "אדום" | "צהוב" | "ירוק";
export const bagrutBand = (missing: number): BagrutBand =>
  missing >= BAGRUT_THRESHOLDS.red ? "אדום"
  : missing >= BAGRUT_THRESHOLDS.yellowMin ? "צהוב"
  : "ירוק";

export const bagrutBandLabel: Record<BagrutBand, string> = {
  "אדום": `${BAGRUT_THRESHOLDS.red}+ חסרים`,
  "צהוב": `${BAGRUT_THRESHOLDS.yellowMin}–${BAGRUT_THRESHOLDS.yellowMax} חסרים`,
  "ירוק": `עד ${BAGRUT_THRESHOLDS.yellowMin - 1} חסרים`,
};
