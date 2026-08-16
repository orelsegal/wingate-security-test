/**
 * מפת דרכים לבגרות — שכבת החישוב.
 *
 * כל מספר כאן נגזר מכניקה מגיליון הבגרות האמיתי (student_bagrut_data):
 * "רכיב" = עמודה אחת בגיליון של אותה שכבה; "הושלם" = התא אינו ריק;
 * "חסר" = התא ריק. אין ציון מומצא, אין השלמה, אין ממוצע משוקלל ואין
 * ניחוש. כל פונקציה כאן טהורה וניתנת לבדיקה.
 *
 * שים לב: "בתהליך" ברמת הרכיב אינו קיים בנתונים שלנו — לתא יש ערך או
 * שאין. ברמת המקצוע כן ניתן להגדיר "חלקי" מכנית: חלק מהרכיבים הוזנו.
 * ההגדרה הזו מוצגת למשתמש על המסך ואינה מסתתרת בקוד.
 */
import { groupBagrut, sectionForClass, type BagrutGroup } from "@/lib/bagrutView";
import { bagrutBand, type BagrutBand } from "@/lib/learningTraffic";
import { classToGrade } from "@/lib/schoolUtils";

/** מצב תלמיד — ארבע הקבוצות שמובילות לפעולה */
export type StudentBand = BagrutBand | "לא הוזן";
export const STUDENT_BANDS: StudentBand[] = ["אדום", "צהוב", "ירוק", "לא הוזן"];

/** מצב מקצוע אצל תלמיד יחיד */
export type SubjectState = "הושלם" | "חלקי" | "לא הוזן";

export interface SubjectSlice {
  subject: string;
  total: number;
  filled: number;
  missing: number;
  pct: number;
  state: SubjectState;
}

export interface StudentBagrut {
  id: string;
  name: string;
  className: string;
  grade: string;
  sport: string;
  groups: BagrutGroup[];
  total: number;
  filled: number;
  missing: number;
  pct: number;
  hasSheet: boolean;
  band: StudentBand;
  bySubject: SubjectSlice[];
}

export interface StudentInput {
  id: string;
  full_name: string;
  class_name?: string | null;
  sport?: string | null;
}

const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const sliceState = (filled: number, total: number): SubjectState =>
  total === 0 || filled === 0 ? "לא הוזן" : filled === total ? "הושלם" : "חלקי";

/** תלמיד אחד: הגיליון שלו → ספירה מכנית לפי מקצוע ובסך הכול. */
export function studentBagrut(s: StudentInput, rec: Record<string, unknown> | undefined): StudentBagrut {
  const groups = rec ? groupBagrut(sectionForClass(s.class_name), rec) : [];
  const bySubject: SubjectSlice[] = groups.map(g => {
    const total = g.items.length;
    const filled = g.items.filter(it => it.value.trim() !== "").length;
    return { subject: g.subject, total, filled, missing: total - filled, pct: pctOf(filled, total), state: sliceState(filled, total) };
  });
  const total = bySubject.reduce((n, g) => n + g.total, 0);
  const filled = bySubject.reduce((n, g) => n + g.filled, 0);
  const missing = total - filled;
  const hasSheet = !!rec && total > 0;
  return {
    id: s.id,
    name: s.full_name,
    className: s.class_name || "",
    grade: classToGrade(s.class_name || "") || "",
    sport: s.sport || "",
    groups, bySubject,
    total, filled, missing,
    pct: pctOf(filled, total),
    hasSheet,
    band: hasSheet ? bagrutBand(missing) : "לא הוזן",
  };
}

/** ספירת תלמידים לפי מצב — הבסיס לכרטיסי הסיכום ולתרשים ההתפלגות. */
export interface BandTally { band: StudentBand; count: number; pct: number }
export function bandTally(rows: StudentBagrut[]): BandTally[] {
  const c: Record<StudentBand, number> = { "אדום": 0, "צהוב": 0, "ירוק": 0, "לא הוזן": 0 };
  rows.forEach(r => { c[r.band]++; });
  return STUDENT_BANDS.map(band => ({ band, count: c[band], pct: pctOf(c[band], rows.length) }));
}

/** סך הרכיבים על פני התלמידים המסוננים. */
export interface Completion { total: number; filled: number; missing: number; pct: number }
export function overallCompletion(rows: StudentBagrut[]): Completion {
  const total = rows.reduce((n, r) => n + r.total, 0);
  const filled = rows.reduce((n, r) => n + r.filled, 0);
  return { total, filled, missing: total - filled, pct: pctOf(filled, total) };
}

/** אחוז השלמה לכל מקצוע, על פני התלמידים המסוננים. */
export interface SubjectCompletion extends Completion { subject: string; students: number }
export function completionBySubject(rows: StudentBagrut[]): SubjectCompletion[] {
  const m = new Map<string, { total: number; filled: number; students: number }>();
  rows.forEach(r => r.bySubject.forEach(g => {
    const cur = m.get(g.subject) || { total: 0, filled: 0, students: 0 };
    cur.total += g.total; cur.filled += g.filled; cur.students += 1;
    m.set(g.subject, cur);
  }));
  return [...m.entries()]
    .map(([subject, v]) => ({ subject, students: v.students, total: v.total, filled: v.filled, missing: v.total - v.filled, pct: pctOf(v.filled, v.total) }))
    .sort((a, b) => a.pct - b.pct || a.subject.localeCompare(b.subject, "he"));
}

/** מטריצת מקצוע × שכבה — איפה בדיוק נמצא הפער. */
export interface SubjectGradeMatrix {
  grades: string[];
  rows: { subject: string; cells: Record<string, Completion | undefined>; totalCell: Completion }[];
}
export function completionBySubjectAndGrade(rows: StudentBagrut[]): SubjectGradeMatrix {
  const grades = [...new Set(rows.map(r => r.grade).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));
  const acc = new Map<string, Map<string, { total: number; filled: number }>>();
  rows.forEach(r => r.bySubject.forEach(g => {
    const byGrade = acc.get(g.subject) || new Map();
    const cur = byGrade.get(r.grade) || { total: 0, filled: 0 };
    cur.total += g.total; cur.filled += g.filled;
    byGrade.set(r.grade, cur);
    acc.set(g.subject, byGrade);
  }));
  const out = [...acc.entries()].map(([subject, byGrade]) => {
    const cells: Record<string, Completion | undefined> = {};
    let t = 0, f = 0;
    grades.forEach(gr => {
      const v = byGrade.get(gr);
      if (v) { cells[gr] = { total: v.total, filled: v.filled, missing: v.total - v.filled, pct: pctOf(v.filled, v.total) }; t += v.total; f += v.filled; }
    });
    return { subject, cells, totalCell: { total: t, filled: f, missing: t - f, pct: pctOf(f, t) } };
  }).sort((a, b) => a.totalCell.pct - b.totalCell.pct);
  return { grades, rows: out };
}

/** פירוט לפי מקצוע ורכיב — כמה תלמידים השלימו כל רכיב בנפרד.
 *  התווית היא כותרת העמודה בגיליון כלשונה, כולל המשקל שכתוב בה. */
export interface ComponentStat { label: string; weight: string | null; filled: number; students: number; pct: number }
export interface SubjectComponents { subject: string; components: ComponentStat[] }

/** המשקל כפי שהוא רשום בכותרת העמודה — לא מחושב ולא מומצא. */
export const weightOf = (label: string): string | null => {
  const m = label.match(/(\d{1,3})\s*%/);
  return m ? `${m[1]}%` : null;
};

export function componentBreakdown(rows: StudentBagrut[]): SubjectComponents[] {
  const acc = new Map<string, Map<string, { filled: number; students: number }>>();
  rows.forEach(r => r.groups.forEach(g => {
    const byLabel = acc.get(g.subject) || new Map();
    g.items.forEach(it => {
      const cur = byLabel.get(it.label) || { filled: 0, students: 0 };
      cur.students += 1;
      if (it.value.trim() !== "") cur.filled += 1;
      byLabel.set(it.label, cur);
    });
    acc.set(g.subject, byLabel);
  }));
  return [...acc.entries()].map(([subject, byLabel]) => ({
    subject,
    components: [...byLabel.entries()]
      .map(([label, v]) => ({ label, weight: weightOf(label), filled: v.filled, students: v.students, pct: pctOf(v.filled, v.students) }))
      .sort((a, b) => a.pct - b.pct),
  })).sort((a, b) => a.subject.localeCompare(b.subject, "he"));
}

/** התלמידים עם הכי הרבה רכיבים חסרים — קבוצת הפעולה. */
export function mostMissing(rows: StudentBagrut[], limit = 12): StudentBagrut[] {
  return rows.filter(r => r.hasSheet && r.missing > 0)
    .sort((a, b) => b.missing - a.missing || a.name.localeCompare(b.name, "he"))
    .slice(0, limit);
}

/* ── דוח מתמטיקה ───────────────────────────────────────────────────────
   הגיליון מחזיק את עמודות המתמטיקה כלשונן (שאלונים 371/372 וסדרותיהם,
   ציון פנימי, ציון שנתי ובשכבת ז׳–ט׳ גם עמודת מוגבר). מספר יחידות
   הלימוד עצמו אינו עמודה בגיליון, ולכן הדוח מציג רכיבים ולא גוזר יח״ל. */
export interface MathRow { id: string; name: string; className: string; cells: { label: string; value: string }[]; filled: number; total: number }
export function mathReport(rows: StudentBagrut[]): MathRow[] {
  return rows.map(r => {
    const g = r.groups.find(x => x.subject === "מתמטיקה");
    const cells = (g?.items || []).map(it => ({ label: it.label, value: it.value.trim() }));
    return {
      id: r.id, name: r.name, className: r.className, cells,
      filled: cells.filter(c => c.value !== "").length,
      total: cells.length,
    };
  }).filter(r => r.total > 0)
    .sort((a, b) => a.filled - b.filled || a.name.localeCompare(b.name, "he"));
}
