import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useStudent, useStudentProgress, useClassLeaderboard } from "@/hooks/useStudents";
import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import {
  Play, Trophy, Sparkles, Flame, BookOpen, Crown, Medal, Target,
  CheckCircle2, Clock, Zap, TrendingUp, Map, AlertTriangle, X,
  Brain, FileText, MessageSquare, Gamepad2, Lock, Star, Gift,
} from "lucide-react";

type Task = {
  id: string;
  title: string;
  subject: string;
  type: "quiz" | "video" | "practice" | "challenge";
  questions?: number;
  minutes: number;
  dueInDays: number;
  xp: number;
};

const taskTitleByStatus: Record<string, (subject: string) => string> = {
  red:    (s) => `אתגר — ${s}`,
  yellow: (s) => `תרגול — ${s}`,
  green:  (s) => `חזרה — ${s}`,
};

const studentXp = (avgScore: number, completionPct: number) =>
  Math.round(avgScore * 8 + completionPct * 5 + 100);

// Achievements defined as conditions checked at render time
const buildAchievements = (student: any, completedSubjects: number) => [
  {
    icon: Star,   label: "אלוף הדיוק",   color: "from-violet-400 to-indigo-400", ring: "ring-violet-100",
    unlocked: (student?.avg_score || 0) >= 85,
  },
  {
    icon: Trophy, label: "מסיים מקצועות", color: "from-amber-400 to-yellow-400",  ring: "ring-amber-100",
    unlocked: completedSubjects >= 3,
  },
  {
    icon: TrendingUp, label: "בסטטוס ירוק", color: "from-emerald-400 to-teal-400", ring: "ring-emerald-100",
    unlocked: (student?.overall_status) === "green",
  },
  {
    icon: Zap, label: "90+ ממוצע", color: "from-rose-400 to-orange-400", ring: "ring-rose-100",
    unlocked: (student?.avg_score || 0) >= 90,
  },
  {
    icon: Crown, label: "מקום ראשון", color: "from-amber-300 to-yellow-500", ring: "ring-yellow-100",
    unlocked: false, // future: when leaderboard rank === 1
  },
  {
    icon: Gift, label: "בונוס מצוינות", color: "from-pink-400 to-rose-400", ring: "ring-pink-100",
    unlocked: (student?.avg_score || 0) >= 95,
  },
];

const typeIcon = (t: Task["type"]) => {
  switch (t) {
    case "quiz":      return FileText;
    case "video":     return Play;
    case "practice":  return Brain;
    case "challenge": return Trophy;
  }
};

const fireConfetti = () => {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999, scalar: 0.9 };
  const count = 200;
  const fire = (ratio: number, opts: confetti.Options) =>
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * ratio) });
  fire(0.25, { spread: 26, startVelocity: 55, colors: ["#a78bfa", "#f472b6", "#fbbf24"] });
  fire(0.2,  { spread: 60, colors: ["#34d399", "#60a5fa", "#a78bfa"] });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ["#fbbf24", "#fb7185", "#a78bfa"] });
  fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1,  { spread: 120, startVelocity: 45 });
};

type Tab = "home" | "tasks" | "leaderboard" | "achievements";

/* ─── Streak helpers (localStorage-based, no DB needed) ─────────────── */
const STREAK_KEY = "wingate_streak";

const todayStr = () => new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const loadStreak = (): number => {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return 0;
    const { date, count } = JSON.parse(raw);
    if (date === todayStr()) return count;            // already counted today
    if (date === yesterdayStr()) return count;        // yesterday → still alive
    return 0;                                        // broke the streak
  } catch { return 0; }
};

const bumpStreak = (): number => {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    const today = todayStr();
    let count = 1;
    if (raw) {
      const { date, count: prev } = JSON.parse(raw);
      if (date === today) return prev;               // already bumped today
      if (date === yesterdayStr()) count = prev + 1; // consecutive day
    }
    localStorage.setItem(STREAK_KEY, JSON.stringify({ date: today, count }));
    return count;
  } catch { return 1; }
};

const PlayHubPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: student } = useStudent(studentId);
  const { data: progress = [] } = useStudentProgress(studentId);
  const { data: classmates = [] } = useClassLeaderboard(student?.class_name || "");
  const [tab, setTab] = useState<Tab>("home");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [urgentPopup, setUrgentPopup] = useState<Task | null>(null);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [streak, setStreak] = useState<number>(loadStreak);

  // Bump streak on first meaningful render (student data arrived)
  useEffect(() => {
    if (studentId) setStreak(bumpStreak());
  }, [studentId]);

  // Derive tasks from real progress data
  const allTasks = useMemo<Task[]>(() => {
    return (progress as any[])
      .filter((p) => p.status === "red" || p.status === "yellow")
      .map((p) => ({
        id: p.subject_id || p.id,
        title: (taskTitleByStatus[p.status] || taskTitleByStatus.green)(p.subjects?.subject_name || ""),
        subject: p.subjects?.subject_name || "",
        type: (p.status === "red" ? "challenge" : "practice") as Task["type"],
        minutes: p.status === "red" ? 10 : 7,
        dueInDays: p.status === "red" ? 2 : 5,
        xp: Math.round((100 - (p.completion_percent || 0)) * 1.5 + 50),
      }));
  }, [progress]);

  const openTasks = useMemo(() => allTasks.filter((t) => !completed.has(t.id)), [allTasks, completed]);
  const urgentTasks = useMemo(() => openTasks.filter((t) => t.dueInDays <= 3), [openTasks]);
  const allDone = allTasks.length > 0 && openTasks.length === 0;

  // Compute XP and stats from real data
  const xp = studentXp(student?.avg_score || 0, student?.completion_percent || 0);
  const completedSubjects = (progress as any[]).filter((p) => p.status === "green").length;
  const totalSubjects = (progress as any[]).length;
  // Avg of assignments/quizzes across the student's subjects (proxy via completion_percent)
  const assignmentsAvg = totalSubjects > 0
    ? Math.round((progress as any[]).reduce((s, p) => s + (p.completion_percent || 0), 0) / totalSubjects)
    : Math.round(student?.completion_percent || 0);

  // Leaderboard with real data — find current student's rank
  const leaderboard = useMemo(() => {
    return classmates
      .map((c, i) => ({
        name: c.full_name,
        xp: studentXp(c.avg_score || 0, c.completion_percent || 0),
        rank: i + 1,
        isMe: c.id === studentId,
      }));
  }, [classmates, studentId]);

  const myRank = leaderboard.find((p) => p.isMe);

  /* Show urgent popup once on mount */
  useEffect(() => {
    if (!popupDismissed && urgentTasks.length > 0) {
      const t = setTimeout(() => setUrgentPopup(urgentTasks[0]), 600);
      return () => clearTimeout(t);
    }
  }, [urgentTasks, popupDismissed]);

  const completeTask = (id: string) => {
    setCompleted((s) => new Set(s).add(id));
    fireConfetti();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 via-white to-violet-50/30" dir="rtl">
      <div className="relative p-5 md:p-8 lg:p-10 max-w-[1200px] mx-auto">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="mb-6">
          <p className="text-[10.5px] font-semibold text-violet-600 mb-1.5 inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" strokeWidth={2.2} />
            שנעלה על המסלול? גו!
          </p>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-[24px] md:text-[30px] font-bold text-foreground tracking-tight leading-tight">
                המסלול של <span className="text-violet-600">{student?.full_name || user?.name}</span>
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1.5">
                {openTasks.length > 0
                  ? `${openTasks.length} משימות פתוחות מחכות לך — קדימה!`
                  : "כל הכבוד! סיימת הכל. הגיע הזמן לחזרה חכמה ✨"}
              </p>
            </div>
            <div className={`flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 ring-1 shadow-sm ${streak >= 7 ? "ring-rose-200" : streak >= 3 ? "ring-orange-100" : "ring-violet-100"}`}>
              <Flame className={`h-4 w-4 ${streak >= 7 ? "text-rose-500" : streak >= 3 ? "text-orange-400" : "text-muted-foreground"}`} strokeWidth={2.2} />
              <span className="text-[13px] font-bold text-foreground">{streak}</span>
              <span className="text-[10.5px] text-muted-foreground">רצף ימים</span>
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────── */}
        <div className="inline-flex items-center gap-1 bg-white rounded-2xl p-1 ring-1 ring-border shadow-sm mb-5">
          {([
            { id: "home",         label: "בית",          icon: Target },
            { id: "tasks",        label: "המשימות שלי",  icon: Zap },
            { id: "leaderboard",  label: "דירוג כיתתי",  icon: Trophy },
            { id: "achievements", label: "הישגים",       icon: Medal },
          ] as { id: Tab; label: string; icon: any }[]).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all ${
                  active ? "bg-violet-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" strokeWidth={2} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ─── HOME tab ───────────────────────────────── */}
        {tab === "home" && (
          <div className="space-y-5">
            {/* KPI strip (from reference image) */}
            <div className="bg-white rounded-3xl ring-1 ring-border p-5 md:p-6 shadow-[var(--shadow-card)]">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-2 items-center">
                {/* completion ring */}
                <div className="flex items-center gap-3">
                  <div className="relative w-[68px] h-[68px]">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" className="stroke-muted/40" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" className="stroke-violet-500" strokeWidth="3"
                        strokeDasharray={`${Math.round(assignmentsAvg * 0.94)}, 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[14px] font-bold text-foreground">{assignmentsAvg}%</span>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground">ממוצע מטלות<br/>ובחנים במקצוע</p>
                </div>
                {/* xp */}
                <div className="flex flex-col items-center text-center border-s border-border/60 ps-2">
                  <div className="inline-flex items-baseline gap-1.5">
                    <span className="text-[20px] font-bold tabular-nums">{xp.toLocaleString()}</span>
                    <span className="text-[9px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">XP</span>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground mt-1">נקודות ניסיון</p>
                </div>
                {/* avg grade */}
                <div className="flex flex-col items-center text-center border-s border-border/60 ps-2">
                  <span className="text-[20px] font-bold tabular-nums">{Math.round(student?.avg_score || 0)}</span>
                  <p className="text-[10.5px] text-muted-foreground mt-1">ממוצע ציונים<br/><span className="text-amber-500 font-semibold">כולל!</span></p>
                </div>
                {/* completed */}
                <div className="flex flex-col items-center text-center border-s border-border/60 ps-2">
                  <span className="text-[20px] font-bold tabular-nums">{completedSubjects}/{totalSubjects} <CheckCircle2 className="inline h-4 w-4 text-emerald-500" strokeWidth={2.2} /></span>
                  <p className="text-[10.5px] text-muted-foreground mt-1">נושאים הושלמו</p>
                </div>
                {/* rank */}
                <div className="flex flex-col items-center text-center border-s border-border/60 ps-2">
                  <div className="inline-flex items-baseline gap-1.5">
                    <span className="text-[20px] font-bold tabular-nums">{myRank?.rank || "—"}</span>
                    <Trophy className="h-4 w-4 text-amber-500" strokeWidth={2.2} />
                  </div>
                  <p className="text-[10.5px] text-muted-foreground mt-1">דירוג בכיתה</p>
                  <div className="w-full h-1 bg-muted/50 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full"
                      style={{ width: myRank && leaderboard.length > 1 ? `${Math.round((1 - (myRank.rank - 1) / leaderboard.length) * 100)}%` : "50%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Featured task + Leaderboard side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4">

              {/* Featured open task */}
              {openTasks[0] ? (
                <FeaturedTaskCard
                  task={openTasks[0]}
                  onPlay={() => completeTask(openTasks[0].id)}
                  onLearn={() => navigate(`/play/${encodeURIComponent(openTasks[0].subject)}`)}
                />
              ) : (
                <AllDoneCard />
              )}

              {/* Leaderboard */}
              <div className="bg-white rounded-3xl ring-1 ring-border p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-baseline justify-between mb-3">
                  <Trophy className="h-4 w-4 text-violet-500" strokeWidth={2} />
                  <h3 className="text-[14px] font-semibold text-foreground">דירוג כיתתי</h3>
                </div>
                {myRank && (
                  <div className="bg-violet-50 ring-1 ring-violet-100 rounded-2xl p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <Trophy className="h-5 w-5 text-violet-500" strokeWidth={2} />
                      <div className="text-end">
                        <p className="text-[13px] font-bold text-violet-700">את/ה במקום {myRank.rank} בכיתה</p>
                        {myRank.rank > 1 && leaderboard[myRank.rank - 2] && (
                          <p className="text-[10.5px] text-muted-foreground">
                            עוד {(leaderboard[myRank.rank - 2].xp - myRank.xp).toLocaleString()} XP לעקוף את {leaderboard[myRank.rank - 2].name.split(" ")[0]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  {leaderboard.slice(0, 5).map((p) => {
                    const max = leaderboard[0]?.xp || 1;
                    const w = Math.round((p.xp / max) * 100);
                    return (
                      <div key={p.rank} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${p.isMe ? "bg-violet-50 ring-1 ring-violet-200" : ""}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          p.rank === 1 ? "bg-amber-200 text-amber-800" :
                          p.rank === 2 ? "bg-slate-200 text-slate-700" :
                          p.rank === 3 ? "bg-orange-200 text-orange-800" :
                          "bg-muted text-muted-foreground"
                        }`}>{p.rank}</div>
                        <span className={`flex-1 text-[11.5px] truncate ${p.isMe ? "font-semibold text-violet-700" : "text-foreground"}`}>{p.name}</span>
                        <div className="hidden md:block w-16 h-1 bg-muted/50 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-400 rounded-full" style={{ width: `${w}%` }} />
                        </div>
                        <span className="text-[10.5px] font-semibold tabular-nums text-foreground/80">{p.xp.toLocaleString()} XP</span>
                      </div>
                    );
                  })}
                </div>
                {myRank && myRank.rank > 1 && leaderboard[myRank.rank - 2] && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2 w-full justify-center">
                    <Zap className="h-3 w-3" />
                    עוד {(leaderboard[myRank.rank - 2].xp - myRank.xp).toLocaleString()} XP לעקוף את {leaderboard[myRank.rank - 2].name.split(" ")[0]}
                  </div>
                )}
              </div>
            </div>

            {/* Goals today + personal progress */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">

              {/* Today's goals = open tasks */}
              <div className="bg-white rounded-3xl ring-1 ring-border p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-baseline justify-between mb-3">
                  <Target className="h-4 w-4 text-violet-500" strokeWidth={2} />
                  <h3 className="text-[14px] font-semibold text-foreground">היעדים שלי להיום</h3>
                </div>
                <div className="space-y-2">
                  {allTasks.slice(0, 3).map((t) => {
                    const done = completed.has(t.id);
                    return (
                      <div key={t.id} className="flex items-center gap-3 bg-muted/20 rounded-xl px-3 py-2.5">
                        <button
                          onClick={() => !done && completeTask(t.id)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            done ? "bg-emerald-500 text-white" : "ring-1 ring-muted-foreground/30 hover:ring-violet-400"
                          }`}
                        >
                          {done && <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-foreground truncate">{t.title}</p>
                          <p className="text-[10.5px] text-muted-foreground">{t.subject} · {t.minutes} דק׳</p>
                        </div>
                        {(() => { const Icon = typeIcon(t.type); return <Icon className="h-4 w-4 text-violet-500" strokeWidth={2} />; })()}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all"
                      style={{ width: allTasks.length > 0 ? `${Math.round((completed.size / allTasks.length) * 100)}%` : "0%" }} />
                  </div>
                  <span>{completed.size} מתוך {allTasks.length} הושלמו 🎁</span>
                </div>
              </div>

              {/* Personal progress */}
              <div className="bg-white rounded-3xl ring-1 ring-border p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-baseline justify-between mb-3">
                  <TrendingUp className="h-4 w-4 text-violet-500" strokeWidth={2} />
                  <h3 className="text-[14px] font-semibold text-foreground">ההתקדמות אישית</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Trophy,     val: myRank?.rank ? `#${myRank.rank}` : "—", sub: "דירוג בכיתה 🏆", fg: "text-amber-500",   bg: "bg-amber-50" },
                    { icon: TrendingUp, val: xp.toLocaleString(),                     sub: "נקודות XP 👥",   fg: "text-violet-500", bg: "bg-violet-50" },
                    { icon: Target,     val: `${Math.round(student?.avg_score || 0)}`, sub: "ממוצע ציונים 📊", fg: "text-emerald-500", bg: "bg-emerald-50" },
                  ].map((s, i) => (
                    <div key={i} className={`${s.bg} rounded-2xl p-3 text-center`}>
                      <p className="text-[10px] text-muted-foreground mb-1">{s.sub.split(" ")[0]}<br/>{s.sub.split(" ").slice(1).join(" ")}</p>
                      <p className="text-[18px] font-bold tabular-nums">{s.val}</p>
                    </div>
                  ))}
                </div>
                {allDone && <AiReviewBanner />}
                {!allDone && (
                  <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2 w-full justify-center">
                    💪 כל הכבוד! אתה בדרך הנכונה לניצחון!
                  </div>
                )}
              </div>
            </div>

            {/* Tip footer */}
            <div className="bg-amber-50/60 rounded-2xl ring-1 ring-amber-100 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
                <Star className="h-4 w-4 text-amber-700 fill-amber-700" strokeWidth={0} />
              </div>
              <p className="text-[12px] text-amber-900/80">
                <span className="font-semibold">טיפ להצלחה:</span> כל שאלה מקרבת אותך לניצחון אישי וכיתתי. תשובות נכונות היום = פותחות לך דלתות מחר.
              </p>
            </div>
          </div>
        )}

        {/* ─── TASKS tab ───────────────────────────────── */}
        {tab === "tasks" && (
          <div className="space-y-3 max-w-[720px] mx-auto">
            {allDone ? (
              <AllDoneCard expanded />
            ) : (
              openTasks.map((t) => {
                const Icon = typeIcon(t.type);
                const urgent = t.dueInDays <= 3;
                return (
                  <div key={t.id} className={`bg-white rounded-2xl ring-1 ${urgent ? "ring-rose-200" : "ring-border"} p-4 shadow-[var(--shadow-card)] flex items-center gap-3`}>
                    <div className={`w-12 h-12 rounded-2xl ${urgent ? "bg-rose-50" : "bg-violet-50"} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-5 w-5 ${urgent ? "text-rose-500" : "text-violet-500"}`} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">{t.subject}</span>
                        {urgent && (
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" /> {t.dueInDays} ימים
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-semibold text-foreground truncate">{t.title}</p>
                      <p className="text-[10.5px] text-muted-foreground">
                        {t.questions ? `${t.questions} שאלות · ` : ""}{t.minutes} דקות · {t.xp} XP
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => navigate(`/play/${encodeURIComponent(t.subject)}`)}
                        className="inline-flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-sm transition-colors"
                      >
                        <Play className="h-3 w-3 fill-white" strokeWidth={0} />
                        כנס
                      </button>
                      <button
                        onClick={() => completeTask(t.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-full border border-border/60 hover:bg-muted/40 transition-colors"
                      >
                        <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
                        עשיתי
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── LEADERBOARD tab ───────────────────────────────── */}
        {tab === "leaderboard" && (
          <div className="space-y-4 max-w-[720px] mx-auto">
            <div className="bg-white rounded-3xl ring-1 ring-border p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-[16px] font-semibold text-foreground text-center mb-6">הדירוג הכיתתי</h2>
              {leaderboard.length >= 3 && (
                <div className="grid grid-cols-3 items-end gap-3 mb-6">
                  {[
                    { ...leaderboard[1], h: "h-20", from: "from-slate-300", to: "to-slate-400", chip: "bg-slate-200 text-slate-700" },
                    { ...leaderboard[0], h: "h-28", from: "from-amber-300", to: "to-amber-500", chip: "bg-amber-200 text-amber-800" },
                    { ...leaderboard[2], h: "h-16", from: "from-orange-300", to: "to-orange-500", chip: "bg-orange-200 text-orange-800" },
                  ].map((p, i) => p && (
                    <div key={i} className="flex flex-col items-center">
                      <p className={`text-[11px] font-semibold truncate max-w-full ${p.isMe ? "text-emerald-600" : "text-muted-foreground"}`}>{p.name.split(" ")[0]}</p>
                      <p className="text-[13px] font-bold tabular-nums mb-2">{p.xp.toLocaleString()}</p>
                      <div className={`w-full ${p.h} rounded-t-2xl bg-gradient-to-b ${p.from} ${p.to} flex items-start justify-center pt-2 shadow-md`}>
                        <div className={`w-7 h-7 rounded-full ${p.chip} flex items-center justify-center text-[12px] font-bold`}>{p.rank}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {leaderboard.length === 0 && (
                <p className="text-[13px] text-muted-foreground text-center py-6">אין נתוני כיתה עדיין</p>
              )}
              <div className="space-y-2">
                {leaderboard.slice(leaderboard.length >= 3 ? 3 : 0).map((p) => (
                  <div key={p.rank} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${p.isMe ? "bg-violet-50 ring-1 ring-violet-200" : "bg-muted/30"}`}>
                    <span className="text-[12px] font-bold text-muted-foreground w-5">{p.rank}</span>
                    <span className={`flex-1 text-[12.5px] truncate ${p.isMe ? "text-violet-700 font-semibold" : "text-foreground"}`}>{p.name}</span>
                    <span className="text-[12px] font-semibold tabular-nums text-foreground/80">{p.xp.toLocaleString()} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── ACHIEVEMENTS tab ───────────────────────────────── */}
        {tab === "achievements" && (
          <div className="max-w-[720px] mx-auto bg-white rounded-3xl ring-1 ring-border p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-[16px] font-semibold text-foreground text-center mb-5 inline-flex items-center gap-2 w-full justify-center">
              <Medal className="h-4 w-4 text-amber-500" />
              ההישגים שלי
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {buildAchievements(student, completedSubjects).map((a, i) => (
                <div key={i} className={`bg-white ring-1 ${a.ring} rounded-2xl p-4 flex flex-col items-center text-center shadow-[var(--shadow-card)] ${!a.unlocked ? "opacity-35 grayscale" : ""}`}>
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${a.color} flex items-center justify-center shadow-md mb-2`}>
                    {a.unlocked
                      ? <a.icon className="h-6 w-6 text-white" strokeWidth={2} />
                      : <Lock className="h-6 w-6 text-white" strokeWidth={2} />
                    }
                  </div>
                  <p className="text-[12px] font-semibold text-foreground">{a.label}</p>
                  <p className="text-[9.5px] text-muted-foreground mt-0.5">{a.unlocked ? "🏅 הושג" : "🔒 נעול"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Urgent task popup ─────────────────────────── */}
      {urgentPopup && (
        <UrgentPopup
          task={urgentPopup}
          onClose={() => { setUrgentPopup(null); setPopupDismissed(true); }}
          onStart={() => { setUrgentPopup(null); setPopupDismissed(true); navigate(`/play/${encodeURIComponent(urgentPopup.subject)}`); }}
        />
      )}
    </div>
  );
};

/* ── Featured task card (matches reference image) ───────── */
const FeaturedTaskCard = ({ task, onPlay, onLearn }: { task: Task; onPlay: () => void; onLearn: () => void }) => {
  const Icon = typeIcon(task.type);
  return (
    <div className="bg-gradient-to-br from-violet-50 via-white to-violet-50/60 rounded-3xl ring-1 ring-violet-100 p-5 md:p-6 shadow-[var(--shadow-card)] relative overflow-hidden">
      {/* scenic decoration */}
      <svg viewBox="0 0 400 120" className="absolute bottom-0 inset-x-0 w-full opacity-50 pointer-events-none" preserveAspectRatio="none">
        <ellipse cx="60" cy="30" rx="35" ry="8" fill="white" />
        <ellipse cx="340" cy="20" rx="30" ry="7" fill="white" />
        <path d="M 0 100 L 60 50 L 120 100 Z" fill="hsl(270 40% 92%)" />
        <path d="M 280 100 L 340 60 L 400 100 Z" fill="hsl(270 40% 92%)" />
      </svg>

      <p className="text-[10.5px] font-semibold text-violet-600 mb-3 inline-flex items-center gap-1.5 relative">
        <Target className="h-3 w-3" strokeWidth={2.2} />
        האתגר היומי
      </p>

      <div className="flex items-start gap-4 relative">
        <div className="flex-1">
          <span className="text-[10px] font-semibold text-violet-700 bg-white/80 px-2 py-0.5 rounded-full">{task.subject}</span>
          <h3 className="text-[28px] md:text-[32px] font-bold text-foreground mt-2 leading-tight">{task.title}</h3>
          <p className="text-[12px] text-muted-foreground mt-1.5">
            {task.questions ? `${task.questions} שאלות · ` : ""}{task.minutes} דקות · {task.xp} XP
          </p>
          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={onLearn}
              className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white text-[14px] font-semibold px-6 py-3 rounded-2xl shadow-[0_10px_24px_-10px_rgba(120,80,200,0.6)] transition-all hover:scale-[1.02]"
            >
              <Play className="h-4 w-4 fill-white" strokeWidth={0} />
              כנס לזירה
            </button>
            <button
              onClick={onPlay}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground px-3 py-3 rounded-2xl border border-border hover:bg-muted/40 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              סימנתי כ-עשיתי
            </button>
          </div>
        </div>

        {/* trophy illustration */}
        <div className="hidden sm:flex w-28 h-28 md:w-36 md:h-36 items-center justify-center shrink-0">
          <Trophy className="w-full h-full text-violet-300 drop-shadow-lg" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
};

/* ── All-done state with AI review suggestion ───────────── */
const AllDoneCard = ({ expanded = false }: { expanded?: boolean }) => (
  <div className={`bg-gradient-to-br from-emerald-50 via-white to-violet-50 rounded-3xl ring-1 ring-emerald-100 p-6 md:p-8 shadow-[var(--shadow-card)] text-center ${expanded ? "py-12" : ""}`}>
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-md">
      <CheckCircle2 className="h-8 w-8 text-white" strokeWidth={2.2} />
    </div>
    <h3 className="text-[20px] font-bold text-foreground mb-1">סיימת את כל המשימות! 🎉</h3>
    <p className="text-[13px] text-muted-foreground mb-5 max-w-md mx-auto">
      וינגייט סמארט מציעה לך עכשיו חזרה ממוקדת על הנושאים החלשים שלך — לשמור על הרצף.
    </p>
    <div className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white text-[13px] font-semibold px-5 py-2.5 rounded-2xl shadow-md cursor-pointer transition-colors">
      <Brain className="h-4 w-4" strokeWidth={2} />
      התחל חזרה חכמה
    </div>
  </div>
);

/* ── Small AI banner inside progress card ───────────── */
const AiReviewBanner = () => (
  <div className="mt-4 bg-violet-50 ring-1 ring-violet-100 rounded-2xl p-3 flex items-center gap-3">
    <div className="w-9 h-9 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
      <Brain className="h-4 w-4 text-white" strokeWidth={2} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[12px] font-semibold text-violet-800">חזרה חכמה זמינה</p>
      <p className="text-[10.5px] text-muted-foreground">5 שאלות מותאמות אישית</p>
    </div>
    <button className="text-[11px] font-semibold text-white bg-violet-500 hover:bg-violet-600 px-3 py-1.5 rounded-full">התחל</button>
  </div>
);

/* ── Urgent task popup ────────────────────────────── */
const UrgentPopup = ({ task, onClose, onStart }: { task: Task; onClose: () => void; onStart: () => void }) => {
  const Icon = typeIcon(task.type);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="bg-white rounded-3xl ring-1 ring-rose-100 p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 end-3 w-7 h-7 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center mx-auto mb-4 shadow-md">
          <AlertTriangle className="h-7 w-7 text-white" strokeWidth={2.2} />
        </div>

        <p className="text-[10.5px] font-semibold text-rose-600 text-center mb-1">דחוף — נותרו {task.dueInDays} ימים</p>
        <h3 className="text-[20px] font-bold text-foreground text-center leading-tight">{task.title}</h3>
        <p className="text-[12px] text-muted-foreground text-center mt-2">
          {task.subject} · {task.minutes} דקות · {task.xp} XP
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="text-[12.5px] font-medium text-muted-foreground hover:text-foreground py-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
          >
            אחר כך
          </button>
          <button
            onClick={onStart}
            className="inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-white bg-violet-500 hover:bg-violet-600 py-2.5 rounded-xl shadow-sm transition-colors"
          >
            <Play className="h-3 w-3 fill-white" strokeWidth={0} />
            התחל עכשיו
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayHubPage;
