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
import DashboardContent from "@/components/DashboardContent";
import EditableElement from "@/components/builder/EditableElement";
import { roleTitles, CURRENT_SEMESTER } from "@/lib/schoolUtils";
import OpsBoard from "@/components/home/OpsBoard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lgApi, yearLabel } from "@/lib/learningGroupsApi";

const lgHome = lgApi(supabase as any);

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
    { id: "students", title: "תלמידים־ספורטאים", icon: Users, color: "bg-[hsl(210,40%,93%)]", iconColor: "text-[hsl(210,45%,48%)]", path: "/students" },
    { id: "groups", title: "כיתות", icon: Layers, color: "bg-[hsl(35,35%,93%)]", iconColor: "text-[hsl(35,45%,42%)]", path: "/groups" },
    { id: "progress", title: "מעקב לימודי", icon: BarChart3, color: "bg-[hsl(150,25%,93%)]", iconColor: "text-[hsl(150,35%,42%)]", path: "/courses" },
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
      {/* Operations board: real, permission-scoped alerts first */}
      <OpsBoard />
      {/* Quick-access navigation strip */}
      <MainEntryButtons navigate={navigate} />
      {/* Full dashboard — no extra padding, parent container provides it */}
      <DashboardContent embedded />
    </>
  );
};

/* ═══ TEACHER: my learning groups (existing RPCs; the permission is the
   gate — an error renders as an honest empty state, never as fake data) ═══ */
const TeacherGroups = ({ navigate }: { navigate: (p: string) => void }) => {
  const groupsQuery = useQuery({
    queryKey: ["teacher-home-groups"],
    retry: false,
    queryFn: async () => {
      const { data: au } = await supabase.auth.getUser();
      const uid = au?.user?.id;
      if (!uid) return [];
      const groups = (await lgHome.list(null, "active")) as any[];
      const details = await Promise.all(groups.slice(0, 40).map(g => lgHome.details(g.id).catch(() => null)));
      return details
        .filter((d: any) => d && d.teachers.some((t: any) => t.user_id === uid))
        .map((d: any) => ({
          id: d.group.id, name: d.group.name,
          year: yearLabel(d.group.academic_year_start),
          students: d.active_count as number,
        }));
    },
  });
  return (
    <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-card)] p-4 mb-6">
      <h3 className="text-[13px] font-semibold text-foreground mb-2">קבוצות הלימוד שלי</h3>
      {groupsQuery.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1].map(i => <div key={i} className="h-9 rounded-lg bg-muted/40 animate-pulse" />)}
        </div>
      ) : groupsQuery.isError ? (
        <p className="text-[12px] text-muted-foreground">צפייה בקבוצות לימוד עדיין אינה פתוחה לחשבון זה.</p>
      ) : (groupsQuery.data || []).length === 0 ? (
        <p className="text-[12px] text-muted-foreground">אינך משויך/ת כרגע לאף קבוצת לימוד פעילה.</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {groupsQuery.data!.map(g => (
            <li key={g.id}>
              <button onClick={() => navigate("/my-groups")}
                className="w-full text-start py-2 flex items-center justify-between gap-2 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded">
                <span className="text-[12.5px] text-foreground min-w-0 break-words">
                  {g.name} <span className="text-muted-foreground" dir="ltr">({g.year})</span>
                </span>
                <span className="text-[11.5px] text-muted-foreground shrink-0">{g.students} תלמידים</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ═══ TEACHER ═══ */
const TeacherHome = () => {
  const navigate = useNavigate();
  const { data: students = [] } = useStudents();

  // Factual only — no default statuses, no averages
  const active = students.filter(s => !(s as any).archived);
  const classesCount = new Set(active.map(s => s.class_name).filter(Boolean)).size;

  const quickActions = [
    { id: "my-groups", title: "הקבוצות שלי",   desc: "קבוצות הלימוד שלך", icon: GraduationCap, color: "bg-primary/10", iconColor: "text-primary",    path: "/my-groups" },
    { id: "content",  title: "מקצועות ומסלולי למידה", desc: "מקצועות, קורסים וחומרי לימוד", icon: BookOpen,     color: "bg-[hsl(270,25%,94%)]", iconColor: "text-[hsl(270,35%,50%)]", path: "/teacher-courses" },
    { id: "grade",    title: "הזנת ציונים",    desc: "עדכון ציוני תלמידים",        icon: ClipboardEdit,color: "bg-emerald-50",   iconColor: "text-emerald-700",  path: "/grade-entry" },
    { id: "students", title: "התלמידים שלי",  desc: "תלמידי קבוצות הלימוד שלך",   icon: Users,        color: "bg-sky-50",       iconColor: "text-sky-700",      path: "/students" },
  ];

  return (
    <>
      <ContinueCard navigate={navigate} />

      {/* Teacher with no assigned groups: say it plainly, no system-wide numbers */}
      {active.length === 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 mb-4 shadow-[var(--shadow-card)]">
          <p className="text-[14px] font-semibold text-foreground">עדיין לא שויכו לך קבוצות לימוד</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            לאחר השיוך יופיעו כאן התלמידים, המשימות וההגשות שבאחריותך. לשיוך קבוצות אפשר לפנות למנהל המערכת.
          </p>
        </div>
      )}

      <TeacherGroups navigate={navigate} />

      {/* KPI strip — factual, scoped to the teacher's own students only */}
      {active.length > 0 && (
        <InsightStrip
          pageKey="home-teacher"
          items={[
            { id: "teacher-stat-total",   label: "התלמידים שלי", value: active.length, icon: Users,    color: "text-primary" },
            { id: "teacher-stat-classes", label: "כיתות",         value: classesCount || "—",  icon: BookOpen, color: "text-primary" },
          ]}
        />
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
const ParentHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const childIds = user?.scopeFilter || [];
  const childId = childIds[0] || "";
  const { data: child, isLoading } = useStudent(childId);
  // additional linked children (RLS-scoped list query returns only the
  // parent's own children; nothing about other students is readable)
  const { data: allChildren = [] } = useStudents();
  const otherChildren = (allChildren as any[]).filter(c => childIds.includes(c.id) && c.id !== childId);
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

  // Factual only: grade rows this account is actually allowed to read.
  // Grades/bagrut are currently admin-only in RLS, so parents get 0 rows;
  // if that policy opens, real counts appear here automatically.
  const totalRows = (progress as any[]).length;
  const gradedRows = (progress as any[]).filter(p => (p.grade ?? 0) > 0).length;

  const cards: ActionCard[] = [
    { id: "profile",  title: "פרופיל התלמיד/ה",  description: "פרטים אישיים ומידע כללי",        icon: Heart,     color: "bg-[hsl(350,25%,93%)]", iconColor: "text-[hsl(350,40%,50%)]", path: `/students/${childId}` },
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
            {/* Real fields only: name, class, sport. No status chip, no average,
                no completion bar — those were default/invented values. */}
            <div className="mb-4 min-w-0">
              <h2 className="text-[16px] font-semibold text-foreground break-words leading-snug">{child?.full_name || user?.name}</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                כיתה {child?.class_name || "—"} · {child?.sport || "—"}
              </p>
            </div>

            {/* Factual grade counts, phrased for a parent (correct singular/plural) */}
            <div className="bg-muted/30 rounded-xl p-3">
              {totalRows === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  נתוני ציונים ובגרות עדיין אינם זמינים לצפייה בחשבון הורה
                </p>
              ) : gradedRows === 0 ? (
                <>
                  <p className="text-[13px] font-medium text-foreground">עדיין אין ציונים להצגה</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {totalRows === 1
                      ? "קיימת רשומה לימודית אחת ללא ציון."
                      : `קיימות ${totalRows} רשומות לימודיות ללא ציון.`}
                  </p>
                </>
              ) : (
                <p className="text-[13px] text-foreground">
                  {gradedRows === 1 ? "ציון אחד" : `${gradedRows} ציונים`} מתוך{" "}
                  {totalRows === 1 ? "רשומה לימודית אחת" : `${totalRows} רשומות לימודיות`}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* additional linked children, each with a direct profile action */}
      {otherChildren.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-card)] p-4 mb-6">
          <h3 className="text-[13px] font-semibold text-foreground mb-1.5">ילדים נוספים מקושרים</h3>
          <ul className="divide-y divide-border/50">
            {otherChildren.map((c: any) => (
              <li key={c.id}>
                <button onClick={() => navigate(`/students/${c.id}`)}
                  className="w-full text-start py-2 flex items-center justify-between gap-2 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded">
                  <span className="text-[12.5px] text-foreground min-w-0 break-words">{c.full_name}</span>
                  <span className="text-[11.5px] text-muted-foreground shrink-0">
                    {c.class_name || "ללא כיתה"}{c.sport ? ` · ${c.sport}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
  const myStudents = mySport ? students.filter((s) => s.sport === mySport && !(s as any).archived) : [];
  // Factual only — no default statuses, no averages
  const myClassesCount = new Set(myStudents.map(s => s.class_name).filter(Boolean)).size;

  if (!mySport) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Dumbbell className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
        <p className="text-[14px] font-medium text-foreground">החשבון שלך עדיין לא מקושר לענף ספורט</p>
        <p className="text-[12px] text-muted-foreground">פנה/י למנהל המערכת לחיבור הענף</p>
      </div>
    );
  }

  const noClass = myStudents.filter(s => !(s.class_name || "").trim());

  return (
    <>
      <InsightStrip
        pageKey="home-coach"
        items={[
          { id: "coach-stat-total",   label: `ספורטאי ${mySport}`, value: myStudents.length || "—", icon: Dumbbell, color: "text-[hsl(25,50%,45%)]" },
          { id: "coach-stat-classes", label: "כיתות בענף",          value: myClassesCount || "—",    icon: BookOpen, color: "text-primary" },
        ]}
      />

      {/* actionable: athletes without a clear class assignment (real check) */}
      {noClass.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-card)] p-4 mb-4">
          <p className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-warning" strokeWidth={1.6} />
            {noClass.length} ספורטאים ללא שיוך כיתה
          </p>
          <p className="text-[11.5px] text-muted-foreground mt-0.5 break-words">
            {noClass.slice(0, 3).map(s => s.full_name).join(", ")}{noClass.length > 3 ? ` ועוד ${noClass.length - 3}` : ""}
          </p>
        </div>
      )}

      {/* direct athlete profiles — the coach's own scope only */}
      {myStudents.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-card)] p-4 mb-4">
          <h3 className="text-[13px] font-semibold text-foreground mb-1.5">הספורטאים שלי</h3>
          <ul className="divide-y divide-border/50">
            {[...myStudents].sort((a, b) => a.full_name.localeCompare(b.full_name, "he")).slice(0, 6).map(s => (
              <li key={s.id}>
                <button onClick={() => navigate(`/students/${s.id}`)}
                  className="w-full text-start py-2 flex items-center justify-between gap-2 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded">
                  <span className="text-[12.5px] text-foreground min-w-0 break-words">{s.full_name}</span>
                  <span className="text-[11.5px] text-muted-foreground shrink-0">{s.class_name || "ללא כיתה"}</span>
                </button>
              </li>
            ))}
          </ul>
          {myStudents.length > 6 && (
            <button onClick={() => navigate("/students")}
              className="text-[11.5px] text-primary hover:underline mt-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded">
              לכל {myStudents.length} הספורטאים
            </button>
          )}
        </div>
      )}

      {/* coach cannot edit student records (admin-gated in RLS), so the
          old "הזנת נתונים" card was removed; only read actions remain */}
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => navigate("/students")}
          className="group bg-card rounded-2xl border border-border p-4 text-start transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-[hsl(210,40%,93%)] flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-105">
            <Users className="h-[18px] w-[18px] text-[hsl(210,45%,48%)]" strokeWidth={1.5} />
          </div>
          <h3 className="text-[13px] font-semibold text-foreground leading-tight">כל הספורטאים</h3>
          <p className="text-[10.5px] text-muted-foreground mt-1">פרופילים ופרטים אישיים</p>
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
          מסלול · האקדמיה למצוינות בספורט
        </span>
      </div>
    </div>
  );
};

export default RoleHomePage;
