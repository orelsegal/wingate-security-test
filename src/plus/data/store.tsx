/* eslint-disable react-refresh/only-export-components */
/**
 * שכבת הנתונים של "פלוס" — שמירה מקומית במכשיר בלבד.
 * אין שרת, אין analytics, אין חיבור בנקאי.
 * הממשק (PlusStore) מרוכז כאן כדי שבעתיד יהיה אפשר להחליף את המימוש
 * ב-Supabase בלי לגעת במסכים.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  PlusState,
  Transaction,
  Goal,
  OnboardingAnswers,
  FirstClientTrack,
  LessonProgress,
  FirstClientStepId,
} from "./types";
import {
  DEFAULT_SPLIT,
  splitAmount,
  weeklyStreak,
  savingRatePct,
  type SplitPercents,
  type Agorot,
} from "../lib/money";
import { LESSONS, BADGES } from "./content";

const USER_KEY = "plus.user.v1";
const DEMO_KEY = "plus.demo.v1";

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** hash פשוט לקוד ההורה — הפרדת מצבים במכשיר, לא מנגנון אבטחה. */
export function simpleHash(code: string): string {
  let h = 5381;
  for (let i = 0; i < code.length; i++) h = (h * 33) ^ code.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export function emptyFirstClient(): FirstClientTrack {
  return {
    ideaId: null,
    serviceText: "",
    priceText: "",
    availabilityText: "",
    contacts: [],
    steps: {
      chooseService: false,
      writeOffer: false,
      pickContacts: false,
      trackAsks: false,
      firstJob: false,
      gotPaid: false,
      askedReview: false,
      reflection: false,
    },
    lessonsLearned: "",
  };
}

export function emptyState(): PlusState {
  return {
    version: 1,
    onboarded: false,
    name: "",
    answers: {
      dream: "",
      earnedBefore: "",
      startingAmount: null,
      weeklyHours: null,
      skills: [],
    },
    split: { ...DEFAULT_SPLIT },
    transactions: [],
    goals: [],
    lessons: {},
    firstClient: emptyFirstClient(),
    parent: {
      codeHash: null,
      approvals: {},
      contentReviewedAt: null,
      shareSummary: false,
    },
    activityDates: [],
    manualBadges: {},
    reduceMotion: false,
  };
}

/** פרופיל הדגמה — "אגם". נשמר במפתח נפרד ואינו נוגע בנתוני המשתמשת. */
export function demoState(): PlusState {
  const s = emptyState();
  const today = todayIso();
  s.onboarded = true;
  s.name = "אגם";
  s.answers = {
    dream: "מחשב נייד משלי ועצמאות כלכלית",
    earnedBefore: "yes",
    startingAmount: 35000,
    weeklyHours: 4,
    skills: ["עריכת סרטונים", "עזרה לילדים", "טיפול בחיות"],
  };
  const goalId = "demo-laptop";
  s.goals = [
    {
      id: goalId,
      name: "מחשב נייד",
      targetAmount: 320000,
      targetDate: null,
      reason: "לעריכת סרטונים וללימודים",
      saved: 20000,
      plannedDeposit: 3600,
      plannedCadence: "weekly",
      createdAt: today,
      achievedAt: null,
    },
  ];
  s.transactions = [
    {
      id: "demo-start",
      kind: "income",
      amount: 35000,
      date: today,
      category: "סכום התחלתי",
      note: "כסף שנחסך עד היום",
    },
    {
      id: "demo-babysit",
      kind: "income",
      amount: 12000,
      date: today,
      category: "בייביסיטר",
      note: "ערב אצל משפחת כהן",
      split: { future: 6000, goals: 3600, fun: 2400 },
    },
    {
      id: "demo-saving",
      kind: "saving",
      amount: 3600,
      date: today,
      category: "הפקדה למטרה",
      goalId,
    },
  ];
  s.activityDates = [today];
  return s;
}

function load(key: string): PlusState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlusState;
    if (parsed?.version !== 1) return null;
    return { ...emptyState(), ...parsed };
  } catch {
    return null;
  }
}

function save(key: string, state: PlusState) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // אחסון מלא או חסום — האפליקציה ממשיכה לעבוד בזיכרון
  }
}

/* ── נתונים נגזרים ─────────────────────────────────────────── */

export interface MonthSummary {
  incomeAg: Agorot;
  savedAg: Agorot;
  spentAg: Agorot;
  savingRate: number | null;
  bucketTotals: { future: Agorot; goals: Agorot; fun: Agorot };
}

export function monthSummary(state: PlusState, ym: string): MonthSummary {
  const txs = state.transactions.filter((t) => t.date.startsWith(ym));
  let incomeAg = 0,
    savedAg = 0,
    spentAg = 0;
  const bucketTotals = { future: 0, goals: 0, fun: 0 };
  for (const t of txs) {
    if (t.kind === "income" || t.kind === "gift" || t.kind === "refund") {
      incomeAg += t.amount;
      if (t.split) {
        bucketTotals.future += t.split.future;
        bucketTotals.goals += t.split.goals;
        bucketTotals.fun += t.split.fun;
      }
    } else if (t.kind === "saving") {
      savedAg += t.amount;
    } else if (t.kind === "expense") {
      spentAg += t.amount;
    }
  }
  return {
    incomeAg,
    savedAg,
    spentAg,
    savingRate: savingRatePct(savedAg, incomeAg),
    bucketTotals,
  };
}

/** "השווי שבנית" — כסף זמין + חסכונות. חוב לעולם לא נספר כהישג. */
export function netWorth(state: PlusState): Agorot {
  let total = 0;
  for (const t of state.transactions) {
    if (t.kind === "income" || t.kind === "gift" || t.kind === "refund") total += t.amount;
    else if (t.kind === "expense") total -= t.amount;
    // הפקדת חיסכון מעבירה כסף בין כיסים — לא משנה את השווי הכולל
  }
  return Math.max(0, total);
}

export function earnedBadges(state: PlusState): Record<string, boolean> {
  const streak = weeklyStreak(state.activityDates, todayIso());
  const derived: Record<string, boolean> = {
    "first-record": state.transactions.length > 0,
    "streak-4": streak >= 4,
    "first-client": state.firstClient.steps.gotPaid,
    "asked-review": state.firstClient.steps.askedReview,
    "understood-fee": !!state.lessons["fees"]?.completedAt,
    "stayed-in-plan": !!state.manualBadges["stayed-in-plan"],
  };
  const result: Record<string, boolean> = {};
  for (const b of BADGES) {
    result[b.id] = b.kind === "manual" ? !!state.manualBadges[b.id] : !!derived[b.id];
  }
  // תרחיש ירידה נרשם דרך manualBadges על ידי המעבדה (פעולה נגזרת ממסך)
  return result;
}

/** מספר השיעורים שהושלמו ומצב הנעילה של שיעור. */
export function lessonUnlocked(state: PlusState, lessonId: string): boolean {
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return false;
  if (lesson.index === 1) return true;
  const prev = LESSONS.find((l) => l.index === lesson.index - 1);
  return prev ? !!state.lessons[prev.id]?.completedAt : false;
}

/* ── ה-store עצמו ──────────────────────────────────────────── */

export interface PlusStore {
  state: PlusState;
  isDemo: boolean;
  update: (fn: (prev: PlusState) => PlusState) => void;
  /** רישום פעולה משמעותית (לרצף השבועי) */
  recordActivity: () => void;
  addTransaction: (tx: Omit<Transaction, "id">) => Transaction;
  applySplitToIncome: (txId: string, percents: SplitPercents, goalId: string | null) => void;
  addGoal: (goal: Omit<Goal, "id" | "createdAt" | "achievedAt">) => boolean;
  depositToGoal: (goalId: string, amount: Agorot, date: string) => void;
  updateGoal: (goalId: string, patch: Partial<Goal>) => void;
  deleteGoal: (goalId: string) => void;
  completeLesson: (lessonId: string, progress: LessonProgress) => void;
  setFirstClientStep: (step: FirstClientStepId, done: boolean) => void;
  finishOnboarding: (name: string, answers: OnboardingAnswers) => void;
  setDemoMode: (on: boolean) => void;
  exportData: () => string;
  deleteAllData: () => void;
}

const PlusContext = createContext<PlusStore | null>(null);

export function PlusProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(false);
  const [state, setState] = useState<PlusState>(() => load(USER_KEY) ?? emptyState());

  useEffect(() => {
    save(isDemo ? DEMO_KEY : USER_KEY, state);
  }, [state, isDemo]);

  const update = useCallback((fn: (prev: PlusState) => PlusState) => {
    setState((prev) => fn(prev));
  }, []);

  const recordActivity = useCallback(() => {
    const today = todayIso();
    setState((prev) =>
      prev.activityDates.includes(today)
        ? prev
        : { ...prev, activityDates: [...prev.activityDates.slice(-365), today] }
    );
  }, []);

  const addTransaction = useCallback(
    (tx: Omit<Transaction, "id">): Transaction => {
      const full: Transaction = { ...tx, id: newId() };
      setState((prev) => ({
        ...prev,
        transactions: [full, ...prev.transactions],
        activityDates: prev.activityDates.includes(todayIso())
          ? prev.activityDates
          : [...prev.activityDates.slice(-365), todayIso()],
      }));
      return full;
    },
    []
  );

  const applySplitToIncome = useCallback(
    (txId: string, percents: SplitPercents, goalId: string | null) => {
      setState((prev) => {
        const tx = prev.transactions.find((t) => t.id === txId);
        if (!tx) return prev;
        const split = splitAmount(tx.amount, percents);
        const transactions = prev.transactions.map((t) =>
          t.id === txId ? { ...t, split } : t
        );
        // חלק "העתיד" וחלק "מטרות" נרשמים כהפקדות חיסכון
        const deposits: Transaction[] = [];
        if (split.future > 0) {
          deposits.push({
            id: newId(),
            kind: "saving",
            amount: split.future,
            date: tx.date,
            category: "עתיד — חיסכון והשקעה",
          });
        }
        if (split.goals > 0) {
          deposits.push({
            id: newId(),
            kind: "saving",
            amount: split.goals,
            date: tx.date,
            category: goalId ? "הפקדה למטרה" : "מטרות — חיסכון כללי",
            goalId: goalId ?? undefined,
          });
        }
        const goals = goalId
          ? prev.goals.map((g) => {
              if (g.id !== goalId) return g;
              const saved = g.saved + split.goals;
              return {
                ...g,
                saved,
                achievedAt:
                  saved >= g.targetAmount && !g.achievedAt ? todayIso() : g.achievedAt,
              };
            })
          : prev.goals;
        return { ...prev, transactions: [...deposits, ...transactions], goals };
      });
    },
    []
  );

  const addGoal = useCallback(
    (goal: Omit<Goal, "id" | "createdAt" | "achievedAt">): boolean => {
      let ok = false;
      setState((prev) => {
        const active = prev.goals.filter((g) => !g.achievedAt);
        if (active.length >= 3) return prev; // עד שלוש מטרות פעילות
        ok = true;
        return {
          ...prev,
          goals: [
            ...prev.goals,
            { ...goal, id: newId(), createdAt: todayIso(), achievedAt: null },
          ],
        };
      });
      return ok;
    },
    []
  );

  const depositToGoal = useCallback((goalId: string, amount: Agorot, date: string) => {
    setState((prev) => {
      const goals = prev.goals.map((g) => {
        if (g.id !== goalId) return g;
        const saved = g.saved + amount;
        return {
          ...g,
          saved,
          achievedAt: saved >= g.targetAmount && !g.achievedAt ? todayIso() : g.achievedAt,
        };
      });
      const tx: Transaction = {
        id: newId(),
        kind: "saving",
        amount,
        date,
        category: "הפקדה למטרה",
        goalId,
      };
      return {
        ...prev,
        goals,
        transactions: [tx, ...prev.transactions],
        activityDates: prev.activityDates.includes(todayIso())
          ? prev.activityDates
          : [...prev.activityDates.slice(-365), todayIso()],
      };
    });
  }, []);

  const updateGoal = useCallback((goalId: string, patch: Partial<Goal>) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === goalId ? { ...g, ...patch } : g)),
    }));
  }, []);

  const deleteGoal = useCallback((goalId: string) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== goalId),
    }));
  }, []);

  const completeLesson = useCallback((lessonId: string, progress: LessonProgress) => {
    setState((prev) => ({
      ...prev,
      lessons: { ...prev.lessons, [lessonId]: progress },
      activityDates:
        progress.completedAt && !prev.activityDates.includes(todayIso())
          ? [...prev.activityDates.slice(-365), todayIso()]
          : prev.activityDates,
    }));
  }, []);

  const setFirstClientStep = useCallback((step: FirstClientStepId, done: boolean) => {
    setState((prev) => ({
      ...prev,
      firstClient: {
        ...prev.firstClient,
        steps: { ...prev.firstClient.steps, [step]: done },
      },
    }));
  }, []);

  const finishOnboarding = useCallback((name: string, answers: OnboardingAnswers) => {
    setState((prev) => {
      const next = { ...prev, onboarded: true, name, answers };
      if (answers.startingAmount && answers.startingAmount > 0 && prev.transactions.length === 0) {
        next.transactions = [
          {
            id: newId(),
            kind: "income" as const,
            amount: answers.startingAmount,
            date: todayIso(),
            category: "סכום התחלתי",
            note: "הכסף שכבר יש לי",
          },
        ];
      }
      return next;
    });
  }, []);

  const setDemoMode = useCallback((on: boolean) => {
    setIsDemo(on);
    if (on) {
      setState(load(DEMO_KEY) ?? demoState());
    } else {
      setState(load(USER_KEY) ?? emptyState());
    }
  }, []);

  const exportData = useCallback(() => JSON.stringify(state, null, 2), [state]);

  const deleteAllData = useCallback(() => {
    try {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(DEMO_KEY);
    } catch {
      // גם אם האחסון חסום — מאפסים בזיכרון
    }
    setIsDemo(false);
    setState(emptyState());
  }, []);

  const value = useMemo<PlusStore>(
    () => ({
      state,
      isDemo,
      update,
      recordActivity,
      addTransaction,
      applySplitToIncome,
      addGoal,
      depositToGoal,
      updateGoal,
      deleteGoal,
      completeLesson,
      setFirstClientStep,
      finishOnboarding,
      setDemoMode,
      exportData,
      deleteAllData,
    }),
    [
      state,
      isDemo,
      update,
      recordActivity,
      addTransaction,
      applySplitToIncome,
      addGoal,
      depositToGoal,
      updateGoal,
      deleteGoal,
      completeLesson,
      setFirstClientStep,
      finishOnboarding,
      setDemoMode,
      exportData,
      deleteAllData,
    ]
  );

  return <PlusContext.Provider value={value}>{children}</PlusContext.Provider>;
}

export function usePlus(): PlusStore {
  const ctx = useContext(PlusContext);
  if (!ctx) throw new Error("usePlus חייב לרוץ בתוך PlusProvider");
  return ctx;
}
