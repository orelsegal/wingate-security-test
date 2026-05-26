/**
 * OlympicTopPanel — "אולימפיאדת הידע" entry panel.
 * Shown at the top of PlayHub: class hook, daily missions ring, class battle bars,
 * featured open challenge. Matches the reference mockup in light/pastel theme.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Trophy, Target, CheckCircle2, Clock, Flame, ChevronLeft } from "lucide-react";
import { DailyChallenge, getResult, todayKey } from "@/lib/dailyChallenge";

type Props = {
  challenge: DailyChallenge;
  studentName?: string;
  classRank?: number;
  className?: string;
};

/* Pretty countdown until next midnight (challenge resets daily) */
const useDailyCountdown = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  const diff = Math.max(0, d.getTime() - now);
  const hh = String(Math.floor(diff / 3_600_000)).padStart(2, "0");
  const mm = String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((diff % 60_000) / 1000)).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};

/* SVG progress ring (light, with soft gradient) */
const Ring = ({
  value, max, label, sub, color, icon,
}: {
  value: number; max: number; label: string; sub?: string;
  color: "violet" | "emerald" | "sky";
  icon?: React.ReactNode;
}) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const dash = `${Math.round(pct * 0.94)}, 100`;
  const stroke =
    color === "violet"  ? "stroke-violet-500" :
    color === "emerald" ? "stroke-emerald-500" :
                          "stroke-sky-400";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[72px] h-[72px]">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" className="stroke-muted/30" strokeWidth="3" />
          <circle cx="18" cy="18" r="15" fill="none" className={stroke} strokeWidth="3"
                  strokeDasharray={dash} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {icon ?? <span className="text-[18px] font-bold tabular-nums text-foreground">{value}</span>}
        </div>
      </div>
      <p className="text-[10.5px] text-muted-foreground text-center leading-tight">{label}</p>
      {sub && <p className="text-[9.5px] text-muted-foreground/70 -mt-1">{sub}</p>}
    </div>
  );
};

const OlympicTopPanel = ({ challenge, studentName, classRank = 3, className }: Props) => {
  const navigate = useNavigate();
  const countdown = useDailyCountdown();
  const result = useMemo(() => getResult(todayKey()), []);
  const playedToday = !!result;

  // Daily missions stats — backed by today's result if exists, otherwise mock pre-play state.
  const totalTasks   = challenge.tasks.length;
  const correctSoFar = result?.correct ?? 0;
  const errorsToFix  = result ? Math.max(0, totalTasks - result.correct) : Math.max(1, Math.round(totalTasks / 2));
  const completed    = result ? 1 : 0; // "צפייה ביחידה" — once played, the recap is "seen"

  // Mock class battle leaderboard — your class highlighted by `className`
  const myClass = className || "י׳3";
  const classBars = [
    { name: "ו׳1", xp: 4820, color: "from-violet-400 to-violet-500", track: "bg-violet-100" },
    { name: "י׳2", xp: 4540, color: "from-sky-400 to-sky-500",       track: "bg-sky-100" },
    { name: `${myClass} (אנחנו)`, xp: 4260, color: "from-emerald-400 to-emerald-500", track: "bg-emerald-100", me: true },
    { name: "ו׳4", xp: 3980, color: "from-slate-300 to-slate-400",   track: "bg-slate-100" },
  ];
  const maxXp = Math.max(...classBars.map((c) => c.xp));

  return (
    <section dir="rtl" className="space-y-4">
      {/* ── Hero hook ────────────────────────────────────── */}
      <div className="text-center px-2">
        <h1 className="text-[22px] md:text-[28px] font-extrabold text-foreground tracking-tight leading-tight">
          {studentName ? `${studentName.split(" ")[0]}, הכיתה שלך צריכה אותך היום!` : "הכיתה שלך צריכה אותך היום!"}
        </h1>
        <p className="text-[12.5px] text-muted-foreground mt-2 inline-flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          עוד {challenge.pointsToOvertake} נקודות ואנחנו עוקפים את {challenge.rivalClass}
        </p>
      </div>

      {/* ── Daily missions card ─────────────────────────── */}
      <div className="bg-white rounded-3xl ring-1 ring-violet-100 shadow-[0_10px_40px_-18px_rgba(139,92,246,0.25)] p-5">
        <p className="text-center text-[12.5px] font-semibold text-foreground/70 mb-4">המשימות היומיות שלך</p>
        <div className="grid grid-cols-3 gap-1 items-center">
          <Ring
            value={completed ? 1 : 0} max={1}
            label="צפייה ביחידה"
            color="emerald"
            icon={
              completed
                ? <CheckCircle2 className="h-7 w-7 text-emerald-500" strokeWidth={2.3} />
                : <span className="text-[18px] font-bold text-muted-foreground/60">0</span>
            }
          />
          <div className="relative">
            <Ring
              value={correctSoFar} max={totalTasks}
              label={`מתוך ${totalTasks}`} sub={playedToday ? "הושלם" : "בתהליך"}
              color="violet"
            />
            <ChevronLeft className="hidden md:block absolute -right-1 top-7 h-4 w-4 text-violet-300" />
            <ChevronLeft className="hidden md:block absolute -left-1 top-7 h-4 w-4 text-violet-300" />
          </div>
          <Ring
            value={errorsToFix} max={totalTasks}
            label="חיזוק טעויות"
            color="sky"
          />
        </div>

        <button
          onClick={() => navigate("/play/daily")}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 via-violet-500 to-fuchsia-500 text-white rounded-2xl py-3.5 font-bold text-[14px] shadow-[0_8px_24px_-8px_rgba(139,92,246,0.6)] hover:scale-[1.01] active:scale-[0.99] transition-transform"
        >
          <Zap className="h-4 w-4 fill-white" strokeWidth={0} />
          {playedToday ? "המשך לחזרה" : "התחל לשחק"}
        </button>
      </div>

      {/* ── Class battle ────────────────────────────────── */}
      <div className="bg-white rounded-3xl ring-1 ring-border shadow-[var(--shadow-card)] p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="text-end">
            <h3 className="text-[14px] font-bold text-foreground">הקרב הכיתתי</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> נגמר בעוד <span className="tabular-nums font-semibold">{countdown}</span>
            </p>
          </div>
          {/* Medal badge */}
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-md shadow-amber-200/60">
              <span className="text-[22px] font-extrabold text-amber-900">{classRank}</span>
            </div>
            <span className="absolute -top-1.5 -start-1.5 bg-violet-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">מקום</span>
          </div>
        </div>

        <div className="space-y-2">
          {classBars.map((c) => {
            const w = Math.round((c.xp / maxXp) * 100);
            return (
              <div key={c.name} className="flex items-center gap-2">
                <span className={`text-[11.5px] font-semibold w-20 truncate ${c.me ? "text-emerald-700" : "text-foreground/80"}`}>
                  {c.name}
                </span>
                <div className={`relative flex-1 h-3.5 ${c.track} rounded-full overflow-hidden`}>
                  <div
                    className={`h-full bg-gradient-to-r ${c.color} rounded-full transition-all`}
                    style={{ width: `${w}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold tabular-nums text-foreground/80 w-14 text-end">
                  {c.xp.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 bg-violet-50 ring-1 ring-violet-100 rounded-2xl px-3 py-2.5 flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {[0,1,2].map((i) => (
              <div key={i} className={`w-5 h-5 rounded-full ring-2 ring-white ${["bg-violet-300","bg-emerald-300","bg-amber-300"][i]}`} />
            ))}
          </div>
          <p className="text-[11px] font-semibold text-violet-700">+3 עוד 3 תלמידים עונים ואתם עולים מקום!</p>
        </div>
      </div>

      {/* ── Open challenges preview ─────────────────────── */}
      <div>
        <div className="flex items-baseline justify-between mb-2.5 px-1">
          <button onClick={() => navigate("/play")} className="text-[11px] font-semibold text-violet-600 hover:underline">
            ראה הכל
          </button>
          <h3 className="text-[14px] font-bold text-foreground">אתגרים פתוחים</h3>
        </div>
        <div className="bg-white rounded-3xl ring-1 ring-border shadow-[var(--shadow-card)] p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 ring-1 ring-rose-200 flex items-center justify-center shrink-0">
              <Target className="h-6 w-6 text-rose-500" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0 text-end">
              <p className="text-[13.5px] font-bold text-foreground">{challenge.subject} — {challenge.topic}</p>
              <p className="text-[10.5px] text-muted-foreground mt-0.5">
                {challenge.tasks.length} שאלות · {challenge.minutes} דקות · בינוני
              </p>
              <p className="text-[10.5px] text-violet-600 font-semibold mt-0.5 inline-flex items-center gap-1">
                <Flame className="h-3 w-3" /> פרס: {challenge.personalXp} XP
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/play/daily")}
            className="mt-3 w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl py-2.5 font-semibold text-[13px] shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-transform"
          >
            התחל אתגר
          </button>
        </div>
      </div>
    </section>
  );
};

export default OlympicTopPanel;
