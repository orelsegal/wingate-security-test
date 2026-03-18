export type StatusType = "green" | "yellow" | "red";

export const statusConfig: Record<StatusType, {
  label: string;
  dotClass: string;
  bgClass: string;
  textClass: string;
  activeBg: string;
}> = {
  green: { label: "תקין", dotClass: "bg-success", bgClass: "bg-success/10", textClass: "text-success", activeBg: "bg-success/15 ring-1 ring-success/30" },
  yellow: { label: "במעקב", dotClass: "bg-warning", bgClass: "bg-warning/10", textClass: "text-warning", activeBg: "bg-warning/15 ring-1 ring-warning/30" },
  red: { label: "בסיכון", dotClass: "bg-destructive", bgClass: "bg-destructive/10", textClass: "text-destructive", activeBg: "bg-destructive/15 ring-1 ring-destructive/30" },
};

export interface StudentData {
  id: string;
  name: string;
  branch: string;
  grade: string;
  status: StatusType;
  avg: number;
}

export const studentsData: StudentData[] = [
  { id: "1", name: "יעל כהן", branch: "טניס", grade: "י׳", status: "green", avg: 58 },
  { id: "2", name: "אורי לוי", branch: "שחייה", grade: "י״א", status: "yellow", avg: 72 },
  { id: "3", name: "נועם ברק", branch: "כדורסל", grade: "י״ב", status: "yellow", avg: 69 },
  { id: "4", name: "מיכל אברהם", branch: "אתלטיקה", grade: "י׳", status: "red", avg: 54 },
  { id: "5", name: "דנה שרון", branch: "שחייה", grade: "י״א", status: "green", avg: 91 },
  { id: "6", name: "עידו גולן", branch: "כדורסל", grade: "י״ב", status: "green", avg: 88 },
  { id: "7", name: "שירה מזרחי", branch: "טניס", grade: "י׳", status: "green", avg: 85 },
  { id: "8", name: "רון אביב", branch: "התעמלות", grade: "י״א", status: "yellow", avg: 71 },
  { id: "9", name: "תמר פרידמן", branch: "אתלטיקה", grade: "י״ב", status: "green", avg: 92 },
  { id: "10", name: "איתי דוד", branch: "שחייה", grade: "י׳", status: "green", avg: 83 },
  { id: "11", name: "ליאור כץ", branch: "כדורסל", grade: "י״א", status: "red", avg: 52 },
  { id: "12", name: "הילה ניסים", branch: "התעמלות", grade: "י״ב", status: "green", avg: 87 },
];
