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
  { id: "1", name: "נועם שטיינר", branch: "טניס", grade: "י׳", status: "green", avg: 58 },
  { id: "2", name: "אביתר נאור", branch: "שחייה", grade: "י״א", status: "yellow", avg: 72 },
  { id: "3", name: "שקד כץ", branch: "כדורסל", grade: "י״ב", status: "yellow", avg: 69 },
  { id: "4", name: "ליאה חשאי", branch: "אתלטיקה", grade: "י׳", status: "red", avg: 54 },
  { id: "5", name: "נינה אריאל", branch: "שחייה", grade: "י״א", status: "green", avg: 91 },
  { id: "6", name: "נוגה נקמורה נהרין", branch: "כדורסל", grade: "י״ב", status: "green", avg: 88 },
  { id: "7", name: "עדן רייזלמן", branch: "טניס", grade: "י׳", status: "green", avg: 85 },
  { id: "8", name: "אלון שטיינר", branch: "התעמלות", grade: "י״א", status: "yellow", avg: 71 },
  { id: "9", name: "כפיר גרנדיר", branch: "אתלטיקה", grade: "י״ב", status: "green", avg: 92 },
  { id: "10", name: "עומר גוזלן", branch: "שחייה", grade: "י׳", status: "green", avg: 83 },
  { id: "11", name: "ניקול גולובנסקי", branch: "כדורסל", grade: "י״א", status: "red", avg: 52 },
  { id: "12", name: "אופיר שמחה", branch: "התעמלות", grade: "י״ב", status: "green", avg: 87 },
  { id: "13", name: "אביגיל בן צבי", branch: "טניס", grade: "י׳", status: "green", avg: 79 },
  { id: "14", name: "קרני נעמה", branch: "שחייה", grade: "י״א", status: "green", avg: 84 },
  { id: "15", name: "יאנה פופוביץ", branch: "כדורסל", grade: "י״ב", status: "yellow", avg: 67 },
  { id: "16", name: "דניאלה גונזלס", branch: "אתלטיקה", grade: "י׳", status: "green", avg: 90 },
  { id: "17", name: "ארבל פרנק", branch: "התעמלות", grade: "י״א", status: "green", avg: 86 },
  { id: "18", name: "רוני רוזנפלד", branch: "שחייה", grade: "י״ב", status: "green", avg: 81 },
  { id: "19", name: "מיקה המאירי", branch: "טניס", grade: "י׳", status: "yellow", avg: 65 },
  { id: "20", name: "תום רגב", branch: "כדורסל", grade: "י״א", status: "green", avg: 88 },
  { id: "21", name: "חנוך שעשוע", branch: "אתלטיקה", grade: "י״ב", status: "green", avg: 77 },
  { id: "22", name: "ליבי גור קורן", branch: "התעמלות", grade: "י׳", status: "green", avg: 93 },
  { id: "23", name: "כפיר פרנק", branch: "שחייה", grade: "י״א", status: "yellow", avg: 68 },
  { id: "24", name: "ליה המאירי", branch: "כדורסל", grade: "י״ב", status: "green", avg: 82 },
  { id: "25", name: "יעל אורון", branch: "טניס", grade: "י׳", status: "green", avg: 89 },
  { id: "26", name: "יעל עטר", branch: "אתלטיקה", grade: "י״א", status: "red", avg: 51 },
  { id: "27", name: "איתן חרמצקי", branch: "התעמלות", grade: "י״ב", status: "green", avg: 80 },
  { id: "28", name: "הראל מור", branch: "שחייה", grade: "י׳", status: "green", avg: 76 },
  { id: "29", name: "טום שמחייב", branch: "כדורסל", grade: "י״א", status: "green", avg: 85 },
  { id: "30", name: "עדי דרור", branch: "אתלטיקה", grade: "י״ב", status: "yellow", avg: 70 },
  { id: "31", name: "רומי דולוטוב", branch: "טניס", grade: "י׳", status: "green", avg: 87 },
];
