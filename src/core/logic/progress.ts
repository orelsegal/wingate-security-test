import type {
  ContentField,
  Course,
  Step,
  StudentProgress,
  Unit,
  UnitProgress,
  UnitStatus,
} from "../../data/types";

/* ---------- Status wording (verbal traffic light) ---------- */

type Tone = "locked" | "idle" | "active" | "wait" | "fix" | "done";

const STATUS_META: Record<UnitStatus, { teacher: string; student: string; tone: Tone }> = {
  locked: { teacher: "נעולה", student: "עדיין נעולה", tone: "locked" },
  not_started: { teacher: "לא התחילה", student: "לא התחלת", tone: "idle" },
  in_progress: { teacher: "בתהליך", student: "בתהליך", tone: "active" },
  submitted: { teacher: "ממתינה לבדיקה", student: "ממתינה לבדיקה", tone: "wait" },
  returned: { teacher: "חזרה לתיקון", student: "חזרה לתיקון", tone: "fix" },
  approved: { teacher: "הושלם ואושר", student: "הושלמה ואושרה", tone: "done" },
};

export const ALL_STATUSES: UnitStatus[] = [
  "not_started",
  "in_progress",
  "submitted",
  "returned",
  "approved",
];

export function statusLabel(status: UnitStatus, audience: "teacher" | "student" = "student") {
  return STATUS_META[status][audience];
}

export function statusTone(status: UnitStatus): Tone {
  return STATUS_META[status].tone;
}

/* ---------- Answers ---------- */

export function isFieldFilled(field: ContentField, value: string | undefined): boolean {
  const v = (value ?? "").trim();
  if (!v) return false;
  if (field.type === "choice") return true;
  return v.length >= (field.minChars ?? 1);
}

export function missingFields(step: Step, values: Record<string, string>): ContentField[] {
  return step.fields.filter((f) => f.required && !isFieldFilled(f, values[f.id]));
}

export function isStepComplete(step: Step, answers: UnitProgress["answers"]): boolean {
  return missingFields(step, answers[step.id] ?? {}).length === 0;
}

export function stepHasAnyAnswer(step: Step, answers: UnitProgress["answers"]): boolean {
  const values = answers[step.id] ?? {};
  return step.fields.some((f) => (values[f.id] ?? "").trim().length > 0);
}

/** A station counts as filled only when it was actually answered. */
export function unitCompletedSteps(unit: Unit, up: UnitProgress | undefined): number {
  if (!up) return 0;
  return unit.steps.filter((s) => stepHasAnyAnswer(s, up.answers) && isStepComplete(s, up.answers))
    .length;
}

export function isUnitComplete(unit: Unit, up: UnitProgress | undefined): boolean {
  return !!up && unitCompletedSteps(unit, up) === unit.steps.length;
}

/* ---------- Unit status ---------- */

export const emptyUnitProgress = (unitId: string): UnitProgress => ({
  unitId,
  status: "not_started",
  answers: {},
});

export function unitStatus(
  course: Course,
  progress: StudentProgress,
  unitIndex: number,
): UnitStatus {
  const unit = course.units[unitIndex];
  if (!unit) return "locked";
  if (unitIndex >= progress.unlockedCount) return "locked";
  return progress.units[unit.id]?.status ?? "not_started";
}

export interface UnitView {
  unit: Unit;
  index: number;
  status: UnitStatus;
  progress: UnitProgress;
  completedSteps: number;
  totalSteps: number;
}

export function buildUnitViews(course: Course, progress: StudentProgress): UnitView[] {
  return course.units.map((unit, index) => {
    const up = progress.units[unit.id] ?? emptyUnitProgress(unit.id);
    return {
      unit,
      index,
      status: unitStatus(course, progress, index),
      progress: up,
      completedSteps: unitCompletedSteps(unit, up),
      totalSteps: unit.steps.length,
    };
  });
}

/* ---------- Course level ---------- */

export interface CourseSummary {
  total: number;
  approved: number;
  percent: number;
  /** The unit the student should look at now, if any. */
  current?: UnitView;
  /** True when every unit is approved. */
  finished: boolean;
  /** True when nothing is open for the student right now (all handed in). */
  waiting: boolean;
}

export function summarize(course: Course, progress: StudentProgress): CourseSummary {
  const views = buildUnitViews(course, progress);
  const approved = views.filter((v) => v.status === "approved").length;
  const total = views.length;

  const actionable =
    views.find((v) => v.status === "returned") ??
    views.find((v) => v.status === "in_progress") ??
    views.find((v) => v.status === "not_started") ??
    views.find((v) => v.status === "submitted");

  return {
    total,
    approved,
    percent: total ? Math.round((approved / total) * 100) : 0,
    current: actionable,
    finished: approved === total && total > 0,
    waiting: !!actionable && actionable.status === "submitted",
  };
}

/** The station the student should land on inside a unit. */
export function resumeStepIndex(view: UnitView): number {
  const { unit, progress } = view;
  if (progress.lastStepId) {
    const i = unit.steps.findIndex((s) => s.id === progress.lastStepId);
    if (i >= 0) return i;
  }
  const firstOpen = unit.steps.findIndex((s) => !isStepComplete(s, progress.answers));
  return firstOpen >= 0 ? firstOpen : 0;
}

export const isReadOnly = (status: UnitStatus) =>
  status === "submitted" || status === "approved" || status === "locked";
