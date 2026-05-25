import { useAuth, roleLabels } from "@/context/AuthContext";
import type { UserRole } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useStudents, useSubjects, useStudent, useStudentProgress } from "@/hooks/useStudents";
import { useMemo, useEffect, useState } from "react";
import {
  LayoutDashboard, Users, Database, BarChart3, BookOpen, ClipboardEdit,
  Route, Calendar, Heart, AlertTriangle, Target, TrendingUp, MessageSquare,
  Dumbbell, ChevronLeft, GraduationCap, Layers, Play,
} from "lucide-react";
import WingateBadge from "@/components/WingateBadge";
import AIInsightsPanel from "@/components/AIInsightsPanel";
import DashboardContent from "@/components/DashboardContent";
import EditableElement from "@/components/builder/EditableElement";
import { roleTitles, CURRENT_SEMESTER } from "@/lib/schoolUtils";

/* ═══ Types ═══ */
interface ActionCard {
  id: string;
  title: string;
  description: string;
  icon: typeof Users;
  color: string;
  iconColor: string;
  path?: string;
  external?: string;
  comingSoon?: boolean;
  badge?: string;
  size?: "large" | "normal";
}

/* ═══ Card Grid ═══ */
const CardGrid = ({ cards, navigate }: { cards: ActionCard[]; navigate: (p: string) => void }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
    {cards.map((card, i) => (
      <button
        key={card.id}
        onClick={() => {
          if (card.comingSoon) return;
          if (card.external) navigate(`/external?type=${card.id}&url=${encodeURIComponent(card.external)}`);
          else if (card.path) navigate(card.path);
        }}
        disabled={card.comingSoon}
        className={`group relative bg-card rounded-2xl border border-border p-5 text-start transition-all duration-300 animate-fade-in-up ${
          card.comingSoon
            ? "opacity-45 cursor-not-allowed"
            : "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        } ${card.size === "large" ? "sm:col-span-2" : ""}`}
        style={{ animationDelay: `${80 + i * 50}ms` }}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 rounded-xl ${card.color} flex items-center justify-center shrink-0 transition-transform duration-300 ${
              !card.comingSoon ? "group-hover:scale-105" : ""
            }`}
          >
            <card.icon className={`h-[18px] w-[18px] ${card.iconColor}`} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[13.5px] font-semibold text-foreground leading-tight">{card.title}</h3>
              {card.comingSoon && (
                <span className="text-[9px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                  בקרוב
                </span>
              )}
              {card.badge && (
                <span className="text-[9.5px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                  {card.badge}
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-1.5 leading-relaxed">{card.description}</p>
          </div>
          {!card.comingSoon && (
            <ChevronLeft
              className="h-4 w-4 text-border shrink-0 mt-0.5 group-hover:text-primary/50 transition-colors duration-200"
              strokeWidth={1.5}
            />
          )}
        </div>
      </button>
    ))}
  </div>
);

/* ═══ Insight Strip ═══ */
const InsightStrip = ({
  items,
  pageKey = "home",
}: {
  items: { label: string; value: string | number; icon: typeof Users; color: string; id?: string }[];
  pageKey?: string;
}) => (
  <div className="grid gap-3 mb-7" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
    {items.map((item, i) => (
      <EditableElement
        key={i}
        id={item.id ?? `insight-stat-${pageKey}-${i}`}
        type="stat"
        defaultLabel={item.label}
        pageKey={pageKey}
      >
        {({ label, inlineStyle }) => (
          <div
            className="bg-card rounded-xl border border-border/60 p-3.5 text-center shadow-[var(--shadow-card)] animate-fade-in-up hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-200"
            style={{ ...inlineStyle, animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-center justify-center mb-1.5">
              <item.icon className={`h-4 w-4 ${item.color}`} strokeWidth={1.5} />
            </div>
            <p className="text-[20px] font-bold text-foreground leading-none font-stat">{item.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">{label}</p>
          </div>
        )}
      </EditableElement>
    ))}
  </div>
);

/* ═══ Continue From Last Time ═══ */
const LAST_VISITED_KEY = "wingate_last_visited";

interface LastVisited {
  path: string;
  label: string;
  timestamp: number;
}

const saveLastVisited = (path: string, label: string) => {
  try {
    localStorage.setItem(LAST_VISITED_KEY, JSON.stringify({ path, label, timestamp: Date.now() }));
  } catch {}
};

const getLastVisited = (): LastVisited | null => {
  try {
    const raw = localStorage.getItem(LAST_VISITED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export { saveLastVisited };

const ContinueCard = ({ navigate }: { navigate: (p: string) => void }) => {
  const [last, setLast] = useState<LastVisited | null>(null);
  useEffect(() => { setLast(getLastVisited()); }, []);

  if (!last) return null;

  return (
    <div className="mb-6 animate-fade-in-up">
      <button
        onClick={() => navigate(last.path)}
        className="w-full group bg-primary/5 rounded-2xl border border-primary/10 p-4 text-start transition-all duration-300 hover:bg-primary/8 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Play className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold text-foreground leading-tight">{last.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">חזור למקום שעצרת</p>
          </div>
          <ChevronLeft className="h-4 w-4 text-primary/30 group-hover:text-primary/60 transition-colors" strokeWidth={1.5} />
        </div>
      </button>
    </div>
  );
};
/* ═══ Subjects List ═══ */
const SubjectsList = ({ navigate }: { navigate: (p: string) => void }) => {
  const { data: subjects = [] } = useSubjects();
  if (!subjects.length) return null;
  return (
    <div className="mb-7 animate-fade-in-up">
      <p className="text-[10.5px] font-medium text-primary/50 mb-2.5 tracking-tight">המקצועות שלי</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {subjects.map((s: any, i: number) => (
          <button
            key={s.id}
            onClick={() => navigate(`/subjects/${encodeURIComponent(s.subject_name)}`)}
            className="group bg-card rounded-xl border border-border p-3.5 text-start transition-all duration-200 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer animate-fade-in-up"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-primary/70" strokeWidth={1.5} />
              </div>
              <span className="text-[12.5px] font-semibold text-foreground leading-tight flex-1 truncate">{s.subject_name}</span>
              <ChevronLeft className="h-3.5 w-3.5 text-border group-hover:text-primary/50 transition-colors" strokeWidth={1.5} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};


/* ═══ Main Entry Buttons ═══ */
const MainEntryButtons = ({ navigate }: { navigate: (p: string) => void }) => {
  const entries = [
    { id: "subjects", title: "מקצועות", icon: BookOpen, color: "bg-[hsl(270,25%,94%)]", iconColor: "text-[hsl(270,35%,50%)]", path: "/subjects" },
    { id: "students", title: "ספורטאים", icon: Users, color: "bg-[hsl(210,40%,93%)]", iconColor: "text-[hsl(210,45%,48%)]", path: "/students" },
    { id: "groups", title: "קבוצות", icon: Layers, color: "bg-[hsl(35,35%,93%)]", iconColor: "text-[hsl(35,45%,42%)]", path: "/groups" },
    { id: "progress", title: "התקדמות לימודית", icon: BarChart3, color: "bg-[hsl(150,25%,93%)]", iconColor: "text-[hsl(150,35%,42%)]", path: "/courses" },
  ];

  return (
    <div className="mb-7">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {entries.map((entry, i) => (
          <button
            key={entry.id}
            onClick={() => navigate(entry.path)}
            className="group bg-card rounded-2xl border border-border p-4 text-center transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer animate-fade-in-up"
            style={{ animationDelay: `${40 + i * 40}ms` }}
          >
            <div className={`w-12 h-12 rounded-xl ${entry.color} flex items-center justify-center mx-auto mb-2.5 transition-transform duration-300 group-hover:scale-110`}>
              <entry.icon className={`h-5 w-5 ${entry.iconColor}`} strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] font-semibold text-foreground leading-tight">{entry.title}</h3>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ═══ ADMIN ═══ */
const AdminHome = () => {
  const navigate = useNavigate();
  return (
    <>
      {/* Quick-access navigation strip */}
      <MainEntryButtons navigate={navigate} />
      {/* Full dashboard — no extra padding, parent container provides it */}
      <DashboardContent embedded />
    </>
  );
};

/* ═══ TEACHER ═══ */
const TeacherHome = () => {
  const navigate = useNavigate();
  const { data: students = [] } = useStudents();

  const redStudents   = students.filter(s => s.overall_status === "red");
  const yellowStudents = students.filter(s => s.overall_status === "yellow");
  const greenStudents = students.filter(s => s.overall_status === "green");
  const graded = students.filter(s => (s.avg_score ?? 0) > 0);
  const avgGrade = graded.length
    ? Math.round(graded.reduce((sum, s) => sum + (s.avg_score || 0), 0) / graded.length)
    : 0;

  const quickActions = [
    { id: "courses",  title: "הקורסים שלי",    desc: "ניהול קורסים וציונים",       icon: BookOpen,     color: "bg-primary/10",   iconColor: "text-primary",      path: "/teacher-courses" },
    { id: "grade",    title: "הזנת ציונים",    desc: "עדכון ציוני תלמידים",        icon: ClipboardEdit,color: "bg-emerald-50",   iconColor: "text-emerald-700",  path: "/grade-entry" },
    { id: "students", title: "כל הספורטאים",   desc: "חיפוש וצפייה בפרופילים",     icon: Users,        color: "bg-sky-50",       iconColor: "text-sky-700",      path: "/students" },
    { id: "data",     title: "הזנת נתונים",    desc: "עדכון מידע אישי ואקדמי",    icon: Database,     color: "bg-violet-50",    iconColor: "text-violet-700",   path: "/data-entry" },
  ];

  /* students that need attention — red first, then yellow if no red */
  const atRisk = redStudents.length > 0 ? redStudents : yellowStudents;
  const atRiskColor = redStudents.length > 0
    ? { dot: "bg-destructive", card: "bg-destructive/5 border-destructive/10", chevron: "group-hover:text-destructive/40" }
    : { dot: "bg-warning",     card: "bg-warning/5 border-warning/10",         chevron: "group-hover:text-warning/40" };
  const atRiskLabel = redStudents.length > 0 ? "ספורטאים בסיכון" : "ספורטאים עם פערים";
  const atRiskFilter = redStudents.length > 0 ? "red" : "yellow";

  return (
    <>
      <ContinueCard navigate={navigate} />

      {/* KPI strip */}
      <InsightStrip
        pageKey="home-teacher"
        items={[
          { id: "teacher-stat-total",  label: "סה״כ ספורטאים", value: students.length,      icon: Users,         color: "text-primary" },
          { id: "teacher-stat-red",    label: "בסיכון",         value: redStudents.length,   icon: AlertTriangle, color: "text-destructive" },
          { id: "teacher-stat-avg",    label: "ממוצע כיתה",     value: avgGrade || "—",      icon: Target,        color: "text-success" },
          { id: "teacher-stat-green",  label: "במסלול",         value: greenStudents.length, icon: TrendingUp,    color: "text-success" },
        ]}
      />

      {/* At-risk students */}
      {atRisk.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate(`/students?status=${atRiskFilter}`)}
              className="text-[11px] text-primary/70 hover:text-primary transition-colors"
            >
              הצג הכל ←
            </button>
            <h3 className="text-[13px] font-semibold text-foreground">{atRiskLabel}</h3>
          </div>
          <div className="space-y-2">
            {atRisk.slice(0, 4).map(s => (
              <button
                key={s.id}
                onClick={() => navigate(`/students/${s.id}`)}
                className={`w-full group ${atRiskColor.card} rounded-xl border p-3 flex items-center gap-3 text-start hover:opacity-90 transition-all`}
              >
                <span className={`w-2 h-2 rounded-full ${atRiskColor.dot} shrink-0`} />
                <span className="text-[13px] font-medium text-foreground flex-1">{s.full_name}</span>
                {s.class_name && <span className="text-[10px] text-muted-foreground">{s.class_name}</span>}
                {s.sport && (
                  <span className="text-[9.5px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{s.sport}</span>
                )}
                <ChevronLeft className={`h-3.5 w-3.5 text-border ${atRiskColor.chevron} transition-colors`} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All-green celebration */}
      {atRisk.length === 0 && students.length > 0 && (
        <div className="mb-6 bg-success/5 rounded-2xl border border-success/15 p-4 flex items-center gap-3">
          <span className="text-xl">🎉</span>
          <div>
            <p className="text-[13px] font-semibold text-foreground">כל הספורטאים במסלול!</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">כל {students.length} הספורטאים עם סטטוס ירוק כרגע</p>
          </div>
        </div>
      )}

      {/* Quick actions grid */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((a, i) => (
          <button
            key={a.id}
            onClick={() => navigate(a.path)}
            className="group bg-card rounded-2xl border border-border p-4 text-start transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer animate-fade-in-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className={`w-10 h-10 rounded-xl ${a.color} flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105`}>
              <a.icon className={`h-[18px] w-[18px] ${a.iconColor}`} strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] font-semibold text-foreground leading-tight">{a.title}</h3>
            <p className="text-[10.5px] text-muted-foreground mt-1">{a.desc}</p>
          </button>
        ))}
      </div>
    </>
  );
};

/* ═══ PARENT ═══ */
const statusBadge: Record<string, { label: string; bg: string; dot: string }> = {
  green:  { label: "במסלול",  bg: "bg-success/10 text-success",      dot: "bg-success" },
  yellow: { label: "פערים",   bg: "bg-warning/10 text-warning",       dot: "bg-warning" },
  red:    { label: "בסיכון",  bg: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

const ParentHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const childId = user?.scopeFilter?.[0] || "";
  const { data: child, isLoading } = useStudent(childId);
  const { data: progress = [] } = useStudentProgress(childId);

  if (!childId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <GraduationCap className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
        <p className="text-[14px] font-medium text-foreground">החשבון שלך עדיין לא מקושר לתלמיד</p>
        <p className="text-[12px] text-muted-foreground">פנה/י למנהל המערכת לחיבור החשבון</p>
      </div>
    );
  }

  /* derive quick subject stats */
  const graded = (progress as any[]).filter(p => (p.grade ?? 0) > 0);
  const avgGrade = graded.length
    ? Math.round(graded.reduce((s: number, p: any) => s + p.grade, 0) / graded.length)
    : null;
  const completionPct = child?.completion_percent ?? 0;
  const status = child?.overall_status || "green";
  const badge = statusBadge[status] || statusBadge.green;

  /* subjects needing attention */
  const atRisk = (progress as any[])
    .filter(p => p.status === "red" || p.status === "yellow")
    .sort((a, b) => (a.status === "red" ? -1 : 1) - (b.status === "red" ? -1 : 1))
    .slice(0, 3);

  const cards: ActionCard[] = [
    { id: "profile",  title: "פרופיל מלא",       description: "כל הנתונים, ציונים ומידע אישי", icon: Heart,     color: "bg-[hsl(350,25%,93%)]", iconColor: "text-[hsl(350,40%,50%)]", path: `/students/${childId}` },
    { id: "calendar", title: "לוח שנה",           description: "משימות, מבחנים ומפגשים קרובים",  icon: Calendar,  color: "bg-secondary",          iconColor: "text-foreground/80",      path: "/calendar" },
    { id: "messages", title: "הודעות והערות",     description: "הערות מצוות החינוך",             icon: MessageSquare, color: "bg-[hsl(270,25%,93%)]", iconColor: "text-[hsl(270,35%,50%)]", comingSoon: true },
  ];

  return (
    <>
      {/* Child summary card */}
      <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-card)] p-5 mb-6 animate-fade-in-up">
        {isLoading ? (
          <div className="h-16 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <span className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${badge.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
              <div className="text-start">
                <h2 className="text-[16px] font-semibold text-foreground">{child?.full_name || user?.name}</h2>
                {child?.class_name && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{child.class_name} · {child.sport || ""}</p>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "ממוצע ציונים", value: avgGrade ?? "—" },
                { label: "השלמת חומר",   value: `${Math.round(completionPct)}%` },
                { label: "מקצועות",      value: (progress as any[]).length },
              ].map((s, i) => (
                <div key={i} className="bg-muted/30 rounded-xl p-3 text-center">
                  <p className="text-[18px] font-bold text-foreground tabular-nums leading-none">{s.value}</p>
                  <p className="text-[9.5px] text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                <span>{Math.round(completionPct)}%</span>
                <span>התקדמות כוללת</span>
              </div>
              <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/70 transition-all duration-700"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>

            {/* At-risk subjects */}
            {atRisk.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/50">
                <p className="text-[10.5px] font-medium text-muted-foreground mb-2 text-end">מקצועות שדורשים תשומת לב</p>
                <div className="flex gap-2 flex-wrap justify-end">
                  {atRisk.map((p: any) => (
                    <span
                      key={p.subject_id}
                      className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${p.status === "red" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}
                    >
                      {p.subjects?.subject_name || "מקצוע"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action cards */}
      <CardGrid cards={cards} navigate={navigate} />
    </>
  );
};

/* ═══ COACH ═══ */
const CoachHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: students = [] } = useStudents();
  const mySport = user?.scopeFilter?.[0] || "";
  const myStudents = mySport ? students.filter((s) => s.sport === mySport) : [];
  const redStudents    = myStudents.filter(s => s.overall_status === "red");
  const yellowStudents = myStudents.filter(s => s.overall_status === "yellow");
  const greenStudents  = myStudents.filter(s => s.overall_status === "green");

  const atRisk = redStudents.length > 0 ? redStudents : yellowStudents;
  const atRiskColor = redStudents.length > 0
    ? { dot: "bg-destructive", card: "bg-destructive/5 border-destructive/10", chevron: "group-hover:text-destructive/40" }
    : { dot: "bg-warning",     card: "bg-warning/5 border-warning/10",         chevron: "group-hover:text-warning/40" };
  const atRiskLabel  = redStudents.length > 0 ? "ספורטאים בסיכון" : "ספורטאים עם פערים";
  const atRiskFilter = redStudents.length > 0 ? "red" : "yellow";

  if (!mySport) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Dumbbell className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
        <p className="text-[14px] font-medium text-foreground">החשבון שלך עדיין לא מקושר לענף ספורט</p>
        <p className="text-[12px] text-muted-foreground">פנה/י למנהל המערכת לחיבור הענף</p>
      </div>
    );
  }

  return (
    <>
      <InsightStrip
        pageKey="home-coach"
        items={[
          { id: "coach-stat-total",  label: `ספורטאי ${mySport}`, value: myStudents.length,   icon: Dumbbell,      color: "text-[hsl(25,50%,45%)]" },
          { id: "coach-stat-red",    label: "בסיכון",              value: redStudents.length,  icon: AlertTriangle, color: "text-destructive" },
          { id: "coach-stat-green",  label: "במסלול",              value: greenStudents.length, icon: TrendingUp,    color: "text-success" },
        ]}
      />

      {/* At-risk quick list */}
      {atRisk.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate(`/students?status=${atRiskFilter}`)}
              className="text-[11px] text-primary/70 hover:text-primary transition-colors"
            >
              הצג הכל ←
            </button>
            <h3 className="text-[13px] font-semibold text-foreground">{atRiskLabel}</h3>
          </div>
          <div className="space-y-2">
            {atRisk.slice(0, 3).map(s => (
              <button
                key={s.id}
                onClick={() => navigate(`/students/${s.id}`)}
                className={`w-full group ${atRiskColor.card} rounded-xl border p-3 flex items-center gap-3 text-start hover:opacity-90 transition-all`}
              >
                <span className={`w-2 h-2 rounded-full ${atRiskColor.dot} shrink-0`} />
                <span className="text-[13px] font-medium text-foreground flex-1">{s.full_name}</span>
                {s.class_name && <span className="text-[10px] text-muted-foreground">{s.class_name}</span>}
                <ChevronLeft className={`h-3.5 w-3.5 text-border ${atRiskColor.chevron} transition-colors`} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>
      )}

      {atRisk.length === 0 && myStudents.length > 0 && (
        <div className="mb-6 bg-success/5 rounded-2xl border border-success/15 p-4 flex items-center gap-3">
          <span className="text-xl">🏆</span>
          <div>
            <p className="text-[13px] font-semibold text-foreground">כל ספורטאי הענף במסלול!</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">כל {myStudents.length} הספורטאים עם סטטוס ירוק</p>
          </div>
        </div>
      )}

      <AIInsightsPanel students={myStudents} role="coach" navigate={navigate} />

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/students")}
          className="group bg-card rounded-2xl border border-border p-4 text-start transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[hsl(210,40%,93%)] flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105">
            <Users className="h-[18px] w-[18px] text-[hsl(210,45%,48%)]" strokeWidth={1.5} />
          </div>
          <h3 className="text-[13px] font-semibold text-foreground leading-tight">כל הספורטאים</h3>
          <p className="text-[10.5px] text-muted-foreground mt-1">פרופילים וסטטוסים</p>
        </button>
        <button
          onClick={() => navigate("/data-entry")}
          className="group bg-card rounded-2xl border border-border p-4 text-start transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[hsl(0,35%,94%)] flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105">
            <AlertTriangle className="h-[18px] w-[18px] text-destructive" strokeWidth={1.5} />
          </div>
          <h3 className="text-[13px] font-semibold text-foreground leading-tight">דורשים תשומת לב</h3>
          <p className="text-[10.5px] text-muted-foreground mt-1">הזנת נתוני ענף</p>
        </button>
      </div>
    </>
  );
};

/* ═══ MAIN ═══ */
const RoleHomePage = () => {
  const { user } = useAuth();

  const roleContent: Record<string, JSX.Element> = {
    developer: <AdminHome />,
    admin: <AdminHome />,
    teacher: <TeacherHome />,
    parent: <ParentHome />,
    coach: <CoachHome />,
  };

  const title = user ? roleTitles[user.role] : "תמונת מצב";
  const isAdminLike = user?.role === "admin" || user?.role === "developer";

  return (
    <div className={`p-5 md:p-8 lg:p-10 mx-auto ${isAdminLike ? "max-w-[1400px]" : "max-w-[880px]"}`}>
      {/* Welcome */}
      <section className="mb-8">
        <EditableElement
          id="home-greeting"
          type="section"
          defaultLabel="ברכת פתיחה"
          pageKey="home"
        >
          {({ inlineStyle }) => (
            <div className="flex items-center gap-4 mb-6" style={inlineStyle}>
              <WingateBadge size="md" className="shadow-[var(--shadow-card-hover)]" />
              <div>
                <h1 className="text-[17px] md:text-[21px] font-medium text-foreground tracking-tight leading-tight">
                  שלום, {user?.name}
                </h1>
                <p className="text-[11px] text-muted-foreground/60 mt-1.5 font-normal">
                  {user ? roleLabels[user.role] : ""} · {CURRENT_SEMESTER}
                </p>
              </div>
            </div>
          )}
        </EditableElement>
      </section>

      {/* Content */}
      <section>
        {user && roleContent[user.role]}
      </section>

      {/* Branding */}
      <div className="mt-16 text-center">
        <span className="text-[8.5px] text-muted-foreground/20 font-normal tracking-wider">
          האקדמיה למצוינות · מכון וינגייט
        </span>
      </div>
    </div>
  );
};

export default RoleHomePage;
