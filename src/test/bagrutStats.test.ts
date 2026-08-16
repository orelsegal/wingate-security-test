/**
 * מפת דרכים לבגרות — חוקי הספירה.
 * מה שנבדק כאן: תא ריק לעולם אינו נספר כהושלם, "חלקי" מוגדר מכנית,
 * לכל אחוז יש מונה ומכנה, והמשקל נקרא מכותרת העמודה ולא מומצא.
 * הנתונים כאן סינתטיים ומשמשים לבדיקת הכללים בלבד.
 */
import { describe, it, expect } from "vitest";
import {
  studentBagrut, bandTally, overallCompletion, completionBySubject,
  completionBySubjectAndGrade, componentBreakdown, mostMissing, mathReport, weightOf,
} from "@/lib/bagrutStats";
import { bagrutColumns } from "@/data/bagrutColumns";
import { sectionForClass } from "@/lib/bagrutView";

/** כל עמודות השכבה מלאות — תלמיד שהשלים הכול.
 *  המפתח נגזר מאותה פונקציה שהמסך משתמש בה, כדי שלא ייווצר פער. */
const fullSheet = (cls = "יא 2") =>
  Object.fromEntries((bagrutColumns[sectionForClass(cls) as string] ?? []).map(c => [c, "80"]));

/* עמודות אמיתיות משכבת י״א, עם ערכים סינתטיים */
const S = (id: string, name: string, cls: string, sport: string) =>
  ({ id, full_name: name, class_name: cls, sport });

const sheet = (over: Record<string, string> = {}) => ({
  "תנך 30% 1263": "", 'תנ"ך 70% 1261': "",
  "ספרות 30% אילנה": "", "ספרות 70% אילנה": "",
  "אזרחות 70%": "", "אזרחות 30% 34283": "",
  "מתמטיקה 371-471-571": "", "מתמטיקה 372-472-572": "", "פנימי מתמטיקה": "",
  ...over,
});

describe("ספירת רכיבים", () => {
  it("תא ריק נספר כחסר, לעולם לא כהושלם", () => {
    const r = studentBagrut(S("1", "א", "יא 1", "שחייה"), sheet({ "אזרחות 70%": "85" }));
    expect(r.filled).toBe(1);
    expect(r.missing).toBe(r.total - 1);
    expect(r.total).toBeGreaterThan(1);
  });

  it("רווחים בלבד אינם ציון", () => {
    const r = studentBagrut(S("1", "א", "יא 1", ""), sheet({ "אזרחות 70%": "   " }));
    expect(r.filled).toBe(0);
  });

  it("ללא גיליון — 'לא הוזן', לא 'במסלול' ולא אפס חוסרים", () => {
    const r = studentBagrut(S("1", "א", "יא 1", ""), undefined);
    expect(r.hasSheet).toBe(false);
    expect(r.band).toBe("לא הוזן");
    expect(r.total).toBe(0);
  });

  it("מצב מקצוע: הושלם / חלקי / לא הוזן — מוגדר מכנית", () => {
    const r = studentBagrut(S("1", "א", "יא 1", ""),
      sheet({ "אזרחות 70%": "90", "אזרחות 30% 34283": "80", "ספרות 30% אילנה": "70" }));
    const by = Object.fromEntries(r.bySubject.map(g => [g.subject, g.state]));
    expect(by["אזרחות"]).toBe("הושלם");
    expect(by["ספרות"]).toBe("חלקי");
    expect(by["תנ״ך"]).toBe("לא הוזן");
  });
});

describe("סיכומים מסונננים", () => {
  const rows = [
    studentBagrut(S("1", "א", "יא 1", "שחייה"), sheet({ "אזרחות 70%": "90" })),      // הרבה חסרים
    studentBagrut(S("2", "ב", "יא 2", "טניס"), fullSheet()),                          // הכול מלא
    studentBagrut(S("3", "ג", "י 1", "כדורסל"), undefined),                            // ללא גיליון
  ];

  it("כל מצב מקבל כמות ואחוז מתוך אותו מכנה", () => {
    const t = bandTally(rows);
    expect(t.map(x => x.band)).toEqual(["אדום", "צהוב", "ירוק", "לא הוזן"]);
    expect(t.reduce((n, x) => n + x.count, 0)).toBe(3);
    expect(t.find(x => x.band === "לא הוזן")!.count).toBe(1);
    expect(t.find(x => x.band === "ירוק")!.count).toBe(1);
    expect(t.find(x => x.band === "לא הוזן")!.pct).toBe(33);
  });

  it("אחוז ההשלמה הכללי הוא מונה חלקי מכנה אמיתי", () => {
    const o = overallCompletion(rows);
    expect(o.total).toBe(rows[0].total + rows[1].total);
    expect(o.filled).toBe(1 + rows[1].filled);
    expect(rows[1].missing).toBe(0);
    expect(o.pct).toBe(Math.round((o.filled / o.total) * 100));
  });

  it("אחוז לפי מקצוע נשען על רכיבי אותו מקצוע בלבד", () => {
    const civics = completionBySubject(rows).find(s => s.subject === "אזרחות")!;
    expect(civics.students).toBe(2);            // רק תלמידים עם גיליון
    expect(civics.filled).toBe(3);              // 1 אצל הראשון + 2 אצל השני
    expect(civics.pct).toBe(Math.round((civics.filled / civics.total) * 100));
  });

  it("מטריצת מקצוע × שכבה מפרידה בין השכבות", () => {
    const m = completionBySubjectAndGrade(rows);
    expect(m.grades.length).toBeGreaterThan(0);
    const civics = m.rows.find(r => r.subject === "אזרחות")!;
    expect(civics.totalCell.filled).toBe(3);
  });

  it("פירוט לפי רכיב סופר תלמידים, והמשקל נקרא מהכותרת", () => {
    const civics = componentBreakdown(rows).find(s => s.subject === "אזרחות")!;
    const c70 = civics.components.find(c => c.label === "אזרחות 70%")!;
    expect(c70.students).toBe(2);
    expect(c70.filled).toBe(2);
    expect(c70.weight).toBe("70%");
    expect(weightOf("E 16471 אנגלית נופר")).toBeNull();
    expect(weightOf("שאלון G 16582 נופר")).toBeNull();
  });

  it("קבוצת הטיפול מדורגת לפי מספר החוסרים בפועל", () => {
    const risk = mostMissing(rows);
    expect(risk[0].id).toBe("1");
    expect(risk.every(r => r.hasSheet)).toBe(true);
  });

  it("דוח המתמטיקה מציג רכיבים ואינו גוזר יחידות לימוד", () => {
    const m = mathReport(rows);
    expect(m.length).toBe(2);
    expect(m[0].cells.every(c => typeof c.label === "string")).toBe(true);
    expect(m[0].total).toBe(3);
  });
});
