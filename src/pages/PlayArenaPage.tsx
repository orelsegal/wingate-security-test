import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useStudent, useStudentProgress, useClassLeaderboard } from "@/hooks/useStudents";
import { useMemo } from "react";
import {
  ArrowRight, Play, ClipboardList, Pencil, Trophy, Zap, GraduationCap,
  CheckCircle2, Circle, Star, Lock, Flame, Gift, Sparkles, MapIcon,
  MessageCircleQuestion, Home as HomeIcon, BarChart3,
} from "lucide-react";

const studentXp = (avgScore: number, completionPct: number) =>
  Math.round(avgScore * 8 + completionPct * 5 + 100);

const STAGE_ICONS = [Play, ClipboardList, Pencil, HomeIcon, Trophy, MessageCircleQuestion, Zap, GraduationCap, Star];
const STAGE_LABELS = [
  "שיעור וידאו", "כרטיסי סיכום", "תרגול מודרך", "תרגול בית",
  "חידון", "שאלות פתוחות", "אתגר בונוס", "מבחן מקדם", "השלמה",
];


const PlayArenaPage = () => {
  const navigate = useNavigate();
  const { subject: subjectParam } = useParams<{ subject?: string }>();
  const subjectName = subjectParam ? decodeURIComponent(subjectParam) : null;
  const { user } = useAuth();
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: student } = useStudent(studentId);
  const { data: progress = [] } = useStudentProgress(studentId);
  const { data: classmates = [] } = useClassLeaderboard(student?.class_name || "");

  // Pick the subject from URL when given, otherwise highest-progress fallback
  const focus = useMemo(() => {
    const arr = (progress as any[]).map((p) => ({
      name: p.subjects?.subject_name || "",
      pct: p.completion_percent || 0,
      grade: p.grade,
      status: p.status,
    }));
    if (subjectName) {
      const match = arr.find((a) => a.name === subjectName || (subjectName === "לשון" && a.name === "לשון והבעה"));
      return match || { name: subjectName, pct: 0, grade: null, status: "yellow" };
    }
    const best = [...arr].sort((a, b) => b.pct - a.pct)[0];
    return best || { name: "מתמטיקה", pct: 0, grade: null, status: "yellow" };
  }, [progress, subjectName]);

  const pct = focus.pct;
  const xp = studentXp(student?.avg_score || 0, student?.completion_percent || 0);
  const level = Math.max(1, Math.floor(xp / 200) + 1);
  const xpToNext = Math.max(20, level * 200 - xp);
  const activeStage = Math.max(1, Math.min(STAGE_LABELS.length, Math.ceil((pct / 100) * STAGE_LABELS.length)));

  // Real leaderboard
  const leaderboard = useMemo(() =>
    classmates.map((c, i) => ({
      name: c.full_name,
      xp: studentXp(c.avg_score || 0, c.completion_percent || 0),
      rank: i + 1,
      isMe: c.id === studentId,
    })), [classmates, studentId]);

  const myRank = leaderboard.find(l => l.isMe)?.rank ?? 0;
  const myXp = leaderboard.find(l => l.isMe)?.xp ?? xp;
  const aboveMe = myRank > 1 ? leaderboard[myRank - 2] : null;
  const gapToNext = aboveMe ? aboveMe.xp - myXp : 0;
  const maxXp = leaderboard.length > 0 ? leaderboard[0].xp : xp;

  // Daily goals from real progress
  const greenCount = (progress as any[]).filter(p => p.status === "green").length;
  const nearDone = (progress as any[]).find(p => p.completion_percent >= 70 && p.completion_percent < 100);
  const dailyGoals = useMemo(() => [
    {
      title: "סיים מקצוע אחד ב-80%+",
      sub: nearDone ? `${nearDone.subjects?.subject_name} ב-${nearDone.completion_percent}% — כמעט שם!` : "השלם מקצוע עד 80% השלמה",
      icon: CheckCircle2,
      done: (progress as any[]).some(p => p.completion_percent >= 80),
    },
    {
      title: "הגיע לסטטוס ירוק",
      sub: `${greenCount} מקצועות ירוקים כרגע`,
      icon: Star,
      done: greenCount >= 1,
    },
    {
      title: `שפר את ${focus.name}`,
      sub: `${Math.round(pct)}% השלמה עכשיו — לך על 100%!`,
      icon: Play,
      done: pct >= 100,
    },
  ], [progress, greenCount, nearDone, focus, pct]);

  /* Winding path geometry — bottom→top */
  const TOTAL = STAGE_LABELS.length;
  const points = STAGE_LABELS.map((_, i) => {
    const t = TOTAL > 1 ? i / (TOTAL - 1) : 0.5;
    return { i, x: 50 + Math.sin(i * 1.35) * 22, y: 94 - t * 88 };
  });
  const pathD = points.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cy = (prev.y + p.y) / 2;
    return `C ${prev.x} ${cy}, ${p.x} ${cy}, ${p.x} ${p.y}`;
  }).join(" ");

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-[1280px] mx-auto" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-[11px] text-muted-foreground hover:bg-accent transition-colors">
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          חזרה למסלול
        </button>
        <div className="text-end">
          <h1 className="text-[22px] font-bold text-foreground tracking-tight flex items-center gap-3 justify-end">
            <span>יחידה {activeStage} — {focus.name}</span>
            <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-violet-600" strokeWidth={2} />
            </div>
          </h1>
          <p className="text-[12px] text-muted-foreground mt-1">חזרה על הפעולות, סדר הפעולות וחוקי הקדימות במספרים</p>
        </div>
      </div>

      {/* Top stats strip */}
      <div className="bg-card rounded-3xl border border-border p-5 shadow-[var(--shadow-card)] mb-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
          <div className="flex items-center justify-center">
            <div className="relative w-[110px] h-[110px]">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <defs>
                  <linearGradient id="playRing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(270 85% 72%)" />
                    <stop offset="60%" stopColor="hsl(330 75% 72%)" />
                    <stop offset="100%" stopColor="hsl(150 50% 70%)" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#playRing)" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - pct / 100)}
                  className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[22px] font-bold text-foreground tabular-nums leading-none">{pct}%</p>
                <p className="text-[9px] text-muted-foreground mt-1">השלמה ביחידה</p>
              </div>
            </div>
          </div>
          <Stat label="נקודות ניסיון" value={xp.toLocaleString()} suffix="XP" tone="violet" />
          <Stat label="היכן אתה נמצא" value={level} prefix="רמה " tone="amber" />
          <Stat label="ממוצע ציונים" value={Math.round(student?.avg_score || 0)} suffix="%" tone="emerald" />
          <div className="bg-gradient-to-l from-amber-50 to-rose-50 rounded-2xl p-3.5 text-center border border-amber-100">
            <p className="text-[9.5px] text-muted-foreground">דירוג בכיתה</p>
            <p className="text-[22px] font-bold text-foreground leading-none mt-1 tabular-nums">{myRank > 0 ? `#${myRank}` : "—"} 🏆</p>
            <div className="mt-2 h-1.5 bg-white/80 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (xp % 200) / 2)}%` }} />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">נשארו {xpToNext} XP לרמה</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        {/* ── Left: Daily challenge + path ────────────────────── */}
        <div className="space-y-5">
          {/* Daily challenge */}
          <div className="bg-card rounded-3xl border border-border p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-[12.5px] font-bold text-foreground mb-3 flex items-center gap-2 justify-end">
              האתגר היומי
              <Sparkles className="h-3.5 w-3.5 text-violet-500" strokeWidth={2} />
            </h2>
            <div className="rounded-2xl bg-gradient-to-br from-violet-100/70 via-pink-50 to-emerald-50/70 p-5 flex items-center justify-between gap-4">
              <div className="text-end">
                <p className="text-[10.5px] font-semibold text-violet-700 mb-1">{focus.name}</p>
                <p className="text-[20px] font-bold text-foreground leading-tight">קרב החזקות</p>
                <p className="text-[11px] text-muted-foreground mt-1">10 שאלות · 7 דקות</p>
                <button className="mt-3 inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white text-[12.5px] font-semibold px-5 py-2.5 rounded-full shadow-[0_8px_20px_-6px_rgba(120,80,200,0.55)] transition-colors">
                  <Play className="h-3.5 w-3.5 fill-white" strokeWidth={0} />
                  התחל לשחק
                </button>
              </div>
              <div className="w-20 h-20 rounded-2xl bg-white/60 flex items-center justify-center shrink-0">
                <Trophy className="h-10 w-10 text-violet-500" strokeWidth={1.5} />
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-rose-50/70 border border-rose-100 p-3 flex items-center gap-3">
              <Flame className="h-4 w-4 text-rose-500 shrink-0" strokeWidth={2} />
              <p className="text-[11px] text-foreground/85 text-end flex-1">
                הכיתה שלך צריכה אותך היום! רק 4 תלמידים ענו עדיין — אם תענה, תוכל לעקוף את י״ב 2!
              </p>
            </div>
          </div>

          {/* Path */}
          <div className="relative bg-card rounded-3xl border border-border shadow-[var(--shadow-card)] overflow-hidden">
            <div className="absolute top-4 right-4 z-30">
              <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-[11px] text-violet-700 font-semibold border border-violet-100 shadow-sm">
                <MapIcon className="h-3.5 w-3.5" strokeWidth={2} />
                מסלול היחידה
              </span>
            </div>

            <div className="relative h-[640px] bg-gradient-to-b from-violet-50/70 via-pink-50/40 to-emerald-50/30">
              {/* Scenery */}
              <svg viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <filter id="playRoadShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feGaussianBlur stdDeviation="3" />
                    <feOffset dy="3" result="o" />
                    <feComponentTransfer in="o"><feFuncA type="linear" slope="0.18" /></feComponentTransfer>
                    <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <radialGradient id="playCloud" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="hsl(220 30% 99%)" />
                    <stop offset="100%" stopColor="hsl(280 25% 95%)" />
                  </radialGradient>
                </defs>
                {[
                  [70, 60, 38, 11], [310, 110, 44, 12], [150, 200, 30, 9],
                  [340, 320, 36, 10], [50, 410, 32, 9], [360, 520, 30, 9],
                  [70, 640, 34, 10], [330, 720, 28, 8], [110, 820, 32, 9],
                ].map(([cx, cy, rx, ry], i) => (
                  <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#playCloud)" opacity="0.9" />
                ))}
                <path d="M 240 200 L 290 110 L 340 200 Z" fill="hsl(270 25% 88%)" />
                <path d="M 285 220 L 335 130 L 390 220 Z" fill="hsl(280 22% 82%)" />
                <path d="M 0 820 Q 100 760 200 800 T 400 780 L 400 900 L 0 900 Z" fill="hsl(150 30% 90%)" opacity="0.55" />
                <g filter="url(#playRoadShadow)" transform="scale(4 9)">
                  <path d={pathD} stroke="hsl(0 0% 100%)" strokeWidth="11" fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </g>
                <path d={pathD} stroke="hsl(270 55% 90%)" strokeWidth="0.5" fill="none" strokeDasharray="1.2 1.8" transform="scale(4 9)" vectorEffect="non-scaling-stroke" />
                {[
                  [35, 720], [375, 690], [25, 820], [385, 830], [40, 560],
                  [365, 580], [30, 440], [375, 460], [40, 310], [370, 330],
                ].map(([x, y], i) => (
                  <g key={i} transform={`translate(${x} ${y})`}>
                    <path d="M 0 0 L 9 -20 L 18 0 Z" fill="hsl(150 32% 65%)" opacity="0.85" />
                    <rect x="7" y="0" width="4" height="7" fill="hsl(25 35% 38%)" />
                  </g>
                ))}
              </svg>

              {/* Nodes */}
              <div className="absolute inset-0">
                {points.map((p) => {
                  const stage = p.i + 1;
                  const isDone = stage < activeStage;
                  const isCurrent = stage === activeStage;
                  const isLocked = stage > activeStage + 1;
                  const Icon = STAGE_ICONS[p.i];
                  const labelLeft = p.x > 50;
                  return (
                    <div key={p.i} className="absolute -translate-x-1/2 -translate-y-1/2 z-20" style={{ top: `${p.y}%`, left: `${p.x}%` }}>
                      <div className={`flex items-center gap-3 ${labelLeft ? "flex-row" : "flex-row-reverse"}`}>
                        <div className={labelLeft ? "text-end" : "text-start"}>
                          <p className="text-[12px] font-bold text-foreground leading-tight whitespace-nowrap">{STAGE_LABELS[p.i]}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                            <Icon className="h-3 w-3" strokeWidth={2} />
                            שלב {stage}
                          </p>
                        </div>
                        <div className="relative">
                          {isDone && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-0.5">
                              {[1, 2, 3].map((s) => (
                                <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={0} />
                              ))}
                            </div>
                          )}
                          <button
                            disabled={isLocked}
                            onClick={() => !isLocked && focus.name && navigate(`/subjects/${encodeURIComponent(focus.name)}`)}
                            className={[
                              "w-[48px] h-[48px] rounded-full flex items-center justify-center text-[16px] font-bold shadow-[0_6px_16px_-4px_rgba(120,80,200,0.35)] transition-all duration-300",
                              isLocked ? "opacity-70 cursor-not-allowed" : "hover:scale-110 cursor-pointer",
                              isDone ? "bg-emerald-400 text-white"
                                : isCurrent ? "bg-violet-500 text-white ring-4 ring-violet-200"
                                : "bg-[hsl(280,15%,82%)] text-white",
                            ].join(" ")}
                          >
                            {isLocked && stage === TOTAL ? <Lock className="h-4 w-4" strokeWidth={2.2} /> : stage}
                          </button>
                          {isDone && (
                            <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow">
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Start chip */}
              <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center shadow">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                </div>
                <div className="text-start">
                  <p className="text-[11px] font-bold text-violet-700 leading-none">התחלה</p>
                  <p className="text-[9.5px] text-muted-foreground mt-1">כאן מתחילים</p>
                </div>
              </div>

              {/* CTA */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
                <button
                  onClick={() => focus.name && navigate(`/subjects/${encodeURIComponent(focus.name)}`)}
                  className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white text-[13px] font-semibold px-7 py-3 rounded-full shadow-[0_10px_24px_-6px_rgba(120,80,200,0.55)] transition-colors"
                >
                  המשך למסלול
                  <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Leaderboard + Goals + Progress ───────────── */}
        <div className="space-y-5">
          {/* Class leaderboard */}
          <div className="bg-card rounded-3xl border border-border p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-[12.5px] font-bold text-foreground mb-1 flex items-center gap-2 justify-end">
              דירוג כיתתי
              <BarChart3 className="h-3.5 w-3.5 text-violet-500" strokeWidth={2} />
            </h2>
            {myRank > 0 && <p className="text-[10.5px] text-muted-foreground mb-3 text-end">את/ה במקום <span className="font-bold text-violet-700">{myRank}</span> בכיתה</p>}
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((row) => {
                const w = Math.round((row.xp / Math.max(maxXp, 1)) * 100);
                return (
                  <div key={row.rank}
                    className={[
                      "relative rounded-xl px-3 py-2.5 flex items-center gap-3 border",
                      row.isMe ? "bg-violet-50 border-violet-200" : "bg-background border-border",
                    ].join(" ")}>
                    <div className="absolute inset-y-0 right-0 rounded-xl overflow-hidden pointer-events-none w-full">
                      <div className={`h-full ${row.isMe ? "bg-violet-200/50" : "bg-muted/50"}`} style={{ width: `${w}%` }} />
                    </div>
                    <span className={[
                      "relative z-10 shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold",
                      row.rank === 1 ? "bg-amber-300 text-amber-900" :
                      row.rank === 2 ? "bg-slate-300 text-slate-800" :
                      row.rank === 3 ? "bg-orange-200 text-orange-900" :
                      "bg-muted text-muted-foreground",
                    ].join(" ")}>{row.rank}</span>
                    <span className="relative z-10 flex-1 text-[12px] font-semibold text-foreground text-end">{row.name}</span>
                    <span className="relative z-10 text-[11px] font-bold text-violet-700 tabular-nums">{row.xp.toLocaleString()} XP</span>
                  </div>
                );
              })}
            </div>
            {gapToNext > 0 && aboveMe && (
              <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
                <p className="text-[10.5px] text-emerald-800 text-end flex-1 font-medium">
                  עוד {gapToNext.toLocaleString()} XP לעקוף את {aboveMe.name.split(" ")[0]}
                </p>
              </div>
            )}
          </div>

          {/* Daily goals */}
          <div className="bg-card rounded-3xl border border-border p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-[12.5px] font-bold text-foreground mb-3 flex items-center gap-2 justify-end">
              יעדים יומיים
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
            </h2>
            <div className="space-y-2">
              {dailyGoals.map((g, i) => {
                const Icon = g.icon;
                return (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${g.done ? "bg-emerald-50/60 border-emerald-100" : "bg-background border-border"}`}>
                    {g.done
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" strokeWidth={2} />
                      : <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" strokeWidth={2} />}
                    <div className="flex-1 text-end">
                      <p className={`text-[12px] font-semibold ${g.done ? "text-foreground" : "text-foreground/80"} leading-tight`}>{g.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{g.sub}</p>
                    </div>
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2 text-end">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-l from-violet-500 to-pink-400 transition-all duration-500"
                  style={{ width: `${(dailyGoals.filter(g => g.done).length / dailyGoals.length) * 100}%` }} />
              </div>
              <span className="text-[10.5px] font-semibold text-violet-700 inline-flex items-center gap-1">
                <Gift className="h-3.5 w-3.5" strokeWidth={2} />
                {dailyGoals.filter(g => g.done).length} מתוך {dailyGoals.length} השלמתי
              </span>
            </div>
          </div>

          {/* Progress metrics */}
          <div className="bg-card rounded-3xl border border-border p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-[12.5px] font-bold text-foreground mb-3 flex items-center gap-2 justify-end">
              ההתקדמות שלי
              <BarChart3 className="h-3.5 w-3.5 text-violet-500" strokeWidth={2} />
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <Metric label="ממוצע ציונים" value={`${Math.round(student?.avg_score || 0)}%`} tone="emerald" icon="📊" />
              <Metric label="נקודות XP" value={xp.toLocaleString()} tone="violet" icon="📈" />
              <Metric label="השלמה" value={`${Math.round(student?.completion_percent || 0)}%`} tone="rose" icon="🎯" />
            </div>
            <div className="mt-3 rounded-xl bg-emerald-50/70 border border-emerald-100 p-3 text-center">
              <p className="text-[10.5px] text-emerald-800 font-medium">👏 כל הכבוד! אתה בדרך הנכונה לניצחון!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom tip */}
      <div className="mt-6 bg-violet-50/60 border border-violet-100 rounded-2xl p-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-foreground/80 flex-1 text-end">
          אל תוותר! כל שאלה מקרבת אותך לניצחון אישי וכיתתי. תשובות נכונות היום — פותחות לך דלתות מחר.
        </p>
        <div className="flex items-center gap-2 text-violet-700">
          <span className="text-[11.5px] font-bold">טיפ להצלחה</span>
          <Star className="h-4 w-4 fill-violet-400 text-violet-500" strokeWidth={0} />
        </div>
      </div>
    </div>
  );
};

/* ── Tiny stat cell ─────────────────────────────────────────────── */
const Stat = ({ label, value, prefix, suffix, tone }: { label: string; value: any; prefix?: string; suffix?: string; tone: "violet"|"amber"|"emerald" }) => {
  const color = tone === "violet" ? "text-violet-600" : tone === "amber" ? "text-amber-600" : "text-emerald-600";
  return (
    <div className="text-center">
      <p className="text-[26px] font-bold text-foreground tabular-nums leading-none">
        {prefix}{value}{suffix && <span className={`text-[11px] font-semibold ${color} mr-1`}>{suffix}</span>}
      </p>
      <p className="text-[10.5px] text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
};

const Metric = ({ label, value, suffix, tone, icon }: { label: string; value: any; suffix?: string; tone: "violet"|"emerald"|"rose"; icon?: string }) => {
  const color = tone === "violet" ? "text-violet-600" : tone === "emerald" ? "text-emerald-600" : "text-rose-500";
  const bg = tone === "violet" ? "bg-violet-50" : tone === "emerald" ? "bg-emerald-50" : "bg-rose-50";
  return (
    <div className={`${bg} rounded-2xl p-2.5 text-center`}>
      <p className={`text-[16px] font-bold ${color} tabular-nums leading-none`}>
        {value}{suffix && <span className="text-[9px] font-semibold mr-1">{suffix}</span>}
      </p>
      <p className="text-[9px] text-muted-foreground mt-1.5 leading-tight">{label}</p>
      {icon && <p className="text-[12px] mt-0.5">{icon}</p>}
    </div>
  );
};

export default PlayArenaPage;
