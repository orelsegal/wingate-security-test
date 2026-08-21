import type {
  Course,
  DataAdapter,
  Student,
  StudentProgress,
  UnitProgress,
} from "./types";
import { emptyUnitProgress } from "../core/logic/progress";

/**
 * Local demo adapter — browser storage only.
 * It exists so the template runs end to end with no backend.
 * A real subject app swaps this for another `DataAdapter` implementation
 * (Firestore / Supabase / API) without touching a single UI component.
 */

const STORAGE_PREFIX = "wgl";
const LATENCY_READ = 120;
const LATENCY_WRITE = 200;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();

type Store = Record<string, StudentProgress>;

function storageKey(courseId: string) {
  return `${STORAGE_PREFIX}:${courseId}:progress`;
}

function seedKey(courseId: string) {
  return `${STORAGE_PREFIX}:${courseId}:seeded`;
}

function readStore(courseId: string): Store {
  try {
    const raw = window.localStorage.getItem(storageKey(courseId));
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    throw new Error("לא הצלחנו לקרוא את הנתונים מהדפדפן");
  }
}

function writeStore(courseId: string, store: Store) {
  try {
    window.localStorage.setItem(storageKey(courseId), JSON.stringify(store));
  } catch {
    throw new Error("לא הצלחנו לשמור את הנתונים בדפדפן");
  }
}

const blank = (studentId: string): StudentProgress => ({
  studentId,
  unlockedCount: 1,
  units: {},
});

function unitOf(progress: StudentProgress, unitId: string): UnitProgress {
  return progress.units[unitId] ?? emptyUnitProgress(unitId);
}

export function createLocalAdapter(course: Course, students: Student[]): DataAdapter {
  const unitIndex = (unitId: string) => course.units.findIndex((u) => u.id === unitId);

  const load = (): Store => {
    if (window.localStorage.getItem(seedKey(course.id)) === "1") {
      return readStore(course.id);
    }
    const seeded = seed(course, students);
    writeStore(course.id, seeded);
    window.localStorage.setItem(seedKey(course.id), "1");
    return seeded;
  };

  const save = (store: Store) => writeStore(course.id, store);

  const mutate = async (
    studentId: string,
    fn: (progress: StudentProgress) => StudentProgress,
  ): Promise<StudentProgress> => {
    await wait(LATENCY_WRITE);
    const store = load();
    const next = fn(store[studentId] ?? blank(studentId));
    store[studentId] = next;
    save(store);
    return structuredClone(next);
  };

  const unlockThrough = (progress: StudentProgress, count: number): number =>
    Math.min(course.units.length, Math.max(progress.unlockedCount, count));

  return {
    async listStudents() {
      await wait(LATENCY_READ);
      return structuredClone(students);
    },

    async getStudent(studentId) {
      await wait(LATENCY_READ);
      const found = students.find((s) => s.id === studentId);
      if (!found) throw new Error("התלמידה לא נמצאה");
      return structuredClone(found);
    },

    async getProgress(studentId) {
      await wait(LATENCY_READ);
      const store = load();
      return structuredClone(store[studentId] ?? blank(studentId));
    },

    async getAllProgress() {
      await wait(LATENCY_READ);
      const store = load();
      const out: Record<string, StudentProgress> = {};
      for (const s of students) out[s.id] = structuredClone(store[s.id] ?? blank(s.id));
      return out;
    },

    saveDraft(studentId, unitId, stepId, values) {
      return mutate(studentId, (progress) => {
        const unit = unitOf(progress, unitId);
        const status =
          unit.status === "approved" || unit.status === "submitted"
            ? unit.status
            : unit.status === "returned"
              ? "returned"
              : "in_progress";
        return {
          ...progress,
          units: {
            ...progress.units,
            [unitId]: {
              ...unit,
              status,
              lastStepId: stepId,
              updatedAt: now(),
              answers: { ...unit.answers, [stepId]: { ...values } },
            },
          },
        };
      });
    },

    submitUnit(studentId, unitId) {
      return mutate(studentId, (progress) => ({
        ...progress,
        units: {
          ...progress.units,
          [unitId]: {
            ...unitOf(progress, unitId),
            status: "submitted",
            submittedAt: now(),
            updatedAt: now(),
          },
        },
      }));
    },

    returnForFix(studentId, unitId, feedback) {
      return mutate(studentId, (progress) => ({
        ...progress,
        units: {
          ...progress.units,
          [unitId]: {
            ...unitOf(progress, unitId),
            status: "returned",
            feedback,
            reviewedAt: now(),
            updatedAt: now(),
          },
        },
      }));
    },

    approveUnit(studentId, unitId, feedback) {
      return mutate(studentId, (progress) => {
        const idx = unitIndex(unitId);
        return {
          ...progress,
          unlockedCount: unlockThrough(progress, idx + 2),
          units: {
            ...progress.units,
            [unitId]: {
              ...unitOf(progress, unitId),
              status: "approved",
              feedback: feedback || unitOf(progress, unitId).feedback,
              reviewedAt: now(),
              updatedAt: now(),
            },
          },
        };
      });
    },

    openNextUnit(studentId, unitId) {
      return mutate(studentId, (progress) => ({
        ...progress,
        unlockedCount: unlockThrough(progress, unitIndex(unitId) + 2),
      }));
    },

    async resetAll() {
      await wait(LATENCY_WRITE);
      save(seed(course, students));
    },
  };
}

/* ---------- Demo seed ---------- */

const demoText = "טקסט דוגמה שנכתב לצורך הדגמת התבנית.";

function filledUnit(course: Course, unitId: string): UnitProgress["answers"] {
  const unit = course.units.find((u) => u.id === unitId);
  if (!unit) return {};
  const answers: UnitProgress["answers"] = {};
  for (const step of unit.steps) {
    answers[step.id] = {};
    for (const field of step.fields) {
      answers[step.id][field.id] =
        field.type === "choice" ? (field.options?.[0] ?? "") : demoText;
    }
  }
  return answers;
}

/**
 * Minimal seed so the teacher screen shows every status at least once.
 * Not real study data — placeholder text only.
 */
function seed(course: Course, students: Student[]): Store {
  const store: Store = {};
  const units = course.units;
  const stamp = "2026-01-01T09:00:00.000Z";

  students.forEach((student, i) => {
    const progress = blank(student.id);
    const pattern = i % 5;

    if (pattern === 1 && units[0]) {
      // בתהליך
      const u = units[0];
      const answers = filledUnit(course, u.id);
      const firstStep = u.steps[0]?.id;
      progress.units[u.id] = {
        unitId: u.id,
        status: "in_progress",
        answers: firstStep ? { [firstStep]: answers[firstStep] } : {},
        lastStepId: firstStep,
        updatedAt: stamp,
      };
    }

    if (pattern === 2 && units[0]) {
      // ממתינה לבדיקה
      progress.units[units[0].id] = {
        unitId: units[0].id,
        status: "submitted",
        answers: filledUnit(course, units[0].id),
        submittedAt: stamp,
        updatedAt: stamp,
      };
    }

    if (pattern === 3 && units[0]) {
      // חזרה לתיקון
      progress.units[units[0].id] = {
        unitId: units[0].id,
        status: "returned",
        answers: filledUnit(course, units[0].id),
        feedback: "משוב דוגמה: הרחיבי מעט את התשובה בתחנה הראשונה.",
        submittedAt: stamp,
        reviewedAt: stamp,
        updatedAt: stamp,
      };
    }

    if (pattern === 4 && units[0]) {
      // הושלם ואושר + היחידה הבאה נפתחה
      progress.units[units[0].id] = {
        unitId: units[0].id,
        status: "approved",
        answers: filledUnit(course, units[0].id),
        submittedAt: stamp,
        reviewedAt: stamp,
        feedback: "משוב דוגמה: עבודה מסודרת.",
        updatedAt: stamp,
      };
      progress.unlockedCount = Math.min(units.length, 2);
    }

    store[student.id] = progress;
  });

  return store;
}
