/**
 * Auto-calculated traffic light system.
 * Determines status based on grades, submissions, and trends.
 */

export type TrafficStatus = "green" | "yellow" | "red";

interface TrafficInput {
  grade: number | null;
  completionPercent: number;
  missingItems: string[];
  absences?: number;
}

export interface TrafficResult {
  status: TrafficStatus;
  reasons: string[];
}

export function calculateTrafficLight(inputs: TrafficInput[]): TrafficResult {
  const reasons: string[] = [];
  let score = 100; // Start perfect, deduct

  const totalMissing = inputs.reduce((s, i) => s + (i.missingItems?.length || 0), 0);
  const grades = inputs.filter(i => i.grade != null && i.grade > 0).map(i => i.grade!);
  const avgGrade = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : null;
  const avgCompletion = inputs.length > 0
    ? inputs.reduce((s, i) => s + i.completionPercent, 0) / inputs.length
    : 0;
  const totalAbsences = inputs.reduce((s, i) => s + (i.absences || 0), 0);
  const lowGrades = grades.filter(g => g < 55).length;

  // Grade penalties
  if (avgGrade !== null) {
    if (avgGrade < 55) { score -= 40; reasons.push(`ממוצע ציונים נמוך (${Math.round(avgGrade)})`); }
    else if (avgGrade < 65) { score -= 20; reasons.push(`ממוצע ציונים ${Math.round(avgGrade)} — דורש שיפור`); }
    else if (avgGrade < 75) { score -= 10; }
  }

  // Missing submissions
  if (totalMissing >= 3) { score -= 30; reasons.push(`${totalMissing} משימות חסרות`); }
  else if (totalMissing >= 1) { score -= 15; reasons.push(`${totalMissing} משימות לא הוגשו`); }

  // Low completion
  if (avgCompletion < 30) { score -= 25; reasons.push("אחוז השלמה נמוך מאוד"); }
  else if (avgCompletion < 50) { score -= 10; reasons.push("אחוז השלמה חלקי"); }

  // Multiple failing subjects
  if (lowGrades >= 3) { score -= 20; reasons.push(`${lowGrades} מקצועות מתחת ל-55`); }
  else if (lowGrades >= 1) { score -= 10; reasons.push(`מקצוע אחד מתחת ל-55`); }

  // Absences
  if (totalAbsences > 15) { score -= 15; reasons.push(`${totalAbsences} חיסורים`); }
  else if (totalAbsences > 8) { score -= 5; }

  let status: TrafficStatus;
  if (score >= 70) status = "green";
  else if (score >= 40) status = "yellow";
  else status = "red";

  if (reasons.length === 0) {
    reasons.push("במסלול — כל הנתונים תקינים");
  }

  return { status, reasons };
}

export function getStatusLabel(status: TrafficStatus): string {
  switch (status) {
    case "green": return "במסלול";
    case "yellow": return "דורש תשומת לב";
    case "red": return "בסיכון";
  }
}

export function getStatusExplanation(result: TrafficResult): string {
  return result.reasons.join(" · ");
}
