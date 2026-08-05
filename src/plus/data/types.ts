import type { Agorot, SplitPercents } from "../lib/money";

/** קטגוריות תנועה — כל התנועות מוזנות ידנית. */
export type TxKind = "income" | "expense" | "saving" | "gift" | "refund";

export type Bucket = "future" | "goals" | "fun";

export interface Transaction {
  id: string;
  kind: TxKind;
  amount: Agorot;
  date: string; // YYYY-MM-DD
  category: string;
  note?: string;
  /** לאיזו מטרה שויכה הפקדת חיסכון (אם שויכה) */
  goalId?: string;
  /** חלוקת הכנסה שאושרה עבור תנועת הכנסה */
  split?: { future: Agorot; goals: Agorot; fun: Agorot };
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: Agorot;
  targetDate: string | null;
  reason: string;
  saved: Agorot;
  plannedDeposit: Agorot;
  plannedCadence: "weekly" | "monthly";
  createdAt: string;
  achievedAt: string | null;
  isSafetyCushion?: boolean;
}

export interface OnboardingAnswers {
  dream: string;            // מה היית רוצה שהכסף יאפשר לך
  earnedBefore: "yes" | "no" | "";
  startingAmount: Agorot | null;
  weeklyHours: number | null;
  skills: string[];
}

export interface FirstClientTrack {
  ideaId: string | null;
  serviceText: string;
  priceText: string;
  availabilityText: string;
  /** עד חמישה אנשים מוכרים — שם פרטי/כינוי בלבד, בלי פרטים מזהים */
  contacts: { id: string; label: string; status: "todo" | "asked" | "yes" | "no" }[];
  steps: Record<FirstClientStepId, boolean>;
  lessonsLearned: string;
}

export type FirstClientStepId =
  | "chooseService"
  | "writeOffer"
  | "pickContacts"
  | "trackAsks"
  | "firstJob"
  | "gotPaid"
  | "askedReview"
  | "reflection";

export interface LessonProgress {
  completedAt: string | null;
  quizCorrect: boolean;
  taskDone: boolean;
}

export interface ParentSettings {
  /** hash פשוט של קוד מקומי — לא אבטחה אמיתית, רק הפרדת מצבים במכשיר */
  codeHash: string | null;
  /** אישורי הורה למשימות רגישות */
  approvals: Record<string, string>; // itemId -> ISO date
  /** מתי ההורה סימן שבדק את התוכן המתעדכן */
  contentReviewedAt: string | null;
  /** שיתוף סיכום עם ההורה — בחירה מפורשת של אגם */
  shareSummary: boolean;
}

export interface PlusState {
  version: 1;
  onboarded: boolean;
  name: string; // שם פרטי או כינוי בלבד
  answers: OnboardingAnswers;
  split: SplitPercents;
  transactions: Transaction[];
  goals: Goal[];
  lessons: Record<string, LessonProgress>;
  firstClient: FirstClientTrack;
  parent: ParentSettings;
  /** תאריכים של פעולות משמעותיות — לרצף השבועי */
  activityDates: string[];
  /** הישגים ידניים (שיחת הורים, השוואת מחירים וכו') */
  manualBadges: Record<string, string>; // badgeId -> ISO date
  reduceMotion: boolean;
}
