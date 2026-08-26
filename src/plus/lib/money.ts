/**
 * מתמטיקת כסף של "פלוס".
 * כל הסכומים נשמרים ומחושבים באגורות (מספרים שלמים) — אין שגיאות עיגול.
 */

export type Agorot = number;

/** המרה מקלט משתמש בשקלים (מחרוזת) לאגורות. מחזיר null על קלט לא תקין. */
export function parseShekelInput(input: string): Agorot | null {
  const cleaned = input.replace(/[₪,\s]/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const agorot = parseInt(whole, 10) * 100 + parseInt((frac + "00").slice(0, 2), 10);
  if (!Number.isSafeInteger(agorot)) return null;
  return agorot;
}

const ilsFormatter = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** עיצוב אגורות לתצוגת שקלים בעברית: 12345 → ‏123.45 ₪ */
export function formatAgorot(agorot: Agorot): string {
  return ilsFormatter.format(agorot / 100);
}

/** עיצוב תאריך ISO לתצוגה ישראלית. */
export function formatDateIL(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${d}.${m}.${y}`;
}

export interface SplitPercents {
  future: number; // עתיד: חיסכון והשקעה
  goals: number;  // מטרות קרובות
  fun: number;    // כיף וחופש אישי
}

export const DEFAULT_SPLIT: SplitPercents = { future: 50, goals: 30, fun: 20 };

export function isValidSplit(s: SplitPercents): boolean {
  const vals = [s.future, s.goals, s.fun];
  return (
    vals.every((v) => Number.isInteger(v) && v >= 0 && v <= 100) &&
    s.future + s.goals + s.fun === 100
  );
}

export interface SplitResult {
  future: Agorot;
  goals: Agorot;
  fun: Agorot;
}

/**
 * חלוקת סכום לפי אחוזים בשיטת "השארית הגדולה":
 * הסכומים תמיד שלמים, לא שליליים, וסכומם שווה בדיוק לסכום המקורי.
 */
export function splitAmount(amount: Agorot, percents: SplitPercents): SplitResult {
  if (!Number.isInteger(amount) || amount < 0) throw new Error("סכום לא תקין");
  if (!isValidSplit(percents)) throw new Error("האחוזים חייבים להסתכם ב-100");

  const keys: (keyof SplitPercents)[] = ["future", "goals", "fun"];
  const exact = keys.map((k) => (amount * percents[k]) / 100);
  const floors = exact.map(Math.floor);
  let remainder = amount - floors.reduce((a, b) => a + b, 0);

  // חלוקת השארית לפי החלק העשרוני הגדול ביותר (שוויון → לפי סדר הקטגוריות)
  const order = keys
    .map((k, i) => ({ i, frac: exact[i] - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const result = [...floors];
  for (const { i } of order) {
    if (remainder <= 0) break;
    result[i] += 1;
    remainder -= 1;
  }
  return { future: result[0], goals: result[1], fun: result[2] };
}

/** שיעור חיסכון באחוזים שלמים; null כשאין הכנסות. */
export function savingRatePct(savedAg: Agorot, incomeAg: Agorot): number | null {
  if (incomeAg <= 0) return null;
  return Math.round((savedAg / incomeAg) * 100);
}

export interface GoalMath {
  remaining: Agorot;
  perPeriod: Agorot | null;          // כמה לחסוך בכל תקופה כדי להגיע בתאריך היעד
  periodsLeft: number | null;
  etaPeriods: number | null;         // מועד משוער לפי ההפקדה המתוכננת
}

/**
 * חישובי מטרה: כמה נשאר, כמה צריך לכל תקופה עד תאריך היעד,
 * ותוך כמה תקופות תושג המטרה לפי ההפקדה המתוכננת.
 */
export function goalMath(
  targetAg: Agorot,
  savedAg: Agorot,
  plannedDepositAg: Agorot,
  periodsUntilDate: number | null
): GoalMath {
  const remaining = Math.max(0, targetAg - savedAg);
  const perPeriod =
    periodsUntilDate && periodsUntilDate > 0
      ? Math.ceil(remaining / periodsUntilDate)
      : null;
  const etaPeriods =
    plannedDepositAg > 0 ? Math.ceil(remaining / plannedDepositAg) : null;
  return { remaining, perPeriod, periodsLeft: periodsUntilDate, etaPeriods };
}

/** מספר שבועות מלאים (מעוגל כלפי מעלה, מינימום 0) בין היום לתאריך יעד. */
export function weeksUntil(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + "T00:00:00");
  const to = new Date(toIso + "T00:00:00");
  const diffDays = Math.floor((to.getTime() - from.getTime()) / 86400000);
  return Math.max(0, Math.ceil(diffDays / 7));
}

/** מזהה שבוע (שנה-שבוע) לצורך רצף שבועי — לפי שבוע שמתחיל ביום ראשון. */
export function weekKey(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  // הזזה ליום ראשון של אותו שבוע
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

/** אורך הרצף השבועי הנוכחי מתוך רשימת תאריכי פעולה משמעותית. */
export function weeklyStreak(activityIsoDates: string[], todayIso: string): number {
  if (activityIsoDates.length === 0) return 0;
  const weeks = new Set(activityIsoDates.map(weekKey));
  let streak = 0;
  const cursor = new Date(weekKey(todayIso) + "T00:00:00");
  // הרצף יכול להתחיל מהשבוע הנוכחי או מהשבוע הקודם (השבוע הנוכחי עוד לא הסתיים)
  if (!weeks.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 7);
  }
  while (weeks.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}
