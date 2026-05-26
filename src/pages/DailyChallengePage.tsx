import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  Clock, Zap, Trophy, Sparkles, Heart, ChevronLeft, CheckCircle2,
  X as XIcon, Crown, RefreshCw, ArrowRight,
} from "lucide-react";
import {
  getTodayChallenge, DCTask, loadSettings, saveResult,
} from "@/lib/dailyChallenge";
import MonsterBurst from "@/components/MonsterBurst";

/* shuffle helper */
const shuffle = <T,>(arr: T[]) => arr.map(v => [Math.random(), v] as const).sort((a,b)=>a[0]-b[0]).map(([,v])=>v);

/* Olympic-themed game names per task kind */
const GAME_NAMES: Record<string, string> = {
  bubbles: "קליעה לידע",
  truefalse: "מדליה או פסילה",
  podium: "פודיום המושגים",
  match: "טבעות הידע",
  boss: "בוס הגמר",
};

const fireConfetti = () => {
  const defaults = { startVelocity: 28, spread: 360, ticks: 60, zIndex: 9999, scalar: 0.9 };
  const count = 160;
  const fire = (ratio: number, opts: confetti.Options) =>
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * ratio) });
  fire(0.25, { spread: 26, startVelocity: 55, colors: ["#a78bfa","#f472b6","#fbbf24"] });
  fire(0.2,  { spread: 60, colors: ["#34d399","#60a5fa","#a78bfa"] });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
};

export default function DailyChallengePage() {
  const navigate = useNavigate();
  const challenge = useMemo(() => getTodayChallenge(), []);
  const settings = useMemo(() => loadSettings(), []);

  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [xp, setXp] = useState(0);
  const [classXp, setClassXp] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const [showMonsters, setShowMonsters] = useState(false);

  // overall timer (5 min default)
  const [secondsLeft, setSecondsLeft] = useState(challenge.minutes * 60);
  useEffect(() => {
    if (finished) return;
    if (secondsLeft <= 0) { finish(); return; }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, finished]);

  const task = challenge.tasks[idx];
  const total = challenge.tasks.length;
  const progressPct = Math.round(((idx) / total) * 100);

  const handleAnswer = (isRight: boolean, isBoss = false) => {
    if (isRight) {
      const gain = isBoss ? settings.pointsBoss : settings.pointsPerCorrect;
      setXp(x => x + gain);
      setClassXp(c => c + gain);
      setCorrectCount(c => c + 1);
      fireConfetti();
    } else {
      setShowMonsters(true);
    }
  };

  const next = () => {
    if (idx + 1 >= total) finish();
    else setIdx(i => i + 1);
  };

  const finish = () => {
    if (finished) return;
    const finalXp = xp + settings.pointsCompletion;
    const finalClass = classXp + Math.round(settings.pointsCompletion * 0.7);
    setXp(finalXp); setClassXp(finalClass);
    const passPct = Math.round((correctCount / total) * 100);
    const passed = passPct >= settings.passThreshold;
    saveResult({
      date: challenge.id,
      correct: correctCount, total,
      xp: finalXp, classXp: finalClass,
      seconds: Math.round((Date.now() - startedAt) / 1000),
      passed,
    });
    setFinished(true);
    if (passed) setTimeout(fireConfetti, 250);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  /* ── Result screen ─────────────────────────────── */
  if (finished) {
    const passPct = Math.round((correctCount / total) * 100);
    const passed = passPct >= settings.passThreshold;
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50/50 via-white to-emerald-50/40 p-5 md:p-10" dir="rtl">
        <div className="max-w-[640px] mx-auto">
          <div className="text-center mb-6">
            {passed ? (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 shadow-lg shadow-amber-200/50 mb-3">
                  <Trophy className="h-10 w-10 text-amber-800" strokeWidth={1.8} />
                </div>
                <h1 className="text-[26px] font-bold text-foreground">ניצחת את האתגר היומי!</h1>
                <p className="text-[13px] text-muted-foreground mt-1.5">הוספת {classXp} XP לכיתה שלך 💜</p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-rose-100 mb-3">
                  <CuteMonster />
                </div>
                <h1 className="text-[24px] font-bold text-foreground">הקרב עוד לא נגמר</h1>
                <p className="text-[13px] text-muted-foreground mt-1.5">בוא נחזיר נקודות בתיקון טעויות.</p>
              </>
            )}
          </div>

          <div className="bg-white rounded-3xl ring-1 ring-border shadow-sm p-5 grid grid-cols-2 gap-3">
            <Stat label="אחוז הצלחה"     value={`${passPct}%`} accent={passed ? "text-emerald-600" : "text-rose-500"} />
            <Stat label="XP אישי"        value={xp.toLocaleString()} accent="text-violet-600" />
            <Stat label="XP לכיתה"       value={classXp.toLocaleString()} accent="text-fuchsia-600" />
            <Stat label="זמן משחק"       value={`${Math.round((Date.now()-startedAt)/1000)}s`} />
            <Stat label="מיקום כיתה"     value={`#${challenge.classRank}`} accent="text-amber-600" />
            <Stat label="שיפור אישי"     value="+50 XP" accent="text-emerald-600" />
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {!passed && (
              <button onClick={() => { setFinished(false); setIdx(0); setCorrectCount(0); setXp(0); setClassXp(0); setSecondsLeft(challenge.minutes*60); }}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl py-3 font-semibold shadow-md shadow-violet-200/60 hover:scale-[1.01] transition-all">
                <RefreshCw className="h-4 w-4" /> לתקן טעויות ולקבל בונוס
              </button>
            )}
            <button onClick={() => navigate("/play")} className="inline-flex items-center justify-center gap-2 bg-white ring-1 ring-border rounded-2xl py-3 font-semibold text-foreground hover:bg-muted/40 transition-all">
              <Trophy className="h-4 w-4 text-amber-500" /> לראות דירוג
            </button>
            <button onClick={() => navigate("/play")} className="inline-flex items-center justify-center gap-2 bg-white ring-1 ring-border rounded-2xl py-3 font-semibold text-foreground hover:bg-muted/40 transition-all">
              <ArrowRight className="h-4 w-4 rotate-180" /> חזור למסלול
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Active play ──────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 via-white to-emerald-50/30 p-5 md:p-10" dir="rtl">
      <div className="max-w-[680px] mx-auto">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate("/play")} className="rounded-full p-2 hover:bg-white/70 transition-colors" aria-label="סגור">
            <XIcon className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 ring-1 ring-border">
              <Zap className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-[12px] font-bold tabular-nums">{xp} XP</span>
            </div>
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ${secondsLeft < 60 ? "bg-rose-50 ring-rose-200 text-rose-600" : "bg-white ring-border text-foreground"}`}>
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[12px] font-bold tabular-nums">{mm}:{ss}</span>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-5">
          {challenge.tasks.map((t, i) => (
            <div key={t.id} className={`h-1.5 flex-1 rounded-full transition-all ${
              i < idx ? "bg-violet-500" : i === idx ? "bg-violet-300" : "bg-muted/60"
            }`} />
          ))}
        </div>

        {/* Task card */}
        <div className="bg-white rounded-3xl ring-1 ring-border shadow-[0_10px_40px_-12px_rgba(139,92,246,0.18)] p-5 md:p-7">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10.5px] font-semibold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                משימה {idx + 1} מתוך {total}
              </span>
              <span className="text-[10.5px] font-semibold text-foreground bg-muted px-2.5 py-1 rounded-full">
                {GAME_NAMES[task.kind] || "משחק"}
              </span>
            </div>
            {task.kind === "boss" && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-700 bg-amber-50 ring-1 ring-amber-200 px-2.5 py-1 rounded-full">
                <Crown className="h-3 w-3" /> בוס הגמר · נקודות כפולות
              </span>
            )}
          </div>

          <TaskRunner key={task.id} task={task} onAnswered={handleAnswer} onNext={next} />
        </div>

        {/* footer micro-copy */}
        <p className="text-center text-[11px] text-muted-foreground mt-4">
          כל תשובה שלך מזיזה את הכיתה קדימה.
        </p>
      </div>
    </div>
  );
}

/* ── Stat tile ─────────────────────────────────── */
const Stat = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
  <div className="text-center">
    <p className={`text-[22px] font-bold tabular-nums ${accent || "text-foreground"}`}>{value}</p>
    <p className="text-[10.5px] text-muted-foreground mt-0.5">{label}</p>
  </div>
);

/* ── Cute monster (encouragement) ──────────────── */
const CuteMonster = () => (
  <svg viewBox="0 0 64 64" className="w-12 h-12">
    <ellipse cx="32" cy="38" rx="22" ry="20" fill="#c4b5fd" />
    <circle cx="24" cy="34" r="5" fill="#fff" />
    <circle cx="40" cy="34" r="5" fill="#fff" />
    <circle cx="24" cy="35" r="2.5" fill="#1f2937" />
    <circle cx="40" cy="35" r="2.5" fill="#1f2937" />
    <path d="M22 46 Q32 52 42 46" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M16 22 L20 12 L24 22 Z" fill="#a78bfa" />
    <path d="M40 22 L44 12 L48 22 Z" fill="#a78bfa" />
  </svg>
);

/* ───────────────────────────────────────────────── */
/* TaskRunner — dispatches to game UI by task.kind  */
/* ───────────────────────────────────────────────── */
function TaskRunner({ task, onAnswered, onNext }: {
  task: DCTask;
  onAnswered: (right: boolean, isBoss?: boolean) => void;
  onNext: () => void;
}) {
  const [answered, setAnswered] = useState<null | boolean>(null);
  const reveal = (right: boolean) => {
    if (answered !== null) return;
    setAnswered(right);
    onAnswered(right, task.kind === "boss");
  };

  return (
    <div>
      <h2 className="text-[17px] md:text-[19px] font-bold text-foreground leading-snug mb-4">{task.prompt}</h2>

      {task.kind === "bubbles" && (
        <BubblesGame task={task} answered={answered} onPick={(i)=>reveal(i===task.correctIndex)} />
      )}
      {task.kind === "boss" && (
        <BubblesGame task={task} answered={answered} onPick={(i)=>reveal(i===task.correctIndex)} boss />
      )}
      {task.kind === "truefalse" && (
        <TrueFalseGame task={task} answered={answered} onPick={(i)=>reveal(i===task.correctIndex)} />
      )}
      {task.kind === "podium" && (
        <PodiumGame task={task} answered={answered} onDone={(ok)=>reveal(ok)} />
      )}
      {task.kind === "match" && (
        <MatchGame task={task} answered={answered} onDone={(ok)=>reveal(ok)} />
      )}

      {answered !== null && (
        <div className={`mt-4 rounded-2xl p-3.5 text-[12.5px] ${answered ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"}`}>
          <div className="flex items-start gap-2">
            {answered ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <Heart className="h-4 w-4 mt-0.5 shrink-0" />}
            <p className="leading-relaxed">{answered ? (task.feedbackRight || "בול!") : (task.feedbackWrong || "כמעט — ננסה לתקן בסוף.")}</p>
          </div>
          <button onClick={onNext} className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-xl py-2.5 text-[13px] font-semibold hover:opacity-90">
            המשך <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Bubbles / Boss multi-choice ───────────────── */
function BubblesGame({ task, answered, onPick, boss }: { task: DCTask; answered: null|boolean; onPick:(i:number)=>void; boss?: boolean; }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {(task.options || []).map((opt, i) => {
        const isCorrect = i === task.correctIndex;
        const showState = answered !== null;
        return (
          <button
            key={i}
            disabled={showState}
            onClick={() => onPick(i)}
            className={`group relative overflow-hidden rounded-2xl p-4 text-start text-[13.5px] font-medium ring-1 transition-all ${
              showState
                ? isCorrect
                  ? "bg-emerald-50 ring-emerald-300 text-emerald-900"
                  : "bg-white ring-border text-muted-foreground"
                : `bg-gradient-to-br ${boss ? "from-amber-50 to-orange-50 ring-amber-200 hover:ring-amber-400" : "from-violet-50 to-fuchsia-50 ring-violet-100 hover:ring-violet-400"} hover:scale-[1.02] active:scale-[0.99]`
            }`}
          >
            <span className="relative z-10">{opt}</span>
            {!showState && (
              <span className={`absolute -end-4 -top-4 w-16 h-16 rounded-full ${boss ? "bg-amber-200/40" : "bg-violet-200/40"} blur-xl group-hover:scale-150 transition-transform`} />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── True / False ──────────────────────────────── */
function TrueFalseGame({ task, answered, onPick }: { task: DCTask; answered: null|boolean; onPick:(i:number)=>void; }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(task.options || ["אמת","בלוף"]).map((opt, i) => {
        const showState = answered !== null;
        const isCorrect = i === task.correctIndex;
        return (
          <button
            key={i}
            disabled={showState}
            onClick={() => onPick(i)}
            className={`rounded-2xl py-6 text-[16px] font-bold ring-1 transition-all ${
              showState
                ? isCorrect ? "bg-emerald-100 ring-emerald-300 text-emerald-800" : "bg-muted/30 ring-border text-muted-foreground"
                : i === 0
                  ? "bg-gradient-to-br from-emerald-50 to-teal-50 ring-emerald-200 hover:ring-emerald-400 text-emerald-800 hover:scale-[1.02]"
                  : "bg-gradient-to-br from-rose-50 to-orange-50 ring-rose-200 hover:ring-rose-400 text-rose-800 hover:scale-[1.02]"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ── Podium — order items ──────────────────────── */
function PodiumGame({ task, answered, onDone }: { task: DCTask; answered: null|boolean; onDone:(ok:boolean)=>void; }) {
  const correctOrder = task.podiumItems || [];
  const [pool, setPool] = useState(() => shuffle(correctOrder));
  const [picked, setPicked] = useState<string[]>([]);

  const choose = (item: string) => {
    if (answered !== null) return;
    const nextPicked = [...picked, item];
    setPicked(nextPicked);
    setPool(pool.filter(p => p !== item));
    if (nextPicked.length === correctOrder.length) {
      const ok = nextPicked.every((v, i) => v === correctOrder[i]);
      setTimeout(() => onDone(ok), 250);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-muted/30 ring-1 ring-border p-3">
        <p className="text-[10.5px] text-muted-foreground mb-2">לחצי לפי הסדר הנכון:</p>
        <div className="flex flex-wrap gap-2">
          {pool.map((p) => (
            <button key={p} onClick={() => choose(p)} className="rounded-xl bg-white ring-1 ring-border px-3 py-2 text-[12.5px] hover:ring-violet-400 hover:scale-[1.02] transition-all">
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 items-end">
        {[0,1,2].map(slot => {
          const heights = ["h-16","h-24","h-12"]; // 2nd tallest middle? keep simple: 1=tallest
          const order = [1,0,2]; // visual order: silver,gold,bronze
          const realSlot = order[slot];
          const medal = ["🥇","🥈","🥉"][realSlot];
          const item = picked[realSlot];
          return (
            <div key={slot} className="flex flex-col items-center">
              <div className={`w-full rounded-t-2xl ring-1 ring-border ${item ? "bg-gradient-to-b from-violet-100 to-violet-50" : "bg-muted/20"} ${slot===1 ? "h-28" : "h-20"} flex items-center justify-center p-2 text-center`}>
                <div>
                  <div className="text-xl">{medal}</div>
                  <p className="text-[11.5px] font-semibold text-foreground mt-1">{item || "—"}</p>
                </div>
              </div>
              <div className="w-full h-1.5 bg-violet-300/60 rounded-b-full" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Matching pairs ────────────────────────────── */
function MatchGame({ task, answered, onDone }: { task: DCTask; answered: null|boolean; onDone:(ok:boolean)=>void; }) {
  const pairs = task.matchPairs || [];
  // Keep indices so duplicate right-side values (e.g. "זכר"/"נקבה") remain unique
  const [rights] = useState(() => shuffle(pairs.map((p, i) => ({ value: p.right, id: i }))));
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, number>>({});
  const [wrong, setWrong] = useState<number | null>(null);

  const pickLeft = (l: string) => { if (matches[l] !== undefined) return; setSelectedLeft(l); };
  const pickRight = (r: { value: string; id: number }) => {
    if (!selectedLeft) return;
    const correct = pairs.find(p => p.left === selectedLeft)?.right === r.value;
    if (correct) {
      const m = { ...matches, [selectedLeft]: r.id };
      setMatches(m);
      setSelectedLeft(null);
      if (Object.keys(m).length === pairs.length) setTimeout(() => onDone(true), 250);
    } else {
      setWrong(r.id);
      setTimeout(() => { setWrong(null); setSelectedLeft(null); }, 500);
    }
  };

  const matchedRightIds = new Set(Object.values(matches));

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        {pairs.map((p, i) => {
          const isMatched = matches[p.left] !== undefined;
          const isSelected = selectedLeft === p.left;
          return (
            <button key={`L-${i}-${p.left}`} disabled={isMatched || answered !== null}
              onClick={() => pickLeft(p.left)}
              className={`w-full rounded-xl ring-1 px-3 py-3 text-[12.5px] font-semibold text-start transition-all ${
                isMatched ? "bg-emerald-50 ring-emerald-200 text-emerald-700"
                : isSelected ? "bg-violet-100 ring-violet-400 text-violet-900"
                : "bg-white ring-border text-foreground hover:ring-violet-300"
              }`}>
              {p.left}
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        {rights.map(r => {
          const isMatched = matchedRightIds.has(r.id);
          const isWrong = wrong === r.id;
          return (
            <button key={`R-${r.id}`} disabled={isMatched || answered !== null}
              onClick={() => pickRight(r)}
              className={`w-full rounded-xl ring-1 px-3 py-3 text-[12.5px] text-start transition-all ${
                isMatched ? "bg-emerald-50 ring-emerald-200 text-emerald-700 line-through"
                : isWrong ? "bg-rose-50 ring-rose-300 text-rose-700 animate-pulse"
                : "bg-white ring-border text-foreground hover:ring-violet-300"
              }`}>
              {r.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
