/**
 * "מקצה הבזק" — quick-fire learning battles.
 * Local-storage backed prototype: a seeded sample game + custom games created
 * by teachers/admins via the builder page.
 */

export type BlitzQuestion = {
  id: string;
  type: "multi" | "truefalse";
  text: string;
  options: string[];        // for truefalse: ["אמת","בלוף"]
  correctIndex: number;
  feedbackRight?: string;
  feedbackWrong?: string;
  bossDouble?: boolean;     // last/bonus question worth double
  perQuestionSeconds?: number; // per-question time budget (default 30)
};

export type BlitzGame = {
  id: string;
  name: string;
  subject: string;
  topic: string;
  grade?: string;
  totalSeconds: number;     // overall game timer
  perQuestionSeconds?: number;
  competition?: "personal" | "class" | "sport" | "group";
  startsAt?: string;
  endsAt?: string;
  prizeXp?: number;
  sourceTitle?: string;     // e.g. שם השיר
  sourceAuthor?: string;    // e.g. שם המשורר
  sourceText?: string;      // full text of the poem/passage shown before play
  questions: BlitzQuestion[];
  createdBy?: string;
  createdAt: string;
  seed?: boolean;
};

const KEY = "wingate_blitz_games_v1";

export const seedGame: BlitzGame = {
  id: "seed-poetry-hunters",
  name: "ציידי השירה",
  subject: "ספרות",
  topic: "שירה",
  grade: "י׳",
  totalSeconds: 300,
  perQuestionSeconds: 30,
  competition: "class",
  prizeXp: 120,
  sourceTitle: "הים שבליבי",
  sourceAuthor: "מאת: יעל ברק (לדוגמה)",
  sourceText:
    "הַלֵּב שֶׁלִּי כְּמוֹ יָם סוֹעֵר,\n" +
    "גַּלִּים נִשְׁבָּרִים אֶל חוֹף שֶׁל שֶׁקֶט.\n" +
    "אֲנִי קוֹרֵא לְעַצְמִי בְּשֵׁם אַחֵר,\n" +
    "וְהָרוּחַ עוֹנָה לִי בְּלַחַשׁ רַךְ.\n\n" +
    "בַּלַּיְלָה הַיָּם נִרְדָּם לְרֶגַע,\n" +
    "וַאֲנִי לוֹמֵד לִשְׁמֹעַ אֶת עַצְמִי —\n" +
    "לֹא הַסַּעַר, לֹא הַשֶּׁקֶט,\n" +
    "רַק הַקּוֹל הַקָּטָן שֶׁבִּפְנִים.",
  createdAt: new Date().toISOString(),
  seed: true,
  questions: [
    /* ── שאלות תוכן על השיר ── */
    {
      id: "c1",
      type: "multi",
      text: "למה הדובר משווה את ליבו בשיר?",
      options: ["לרוח לוחשת", "לים סוער", "ללילה שקט", "לחוף נטוש"],
      correctIndex: 1,
      feedbackRight: "בול. ״הלב שלי כמו ים סוער״ — הדימוי המרכזי בשיר.",
      feedbackWrong: "חזור לשורה הראשונה: ״הלב שלי כמו ים סוער״.",
    },
    {
      id: "c2",
      type: "multi",
      text: "מה קורה ליַּם בלילה לפי השיר?",
      options: [
        "הוא ממשיך לסעור",
        "הוא נרדם לרגע",
        "הוא מתייבש",
        "הוא בולע את החוף",
      ],
      correctIndex: 1,
      feedbackRight: "מדויק. ״בלילה היָּם נרדם לרגע״.",
      feedbackWrong: "כמעט. בבית השני נאמר שהיָּם נרדם לרגע.",
    },
    {
      id: "c3",
      type: "multi",
      text: "מה הדובר לומד לעשות בבית השני?",
      options: [
        "לצעוק אל הרוח",
        "לשמוע את עצמו",
        "לברוח מהחוף",
        "להירדם עם היָּם",
      ],
      correctIndex: 1,
      feedbackRight: "כן — ״ואני לומד לשמוע את עצמי״.",
      feedbackWrong: "ההתבוננות הפנימית: הוא לומד לשמוע את עצמו.",
    },
    {
      id: "c4",
      type: "truefalse",
      text: "בשיר, ״הקול הקטן שבפנים״ חזק יותר מהסערה ומהשקט.",
      options: ["אמת", "בלוף"],
      correctIndex: 0,
      feedbackRight: "אמת. זה בדיוק המסר של הסיום — הקול הפנימי הוא העיקר.",
      feedbackWrong: "דווקא כן — הסיום מדגיש שהקול הפנימי הוא מה שחשוב.",
    },
    {
      id: "c5",
      type: "multi",
      text: "איזה רגש מרכזי עולה מהשיר?",
      options: [
        "כעס וזעם בלבד",
        "מסע מסערה אל הקשבה פנימית",
        "שמחה ילדותית",
        "אדישות מוחלטת",
      ],
      correctIndex: 1,
      feedbackRight: "בדיוק — מסע מהסערה אל ההקשבה הפנימית.",
      feedbackWrong: "השיר נע מסערה רגשית להקשבה פנימית שקטה.",
    },

    /* ── שאלות מושגים בשירה ── */
    {
      id: "q1",
      type: "multi",
      text: "מה תפקיד הדובר בשיר?",
      options: [
        "מי שכתב את השיר",
        "הקול שמדבר בתוך השיר",
        "הקורא של השיר",
        "שם הדמות הראשית",
      ],
      correctIndex: 1,
      feedbackRight: "בול! הדובר הוא הקול הפנימי של השיר.",
      feedbackWrong: "כמעט. הדובר הוא הקול שמדבר בתוך השיר, לא בהכרח המשורר.",
    },
    {
      id: "q2",
      type: "multi",
      text: "בשורה ״הלב שלי כמו ים סוער״ — איזה אמצעי אמנותי מופיע?",
      options: ["האנשה", "דימוי", "חריזה", "ניגוד"],
      correctIndex: 1,
      feedbackRight: "כן! ״כמו״ → דימוי קלאסי.",
      feedbackWrong: "כמעט. השימוש ב״כמו״ הוא סימן ההיכר של דימוי.",
    },
    {
      id: "q3",
      type: "truefalse",
      text: "מטאפורה משתמשת תמיד במילים כמו / כאילו / כ־.",
      options: ["אמת", "בלוף"],
      correctIndex: 1,
      feedbackRight: "בלוף ענק. דווקא דימוי משתמש במילים האלה, לא מטאפורה.",
      feedbackWrong: "טעות נחמדה — אלה דווקא סימני דימוי, לא מטאפורה.",
    },
    {
      id: "q4",
      type: "multi",
      text: "מהו מסר מרכזי בשיר?",
      options: [
        "הרעיון או התחושה שהשיר מבקש להעביר",
        "רק מספר הבתים בשיר",
        "רק שם המשורר",
        "רק החריזה",
      ],
      correctIndex: 0,
      feedbackRight: "מדויק.",
      feedbackWrong: "כמעט. המסר הוא הרעיון המרכזי, לא הצורה.",
    },
    {
      id: "q5",
      type: "multi",
      text: "איזה צעד הכי נכון להתחיל איתו כשמנתחים שיר?",
      options: [
        "לספור מילים בלבד",
        "לזהות דובר, נושא ורגש מרכזי",
        "לחפש רק חרוזים",
        "לדלג ישר לתשובות",
      ],
      correctIndex: 1,
      bossDouble: true,
      feedbackRight: "בוס הגמר! ניקוד כפול.",
      feedbackWrong: "כמעט. בכל ניתוח מתחילים מדובר, נושא ורגש.",
    },
  ],
};

const readAll = (): BlitzGame[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const arr: BlitzGame[] = raw ? JSON.parse(raw) : [];
    if (!arr.find((g) => g.id === seedGame.id)) arr.unshift(seedGame);
    return arr;
  } catch {
    return [seedGame];
  }
};

const writeAll = (games: BlitzGame[]) => {
  // never persist the seed
  localStorage.setItem(KEY, JSON.stringify(games.filter((g) => !g.seed)));
};

export const listBlitzGames = (): BlitzGame[] => readAll();

export const getBlitzGame = (id: string): BlitzGame | undefined =>
  readAll().find((g) => g.id === id);

export const upsertBlitzGame = (game: BlitzGame) => {
  const all = readAll().filter((g) => !g.seed);
  const idx = all.findIndex((g) => g.id === game.id);
  if (idx >= 0) all[idx] = game;
  else all.unshift(game);
  writeAll(all);
};

export const deleteBlitzGame = (id: string) => {
  const all = readAll().filter((g) => !g.seed && g.id !== id);
  writeAll(all);
};

export const newBlitzGame = (): BlitzGame => ({
  id: `blitz-${Date.now()}`,
  name: "",
  subject: "",
  topic: "",
  totalSeconds: 300,
  perQuestionSeconds: 30,
  competition: "class",
  prizeXp: 100,
  createdAt: new Date().toISOString(),
  questions: [],
});

export const blankQuestion = (): BlitzQuestion => ({
  id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  type: "multi",
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
});

/* ── Scoring helpers ─────────────────────────────── */
export const scoreForAnswer = (q: BlitzQuestion, secondsLeftPerQ: number) => {
  const base = 20;
  const speedBonus = Math.round(Math.max(0, secondsLeftPerQ) * 0.5); // up to ~15
  const mult = q.bossDouble ? 2 : 1;
  return (base + speedBonus) * mult;
};

export const completionBonus = 30;
export const streakBonus = 50;
