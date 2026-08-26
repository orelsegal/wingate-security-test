/**
 * מעבדת ההשקעות של "פלוס" — חישובים לימודיים בלבד.
 * אלו המחשות מתמטיות עם הנחות שהמשתמשת קובעת, לא תחזית ולא ייעוץ.
 * החישוב בנקודה צפה והתצוגה מעוגלת לשקלים — אין כאן כסף אמיתי.
 */

export interface ProjectionPoint {
  month: number;
  value: number;      // בשקלים (לתצוגה בלבד)
  deposited: number;  // סך ההפקדות עד כה בשקלים
}

export interface ProjectionInput {
  initialShekels: number;
  monthlyDepositShekels: number;
  annualRatePct: number;   // הנחת תשואה שנתית — ניתנת לשינוי, הדגמה בלבד
  annualFeePct?: number;   // דמי ניהול שנתיים
  years: number;
  /** תרחיש: ירידה חד-פעמית באחוזים בחודש נתון (למשל ‎-30 בחודש 24) */
  shock?: { month: number; changePct: number };
  /** הפסקת הפקדות החל מחודש מסוים ("מה יקרה אם אפסיק להפקיד?") */
  stopDepositsAtMonth?: number;
}

/** תחזית חודשית בריבית דריבית. מחזיר נקודה לכל חודש (כולל חודש 0). */
export function project(input: ProjectionInput): ProjectionPoint[] {
  const {
    initialShekels,
    monthlyDepositShekels,
    annualRatePct,
    annualFeePct = 0,
    years,
    shock,
    stopDepositsAtMonth,
  } = input;

  const months = Math.max(0, Math.round(years * 12));
  const netAnnual = (annualRatePct - annualFeePct) / 100;
  // ריבית חודשית שקולה: (1+r)^(1/12)-1, עובד גם עבור תשואה שלילית עד -100%
  const monthlyRate = netAnnual <= -1 ? -1 : Math.pow(1 + netAnnual, 1 / 12) - 1;

  const points: ProjectionPoint[] = [];
  let value = initialShekels;
  let deposited = initialShekels;
  points.push({ month: 0, value, deposited });

  for (let m = 1; m <= months; m++) {
    value *= 1 + monthlyRate;
    const depositing =
      stopDepositsAtMonth === undefined || m < stopDepositsAtMonth;
    if (depositing) {
      value += monthlyDepositShekels;
      deposited += monthlyDepositShekels;
    }
    if (shock && shock.month === m) {
      value *= 1 + shock.changePct / 100;
    }
    value = Math.max(0, value);
    points.push({ month: m, value, deposited });
  }
  return points;
}

/** ערך סופי של תחזית. */
export function finalValue(input: ProjectionInput): number {
  const pts = project(input);
  return pts[pts.length - 1].value;
}

/**
 * השוואת גיל התחלה: אותה הפקדה חודשית ואותה הנחת תשואה,
 * התחלה בגילאים שונים עד גיל יעד משותף.
 */
export function compareStartAges(
  startAges: number[],
  targetAge: number,
  monthlyDepositShekels: number,
  annualRatePct: number
): { startAge: number; years: number; final: number; deposited: number }[] {
  return startAges.map((startAge) => {
    const years = Math.max(0, targetAge - startAge);
    const pts = project({
      initialShekels: 0,
      monthlyDepositShekels,
      annualRatePct,
      years,
    });
    const last = pts[pts.length - 1];
    return { startAge, years, final: last.value, deposited: last.deposited };
  });
}

/** כמה עולות עמלות לאורך זמן: הפרש בין תחזית בלי עמלה ועם עמלה. */
export function feeCost(
  base: Omit<ProjectionInput, "annualFeePct">,
  annualFeePct: number
): { withoutFee: number; withFee: number; cost: number } {
  const withoutFee = finalValue({ ...base, annualFeePct: 0 });
  const withFee = finalValue({ ...base, annualFeePct });
  return { withoutFee, withFee, cost: withoutFee - withFee };
}
