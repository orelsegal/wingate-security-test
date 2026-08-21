/**
 * תנ״ך · זירת המשחקים — אב־טיפוס.
 *
 * חמישה מיני־משחקים קצרים על התוכן שכבר קיים במסלול התנ״ך: מילון היחידה,
 * הפרקים, השאלות המנחות, שתי הקשתות ופסוקי הפתיחה. אין כאן תוכן חדש
 * ואין נתוני התקדמות מומצאים — התוצאות נשמרות במכשיר בלבד.
 *
 * שפה חזותית: אותו קלף חם ודיו אינדיגו של מפת השנה, עם נגיעת צבע אחת
 * לכל משחק כדי שיהיו נבדלים זה מזה.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { ArrowRight, ChevronLeft, Check, X, RotateCcw, Undo2, Gamepad2, Award } from "lucide-react";
import {
  ARENA_GAMES, MEDAL_META, medalFor, medalCount,
  loadArenaScores, saveArenaResult,
  type ArenaGame, type ArenaGameId, type ArenaRound, type ArenaScores, type Accent,
} from "@/tanakh/arenaGames";

/* ── צבעי המשחקים — מחרוזות מלאות, כדי ש-Tailwind יקצור אותן ── */
const ACCENT: Record<Accent, { chip: string; icon: string; bar: string; btn: string; edge: string }> = {
  amber:   { chip: "bg-amber-100 text-amber-900 border-amber-300",       icon: "bg-amber-100 border-amber-300",       bar: "bg-amber-500",   btn: "bg-amber-600 hover:bg-amber-700",   edge: "hover:border-amber-300" },
  indigo:  { chip: "bg-indigo-100 text-indigo-900 border-indigo-300",    icon: "bg-indigo-100 border-indigo-300",    bar: "bg-indigo-500",  btn: "bg-indigo-600 hover:bg-indigo-700", edge: "hover:border-indigo-300" },
  emerald: { chip: "bg-emerald-100 text-emerald-900 border-emerald-300", icon: "bg-emerald-100 border-emerald-300",  bar: "bg-emerald-500", btn: "bg-emerald-600 hover:bg-emerald-700", edge: "hover:border-emerald-300" },
  rose:    { chip: "bg-rose-100 text-rose-900 border-rose-300",          icon: "bg-rose-100 border-rose-300",        bar: "bg-rose-500",    btn: "bg-rose-600 hover:bg-rose-700",     edge: "hover:border-rose-300" },
  sky:     { chip: "bg-sky-100 text-sky-900 border-sky-300",             icon: "bg-sky-100 border-sky-300",          bar: "bg-sky-500",     btn: "bg-sky-600 hover:bg-sky-700",       edge: "hover:border-sky-300" },
};

const celebrate = () => {
  const base = { spread: 70, startVelocity: 42, ticks: 90, zIndex: 9999, scalar: 0.9 };
  confetti({ ...base, particleCount: 70, origin: { y: 0.7 }, colors: ["#c9a227", "#3b4d9e", "#e8d9a8"] });
  confetti({ ...base, particleCount: 40, spread: 110, decay: 0.92, origin: { y: 0.6 } });
};

/* ── מדליה קטנה ── */
const MedalChip = ({ pct }: { pct: number }) => {
  const medal = medalFor(pct);
  if (!medal) return null;
  const m = MEDAL_META[medal];
  return (
    <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full ${m.ring} ${m.text}`}>
      <Award className="h-3 w-3" strokeWidth={2.2} />
      {m.label}
    </span>
  );
};

/* ── כרטיס משחק בזירה ── */
const GameCard = ({ game, record, onPlay }: {
  game: ArenaGame;
  record?: { best: number; plays: number };
  onPlay: () => void;
}) => {
  const a = ACCENT[game.accent];
  const best = record?.best ?? 0;
  return (
    <button
      onClick={onPlay}
      className={`group text-start w-full rounded-2xl border border-[hsl(40,25%,86%)] bg-[hsl(42,35%,98%)] p-4 md:p-5 transition-all hover:shadow-md hover:-translate-y-[1px] ${a.edge} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(232,45%,45%)]`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center text-[20px] ${a.icon}`}>
          <span aria-hidden>{game.emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[15.5px] font-bold text-[hsl(232,35%,22%)] leading-snug">{game.title}</h3>
            <MedalChip pct={best} />
          </div>
          <p className="text-[12px] text-[hsl(230,15%,42%)] mt-1 leading-relaxed">{game.tagline}</p>
          <p className="text-[10.5px] text-[hsl(230,10%,55%)] mt-2">{game.source}</p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[hsl(232,45%,32%)]">
              {record ? "שוב" : "התחלה"}
              <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.2} />
            </span>
            <span className="text-[10.5px] text-[hsl(230,10%,55%)]">
              {record ? `שיא: ${best}% · ${record.plays} סבבים` : "עוד לא שיחקת"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

/* ── שאלה אמריקאית ── */
const McqBody = ({ round, picked, onPick }: {
  round: Extract<ArenaRound, { kind: "mcq" }>;
  picked: number | null;
  onPick: (i: number) => void;
}) => (
  <div className="space-y-2.5">
    {round.options.map((opt, i) => {
      const isAnswer = i === round.answer;
      const isPicked = i === picked;
      const answered = picked !== null;
      const tone = !answered
        ? "bg-white border-[hsl(40,25%,86%)] hover:border-[hsl(232,35%,60%)] hover:bg-[hsl(232,40%,98%)]"
        : isAnswer
          ? "bg-emerald-50 border-emerald-400"
          : isPicked
            ? "bg-rose-50 border-rose-300"
            : "bg-white border-[hsl(40,25%,88%)] opacity-60";
      return (
        <button
          key={`${opt}-${i}`}
          onClick={() => onPick(i)}
          disabled={answered}
          className={`w-full text-start rounded-xl border px-4 py-3 text-[13.5px] leading-relaxed text-[hsl(232,30%,22%)] transition-all ${tone} disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(232,45%,45%)]`}
        >
          <span className="flex items-start gap-2">
            {answered && isAnswer && <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" strokeWidth={2.4} />}
            {answered && isPicked && !isAnswer && <X className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" strokeWidth={2.4} />}
            <span>{opt}</span>
          </span>
        </button>
      );
    })}
    {picked === null && (
      <p className="text-[10.5px] text-[hsl(230,10%,55%)] pt-1">בחרו תשובה אחת</p>
    )}
  </div>
);

/* ── סידור פסוק ── */
const OrderBody = ({ round, built, checked, onAdd, onUndo }: {
  round: Extract<ArenaRound, { kind: "order" }>;
  built: number[];
  checked: boolean;
  onAdd: (i: number) => void;
  onUndo: () => void;
}) => {
  const isCorrect = built.map((i) => round.tokens[i]).join(" ") === round.answer.join(" ");
  return (
    <div className="space-y-3">
      {/* שורת ההרכבה */}
      <div
        className={`min-h-[64px] rounded-xl border-2 border-dashed px-3 py-3 flex flex-wrap gap-2 items-start ${
          checked ? (isCorrect ? "border-emerald-400 bg-emerald-50" : "border-rose-300 bg-rose-50") : "border-[hsl(40,30%,80%)] bg-white"
        }`}
      >
        {built.length === 0 ? (
          <span className="text-[11.5px] text-[hsl(230,10%,58%)] self-center">כאן ייבנה הפסוק</span>
        ) : (
          built.map((tokenIdx, pos) => (
            <span
              key={`${tokenIdx}-${pos}`}
              className="text-[15px] font-semibold text-[hsl(232,35%,22%)] px-2.5 py-1 rounded-lg bg-[hsl(42,45%,94%)] border border-[hsl(40,30%,84%)]"
            >
              {round.tokens[tokenIdx]}
            </span>
          ))
        )}
      </div>

      {/* מאגר המילים */}
      <div className="flex flex-wrap gap-2">
        {round.tokens.map((tok, i) => {
          const used = built.includes(i);
          return (
            <button
              key={`${tok}-${i}`}
              onClick={() => onAdd(i)}
              disabled={used || checked}
              className={`text-[15px] font-semibold px-3 py-2 rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(232,45%,45%)] ${
                used
                  ? "opacity-30 border-[hsl(40,25%,88%)] bg-[hsl(42,25%,96%)] text-[hsl(230,10%,55%)] cursor-default"
                  : "bg-white border-[hsl(40,25%,84%)] text-[hsl(232,35%,22%)] hover:border-[hsl(232,35%,60%)] hover:bg-[hsl(232,40%,98%)]"
              }`}
            >
              {tok}
            </button>
          );
        })}
      </div>

      {!checked && built.length > 0 && (
        <button
          onClick={onUndo}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[hsl(230,15%,42%)] hover:text-[hsl(232,45%,32%)] transition-colors"
        >
          <Undo2 className="h-3.5 w-3.5" strokeWidth={2} />
          ביטול המילה האחרונה
        </button>
      )}

      {checked && !isCorrect && (
        <div className="rounded-xl border border-[hsl(40,30%,84%)] bg-[hsl(42,45%,96%)] px-3.5 py-2.5">
          <p className="text-[10.5px] font-semibold text-[hsl(230,15%,42%)] mb-1">הסדר הנכון</p>
          <p className="text-[14.5px] font-semibold text-[hsl(232,35%,22%)] leading-relaxed">{round.answer.join(" ")}</p>
        </div>
      )}

      <p className="text-[10.5px] text-[hsl(230,10%,55%)]">{round.hint}</p>
    </div>
  );
};

/* ── העמוד ── */
const TanakhArenaPage = () => {
  const navigate = useNavigate();
  const base = `/subjects/${encodeURIComponent("תנ״ך")}/tanakh-30`;

  const [scores, setScores] = useState<ArenaScores>(loadArenaScores);
  const [activeId, setActiveId] = useState<ArenaGameId | null>(null);
  const [rounds, setRounds] = useState<ArenaRound[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [built, setBuilt] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [finished, setFinished] = useState(false);

  const game = useMemo(() => ARENA_GAMES.find((g) => g.id === activeId) ?? null, [activeId]);
  const round = rounds[idx];
  const medals = medalCount(scores);

  const resetRoundState = () => {
    setPicked(null);
    setBuilt([]);
    setChecked(false);
  };

  const startGame = (g: ArenaGame) => {
    setActiveId(g.id);
    setRounds(g.build());
    setIdx(0);
    setCorrect(0);
    setFinished(false);
    resetRoundState();
  };

  const backToArena = () => {
    setActiveId(null);
    setRounds([]);
    setFinished(false);
    resetRoundState();
  };

  const answeredThisRound = round?.kind === "mcq" ? picked !== null : checked;

  const handlePick = (i: number) => {
    if (!round || round.kind !== "mcq" || picked !== null) return;
    setPicked(i);
    if (i === round.answer) setCorrect((c) => c + 1);
  };

  const handleCheckOrder = () => {
    if (!round || round.kind !== "order" || checked) return;
    setChecked(true);
    const built0 = built.map((t) => round.tokens[t]).join(" ");
    if (built0 === round.answer.join(" ")) setCorrect((c) => c + 1);
  };

  const handleNext = () => {
    if (!game) return;
    if (idx + 1 < rounds.length) {
      setIdx(idx + 1);
      resetRoundState();
      return;
    }
    const pct = rounds.length ? Math.round((correct / rounds.length) * 100) : 0;
    setScores(saveArenaResult(game.id, pct));
    setFinished(true);
    if (medalFor(pct)) celebrate();
  };

  /* ── מסך סיום ── */
  if (game && finished) {
    const pct = rounds.length ? Math.round((correct / rounds.length) * 100) : 0;
    const medal = medalFor(pct);
    const a = ACCENT[game.accent];
    return (
      <div className="min-h-full bg-[hsl(42,45%,96%)]" dir="rtl">
        <div className="p-5 md:p-8 max-w-[560px] mx-auto">
          <div className="rounded-3xl border border-[hsl(40,25%,86%)] bg-[hsl(42,35%,98%)] p-6 md:p-8 text-center mt-6">
            <div className="text-[38px] leading-none mb-3" aria-hidden>{game.emoji}</div>
            <h1 className="text-[20px] font-black text-[hsl(232,40%,18%)]">{game.title} · סיכום</h1>
            <p className="text-[34px] font-black text-[hsl(232,45%,32%)] mt-3 leading-none">{pct}%</p>
            <p className="text-[12.5px] text-[hsl(230,15%,42%)] mt-1.5">
              {correct} מתוך {rounds.length} תשובות נכונות
            </p>

            <div className="mt-4">
              {medal ? (
                <MedalChip pct={pct} />
              ) : (
                <p className="text-[11.5px] text-[hsl(230,10%,52%)]">
                  מדליית ארד מחכה בציון 60 ומעלה. עוד סבב וזה שם.
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                onClick={() => startGame(game)}
                className={`inline-flex items-center justify-center gap-1.5 text-[13.5px] font-bold text-white px-5 py-2.5 rounded-full transition-colors ${a.btn} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(232,45%,45%)]`}
              >
                <RotateCcw className="h-4 w-4" strokeWidth={2.2} />
                סבב נוסף
              </button>
              <button
                onClick={backToArena}
                className="inline-flex items-center justify-center gap-1.5 text-[13.5px] font-semibold text-[hsl(232,45%,32%)] border border-[hsl(232,25%,80%)] bg-white px-5 py-2.5 rounded-full hover:bg-[hsl(232,40%,97%)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(232,45%,45%)]"
              >
                חזרה לזירה
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── מסך משחק ── */
  if (game && round) {
    const a = ACCENT[game.accent];
    const progress = ((idx + (answeredThisRound ? 1 : 0)) / rounds.length) * 100;
    return (
      <div className="min-h-full bg-[hsl(42,45%,96%)]" dir="rtl">
        <div className="p-5 md:p-8 max-w-[640px] mx-auto">
          <div className="flex items-center justify-between gap-3 mb-4">
            <button
              onClick={backToArena}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[hsl(230,15%,42%)] hover:text-[hsl(232,45%,32%)] transition-colors"
            >
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
              יציאה לזירה
            </button>
            <span className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full border ${a.chip}`}>
              {game.emoji} {game.title}
            </span>
          </div>

          {/* התקדמות */}
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-[hsl(230,15%,45%)]">
            <span>שאלה {idx + 1} מתוך {rounds.length}</span>
            <span>{correct} נכונות</span>
          </div>
          <div className="h-1.5 rounded-full bg-[hsl(40,25%,88%)] overflow-hidden mb-5">
            <div className={`h-full rounded-full transition-all duration-300 ${a.bar}`} style={{ width: `${progress}%` }} />
          </div>

          {/* השאלה */}
          <div className="rounded-2xl border border-[hsl(40,25%,86%)] bg-[hsl(42,35%,98%)] p-4 md:p-6">
            {round.hint && round.kind === "mcq" && (
              <p className="text-[10.5px] text-[hsl(230,10%,55%)] mb-1.5">{round.hint}</p>
            )}
            <h2 className="text-[16.5px] md:text-[18px] font-bold text-[hsl(232,35%,20%)] leading-snug mb-4">
              {round.prompt}
            </h2>

            {round.kind === "mcq" ? (
              <McqBody round={round} picked={picked} onPick={handlePick} />
            ) : (
              <OrderBody
                round={round}
                built={built}
                checked={checked}
                onAdd={(i) => setBuilt((b) => (b.includes(i) ? b : [...b, i]))}
                onUndo={() => setBuilt((b) => b.slice(0, -1))}
              />
            )}
          </div>

          {/* פעולה */}
          <div className="mt-4 flex justify-end">
            {round.kind === "order" && !checked ? (
              <button
                onClick={handleCheckOrder}
                disabled={built.length !== round.answer.length}
                className={`inline-flex items-center gap-1.5 text-[13.5px] font-bold text-white px-5 py-2.5 rounded-full transition-colors ${a.btn} disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(232,45%,45%)]`}
              >
                בדיקה
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!answeredThisRound}
                className={`inline-flex items-center gap-1.5 text-[13.5px] font-bold text-white px-5 py-2.5 rounded-full transition-colors ${a.btn} disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(232,45%,45%)]`}
              >
                {idx + 1 < rounds.length ? "לשאלה הבאה" : "לסיכום"}
                <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── מסך הזירה ── */
  return (
    <div className="min-h-full bg-[hsl(42,45%,96%)]" dir="rtl">
      <div className="p-5 md:p-8 lg:p-10 max-w-[980px] mx-auto">

        <button
          onClick={() => navigate(base)}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[hsl(230,15%,42%)] hover:text-[hsl(232,45%,32%)] transition-colors mb-5"
        >
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
          חזרה למסלול התנ״ך
        </button>

        {/* הודעת אב־טיפוס — כמו במפת השנה */}
        <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-2.5">
          <p className="text-[11.5px] text-indigo-900 leading-relaxed">
            <span className="font-bold">גרסת הדגמה.</span>{" "}
            המשחקים בנויים על תוכן המסלול הקיים. התוצאות נשמרות במכשיר בלבד.
          </p>
          <details className="mt-1">
            <summary className="text-[10.5px] text-indigo-800/80 cursor-pointer select-none hover:underline">
              מידע נוסף לצוות
            </summary>
            <p className="text-[10.5px] text-indigo-900/80 leading-relaxed mt-1">
              כל השאלות והמסיחים נגזרים מחומרי ההוראה של צוות תנ״ך ומפסוקי הפתיחה
              (נחלת הכלל, באדיבות מאגר ספריא). כרגע רק יחידה 1 נושאת תוכן מלא, ולכן
              משחק המילון מבוסס עליה. הניקוד אינו נשמר בשרת ואינו מגיע לדוחות.
            </p>
          </details>
        </div>

        <header className="text-center mb-7 md:mb-9">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[hsl(232,45%,32%)] mb-3 shadow-sm">
            <Gamepad2 className="h-6 w-6 text-[hsl(42,80%,85%)]" strokeWidth={1.7} />
          </div>
          <h1 className="text-[26px] md:text-[32px] font-black text-[hsl(232,40%,18%)] tracking-tight leading-tight">
            תנ״ך · זירת המשחקים
          </h1>
          <p className="text-[13px] text-[hsl(230,15%,40%)] mt-2">
            חמישה סבבים קצרים על חומר המסלול · כמה דקות לכל אחד
          </p>
          <p className="text-[11.5px] text-[hsl(230,15%,45%)] mt-3">
            <span className="font-bold text-[hsl(232,45%,32%)]">{medals}</span> מדליות מתוך {ARENA_GAMES.length}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {ARENA_GAMES.map((g) => (
            <GameCard key={g.id} game={g} record={scores[g.id]} onPlay={() => startGame(g)} />
          ))}
        </div>

        <p className="text-center text-[10px] text-[hsl(230,10%,55%)] mt-8 pb-6">
          מדליות: 60% ארד · 80% כסף · 100% זהב
        </p>
      </div>
    </div>
  );
};

export default TanakhArenaPage;
