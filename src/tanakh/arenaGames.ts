/**
 * תנ״ך · זירת המשחקים — בניית סבבי המשחק והניקוד.
 *
 * כל התוכן כאן נגזר מ-`tanakhData.ts` בלבד (חומרי ההוראה של צוות תנ״ך
 * ופסוקי הפתיחה מנחלת הכלל). אין כאן שאלות מומצאות, אין מסיחים מומצאים:
 * כל מסיח הוא תשובה נכונה של פריט אחר מאותו מאגר.
 *
 * ההתקדמות נשמרת במכשיר בלבד (localStorage) — אין שרת, אין סכמה, אין
 * הרשאות. זהו אב־טיפוס, והממשק אומר זאת במפורש.
 */
import { TANAKH_UNITS, ARCS, UNIT1 } from "@/tanakh/tanakhData";

export type ArenaGameId = "glossary" | "chapters" | "question" | "arc" | "verse";

export interface McqRound {
  kind: "mcq";
  prompt: string;
  hint?: string;
  options: string[];
  answer: number;
}

export interface OrderRound {
  kind: "order";
  prompt: string;
  hint?: string;
  /** התשובה הנכונה, לפי הסדר */
  answer: string[];
  /** אותם אסימונים בערבוב — סדר הצגה בלבד */
  tokens: string[];
}

export type ArenaRound = McqRound | OrderRound;

export type Accent = "amber" | "indigo" | "emerald" | "rose" | "sky";

export interface ArenaGame {
  id: ArenaGameId;
  title: string;
  tagline: string;
  emoji: string;
  accent: Accent;
  /** מאיפה הגיע התוכן — מוצג למשתמש כדי שלא ייראה כאילו הומצא */
  source: string;
  build: () => ArenaRound[];
}

/* ── עזרים ─────────────────────────────────────────────────────────── */

const shuffle = <T,>(arr: readonly T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** ערבוב שאינו מחזיר את הסדר המקורי (כשיש יותר מאסימון אחד) */
const shuffleDifferent = (arr: readonly string[]): string[] => {
  if (arr.length < 2) return [...arr];
  const same = (a: string[]) => a.every((v, i) => v === arr[i]);
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = shuffle(arr);
    if (!same(candidate)) return candidate;
  }
  // נפילה בטוחה: הזזה במקום אחד
  return [...arr.slice(1), arr[0]];
};

const pick = <T,>(arr: readonly T[], n: number): T[] => shuffle(arr).slice(0, n);

/**
 * בונה שאלה אמריקאית: התשובה הנכונה + מסיחים שנלקחים מתשובות אמיתיות אחרות.
 * מסננת כפילויות כדי שלא תופיע אותה אפשרות פעמיים.
 */
const mcq = (
  prompt: string,
  correct: string,
  pool: readonly string[],
  hint?: string,
  distractors = 3,
): McqRound => {
  const others = pick(pool.filter((v) => v !== correct), distractors);
  const options = shuffle([correct, ...others]);
  return { kind: "mcq", prompt, hint, options, answer: options.indexOf(correct) };
};

/** חלוקת פסוקי הפתיחה לפסוקים בודדים לפי סוף־פסוק (׃) */
const openingVerses = (): string[] =>
  UNIT1.textOpening
    .split("׃")
    .map((v) => v.trim())
    .filter(Boolean);

/* ── המשחקים ───────────────────────────────────────────────────────── */

const ROUNDS_PER_UNIT_GAME = 6;

export const ARENA_GAMES: ArenaGame[] = [
  {
    id: "glossary",
    title: "מילון בזק",
    tagline: "מונח מקראי — ומה הוא אומר",
    emoji: "🔤",
    accent: "amber",
    source: "מילון היחידה · יחידה 1 · בריאה, אדם ואחריות",
    build: () => {
      const defs = UNIT1.glossary.map((g) => g.def);
      return shuffle(UNIT1.glossary).map((g) =>
        mcq(g.term, g.def, defs, "רגל 1 · שפה"),
      );
    },
  },
  {
    id: "chapters",
    title: "איפה זה כתוב",
    tagline: "יחידה — ובאילו פרקים היא עוסקת",
    emoji: "📖",
    accent: "indigo",
    source: "מפת הדרך השנתית · 9 היחידות",
    build: () => {
      const all = TANAKH_UNITS.map((u) => u.chapters);
      return pick(TANAKH_UNITS, ROUNDS_PER_UNIT_GAME).map((u) =>
        mcq(u.title, u.chapters, all, `יחידה ${u.id}`),
      );
    },
  },
  {
    id: "question",
    title: "השאלה המנחה",
    tagline: "שאלה — ולאיזו יחידה היא שייכת",
    emoji: "❓",
    accent: "emerald",
    source: "השאלות המנחות כלשונן בדפי היחידות",
    build: () => {
      const titles = TANAKH_UNITS.map((u) => u.title);
      return pick(TANAKH_UNITS, ROUNDS_PER_UNIT_GAME).map((u) =>
        mcq(u.question, u.title, titles),
      );
    },
  },
  {
    id: "arc",
    title: "שתי הקשתות",
    tagline: "בראשית או שמואל — החלטה מהירה",
    emoji: "🏹",
    accent: "rose",
    source: "חלוקת המסלול לשתי קשתות",
    build: () => {
      const names = [ARCS.bereshit.name, ARCS["shaul-david"].name];
      return shuffle(TANAKH_UNITS).map((u) => ({
        kind: "mcq" as const,
        prompt: u.title,
        hint: u.chapters,
        options: names,
        answer: names.indexOf(ARCS[u.arc].name),
      }));
    },
  },
  {
    id: "verse",
    title: "סדר את הפסוק",
    tagline: "המילים התערבבו — החזירו אותן לסדר",
    emoji: "🧩",
    accent: "sky",
    source: "בראשית א׳ · נחלת הכלל, באדיבות מאגר ספריא",
    build: () =>
      openingVerses().map((verse, i) => {
        const words = verse.split(/\s+/).filter(Boolean);
        return {
          kind: "order" as const,
          prompt: `פסוק ${i + 1} · בראשית א׳`,
          hint: "לחצו על המילים לפי הסדר הנכון",
          answer: words,
          tokens: shuffleDifferent(words),
        };
      }),
  },
];

export const getArenaGame = (id: string): ArenaGame | undefined =>
  ARENA_GAMES.find((g) => g.id === id);

/* ── מדליות וניקוד ─────────────────────────────────────────────────── */

export type Medal = "gold" | "silver" | "bronze" | null;

export const MEDAL_META: Record<Exclude<Medal, null>, { label: string; ring: string; text: string }> = {
  gold:   { label: "זהב", ring: "bg-gradient-to-br from-[hsl(45,90%,62%)] to-[hsl(38,75%,48%)]", text: "text-[hsl(30,60%,22%)]" },
  silver: { label: "כסף", ring: "bg-gradient-to-br from-[hsl(220,14%,82%)] to-[hsl(220,10%,62%)]", text: "text-[hsl(220,20%,22%)]" },
  bronze: { label: "ארד", ring: "bg-gradient-to-br from-[hsl(28,55%,60%)] to-[hsl(24,50%,42%)]", text: "text-[hsl(24,45%,18%)]" },
};

/** 100% זהב · 80%+ כסף · 60%+ ארד · מתחת לזה עוד אין מדליה */
export const medalFor = (pct: number): Medal => {
  if (pct >= 100) return "gold";
  if (pct >= 80) return "silver";
  if (pct >= 60) return "bronze";
  return null;
};

/* ── שמירה במכשיר בלבד ─────────────────────────────────────────────── */

export const ARENA_SCORES_KEY = "tanakh-arena-scores-v1";

export interface GameRecord {
  /** האחוז הטוב ביותר שהושג במשחק הזה */
  best: number;
  plays: number;
}

export type ArenaScores = Partial<Record<ArenaGameId, GameRecord>>;

const isValidRecord = (v: unknown): v is GameRecord =>
  !!v && typeof v === "object" &&
  typeof (v as GameRecord).best === "number" &&
  typeof (v as GameRecord).plays === "number";

export const loadArenaScores = (): ArenaScores => {
  try {
    const raw = localStorage.getItem(ARENA_SCORES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: ArenaScores = {};
    ARENA_GAMES.forEach((g) => {
      const rec = parsed?.[g.id];
      if (isValidRecord(rec)) {
        out[g.id] = {
          best: Math.max(0, Math.min(100, Math.round(rec.best))),
          plays: Math.max(0, Math.round(rec.plays)),
        };
      }
    });
    return out;
  } catch {
    return {};
  }
};

/** שומר תוצאה חדשה ומחזיר את מצב הניקוד המעודכן (גם אם השמירה נכשלה) */
export const saveArenaResult = (id: ArenaGameId, pct: number): ArenaScores => {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const scores = loadArenaScores();
  const prev = scores[id];
  const next: ArenaScores = {
    ...scores,
    [id]: { best: Math.max(prev?.best ?? 0, clamped), plays: (prev?.plays ?? 0) + 1 },
  };
  try {
    localStorage.setItem(ARENA_SCORES_KEY, JSON.stringify(next));
  } catch {
    /* מצב פרטי או אחסון מלא — הניקוד פשוט לא יישמר, ואין נפילה */
  }
  return next;
};

export const clearArenaScores = () => {
  try {
    localStorage.removeItem(ARENA_SCORES_KEY);
  } catch {
    /* אין מה לעשות, וגם אין במה להפיל את הדף */
  }
};

/** כמה מדליות נצברו מתוך כלל המשחקים */
export const medalCount = (scores: ArenaScores): number =>
  ARENA_GAMES.filter((g) => medalFor(scores[g.id]?.best ?? 0) !== null).length;
