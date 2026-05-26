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
import DailyChallengePopup from "@/components/DailyChallengePopup";
import OlympicTopPanel from "@/components/OlympicTopPanel";
import { getTodayChallenge, wasPopupSeenToday, markPopupSeen, hasPlayedToday } from "@/lib/dailyChallenge";
import { listPublishedBlitzGames, type BlitzGame } from "@/lib/blitzGames";

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
  const todaysChallenge = useMemo(() => getTodayChallenge(), []);
  const [dailyPopupOpen, setDailyPopupOpen] = useState(false);
  const openChallenges = useMemo<BlitzGame[]>(() => listPublishedBlitzGames(), []);

  // Bump streak on first meaningful render (student data arrived)
  useEffect(() => {
    if (studentId) setStreak(bumpStreak());
  }, [studentId]);

  // Show Daily Challenge popup once per day for students
  useEffect(() => {
    if (user?.role === "student" && !wasPopupSeenToday() && !hasPlayedToday()) {
      const t = setTimeout(() => { setDailyPopupOpen(true); markPopupSeen(); }, 700);
      return () => clearTimeout(t);
    }
  }, [user?.role]);

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
      {dailyPopupOpen && (
        <DailyChallengePopup challenge={todaysChallenge} onClose={() => setDailyPopupOpen(false)} />
      )}
      <div className="relative p-5 md:p-8 lg:p-10 max-w-[1200px] mx-auto">

        {/* ── Header (unit-style) ─────────────────────────── */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className={`flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 ring-1 shadow-sm ${streak >= 7 ? "ring-rose-200" : streak >= 3 ? "ring-orange-100" : "ring-violet-100"}`}>
            <Flame className={`h-4 w-4 ${streak >= 7 ? "text-rose-500" : streak >= 3 ? "text-orange-400" : "text-muted-foreground"}`} strokeWidth={2.2} />
            <span className="text-[13px] font-bold text-foreground">{streak}</span>
            <span className="text-[10.5px] text-muted-foreground">רצף ימים</span>
          </div>
          <div className="text-end flex items-center gap-3 justify-end">
            <div>
              <h1 className="text-[22px] md:text-[26px] font-bold text-foreground tracking-tight leading-tight">
                המסלול של <span className="text-violet-600">{student?.full_name || user?.name}</span>
              </h1>
              <p className="text-[12px] text-muted-foreground mt-1">
                {openTasks.length > 0
                  ? `${openTasks.length} משימות פתוחות מחכות לך — קדימה!`
                  : "כל הכבוד! סיימת הכל. הגיע הזמן לחזרה חכמה ✨"}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-violet-600" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────── */}
        <div className="inline-flex items-center gap-1 bg-white rounded-2xl p-1 ring-1 ring-border shadow-sm mb-5">
          {([
            { id: "home",         label: "בית",          icon: Target },
            { id: "tasks",        label: "המשימות שלי",   icon: Zap },
            { id: "leaderboard",  label: "פודיום כיתתי",  icon: Trophy },
            { id: "achievements", label: "ארון המדליות",  icon: Medal },
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

        {/* ─── HOME tab — מותאם לרפרנס ─────────────────── */}
        {tab === "home" && (
          <div className="space-y-4 max-w-[560px] mx-auto">

            {/* Hero title */}
            <div className="text-center pt-1 pb-1">
              <h2 className="text-[26px] md:text-[28px] font-extrabold leading-tight text-violet-600 tracking-tight">
                הכיתה שלך צריכה אותך היום!
              </h2>
              <p className="text-[13px] text-foreground/70 mt-2 inline-flex items-center gap-1.5 justify-center">
                <Trophy className="h-3.5 w-3.5 text-amber-500" strokeWidth={2.2} />
                עוד <span className="font-bold text-foreground">280</span> נקודות ואנחנו עוקפים את 1'3 2'
              </p>
            </div>

            {/* ── המשימות היומיות שלך ── */}
            <div className="bg-white rounded-3xl ring-1 ring-violet-100 p-5 shadow-[var(--shadow-card)]">
              <h3 className="text-[14px] font-bold text-foreground text-center mb-4">המשימות היומיות שלך</h3>
              <div className="grid grid-cols-3 gap-2 items-end">
                {/* ring 1 — done */}
                <DailyRing color="emerald" pct={100} label="צפייה ביחידה" done />
                {/* ring 2 — in progress */}
                <DailyRing color="violet" pct={Math.round((completed.size / Math.max(allTasks.length, 1)) * 100)} label="חידון טעימות" big text={`${completed.size}`} sub={`מתוך ${Math.max(allTasks.length, 3)}`} />
                {/* ring 3 — locked */}
                <DailyRing color="sky" pct={20} label="חידון שבועי" text="3" />
              </div>
              <button
                onClick={() => navigate("/play/blitz/seed-poetry-hunters")}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-l from-violet-500 to-violet-600 hover:brightness-110 text-white text-[14px] font-bold px-5 py-3 rounded-2xl shadow-[0_12px_28px_-12px_rgba(140,80,220,0.55)] transition-all hover:scale-[1.01]"
              >
                <Zap className="h-4 w-4 fill-white" strokeWidth={0} />
                התחל לשחק
              </button>
            </div>

            {/* ── הקרב הכיתתי ── */}
            <ClassBattleCard
              myClass={student?.class_name || "3'"}
              leaderboard={leaderboard}
            />

            {/* ── אתגרים פתוחים ── */}
            {openChallenges.length > 0 && (
              <div className="bg-white rounded-3xl ring-1 ring-violet-100 p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setTab("tasks")} className="text-[11.5px] font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                    ראה הכל
                  </button>
                  <h3 className="text-[15px] font-bold text-foreground">אתגרים פתוחים</h3>
                </div>
                {(() => {
                  const g = openChallenges[0];
                  const minutes = Math.round(g.totalSeconds / 60);
                  const difficulty = g.questions.length >= 8 ? "מתקדם" : g.questions.length >= 5 ? "בינוני" : "מתחילים";
                  return (
                    <div className="relative bg-gradient-to-b from-violet-50/40 to-white rounded-2xl ring-1 ring-violet-100/80 p-4 overflow-hidden">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 ring-1 ring-rose-200/50 flex items-center justify-center shrink-0">
                          <Target className="h-7 w-7 text-rose-500" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0 text-end">
                          <div className="flex items-start justify-between gap-2">
                            <button className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                              <X className="h-4 w-4" />
                            </button>
                            <h4 className="text-[14.5px] font-bold text-foreground leading-tight">
                              {g.subject} — {g.name}
                            </h4>
                          </div>
                          <p className="text-[12px] text-violet-600 mt-1 font-medium">
                            {g.questions.length} שאלות · {minutes} דקות · {difficulty}
                          </p>
                          <p className="text-[12px] text-foreground/70 mt-0.5">
                            פרס: <span className="font-bold text-violet-700">{g.prizeXp || 150} נקודות</span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/play/blitz/${g.id}`)}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-l from-violet-500 to-violet-600 hover:brightness-110 text-white text-[13.5px] font-bold px-5 py-2.5 rounded-2xl shadow-[0_10px_24px_-12px_rgba(140,80,220,0.55)] transition-all hover:scale-[1.01]"
                      >
                        התחל אתגר
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ─── TASKS tab ───────────────────────────────── */}
        {tab === "tasks" && (
          <div className="space-y-4 max-w-[720px] mx-auto">
            {/* Header strip — "אתגרים פתוחים" */}
            <div className="flex items-center justify-between px-1">
              <button className="text-[11.5px] font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                ראה הכל
              </button>
              <h2 className="text-[15px] font-bold text-foreground inline-flex items-center gap-1.5">
                <Target className="h-4 w-4 text-violet-500" strokeWidth={2.2} />
                אתגרים פתוחים
              </h2>
            </div>

            {/* Published blitz challenges */}
            {openChallenges.map((g) => {
              const minutes = Math.round(g.totalSeconds / 60);
              const difficulty = g.questions.length >= 8 ? "מתקדם" : g.questions.length >= 5 ? "בינוני" : "מתחילים";
              return (
                <div key={g.id} className="relative bg-white rounded-3xl ring-1 ring-violet-100 p-5 shadow-[var(--shadow-card)] overflow-hidden">
                  <div className="absolute -top-12 -end-12 w-40 h-40 rounded-full bg-violet-100/50 blur-2xl pointer-events-none" />
                  <div className="relative flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 ring-1 ring-rose-200/50 flex items-center justify-center shrink-0 shadow-sm">
                      <Target className="h-6 w-6 text-rose-500" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0 text-end">
                      <h3 className="text-[15px] font-bold text-foreground leading-tight">
                        {g.subject} — {g.name}
                      </h3>
                      <p className="text-[12px] text-violet-600 mt-1.5 font-medium">
                        {g.questions.length} שאלות · {minutes} דקות · {difficulty}
                      </p>
                      <p className="text-[12px] text-foreground/70 mt-1">
                        פרס: <span className="font-bold text-violet-700">{g.prizeXp || 150} XP</span>
                      </p>
                      <button
                        onClick={() => navigate(`/play/blitz/${g.id}`)}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-l from-violet-500 to-fuchsia-500 hover:brightness-110 text-white text-[13.5px] font-bold px-5 py-2.5 rounded-2xl shadow-[0_10px_24px_-12px_rgba(140,80,220,0.6)] transition-all hover:scale-[1.01]"
                      >
                        <Play className="h-3.5 w-3.5 fill-white" strokeWidth={0} />
                        התחל אתגר
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {allDone && openChallenges.length === 0 ? (
              <AllDoneCard expanded />
            ) : (
              openTasks.map((t) => {
                const Icon = typeIcon(t.type);
                const urgent = t.dueInDays <= 3;
                const difficulty = t.xp >= 200 ? "מתקדם" : t.xp >= 120 ? "בינוני" : "מתחילים";
                return (
                  <div
                    key={t.id}
                    className="relative bg-white rounded-3xl ring-1 ring-violet-100 p-5 shadow-[var(--shadow-card)] overflow-hidden"
                  >
                    {/* soft decorative glow */}
                    <div className="absolute -top-12 -end-12 w-40 h-40 rounded-full bg-violet-100/50 blur-2xl pointer-events-none" />

                    <div className="relative flex items-start gap-4">
                      {/* Icon medallion */}
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 ring-1 ring-violet-200/60 flex items-center justify-center shrink-0 shadow-sm">
                        <Icon className="h-6 w-6 text-violet-600" strokeWidth={2} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[15px] font-bold text-foreground leading-tight">
                            {t.subject} — {t.title.replace(`— ${t.subject}`, "").replace(t.subject, "").trim() || t.title}
                          </h3>
                          {urgent && (
                            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                              <Clock className="h-2.5 w-2.5" /> {t.dueInDays} ימים
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-violet-600 mt-1.5 font-medium">
                          {t.questions ? `${t.questions} שאלות` : `${t.minutes} דק׳`} · {t.minutes} דקות · {difficulty}
                        </p>
                        <p className="text-[12px] text-foreground/70 mt-1">
                          פרס: <span className="font-bold text-violet-700">{t.xp} XP</span>
                        </p>

                        <div className="mt-4 flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/play/${encodeURIComponent(t.subject)}`)}
                            className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-l from-violet-500 to-fuchsia-500 hover:brightness-110 text-white text-[13.5px] font-bold px-5 py-2.5 rounded-2xl shadow-[0_10px_24px_-12px_rgba(140,80,220,0.6)] transition-all hover:scale-[1.01]"
                          >
                            <Play className="h-3.5 w-3.5 fill-white" strokeWidth={0} />
                            התחל אתגר
                          </button>
                          <button
                            onClick={() => completeTask(t.id)}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-2xl text-muted-foreground hover:text-foreground border border-border/60 hover:bg-muted/40 transition-colors shrink-0"
                            title="סמן כבוצע"
                          >
                            <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}


        {/* ─── LEADERBOARD tab — פודיום כיתתי ───────────────── */}
        {tab === "leaderboard" && (
          <div className="space-y-4 max-w-[720px] mx-auto">
            {/* header strip */}
            <div className="flex items-center justify-between px-1">
              <button onClick={() => setTab("home")} className="text-[11.5px] font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                חזרה
              </button>
              <h2 className="text-[15px] font-bold text-foreground inline-flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-violet-500" strokeWidth={2.2} />
                פודיום כיתתי
              </h2>
            </div>

            {/* My-rank summary */}
            {myRank && (
              <div className="relative bg-white rounded-3xl ring-1 ring-violet-100 p-5 shadow-[var(--shadow-card)] overflow-hidden">
                <div className="absolute -top-12 -end-12 w-40 h-40 rounded-full bg-violet-100/50 blur-2xl pointer-events-none" />
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 ring-1 ring-violet-200/60 flex items-center justify-center shrink-0 shadow-sm">
                    <Trophy className="h-6 w-6 text-violet-600" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0 text-end">
                    <p className="text-[10.5px] font-semibold text-violet-600">הכיתה שלך — {student?.class_name || ""}</p>
                    <h3 className="text-[18px] font-bold text-foreground leading-tight mt-0.5">
                      את/ה במקום <span className="text-violet-600">#{myRank.rank}</span> מתוך {leaderboard.length}
                    </h3>
                    {myRank.rank > 1 && leaderboard[myRank.rank - 2] && (
                      <p className="text-[12px] text-foreground/70 mt-1">
                        עוד <span className="font-bold text-violet-700">{(leaderboard[myRank.rank - 2].xp - myRank.xp).toLocaleString()} XP</span> כדי לעקוף את {leaderboard[myRank.rank - 2].name.split(" ")[0]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Top 3 podium — soft cards */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { ...leaderboard[1], place: 2, ring: "ring-slate-200",  bg: "from-slate-50 to-white",  chip: "bg-slate-100 text-slate-700",   icon: Medal },
                  { ...leaderboard[0], place: 1, ring: "ring-amber-200",  bg: "from-amber-50 to-white",  chip: "bg-amber-100 text-amber-800",   icon: Crown },
                  { ...leaderboard[2], place: 3, ring: "ring-orange-200", bg: "from-orange-50 to-white", chip: "bg-orange-100 text-orange-800", icon: Medal },
                ].map((p, i) => (
                  <div key={i} className={`bg-gradient-to-b ${p.bg} rounded-3xl ring-1 ${p.ring} p-4 shadow-[var(--shadow-card)] flex flex-col items-center text-center ${p.place === 1 ? "scale-[1.04]" : ""}`}>
                    <div className={`w-12 h-12 rounded-2xl ${p.chip} flex items-center justify-center shadow-sm`}>
                      <p.icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <span className={`mt-2 text-[10px] font-bold ${p.chip} px-2 py-0.5 rounded-full`}>מקום {p.place}</span>
                    <p className={`text-[12.5px] font-semibold mt-2 truncate max-w-full ${p.isMe ? "text-violet-700" : "text-foreground"}`}>
                      {p.name.split(" ")[0]}
                    </p>
                    <p className="text-[13px] font-bold tabular-nums text-foreground/80 mt-0.5">{p.xp.toLocaleString()} XP</p>
                  </div>
                ))}
              </div>
            )}

            {/* Full list cards */}
            <div className="space-y-2">
              {leaderboard.length === 0 && (
                <div className="bg-white rounded-3xl ring-1 ring-border p-8 text-center">
                  <p className="text-[13px] text-muted-foreground">אין נתוני כיתה עדיין</p>
                </div>
              )}
              {leaderboard.map((p) => {
                const max = leaderboard[0]?.xp || 1;
                const w = Math.round((p.xp / max) * 100);
                return (
                  <div key={p.rank} className={`bg-white rounded-2xl ring-1 ${p.isMe ? "ring-violet-200 bg-violet-50/40" : "ring-border"} p-3.5 shadow-sm flex items-center gap-3`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0 ${
                      p.rank === 1 ? "bg-amber-100 text-amber-800"   :
                      p.rank === 2 ? "bg-slate-100 text-slate-700"   :
                      p.rank === 3 ? "bg-orange-100 text-orange-800" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {p.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] truncate ${p.isMe ? "font-bold text-violet-700" : "font-semibold text-foreground"}`}>
                        {p.name}{p.isMe && <span className="text-[10.5px] font-medium text-violet-500 me-1"> (אני)</span>}
                      </p>
                      <div className="mt-1.5 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-l from-violet-500 to-fuchsia-400 rounded-full" style={{ width: `${w}%` }} />
                      </div>
                    </div>
                    <span className="text-[12px] font-bold tabular-nums text-foreground/80 shrink-0">{p.xp.toLocaleString()} XP</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── ACHIEVEMENTS tab — ארון המדליות ───────────────── */}
        {tab === "achievements" && (() => {
          const items = buildAchievements(student, completedSubjects);
          const unlockedCount = items.filter(a => a.unlocked).length;
          return (
            <div className="space-y-4 max-w-[720px] mx-auto">
              {/* header strip */}
              <div className="flex items-center justify-between px-1">
                <button onClick={() => setTab("home")} className="text-[11.5px] font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                  חזרה
                </button>
                <h2 className="text-[15px] font-bold text-foreground inline-flex items-center gap-1.5">
                  <Medal className="h-4 w-4 text-violet-500" strokeWidth={2.2} />
                  ארון המדליות
                </h2>
              </div>

              {/* Summary card */}
              <div className="relative bg-white rounded-3xl ring-1 ring-violet-100 p-5 shadow-[var(--shadow-card)] overflow-hidden">
                <div className="absolute -top-12 -end-12 w-40 h-40 rounded-full bg-violet-100/50 blur-2xl pointer-events-none" />
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 ring-1 ring-amber-200/60 flex items-center justify-center shrink-0 shadow-sm">
                    <Medal className="h-6 w-6 text-amber-600" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0 text-end">
                    <p className="text-[10.5px] font-semibold text-violet-600">האוסף שלך</p>
                    <h3 className="text-[18px] font-bold text-foreground leading-tight mt-0.5">
                      <span className="text-violet-600">{unlockedCount}</span> מדליות מתוך {items.length}
                    </h3>
                    <div className="mt-2 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-l from-amber-400 to-amber-500 rounded-full transition-all" style={{ width: `${(unlockedCount / items.length) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Medals grid — app-like cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.map((a, i) => (
                  <div
                    key={i}
                    className={`relative bg-white rounded-3xl ring-1 ${a.unlocked ? "ring-violet-100" : "ring-border"} p-4 shadow-[var(--shadow-card)] flex flex-col items-center text-center overflow-hidden ${!a.unlocked ? "opacity-75" : ""}`}
                  >
                    {a.unlocked && (
                      <div className="absolute -top-10 -end-10 w-28 h-28 rounded-full bg-violet-100/40 blur-2xl pointer-events-none" />
                    )}
                    <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${a.unlocked ? a.color : "from-muted to-muted-foreground/30"} flex items-center justify-center shadow-md mb-2.5`}>
                      {a.unlocked
                        ? <a.icon className="h-7 w-7 text-white" strokeWidth={2} />
                        : <Lock className="h-6 w-6 text-white/80" strokeWidth={2} />
                      }
                    </div>
                    <p className="text-[12.5px] font-bold text-foreground leading-tight">{a.label}</p>
                    <span className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      a.unlocked ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
                    }`}>
                      {a.unlocked ? <><CheckCircle2 className="h-2.5 w-2.5" /> הושג</> : <><Lock className="h-2.5 w-2.5" /> נעול</>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
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

/* ── מקצה הבזק featured card ─────────────────────── */
const BlitzFeaturedCard = ({
  role, onPlay, onBuild,
}: { role: string; onPlay: () => void; onBuild: () => void }) => {
  const canBuild = role === "admin" || role === "teacher";
  return (
    <div className="relative overflow-hidden rounded-[28px] ring-1 ring-violet-200 shadow-[var(--shadow-card)] bg-gradient-to-br from-violet-100 via-white to-fuchsia-50 p-5 md:p-6">
      <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-fuchsia-200/40 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -start-10 w-40 h-40 rounded-full bg-violet-200/40 blur-2xl pointer-events-none" />
      <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 bg-white/80 text-violet-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
            <Zap className="h-3 w-3" /> מקצה הבזק נפתח 🔥
          </span>
          <h2 className="text-[22px] md:text-[26px] font-bold text-foreground mt-2 leading-tight">ציידי השירה</h2>
          <p className="text-[12.5px] text-muted-foreground mt-1">
            5 שאלות · 5 דקות · נושא היום: שירה · פרס: 120 XP + בונוס לכיתה
          </p>
          <p className="text-[12px] font-semibold text-violet-700 mt-2">
            הכיתה שלך צריכה אותך היום! חסרות לכם 280 נקודות כדי לעקוף את י׳2
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={onPlay}
              className="inline-flex items-center gap-2 bg-gradient-to-l from-violet-500 to-fuchsia-500 hover:brightness-110 text-white text-[14px] font-bold px-5 py-2.5 rounded-2xl shadow-[0_12px_28px_-12px_rgba(140,80,220,0.6)] transition-all hover:scale-[1.02]"
            >
              <Play className="h-4 w-4 fill-white" strokeWidth={0} />
              התחל לשחק
            </button>
            {canBuild && (
              <button
                onClick={onBuild}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-violet-700 bg-white/80 hover:bg-white border border-violet-200 px-4 py-2.5 rounded-2xl"
              >
                <Sparkles className="h-3.5 w-3.5" />
                צור קרב חדש
              </button>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center justify-center w-28 h-28 md:w-32 md:h-32 shrink-0 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-200 to-fuchsia-200 rounded-full opacity-50 blur-xl" />
          <Trophy className="w-20 h-20 md:w-24 md:h-24 text-amber-400 relative drop-shadow-md" strokeWidth={1.6} />
          <Clock className="absolute bottom-1 end-1 w-6 h-6 text-violet-500 bg-white rounded-full p-1 shadow" strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
};

/* ── DailyRing — circular progress ring used in "המשימות היומיות שלך" ── */
const DailyRing = ({
  color, pct, label, text, sub, done, big,
}: {
  color: "emerald" | "violet" | "sky";
  pct: number;
  label: string;
  text?: string;
  sub?: string;
  done?: boolean;
  big?: boolean;
}) => {
  const stroke = color === "emerald" ? "stroke-emerald-500"
              : color === "sky"     ? "stroke-sky-400"
              :                       "stroke-violet-500";
  const size = big ? 84 : 72;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" className="stroke-muted/40" strokeWidth="3" />
          <circle cx="18" cy="18" r="15" fill="none" className={stroke} strokeWidth="3"
            strokeDasharray={`${Math.max(0, Math.min(100, pct)) * 0.94}, 100`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          {done ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" strokeWidth={2.5} />
          ) : (
            <>
              <span className={`${big ? "text-[22px]" : "text-[18px]"} font-extrabold text-foreground tabular-nums`}>{text ?? Math.round(pct)}</span>
              {sub && <span className="text-[9px] text-muted-foreground mt-0.5">{sub}</span>}
            </>
          )}
        </div>
      </div>
      <p className="text-[10.5px] text-muted-foreground text-center leading-tight">{label}</p>
    </div>
  );
};

/* ── ClassBattleCard — לוח מירוצי כיתות עם ספירה לאחור ── */
const ClassBattleCard = ({
  myClass,
  leaderboard,
}: { myClass: string; leaderboard: { name: string; xp: number; rank: number; isMe: boolean }[] }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const end = useMemo(() => {
    const d = new Date(); d.setHours(23, 59, 59, 0); return d.getTime();
  }, []);
  const diff = Math.max(0, end - now);
  const hh = String(Math.floor(diff / 3.6e6)).padStart(2, "0");
  const mm = String(Math.floor((diff % 3.6e6) / 6e4)).padStart(2, "0");
  const ss = String(Math.floor((diff % 6e4) / 1000)).padStart(2, "0");

  const classes = useMemo(() => ([
    { name: "1'1",                xp: 4820, isMe: false, color: "bg-violet-500" },
    { name: "2'",                 xp: 4540, isMe: false, color: "bg-sky-400" },
    { name: `${myClass} (אנחנו)`, xp: 4260, isMe: true,  color: "bg-emerald-500" },
    { name: "4'",                 xp: 3980, isMe: false, color: "bg-slate-300" },
  ]), [myClass]);
  const max = Math.max(...classes.map(c => c.xp));
  const myPlace = classes.findIndex(c => c.isMe) + 1;

  return (
    <div className="bg-white rounded-3xl ring-1 ring-violet-100 p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between mb-3">
        <div className="relative">
          <div className="w-14 h-16 bg-gradient-to-b from-amber-400 to-amber-500 rounded-b-[14px] rounded-t-md flex flex-col items-center justify-center shadow-md text-white">
            <span className="text-[8.5px] font-semibold opacity-90 leading-none">מקום</span>
            <span className="text-[20px] font-extrabold leading-none mt-0.5">{myPlace}</span>
          </div>
          <Sparkles className="absolute -top-1 -end-2 h-3.5 w-3.5 text-amber-300" strokeWidth={2.4} />
          <Sparkles className="absolute -bottom-1 -start-2 h-3 w-3 text-rose-300" strokeWidth={2.4} />
        </div>
        <div className="text-end">
          <h3 className="text-[16px] font-bold text-foreground">הקרב הכיתתי</h3>
          <p className="text-[11.5px] text-muted-foreground mt-1 tabular-nums">
            נגמר בעוד {hh}:{mm}:{ss}
          </p>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        {classes.map((c) => {
          const w = Math.round((c.xp / max) * 100);
          return (
            <div key={c.name} className="flex items-center gap-2">
              <span className={`text-[12px] font-bold w-20 shrink-0 text-end ${c.isMe ? "text-emerald-700" : "text-foreground/80"}`}>
                {c.name}
              </span>
              <div className="flex-1 h-3.5 bg-muted/40 rounded-full overflow-hidden relative">
                <div className={`h-full ${c.color} rounded-full transition-all`} style={{ width: `${w}%` }} />
                <span className="absolute inset-y-0 end-2 flex items-center text-[10.5px] font-bold tabular-nums text-foreground/90">
                  {c.xp.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-violet-50/70 ring-1 ring-violet-100 rounded-2xl px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex -space-x-2 rtl:space-x-reverse">
          {["bg-violet-400", "bg-rose-400", "bg-amber-400"].map((b, i) => (
            <div key={i} className={`w-6 h-6 rounded-full ${b} ring-2 ring-white text-white text-[10px] font-bold flex items-center justify-center`}>
              {["נ", "ט", "ר"][i]}
            </div>
          ))}
          <div className="w-6 h-6 rounded-full bg-violet-200 ring-2 ring-white text-violet-800 text-[9px] font-bold flex items-center justify-center">+3</div>
        </div>
        <p className="text-[11.5px] font-semibold text-violet-800 text-end">
          עוד 3 תלמידים עונים ואנחנו עולים מקום!
        </p>
      </div>
    </div>
  );
};

export default PlayHubPage;
