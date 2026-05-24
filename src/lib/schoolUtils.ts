import type { UserRole } from "@/context/AuthContext";

/** Current academic semester label — update here when semester changes */
export const CURRENT_SEMESTER = "סמסטר א׳ תשפ״ה";

/** Map a raw class name (e.g. "יא'2") to its grade label (e.g. "י״א") */
export const classToGrade = (className: string): string => {
  if (!className) return "";
  if (className.startsWith("י״ב") || className.startsWith("יב")) return "י״ב";
  if (className.startsWith("י״א") || className.startsWith("יא")) return "י״א";
  if (
    className.startsWith("י׳") ||
    className.startsWith("י'") ||
    (className.startsWith("י") &&
      !className.startsWith("יא") &&
      !className.startsWith("י״א") &&
      !className.startsWith("יב") &&
      !className.startsWith("י״ב"))
  )
    return "י׳";
  if (className.startsWith("ט")) return "ט׳";
  return className;
};

/** Grade display order — from senior to freshman */
export const GRADE_ORDER = ["י״ב", "י״א", "י׳", "ט׳"] as const;

/** Human-readable titles per role, shown in home pages and header */
export const roleTitles: Record<UserRole, string> = {
  admin: "מרכז ניהול",
  teacher: "מרכז עבודה",
  student: "המרחב שלי",
  parent: "התקדמות הילד/ה",
  coach: "מרכז המאמן",
};
