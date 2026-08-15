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

/** תצוגה אחידה: צבע לעולם לא לבד — תמיד גם מילה. */
export const ramzorMeta: Record<Ramzor | "לא הוזן", {
  label: string; dot: string; chip: string; order: number;
}> = {
  "אדום":     { label: "אדום",     dot: "bg-destructive",                chip: "bg-destructive/10 text-destructive border-destructive/25", order: 0 },
  "צהוב":     { label: "צהוב",     dot: "bg-[hsl(var(--warning))]",      chip: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/25", order: 1 },
  "ירוק":     { label: "ירוק",     dot: "bg-[hsl(var(--success))]",      chip: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/25", order: 2 },
  "לא הוזן":  { label: "לא הוזן",  dot: "bg-muted-foreground/35",        chip: "bg-muted/50 text-muted-foreground border-border", order: 3 },
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
