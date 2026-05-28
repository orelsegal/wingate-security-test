/**
 * LarutzImMilimPage — לרוץ עם מילים
 * Native integration of the "מישהו לרוץ איתו" literature unit
 * Part of ספרות → הערכה פנימית 30% → מפות דרכים
 */

import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  ArrowRight, ChevronLeft, CheckCircle2, Clock, BookOpen,
  Users, Star, Pencil, HelpCircle, MessageCircle,
  ChevronDown, ChevronUp, Award, BarChart3, TrendingUp,
  Lightbulb, Play, Lock, Feather
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  limTasks, limCharacters, limThemes,
  mockStudents,
  type LimTask, type LimSection
} from "@/lib/literatureContent";

/* ── Confetti on quiz correct ─────────────────────────── */
const fireConfetti = () => {
  const colors = ["#7c3aed", "#a78bfa", "#ddd6fe", "#f9a8d4", "#fbbf24"];
  confetti({ particleCount: 60, angle: 60,  spread: 50, origin: { x: 0,   y: 0.75 }, colors, startVelocity: 48, ticks: 90, scalar: 0.9, zIndex: 9999 });
  confetti({ particleCount: 60, angle: 120, spread: 50, origin: { x: 1,   y: 0.75 }, colors, startVelocity: 48, ticks: 90, scalar: 0.9, zIndex: 9999 });
};

/* ── Section type icons ───────────────────────────────── */
const SECTION_ICONS: Record<string, any> = {
  read:    BookOpen,
  think:   Lightbulb,
  write:   Pencil,
  quiz:    HelpCircle,
  discuss: MessageCircle,
};
const SECTION_LABELS: Record<string, string> = {
  read:    "קריאה",
  think:   "חשיבה",
  write:   "כתיבה",
  quiz:    "בדיקת הבנה",
  discuss: "דיון",
};
const SECTION_COLORS: Record<string, string> = {
  read:    "text-sky-600 bg-sky-50",
  think:   "text-amber-600 bg-amber-50",
  write:   "text-violet-600 bg-violet-50",
  quiz:    "text-emerald-600 bg-emerald-50",
  discuss: "text-rose-600 bg-rose-50",
};

/* ══════════════════════════════════════════════════════════
   Sub-component: a single content section within a task
   ══════════════════════════════════════════════════════════ */
interface SectionViewProps {
  section: LimSection;
  taskId: string;
  quizState: Record<string, { selected: number | null; solved: boolean }>;
  onQuizAnswer: (key: string, selected: number, correct: number) => void;
  textState: Record<string, string>;
  onTextChange: (key: string, val: string) => void;
}

const SectionView = ({ section, taskId, quizState, onQuizAnswer, textState, onTextChange }: SectionViewProps) => {
  const Icon = SECTION_ICONS[section.type] || BookOpen;
  const colorClass = SECTION_COLORS[section.type] || "text-primary bg-primary/8";
  const label = SECTION_LABELS[section.type] || section.type;

  return (
    <div className="space-y-3">
      {/* Section label */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
          <Icon className="h-3 w-3" strokeWidth={1.5} />
          {label}
        </span>
        {section.title && (
          <h4 className="text-[13px] font-semibold text-foreground">{section.title}</h4>
        )}
      </div>

      {/* Read / Think — plain text body */}
      {(section.type === "read" || section.type === "think") && section.body && (
        <div className="bg-muted/25 rounded-xl p-4 border border-border/40">
          <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">{section.body}</p>
        </div>
      )}

      {/* Write / Discuss — prompt + textarea */}
      {(section.type === "write" || section.type === "discuss") && section.prompt && (
        <div className="space-y-2.5">
          <div className="bg-violet-50/60 rounded-xl p-3.5 border border-violet-100">
            <p className="text-[11.5px] text-foreground leading-relaxed">{section.prompt}</p>
          </div>
          <Textarea
            value={textState[`${taskId}-${section.id}`] || ""}
            onChange={e => onTextChange(`${taskId}-${section.id}`, e.target.value)}
            placeholder={section.type === "write" ? "כתוב/י את תשובתך כאן..." : "שתף/י את דעתך..."}
            className="text-[12px] min-h-[90px] rounded-xl bg-background border-border/50 resize-none"
          />
          {(textState[`${taskId}-${section.id}`] || "").length > 10 && (
            <p className="text-[10px] text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
              נשמר אוטומטית
            </p>
          )}
        </div>
      )}

      {/* Quiz */}
      {section.type === "quiz" && section.quiz && (
        <div className="space-y-4">
          {section.quiz.map((q, qi) => {
            const key = `${taskId}-${section.id}-${qi}`;
            const state = quizState[key] || { selected: null, solved: false };
            const { selected, solved } = state;

            return (
              <div key={qi} className="bg-card border border-border rounded-2xl p-4">
                <p className="text-[12.5px] font-medium text-foreground mb-3">{q.q}</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {q.options.map((opt, oi) => {
                    const isSelected = selected === oi;
                    const isCorrect = oi === q.correct;
                    let cls = "bg-muted/30 text-foreground hover:bg-muted/50 hover:scale-[1.01]";
                    if (solved) {
                      cls = isCorrect
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-muted/20 text-muted-foreground/50";
                    } else if (isSelected) {
                      cls = "bg-destructive/10 text-destructive border-destructive/30 ring-1 ring-destructive/20";
                    }
                    return (
                      <button
                        key={oi}
                        disabled={solved}
                        onClick={() => !solved && onQuizAnswer(key, oi, q.correct)}
                        className={`text-start px-3 py-2.5 rounded-lg text-[12px] border border-transparent transition-all duration-150 ${cls} ${!solved ? "cursor-pointer active:scale-[0.98]" : "cursor-default"}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {solved && (
                  <div className="mt-2.5 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-[10.5px]">
                    <CheckCircle2 className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                    <span>נכון! כל הכבוד</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   Sub-component: expandable task card
   ══════════════════════════════════════════════════════════ */
interface TaskCardProps {
  task: LimTask;
  index: number;
  isOpen: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  onToggle: () => void;
  onComplete: () => void;
  quizState: Record<string, { selected: number | null; solved: boolean }>;
  onQuizAnswer: (key: string, selected: number, correct: number) => void;
  textState: Record<string, string>;
  onTextChange: (key: string, val: string) => void;
}

const TaskCard = ({
  task, index, isOpen, isCompleted, isLocked,
  onToggle, onComplete, quizState, onQuizAnswer, textState, onTextChange,
}: TaskCardProps) => (
  <div
    className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
      isOpen
        ? `border-violet-200 shadow-lg ${task.color}`
        : isCompleted
          ? "border-emerald-200 bg-emerald-50/30"
          : isLocked
            ? "border-border/40 bg-muted/20 opacity-60"
            : "border-border bg-card shadow-sm hover:shadow-md"
    }`}
  >
    {/* Header */}
    <button
      onClick={() => !isLocked && onToggle()}
      disabled={isLocked}
      className={`w-full flex items-center gap-4 p-4 md:p-5 text-start ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
    >
      {/* Index / status bubble */}
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-[15px] font-bold transition-all
        ${isCompleted ? "bg-emerald-400 text-white" : isLocked ? "bg-muted/50 text-muted-foreground/50" : `${task.iconBg ?? "bg-violet-100"} text-violet-700`}`}>
        {isCompleted
          ? <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
          : isLocked
            ? <Lock className="h-4 w-4" strokeWidth={1.5} />
            : task.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-muted-foreground">שלב {index + 1}</span>
          {isCompleted && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">הושלם ✓</span>}
          {isLocked   && <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">נעול</span>}
        </div>
        <h3 className={`text-[14px] font-bold tracking-tight leading-snug ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>
          {task.title}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        <div className="text-[10.5px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" strokeWidth={1.5} />
          {task.estimatedMin} דק׳
        </div>
        {!isLocked && (
          isOpen
            ? <ChevronUp className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
            : <ChevronDown className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
        )}
      </div>
    </button>

    {/* Expanded content */}
    {isOpen && !isLocked && (
      <div className="px-4 md:px-6 pb-5 space-y-6 animate-fade-in-up">
        <div className="border-t border-border/30 pt-5 space-y-7">
          {task.sections.map((sec) => (
            <SectionView
              key={sec.id}
              section={sec}
              taskId={task.id}
              quizState={quizState}
              onQuizAnswer={onQuizAnswer}
              textState={textState}
              onTextChange={onTextChange}
            />
          ))}
        </div>

        {/* Complete button */}
        {!isCompleted && (
          <Button
            onClick={onComplete}
            className="w-full gap-2 text-[12px] h-10 rounded-2xl bg-violet-600 hover:bg-violet-700"
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
            סיימתי את השלב הזה — המשך
          </Button>
        )}
        {isCompleted && (
          <div className="flex items-center gap-2 justify-center py-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2} />
            <span className="text-[11px] text-emerald-600 font-medium">שלב הושלם</span>
          </div>
        )}
      </div>
    )}
  </div>
);

/* ══════════════════════════════════════════════════════════
   Main page component
   ══════════════════════════════════════════════════════════ */
const LarutzImMilimPage = () => {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const decoded = decodeURIComponent(subjectName || "ספרות");

  /* ── Tab state ── */
  const [activeTab, setActiveTab] = useState<"learn" | "characters" | "themes" | "teacher">("learn");

  /* ── Task progress ── */
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [openTask, setOpenTask] = useState<string | null>(limTasks[0].id);

  /* ── Quiz state ── */
  const [quizState, setQuizState] = useState<Record<string, { selected: number | null; solved: boolean }>>({});

  /* ── Text (write / discuss) state ── */
  const [textState, setTextState] = useState<Record<string, string>>({});

  const completedCount = completedTasks.size;
  const totalTasks = limTasks.length;
  const pct = Math.round((completedCount / totalTasks) * 100);

  const handleQuizAnswer = useCallback((key: string, selected: number, correct: number) => {
    const isCorrect = selected === correct;
    setQuizState(prev => ({
      ...prev,
      [key]: {
        selected,
        solved: isCorrect || prev[key]?.solved || false,
      },
    }));
    if (isCorrect) fireConfetti();
  }, []);

  const handleTextChange = useCallback((key: string, val: string) => {
    setTextState(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleComplete = (taskId: string) => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    // Auto-open next task
    const idx = limTasks.findIndex(t => t.id === taskId);
    const next = limTasks[idx + 1];
    if (next) {
      setOpenTask(next.id);
      setTimeout(() => {
        document.getElementById(`task-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  };

  const isTaskLocked = (idx: number) => idx > 0 && !completedTasks.has(limTasks[idx - 1].id);

  /* ── Tab buttons ── */
  const tabs = [
    { id: "learn",      label: "מסלול הלמידה",  icon: Play },
    { id: "characters", label: "דמויות",         icon: Users },
    { id: "themes",     label: "נושאים",          icon: Star },
    ...(isTeacher ? [{ id: "teacher", label: "כלי מורה", icon: BarChart3 }] : []),
  ] as { id: "learn" | "characters" | "themes" | "teacher"; label: string; icon: any }[];

  return (
    <div className="min-h-screen" dir="rtl">
      {/* ═══════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════ */}
      <div className="bg-gradient-to-bl from-violet-600 via-indigo-700 to-violet-900 text-white relative overflow-hidden">
        {/* subtle decorative circles */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-56 h-56 bg-white/5 rounded-full translate-x-1/4 translate-y-1/4 pointer-events-none" />

        <div className="relative max-w-[1100px] mx-auto px-5 md:px-8 pt-5 pb-7">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[10.5px] text-white/60 mb-4 flex-wrap">
            <button onClick={() => navigate("/")} className="hover:text-white/90 transition-colors">בית</button>
            <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
            <button onClick={() => navigate("/subjects")} className="hover:text-white/90 transition-colors">מקצועות</button>
            <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
            <button onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}`)} className="hover:text-white/90 transition-colors">{decoded}</button>
            <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
            <button onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}/assessment-30`)} className="hover:text-white/90 transition-colors">הערכה פנימית 30%</button>
            <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
            <span className="text-white/90 font-medium">לרוץ עם מילים</span>
          </div>

          <div className="flex items-start gap-5">
            {/* Book cover placeholder */}
            <div className="shrink-0 w-[72px] h-[96px] md:w-[88px] md:h-[117px] bg-white/10 rounded-xl flex flex-col items-center justify-center border border-white/20 backdrop-blur-sm">
              <span className="text-3xl">📖</span>
              <span className="text-[7px] text-white/60 mt-1 text-center px-1 leading-tight">מישהו לרוץ איתו</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] font-semibold text-violet-200 tracking-wider uppercase mb-1">
                הערכה פנימית · 30% מהבגרות
              </p>
              <h1 className="text-[26px] md:text-[32px] font-black tracking-tight leading-none mb-1">
                לרוץ עם מילים
              </h1>
              <p className="text-[13px] text-white/70 mb-4">
                <span className="font-semibold text-white/90">מישהו לרוץ איתו</span> · דוד גרוסמן
              </p>

              {/* Progress bar */}
              <div className="max-w-[420px]">
                <div className="flex items-center justify-between text-[10.5px] text-white/60 mb-1.5">
                  <span>התקדמות</span>
                  <span className="font-bold text-white">{pct}% — {completedCount}/{totalTasks} שלבים</span>
                </div>
                <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-violet-300 to-white/90 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="hidden md:flex flex-col gap-2 shrink-0">
              {[
                { icon: Clock,  val: "~3 שעות", sub: "זמן כולל" },
                { icon: Award,  val: "6 שלבים",  sub: "משימות" },
                { icon: Feather, val: "30%",     sub: "מהבגרות" },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2.5 border border-white/15">
                    <Icon className="h-3.5 w-3.5 text-violet-200" strokeWidth={1.5} />
                    <div>
                      <p className="text-[12px] font-bold text-white leading-none">{s.val}</p>
                      <p className="text-[9.5px] text-white/50">{s.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="relative max-w-[1100px] mx-auto px-5 md:px-8">
          <div className="flex items-end gap-1 overflow-x-auto pb-0 scrollbar-hide">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-[12px] font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-background text-foreground shadow-none"
                      : "text-white/60 hover:text-white/90 hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          CONTENT AREA
          ═══════════════════════════════════════ */}
      <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-6">

        {/* ── TAB: Learning roadmap ── */}
        {activeTab === "learn" && (
          <div className="space-y-3">
            {/* Progress widget */}
            {completedCount > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <p className="text-[12.5px] font-semibold text-emerald-800">כל הכבוד! השלמת {completedCount} מתוך {totalTasks} שלבים</p>
                  <Progress value={pct} className="h-1.5 mt-2 bg-emerald-200/50" />
                </div>
                <span className="text-[20px] font-black text-emerald-600 tabular-nums">{pct}%</span>
              </div>
            )}

            {/* Task cards */}
            {limTasks.map((task, idx) => {
              const isCompleted = completedTasks.has(task.id);
              const isLocked = isTaskLocked(idx);
              const isOpen = openTask === task.id && !isLocked;
              return (
                <div key={task.id} id={`task-${task.id}`} className="scroll-mt-4">
                  <TaskCard
                    task={task}
                    index={idx}
                    isOpen={isOpen}
                    isCompleted={isCompleted}
                    isLocked={isLocked}
                    onToggle={() => setOpenTask(isOpen ? null : task.id)}
                    onComplete={() => handleComplete(task.id)}
                    quizState={quizState}
                    onQuizAnswer={handleQuizAnswer}
                    textState={textState}
                    onTextChange={handleTextChange}
                  />
                </div>
              );
            })}

            {/* Completion celebration */}
            {completedCount === totalTasks && (
              <div className="bg-gradient-to-l from-violet-600 to-indigo-700 text-white rounded-3xl p-6 text-center space-y-2">
                <p className="text-3xl">🎉</p>
                <h3 className="text-[18px] font-black">סיימת את כל שלבי הלמידה!</h3>
                <p className="text-[12px] text-white/70">
                  כעת ניתן להגיש את הפרויקט הסופי למורה ולהשלים את ה-30%.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Characters ── */}
        {activeTab === "characters" && (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="text-[17px] font-bold text-foreground mb-1">הדמויות בספר</h2>
              <p className="text-[12px] text-muted-foreground">לחץ על כל דמות לפרטים נוספים</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {limCharacters.map((c, i) => (
                <div key={i} className={`rounded-3xl border p-5 ${c.color} transition-all hover:shadow-md`}>
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{c.emoji}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-[15px] font-bold ${c.textColor}`}>{c.name}</h3>
                        <span className="text-[10px] bg-white/60 text-muted-foreground px-2 py-0.5 rounded-full font-medium">{c.role}</span>
                      </div>
                      <p className="text-[11.5px] text-foreground/80 leading-relaxed">{c.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Character map */}
            <div className="bg-muted/20 border border-border rounded-2xl p-5">
              <h3 className="text-[13px] font-bold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" strokeWidth={1.5} />
                קשרים בין הדמויות
              </h3>
              <div className="text-[11.5px] text-foreground/80 leading-loose space-y-1.5">
                <p>🔗 <strong>אסף ↔ תאודורה</strong> — הכלבה היא המנחה שלו לאורך המסע</p>
                <p>🔗 <strong>תמר ↔ שי</strong> — קשר אח-אחות שמניע את כל עלילתה</p>
                <p>🔗 <strong>אסף ↔ תמר</strong> — נפגשים בסוף, לאחר שני מסלולים מקבילים</p>
                <p>🔗 <strong>שי ↔ מוסיקה</strong> — כישרון שהפך לבריחה</p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Themes ── */}
        {activeTab === "themes" && (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="text-[17px] font-bold text-foreground mb-1">נושאים ומוטיבים</h2>
              <p className="text-[12px] text-muted-foreground">הנושאים המרכזיים שחוזרים בספר</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {limThemes.map((t, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{t.emoji}</span>
                    <div>
                      <h4 className="text-[13px] font-bold text-foreground mb-1">{t.title}</h4>
                      <p className="text-[11.5px] text-foreground/75 leading-relaxed">{t.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tip box */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-[12px] font-semibold text-amber-800 mb-1">טיפ לניתוח</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  בעת כתיבת עבודת הניתוח, חפשו כיצד מספר נושאים שונים מתחברים ומחזקים זה את זה בסיפור. ספרות טובה לא מסתפקת בנושא אחד — היא רוקמת רשת שלמה.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Teacher tools (only for teachers) ── */}
        {activeTab === "teacher" && isTeacher && (
          <div className="space-y-5">
            <div className="mb-2">
              <h2 className="text-[17px] font-bold text-foreground mb-1">כלי מורה — לרוץ עם מילים</h2>
              <p className="text-[12px] text-muted-foreground">מצב ההתקדמות של התלמידים ביחידה</p>
            </div>

            {/* Class overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "ממוצע כיתה",    val: `${Math.round(mockStudents.reduce((a,s) => a + s.progress, 0) / mockStudents.length)}%`, color: "text-violet-600" },
                { label: "השלימו הכל",   val: `${mockStudents.filter(s => s.progress === 100).length}`, color: "text-emerald-600" },
                { label: "ציון ממוצע",   val: `${Math.round(mockStudents.filter(s => s.grade).reduce((a,s) => a + (s.grade || 0), 0) / mockStudents.filter(s => s.grade).length)}`, color: "text-amber-600" },
                { label: "ברשימה",       val: `${mockStudents.length}`, color: "text-sky-600" },
              ].map((s, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-4 text-center">
                  <p className={`text-[26px] font-black tabular-nums ${s.color}`}>{s.val}</p>
                  <p className="text-[10.5px] text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Student list */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-[13px] font-bold text-foreground">התקדמות תלמידים</h3>
                <button className="text-[11px] text-primary font-medium hover:underline">ייצוא לאקסל</button>
              </div>
              <div className="divide-y divide-border">
                {mockStudents.map((student, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 text-[13px] font-bold text-violet-700">
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12.5px] font-semibold text-foreground">{student.name}</p>
                        <span className="text-[9.5px] text-muted-foreground">{student.lastActive}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 max-w-[140px] h-1.5 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${student.progress === 100 ? "bg-emerald-400" : "bg-violet-400"}`}
                            style={{ width: `${student.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{student.progress}%</span>
                        <span className="text-[9.5px] text-muted-foreground">{student.submittedTasks.length}/{limTasks.length} שלבים</span>
                      </div>
                    </div>
                    {student.grade ? (
                      <div className="shrink-0 text-center">
                        <p className="text-[16px] font-black text-emerald-600 tabular-nums">{student.grade}</p>
                        <p className="text-[9px] text-muted-foreground">ציון</p>
                      </div>
                    ) : (
                      <button className="shrink-0 text-[11px] text-primary font-medium bg-primary/8 hover:bg-primary/15 px-3 py-1.5 rounded-xl transition-colors">
                        הזן ציון
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:bg-accent transition-colors text-start">
                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                  <Pencil className="h-4 w-4 text-violet-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold text-foreground">ערוך משימות</p>
                  <p className="text-[10.5px] text-muted-foreground">הוסף / ערוך שאלות ומשימות</p>
                </div>
              </button>
              <button className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:bg-accent transition-colors text-start">
                <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-4 w-4 text-sky-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold text-foreground">שלח הודעה לכיתה</p>
                  <p className="text-[10.5px] text-muted-foreground">תזכורת / עדכון לכל התלמידים</p>
                </div>
              </button>
              <button className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:bg-accent transition-colors text-start">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-4 w-4 text-emerald-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold text-foreground">דוח התקדמות מלא</p>
                  <p className="text-[10.5px] text-muted-foreground">סטטיסטיקות מפורטות לכיתה</p>
                </div>
              </button>
              <button className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:bg-accent transition-colors text-start">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Award className="h-4 w-4 text-amber-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold text-foreground">רשימת ציונים סופיים</p>
                  <p className="text-[10.5px] text-muted-foreground">הזן ציוני 30% לכל התלמידים</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LarutzImMilimPage;
