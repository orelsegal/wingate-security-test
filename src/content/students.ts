import type { Student } from "../data/types";

/**
 * רשימת תלמידות להדגמה בלבד. באפליקציה אמיתית הרשימה תגיע משכבת הנתונים
 * (adapter אחר שמממש את אותו interface) ולא מקובץ בקוד.
 */
export const demoStudents: Student[] = [
  { id: "s1", name: "נועה דוגמה", group: "כיתה א׳ להדגמה" },
  { id: "s2", name: "מאיה דוגמה", group: "כיתה א׳ להדגמה" },
  { id: "s3", name: "יעל דוגמה", group: "כיתה א׳ להדגמה" },
  { id: "s4", name: "שירה דוגמה", group: "כיתה ב׳ להדגמה" },
  { id: "s5", name: "תמר דוגמה", group: "כיתה ב׳ להדגמה" },
];
