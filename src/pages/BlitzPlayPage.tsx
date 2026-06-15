import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  Zap, Timer, Trophy, Sparkles, ArrowLeft, ChevronLeft, CheckCircle2,
  XCircle, Flame, Crown, Target, Award,
} from "lucide-react";
import {
  getBlitzGame, scoreForAnswer, completionBonus, streakBonus, type BlitzQuestion,
} from "@/lib/blitzGames";
import { useAuth } from "@/context/AuthContext";
import { useStudent, useClassLeaderboard } from "@/hooks/useStudents";
import MonsterBurst from "@/components/MonsterBurst";

type Phase = "intro" | "play" | "result" | "leaderboard";

const fmt = (s: number) => {
  const m = Math.floor(s / 60).toString();
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

const fire = () => {
  confetti({
    particleCount: 140, spread: 80, startVelocity: 38, ticks: 70,
    colors: ["#a78bfa", "#c4b5fd", "#34d399", "#fbbf24", "#f472b6"],
    origin: { y: 0.4 },
  });
};

const BlitzPlayPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: student } = useStudent(studentId);
  const { data: classmates = [] } = useClassLeaderboard(student?.class_name || "");

  const game = useMemo(() => getBlitzGame(id), [id]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [classContribution, setClassContribution] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<null | { ok: boolean; text: string; delta: number }>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(game?.totalSeconds || 300);
  const [qSecondsLeft, setQSecondsLeft] = useState(game?.perQuestionSeconds || 30);
  const [showMonsters, setShowMonsters] = useState(false);
  const tickRef = useRef<number | null>(null);

  useEffect(() => () => { if (tickRef.current) window.clearInterval(tickRef.current); }, []);

  if (!game) {
    return (
      <div className="p-10 text-center" dir="rtl">
        <p className="text-[14px] text-muted-foreground mb-4">המשחק לא נמצא</p>
        <button onClick={() => navigate("/play")} className="text-violet-600 text-[13px] font-semibold">
          חזרה
        </button>
      </div>
    );
  }

  const startGame = () => {
    setPhase("play");
    setQIdx(0); setScore(0); setPicked(null); setFeedback(null); setWrong([]);
    setSecondsLeft(game.totalSeconds);
    setQSecondsLeft(game.perQuestionSeconds || 30);
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { finish(true); return 0; }
        return s - 1;
      });
      setQSecondsLeft((q) => (q > 0 ? q - 1 : 0));
    }, 1000) as unknown as number;
  };

  const finish = (timeup = false) => {
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    // completion bonus only if all answered
    if (!timeup) setScore((s) => s + completionBonus);
    setPhase("result");
  };

  const pickAnswer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const q = game.questions[qIdx];
    const ok = i === q.correctIndex;
    const delta = ok ? scoreForAnswer(q, qSecondsLeft) : 0;
    if (ok) {
      setScore((s) => s + delta);
      setClassContribution((c) => c + Math.round(delta * 0.6));
    } else {
      setWrong((w) => [...w, q.id]);
      setShowMonsters(true);
    }
    setFeedback({
      ok,
      text: ok
        ? (q.feedbackRight || `בול! הוספת ${delta} XP לעצמך ולכיתה.`)
        : (q.feedbackWrong || "כמעט. שמרנו לך את זה לתיקון בסוף."),
      delta,
    });
    if (ok) fire();
  };

  const next = () => {
    setPicked(null);
    setFeedback(null);
    setQSecondsLeft(game.perQuestionSeconds || 30);
    if (qIdx + 1 >= game.questions.length) {
      finish(false);
    } else {
      setQIdx((i) => i + 1);
    }
  };

  /* ─── Intro ────────────────────────────────────────── */
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50/60 via-white to-violet-50/30 p-5 md:p-8" dir="rtl">
        <div className="max-w-[860px] mx-auto">
          <button
            onClick={() => navigate("/play")}
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> חזרה
          </button>
          <BlitzIntroCard game={game} onStart={startGame} />
        </div>
      </div>
    );
  }

  /* ─── Play ──────────────────────────────────────────── */
  if (phase === "play") {
    const q = game.questions[qIdx];
    const pct = Math.round(((qIdx) / game.questions.length) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50/60 via-white to-violet-50/30 p-5 md:p-8" dir="rtl">
        {showMonsters && <MonsterBurst onDone={() => setShowMonsters(false)} />}
        <div className={`mx-auto ${game.sourceText ? "max-w-[1180px]" : "max-w-[760px]"}`}>

          {/* Top bar */}
          <div className="bg-white rounded-2xl ring-1 ring-border p-4 shadow-[var(--shadow-card)] mb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 rounded-full px-3 py-1.5">
                <Timer className="h-3.5 w-3.5" strokeWidth={2.2} />
                <span className="text-[13px] font-bold tabular-nums">{fmt(secondsLeft)}</span>
              </div>
              <span className="text-[12px] font-semibold text-foreground">
                שאלה {qIdx + 1} מתוך {game.questions.length}
              </span>
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 rounded-full px-3 py-1.5">
                <Zap className="h-3.5 w-3.5" strokeWidth={2.2} />
                <span className="text-[13px] font-bold tabular-nums">{score} XP</span>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-muted/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-full transition-all"
                style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground text-center">
              עוד 80 XP ואתם עולים מקום בדירוג הכיתתי
            </p>
          </div>

          <div className={game.sourceText ? "grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start" : ""}>

          {/* Question */}
          <div className="bg-white rounded-3xl ring-1 ring-border p-6 md:p-8 shadow-[var(--shadow-card)]">
            {q.bossDouble && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full mb-3">
                <Crown className="h-3 w-3" /> בוס הגמר · ניקוד כפול
              </span>
            )}
            <h2 className="text-[19px] md:text-[22px] font-bold text-foreground leading-snug">
              {q.text}
            </h2>
            <div className="mt-5 grid gap-2.5">
              {q.options.map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = picked !== null && i === q.correctIndex;
                const isWrongPick = isPicked && !isCorrect;
                return (
                  <button
                    key={i}
                    onClick={() => pickAnswer(i)}
                    disabled={picked !== null}
                    className={`w-full text-start rounded-2xl border px-4 py-3 text-[14px] font-medium transition-all
                      ${picked === null ? "border-border hover:border-violet-300 hover:bg-violet-50/60 cursor-pointer"
                        : isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : isWrongPick ? "border-rose-300 bg-rose-50 text-rose-800"
                        : "border-border opacity-60"}`}
                  >
                    <span className="inline-block w-5 h-5 rounded-full bg-muted text-[10px] font-bold leading-5 text-center me-2 align-middle">
                      {String.fromCharCode(0x05D0 + i) /* א ב ג ד */}
                    </span>
                    {opt}
                    {isCorrect && <CheckCircle2 className="inline h-4 w-4 ms-2 -mt-0.5 text-emerald-600" />}
                    {isWrongPick && <XCircle className="inline h-4 w-4 ms-2 -mt-0.5 text-rose-600" />}
                  </button>
                );
              })}
            </div>

            {feedback && (
              <div className={`mt-5 rounded-2xl p-4 ring-1 ${feedback.ok ? "bg-emerald-50 ring-emerald-100" : "bg-amber-50 ring-amber-100"}`}>
                <p className={`text-[13px] font-semibold ${feedback.ok ? "text-emerald-800" : "text-amber-900"}`}>
                  {feedback.text}
                </p>
                {feedback.ok && (
                  <p className="text-[11px] text-emerald-700 mt-1">
                    +{feedback.delta} XP · בונוס מהירות נכלל
                  </p>
                )}
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={next}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-l from-violet-500 to-fuchsia-500 text-white text-[13px] font-semibold px-4 py-2 rounded-xl shadow-sm"
                  >
                    {qIdx + 1 >= game.questions.length ? "סיים קרב" : "הבא"}
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Poem / source text — always visible during play */}
          {game.sourceText && (
            <aside className="bg-white rounded-3xl ring-1 ring-violet-100 p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-4 self-start">
              <div className="flex items-center gap-1.5 text-violet-700 mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[11px] font-bold">טקסט המקור</span>
              </div>
              {(game.sourceTitle || game.sourceAuthor) && (
                <div className="mb-2">
                  {game.sourceTitle && (
                    <p className="text-[13px] font-bold text-foreground">״{game.sourceTitle}״</p>
                  )}
                  {game.sourceAuthor && (
                    <p className="text-[11px] text-muted-foreground">{game.sourceAuthor}</p>
                  )}
                </div>
              )}
              <pre className="whitespace-pre-wrap font-sans text-[13px] leading-[1.85] text-foreground/90 max-h-[60vh] overflow-auto pe-1">
{game.sourceText}
              </pre>
            </aside>
          )}

          </div>
        </div>
      </div>
    );
  }

  /* ─── Result ───────────────────────────────────────── */
  if (phase === "result") {
    const totalQ = game.questions.length;
    const correctCount = totalQ - wrong.length;
    const accuracy = Math.round((correctCount / totalQ) * 100);
    const time = (game.totalSeconds - secondsLeft);
    const dynamicMsg =
      accuracy >= 80 ? "וואו, אתה בכושר של אלוף." :
      accuracy >= 60 ? "יפה! עוד תיקון קטן ואתה עולה רמה." :
                       "הקרב עוד לא נגמר. אפשר להחזיר נקודות בתיקון טעויות.";

    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50/60 via-white to-emerald-50/30 p-5 md:p-8" dir="rtl">
        <div className="max-w-[720px] mx-auto">
          <div className="bg-white rounded-3xl ring-1 ring-border p-6 md:p-8 shadow-[var(--shadow-card)] text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center mx-auto mb-3 shadow-md">
              <Trophy className="h-8 w-8 text-white" strokeWidth={2} />
            </div>
            <h2 className="text-[22px] font-bold text-foreground">סיימת את קרב הבזק!</h2>
            <p className="text-[13px] text-muted-foreground mt-1">{dynamicMsg}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <Stat label="הצלחה" value={`${accuracy}%`} icon={Target} tint="violet" />
              <Stat label="XP שנצברו" value={`${score}`} icon={Zap} tint="amber" />
              <Stat label="לכיתה" value={`+${classContribution}`} icon={Sparkles} tint="emerald" />
              <Stat label="זמן" value={fmt(time)} icon={Timer} tint="slate" />
            </div>

            <div className="mt-5 bg-violet-50 rounded-2xl p-3 inline-flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-500" />
              <span className="text-[12px] text-violet-900 font-semibold">רצף יומי שמור · +{streakBonus} XP בונוס</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {wrong.length > 0 && (
                <button
                  onClick={() => { /* restart with wrong only — simplified: restart game */ startGame(); }}
                  className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl shadow-sm"
                >
                  <Award className="h-4 w-4" /> לתקן טעויות ולקבל בונוס
                </button>
              )}
              <button
                onClick={() => setPhase("leaderboard")}
                className="inline-flex items-center gap-1.5 bg-gradient-to-l from-violet-500 to-fuchsia-500 text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl shadow-sm"
              >
                <Trophy className="h-4 w-4" /> לראות דירוג כיתתי
              </button>
              <button
                onClick={() => navigate("/play")}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground border border-border px-4 py-2.5 rounded-xl"
              >
                חזור למסלול
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Class leaderboard ────────────────────────────── */
  // Build a mock class leaderboard rooted in real classmates list
  const myClass = student?.class_name || "הכיתה שלך";
  const otherClasses = [
    { name: "י׳1", xp: 5780 },
    { name: "י׳2", xp: 5100 },
    { name: myClass,     xp: 4820, isMine: true },
    { name: "י׳4", xp: 4540 },
    { name: "י׳5", xp: 3720 },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/60 via-white to-violet-50/30 p-5 md:p-8" dir="rtl">
      <div className="max-w-[640px] mx-auto">
        <div className="bg-white rounded-3xl ring-1 ring-border p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-[18px] font-bold text-foreground text-center mb-5 inline-flex items-center gap-2 w-full justify-center">
            <Trophy className="h-5 w-5 text-amber-500" /> דירוג כיתתי
          </h2>
          <div className="space-y-2">
            {otherClasses.map((c, i) => (
              <div key={c.name + i}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${c.isMine ? "bg-violet-50 ring-1 ring-violet-200" : "bg-muted/30"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  i === 0 ? "bg-amber-200 text-amber-800" :
                  i === 1 ? "bg-slate-200 text-slate-700" :
                  i === 2 ? "bg-orange-200 text-orange-800" :
                  "bg-muted text-muted-foreground"
                }`}>{i + 1}</span>
                <span className={`flex-1 text-[13px] ${c.isMine ? "font-bold text-violet-700" : "text-foreground"}`}>
                  {c.isMine ? `${c.name} (הכיתה שלך)` : c.name}
                </span>
                <span className="text-[12px] font-semibold tabular-nums">{c.xp.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] font-semibold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 text-center">
            חסרות 280 נקודות כדי לעקוף את י׳2 — קדימה!
          </p>
          <div className="mt-5 flex justify-center">
            <button onClick={() => navigate("/play")}
              className="inline-flex items-center gap-1.5 bg-gradient-to-l from-violet-500 to-fuchsia-500 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl shadow-sm">
              חזור למסלול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── intro card ── */
const BlitzIntroCard = ({ game, onStart }: { game: ReturnType<typeof getBlitzGame> & {}; onStart: () => void }) => (
  <div className="bg-gradient-to-br from-violet-100 via-white to-fuchsia-50 rounded-[28px] ring-1 ring-violet-200 p-6 md:p-8 shadow-[var(--shadow-card)] relative overflow-hidden">
    <div className="absolute -top-10 -end-10 w-44 h-44 rounded-full bg-fuchsia-200/40 blur-2xl pointer-events-none" />
    <div className="absolute -bottom-10 -start-10 w-44 h-44 rounded-full bg-violet-200/40 blur-2xl pointer-events-none" />
    <div className="relative">
      <span className="inline-flex items-center gap-1.5 bg-white/80 text-violet-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
        <Zap className="h-3 w-3" /> מקצה הבזק
      </span>
      <h1 className="text-[26px] md:text-[32px] font-bold text-foreground mt-3 leading-tight">
        מקצה הבזק נפתח 🔥
      </h1>
      <p className="text-[16px] md:text-[18px] font-semibold text-violet-700 mt-1">{game!.name}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
        <Pill icon={Target} text={`${game!.questions.length} שאלות`} />
        <Pill icon={Timer} text={`${Math.round(game!.totalSeconds / 60)} דקות`} />
        <Pill icon={Sparkles} text={`נושא: ${game!.topic}`} />
        <Pill icon={Trophy} text={`${game!.prizeXp || 100} XP + בונוס לכיתה`} />
      </div>

      {game!.sourceText && (
        <div className="mt-5 bg-white/80 backdrop-blur rounded-2xl p-4 ring-1 ring-violet-100 text-right">
          {(game!.sourceTitle || game!.sourceAuthor) && (
            <div className="mb-2">
              {game!.sourceTitle && (
                <p className="text-[13px] font-bold text-foreground">״{game!.sourceTitle}״</p>
              )}
              {game!.sourceAuthor && (
                <p className="text-[11px] text-muted-foreground">{game!.sourceAuthor}</p>
              )}
            </div>
          )}
          <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-[1.85] text-foreground/90">
{game!.sourceText}
          </pre>
          <p className="text-[11px] text-violet-700 font-semibold mt-2">קרא בעיון — השאלות יתבססו גם על תוכן השיר.</p>
        </div>
      )}

      <div className="mt-5 bg-white/70 backdrop-blur rounded-2xl p-4 ring-1 ring-white">
        <p className="text-[14px] font-bold text-foreground">הכיתה שלך צריכה אותך היום!</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">חסרות לכם 280 נקודות כדי לעקוף את י׳2</p>
      </div>

      <button
        onClick={onStart}
        className="mt-6 inline-flex items-center gap-2 bg-gradient-to-l from-violet-500 to-fuchsia-500 hover:brightness-110 text-white text-[15px] font-bold px-7 py-3.5 rounded-2xl shadow-[0_14px_30px_-12px_rgba(140,80,220,0.6)] transition-all hover:scale-[1.02]"
      >
        התחל לשחק
        <ArrowLeft className="h-4 w-4" />
      </button>
    </div>
  </div>
);

const Pill = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="bg-white/70 backdrop-blur ring-1 ring-white rounded-xl px-3 py-2 inline-flex items-center gap-1.5">
    <Icon className="h-3.5 w-3.5 text-violet-600" strokeWidth={2.2} />
    <span className="text-[11.5px] font-semibold text-foreground">{text}</span>
  </div>
);

const Stat = ({ label, value, icon: Icon, tint }: { label: string; value: string; icon: any; tint: "violet"|"amber"|"emerald"|"slate" }) => {
  const map = {
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-50 text-slate-700",
  } as const;
  return (
    <div className={`${map[tint]} rounded-2xl p-3 text-center`}>
      <Icon className="h-4 w-4 mx-auto mb-1" />
      <p className="text-[18px] font-bold tabular-nums">{value}</p>
      <p className="text-[10.5px] opacity-80 mt-0.5">{label}</p>
    </div>
  );
};

export default BlitzPlayPage;
