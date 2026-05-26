/**
 * "האתגר היומי" — Daily Challenge engine.
 * Local-storage prototype: rotates subject by weekday, 5 mixed mini-games,
 * tracks personal + class XP, streak, teacher settings.
 */

export type DCGameKind =
  | "bubbles"      // 4 answer bubbles
  | "truefalse"    // true/false
  | "podium"       // order 3 concepts 1-2-3
  | "match"        // match concept → definition
  | "boss";        // boss question, double XP

export type DCTask = {
  id: string;
  kind: DCGameKind;
  prompt: string;
  options: string[];          // for bubbles/truefalse/boss
  correctIndex?: number;      // for bubbles/truefalse/boss
  podiumItems?: string[];     // for podium — already in correct order
  matchPairs?: { left: string; right: string }[]; // for match
  hint?: string;
  feedbackRight?: string;
  feedbackWrong?: string;
};

export type DailyChallenge = {
  id: string;                 // e.g. "2026-05-26"
  date: string;               // YYYY-MM-DD
  subject: string;
  topic: string;
  hook: string;
  minutes: number;
  personalXp: number;         // XP reward on full success
  classXp: number;
  classRank: number;          // mock current class rank
  pointsToOvertake: number;
  rivalClass: string;
  tasks: DCTask[];
};

export type DCSettings = {
  enabled: boolean;
  passThreshold: number;      // % to pass (default 70)
  competition: "personal" | "class" | "group" | "sport" | "grade" | "school";
  difficulty: "easy" | "medium" | "hard";
  subjects: string[];         // allowed subjects pool
  pointsPerCorrect: number;
  pointsBoss: number;
  pointsCompletion: number;
};

const SETTINGS_KEY = "wingate_dc_settings_v1";
const RESULTS_KEY  = "wingate_dc_results_v1";   // { [date]: { score, xp, time, attempts } }
const SEEN_KEY     = "wingate_dc_seen_v1";      // last date the popup was shown

const DEFAULT_SETTINGS: DCSettings = {
  enabled: true,
  passThreshold: 70,
  competition: "class",
  difficulty: "medium",
  subjects: ["מתמטיקה", "ספרות", "לשון", "היסטוריה", "תנ״ך"],
  pointsPerCorrect: 20,
  pointsBoss: 40,
  pointsCompletion: 30,
};

/* ── Settings ─────────────────────────────────────── */
export const loadSettings = (): DCSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
};
export const saveSettings = (s: DCSettings) =>
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

/* ── Date helpers ─────────────────────────────────── */
export const todayKey = () => new Date().toISOString().slice(0, 10);

/* ── Subject rotation by weekday ─────────────────── */
// Sun=0, Mon=1, ... Sat=6
const WEEKDAY_PLAN: { subject: string; topic: string }[] = [
  { subject: "מתמטיקה", topic: "פונקציות ליניאריות" },           // ראשון
  { subject: "ספרות",   topic: "שירה — דובר ודימוי" },           // שני
  { subject: "לשון",    topic: "שם המספר וצורות יחיד/רבים" },    // שלישי
  { subject: "היסטוריה", topic: "המהפכה הצרפתית" },              // רביעי
  { subject: "תנ״ך",    topic: "סיפור יוסף ואחיו" },             // חמישי
  { subject: "חזרה שבועית", topic: "ערבוב מכל המקצועות" },       // שישי
  { subject: "ספרות",   topic: "שירה — מסר מרכזי" },             // שבת
];

/* ── Bank of tasks per subject (mock data) ───────── */
const BANK: Record<string, DCTask[]> = {
  "מתמטיקה": [
    {
      id: "m1", kind: "bubbles",
      prompt: "מה השיפוע של הפונקציה y = 3x + 2?",
      options: ["2", "3", "5", "-3"], correctIndex: 1,
      feedbackRight: "בול. השיפוע הוא המקדם של x.",
      feedbackWrong: "כמעט. המקדם של x הוא השיפוע — כלומר 3.",
    },
    {
      id: "m2", kind: "truefalse",
      prompt: "הפונקציה y = 5 היא קו אופקי.",
      options: ["אמת", "בלוף"], correctIndex: 0,
      feedbackRight: "אמת — אין x, אז הקו אופקי.",
      feedbackWrong: "דווקא אמת — בלי x הקו אופקי.",
    },
    {
      id: "m3", kind: "podium",
      prompt: "סדרו את הצעדים לפתרון משוואה ליניארית",
      podiumItems: ["פשטו את שני האגפים", "העבירו x לאגף אחד", "חלקו במקדם של x"],
      feedbackRight: "מדויק.",
      feedbackWrong: "כמעט — קודם פישוט, אחר כך העברה, ובסוף חלוקה.",
    },
    {
      id: "m4", kind: "match",
      prompt: "התאימו מושג להגדרה",
      matchPairs: [
        { left: "שיפוע", right: "המקדם של x" },
        { left: "חותך", right: "הערך כשx=0" },
        { left: "פתרון", right: "נקודה שמקיימת את המשוואה" },
      ],
      feedbackRight: "מצוין.",
      feedbackWrong: "בוא נעבור שוב על המושגים.",
    },
    {
      id: "m5", kind: "boss",
      prompt: "בוס — מצא את נקודת החיתוך של y = 2x + 1 עם ציר y",
      options: ["(0,1)", "(1,0)", "(0,2)", "(2,0)"], correctIndex: 0,
      feedbackRight: "ניצחת את הבוס! חיתוך עם y הוא כשx=0.",
      feedbackWrong: "כמעט — נקודת חיתוך עם y היא תמיד (0, b).",
    },
  ],
  "ספרות": [
    {
      id: "l1", kind: "bubbles",
      prompt: "מי הדובר בשיר?",
      options: ["המשורר עצמו", "הקול המדבר בתוך השיר", "הקורא", "המבקר"],
      correctIndex: 1,
      feedbackRight: "בול — הדובר הוא הקול בתוך השיר.",
      feedbackWrong: "כמעט. הדובר ≠ המשורר.",
    },
    {
      id: "l2", kind: "bubbles",
      prompt: "״הלב שלי כמו ים סוער״ — איזה אמצעי?",
      options: ["האנשה", "דימוי", "ניגוד", "חריזה"], correctIndex: 1,
      feedbackRight: "כן — ״כמו״ → דימוי.",
      feedbackWrong: "המילה ״כמו״ מסגירה דימוי.",
    },
    {
      id: "l3", kind: "truefalse",
      prompt: "מטאפורה משתמשת תמיד במילה ״כמו״.",
      options: ["אמת", "בלוף"], correctIndex: 1,
      feedbackRight: "בלוף — זה דווקא דימוי.",
      feedbackWrong: "לא — ״כמו״ הוא סימן של דימוי, לא מטאפורה.",
    },
    {
      id: "l4", kind: "match",
      prompt: "התאימו מושג להגדרה",
      matchPairs: [
        { left: "דימוי",    right: "השוואה עם ״כמו״" },
        { left: "מטאפורה",  right: "השוואה ללא ״כמו״" },
        { left: "דובר",     right: "הקול שבתוך השיר" },
        { left: "מסר",      right: "הרעיון המרכזי" },
      ],
      feedbackRight: "מעולה.",
      feedbackWrong: "בוא נחזור על המושגים.",
    },
    {
      id: "l5", kind: "boss",
      prompt: "בוס — מהו הצעד הראשון בניתוח שיר?",
      options: ["לספור מילים", "לזהות דובר ונושא", "לחפש חרוזים", "לדלג לסיכום"],
      correctIndex: 1,
      feedbackRight: "ניצחת את הבוס!",
      feedbackWrong: "מתחילים תמיד מדובר ונושא.",
    },
  ],
  "לשון": [
    {
      id: "h1", kind: "bubbles",
      prompt: "איזו צורת רבים נכונה ל״שולחן״?",
      options: ["שולחנים", "שולחנות", "שולחניות", "שולחנייה"], correctIndex: 1,
      feedbackRight: "נכון — שולחנות.",
      feedbackWrong: "כמעט — הצורה התקנית היא שולחנות.",
    },
    {
      id: "h2", kind: "truefalse",
      prompt: "״שלוש בנים״ זו צורה נכונה.",
      options: ["אמת", "בלוף"], correctIndex: 1,
      feedbackRight: "בלוף — אומרים ״שלושה בנים״.",
      feedbackWrong: "טעות נפוצה — הנכון: שלושה בנים.",
    },
    {
      id: "h3", kind: "podium",
      prompt: "סדרו לפי גודל מהקטן לגדול",
      podiumItems: ["אחת", "שתיים", "שלוש"],
      feedbackRight: "מדויק.",
      feedbackWrong: "כמעט — סדר עולה: אחת, שתיים, שלוש.",
    },
    {
      id: "h4", kind: "match",
      prompt: "התאימו מין דקדוקי",
      matchPairs: [
        { left: "שולחן", right: "זכר" },
        { left: "מחברת", right: "נקבה" },
        { left: "ספר",   right: "זכר" },
      ],
      feedbackRight: "כל הכבוד.",
      feedbackWrong: "בוא נחזור על המין הדקדוקי.",
    },
    {
      id: "h5", kind: "boss",
      prompt: "בוס — צורת הרבים של ״כיסא״?",
      options: ["כיסאים", "כיסאות", "כיסאיות", "כיסאיים"], correctIndex: 1,
      feedbackRight: "ניצחת את הבוס!",
      feedbackWrong: "כיסא → כיסאות.",
    },
  ],
  "היסטוריה": [
    {
      id: "y1", kind: "bubbles",
      prompt: "באיזו שנה פרצה המהפכה הצרפתית?",
      options: ["1689", "1789", "1812", "1848"], correctIndex: 1,
      feedbackRight: "בול — 1789.",
      feedbackWrong: "השנה הנכונה היא 1789.",
    },
    {
      id: "y2", kind: "truefalse",
      prompt: "הסיסמה ״חירות, שוויון, אחווה״ קשורה למהפכה הצרפתית.",
      options: ["אמת", "בלוף"], correctIndex: 0,
      feedbackRight: "אמת.", feedbackWrong: "דווקא אמת.",
    },
    {
      id: "y3", kind: "podium",
      prompt: "סדרו לפי סדר כרונולוגי",
      podiumItems: ["כינוס האספה הלאומית", "נפילת הבסטיליה", "הוצאת לואי ה-16 להורג"],
      feedbackRight: "מדויק.", feedbackWrong: "בדקו את הסדר.",
    },
    {
      id: "y4", kind: "match",
      prompt: "התאימו דמות לתפקיד",
      matchPairs: [
        { left: "לואי ה-16",  right: "מלך צרפת" },
        { left: "רובספייר",   right: "מנהיג יעקובינים" },
        { left: "נפוליאון",   right: "קיסר" },
      ],
      feedbackRight: "מצוין.", feedbackWrong: "נחזור על הדמויות.",
    },
    {
      id: "y5", kind: "boss",
      prompt: "בוס — מה היה ה״משטר הישן״?",
      options: [
        "הרפובליקה הראשונה",
        "המשטר המלוכני שלפני המהפכה",
        "שלטון נפוליאון",
        "ועדת הציבור",
      ], correctIndex: 1,
      feedbackRight: "ניצחת את הבוס!",
      feedbackWrong: "ה״משטר הישן״ = המלוכה שלפני 1789.",
    },
  ],
  "תנ״ך": [
    {
      id: "t1", kind: "bubbles",
      prompt: "מי מכר את יוסף לישמעאלים?",
      options: ["אחיו", "אביו", "פרעה", "פוטיפר"], correctIndex: 0,
      feedbackRight: "נכון — אחיו.",
      feedbackWrong: "האחים הם שמכרו את יוסף.",
    },
    {
      id: "t2", kind: "truefalse",
      prompt: "יוסף היה הבן הצעיר ביותר של יעקב.",
      options: ["אמת", "בלוף"], correctIndex: 1,
      feedbackRight: "בלוף — בנימין הוא הצעיר.",
      feedbackWrong: "בנימין הוא הצעיר, לא יוסף.",
    },
    {
      id: "t3", kind: "podium",
      prompt: "סדרו לפי סדר העלילה",
      podiumItems: ["חלום יוסף", "מכירתו לישמעאלים", "מינויו למשנה לפרעה"],
      feedbackRight: "מדויק.", feedbackWrong: "בדקו את הסדר.",
    },
    {
      id: "t4", kind: "match",
      prompt: "התאימו דמות לתיאור",
      matchPairs: [
        { left: "יוסף",   right: "פותר חלומות" },
        { left: "יעקב",   right: "אב המשפחה" },
        { left: "פרעה",   right: "מלך מצרים" },
      ],
      feedbackRight: "מעולה.", feedbackWrong: "בוא נחזור על הדמויות.",
    },
    {
      id: "t5", kind: "boss",
      prompt: "בוס — מה היה תפקידו של יוסף במצרים בסוף הסיפור?",
      options: ["עבד", "אסיר", "משנה לפרעה", "סוחר"],
      correctIndex: 2,
      feedbackRight: "ניצחת את הבוס!",
      feedbackWrong: "יוסף עלה להיות משנה לפרעה.",
    },
  ],
  "חזרה שבועית": [], // built from a mix
};

const buildWeeklyMix = (): DCTask[] => {
  const subs = ["מתמטיקה", "ספרות", "לשון", "היסטוריה", "תנ״ך"];
  return subs.map((s, i) => {
    const t = BANK[s][i % BANK[s].length];
    return { ...t, id: `wk-${i}-${t.id}` };
  });
};

/* ── Build today's challenge ─────────────────────── */
export const getTodayChallenge = (): DailyChallenge => {
  const date = todayKey();
  const day = new Date().getDay();
  const plan = WEEKDAY_PLAN[day];
  const settings = loadSettings();
  const subject = settings.subjects.includes(plan.subject) ? plan.subject : settings.subjects[0] || plan.subject;
  const tasks = subject === "חזרה שבועית" ? buildWeeklyMix() : (BANK[subject] || BANK["ספרות"]).slice(0, 5);

  return {
    id: date,
    date,
    subject,
    topic: plan.topic,
    hook: "הכיתה שלך צריכה אותך היום!",
    minutes: 5,
    personalXp: 120,
    classXp: 120,
    classRank: 3,
    pointsToOvertake: 280,
    rivalClass: "י׳2",
    tasks,
  };
};

/* ── Results tracking ─────────────────────────────── */
type DCResult = {
  date: string;
  correct: number;
  total: number;
  xp: number;
  classXp: number;
  seconds: number;
  passed: boolean;
};

export const saveResult = (r: DCResult) => {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[r.date] = r;
    localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
  } catch {}
};

export const getResult = (date = todayKey()): DCResult | null => {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all[date] || null;
  } catch { return null; }
};

export const hasPlayedToday = () => !!getResult(todayKey());

/* ── Popup seen tracking ─────────────────────────── */
export const wasPopupSeenToday = () => {
  try { return localStorage.getItem(SEEN_KEY) === todayKey(); } catch { return false; }
};
export const markPopupSeen = () => {
  try { localStorage.setItem(SEEN_KEY, todayKey()); } catch {}
};
