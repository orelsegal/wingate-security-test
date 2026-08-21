/**
 * Wingate Learning Lite — domain contracts.
 *
 * Core components never import subject content. They only know these shapes.
 * A new subject = a new `src/content/course.ts` + `src/content/theme.ts`.
 */

/* ---------- Content model (comes from the single content file) ---------- */

export type FieldType = "short" | "long" | "choice";

export interface ContentField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  /** Only for type: "choice" */
  options?: string[];
  /** Minimum characters for the answer to count as filled (text fields). */
  minChars?: number;
}

/** A single station inside a unit — one station is shown per screen. */
export interface Step {
  id: string;
  title: string;
  prompt: string;
  hint?: string;
  fields: ContentField[];
}

export interface Unit {
  id: string;
  title: string;
  subtitle?: string;
  goal?: string;
  steps: Step[];
}

export interface Course {
  id: string;
  title: string;
  /** Short line shown on the student home screen. */
  intro?: string;
  units: Unit[];
}

/* ---------- Theme (per subject, visual + wording only) ---------- */

export interface SubjectTheme {
  /** e.g. "מקצוע לדוגמה" */
  subjectName: string;
  /** e.g. "30%" — shown as a small badge next to the name. */
  percentBadge?: string;
  /** Single extra colour for this subject. Everything else is the shared base. */
  accent: string;
  accentSoft: string;
  accentStrong: string;
  /** Short mark for the header (emoji or one/two letters). */
  icon: string;
  /** Wording metaphor — how this subject calls its units and stations. */
  words: {
    unit: string;
    units: string;
    step: string;
    steps: string;
    mapTitle: string;
    mapSubtitle: string;
  };
}

/* ---------- Progress model ---------- */

export type UnitStatus =
  | "locked"
  | "not_started"
  | "in_progress"
  | "submitted"
  | "returned"
  | "approved";

/** Answers: stepId -> fieldId -> value */
export type UnitAnswers = Record<string, Record<string, string>>;

export interface UnitProgress {
  unitId: string;
  status: Exclude<UnitStatus, "locked">;
  answers: UnitAnswers;
  /** Last station the student was on. */
  lastStepId?: string;
  submittedAt?: string;
  reviewedAt?: string;
  /** Teacher feedback, shown to the student on return / approval. */
  feedback?: string;
  updatedAt?: string;
}

export interface StudentProgress {
  studentId: string;
  /** Number of units unlocked from the start of the course (always >= 1). */
  unlockedCount: number;
  units: Record<string, UnitProgress>;
}

export interface Student {
  id: string;
  name: string;
  group?: string;
}

/* ---------- Data layer contract ---------- */

/**
 * The only surface the UI uses to read/write data.
 * The demo ships a local (browser storage) adapter; a real subject app can
 * implement the same interface over any backend without touching the UI.
 */
export interface DataAdapter {
  listStudents(): Promise<Student[]>;
  getStudent(studentId: string): Promise<Student>;
  getProgress(studentId: string): Promise<StudentProgress>;
  getAllProgress(): Promise<Record<string, StudentProgress>>;

  /** Student: save a draft of one station. */
  saveDraft(
    studentId: string,
    unitId: string,
    stepId: string,
    values: Record<string, string>,
  ): Promise<StudentProgress>;

  /** Student: hand the unit in for review. */
  submitUnit(studentId: string, unitId: string): Promise<StudentProgress>;

  /** Teacher: send the unit back with feedback. */
  returnForFix(
    studentId: string,
    unitId: string,
    feedback: string,
  ): Promise<StudentProgress>;

  /** Teacher: approve the unit (also opens the next one). */
  approveUnit(
    studentId: string,
    unitId: string,
    feedback?: string,
  ): Promise<StudentProgress>;

  /** Teacher: open the next unit without approving. */
  openNextUnit(studentId: string, unitId: string): Promise<StudentProgress>;

  /** Demo helper — reset local data. */
  resetAll(): Promise<void>;
}

export type Role = "student" | "teacher";

export interface Session {
  role: Role;
  studentId?: string;
  name: string;
}
