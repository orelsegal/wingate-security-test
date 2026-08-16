import * as XLSX from "xlsx";
import type { StudentBagrut } from "@/lib/bagrutStats";
import { metaFor } from "@/lib/learningTraffic";

/**
 * ייצוא לאקסל של מה שמוצג על המסך כרגע — אותו dataset מסונן, לא יותר.
 *
 * הקובץ נוצר בדפדפן ואינו נשלח לשום שרת. הוא מכיל את אותם נתונים
 * שהמשתמש כבר רואה: RLS בשרת כבר צמצם את השורות לפי התפקיד, ולכן
 * הייצוא אינו יכול לחשוף יותר ממה שהוצג. אין ייצוא של תעודות זהות.
 */
export function exportBagrutXlsx(rows: StudentBagrut[], filterNote: string) {
  const wb = XLSX.utils.book_new();

  const summary = rows.map(r => ({
    "שם": r.name,
    "כיתה": r.className,
    "ענף": r.sport,
    "מצב": metaFor(r.hasSheet ? (r.band as "אדום" | "צהוב" | "ירוק") : null).label,
    "רכיבים שהושלמו": r.filled,
    "רכיבים חסרים": r.missing,
    "סה״כ רכיבים": r.total,
    "אחוז השלמה": r.total ? `${r.pct}%` : "",
  }));
  const ws1 = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, ws1, "תלמידים");

  const detail: Record<string, string | number>[] = [];
  rows.forEach(r => r.groups.forEach(g => g.items.forEach(it => {
    detail.push({
      "שם": r.name,
      "כיתה": r.className,
      "מקצוע": g.subject,
      "רכיב": it.label,
      "ערך": it.value.trim(),
      "מצב רכיב": it.value.trim() === "" ? "חסר" : "הושלם",
    });
  })));
  if (detail.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), "רכיבים");
  }

  const meta = [
    { "שדה": "מקור", "ערך": "גיליון הבגרות במערכת (student_bagrut_data), כלשונו" },
    { "שדה": "סינון פעיל", "ערך": filterNote },
    { "שדה": "מספר תלמידים בייצוא", "ערך": String(rows.length) },
    { "שדה": "הגדרת חסר", "ערך": "תא ריק בגיליון של אותה שכבה" },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(meta), "הסבר");

  XLSX.writeFile(wb, "מפת-דרכים-לבגרות.xlsx");
}
