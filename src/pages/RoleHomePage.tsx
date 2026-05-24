import { useAuth, roleLabels } from "@/context/AuthContext";
import type { UserRole } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useStudents, useSubjects } from "@/hooks/useStudents";
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

  return (
    <>
      <ContinueCard navigate={navigate} />

      {/* Main action — go to courses */}
      <button
        onClick={() => navigate("/teacher-courses")}
        className="w-full group bg-primary/5 rounded-2xl border border-primary/10 p-5 text-start transition-all duration-300 hover:bg-primary/8 cursor-pointer mb-6 animate-fade-in-up"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-semibold text-foreground">הקורסים שלי</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">ניהול קורסים, ציונים ותלמידים</p>
          </div>
          <ChevronLeft className="h-4 w-4 text-primary/30 group-hover:text-primary/60 transition-colors" strokeWidth={1.5} />
        </div>
      </button>

    </>
  );
};

/* ═══ PARENT ═══ */
const ParentHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const childId = user?.scopeFilter?.[0] || "";

  // Safety: parent account not linked to a child yet
  if (!childId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <GraduationCap className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
        <p className="text-[14px] font-medium text-foreground">החשבון שלך עדיין לא מקושר לתלמיד</p>
        <p className="text-[12px] text-muted-foreground">פנה/י למנהל המערכת לחיבור החשבון</p>
      </div>
    );
  }

  const cards: ActionCard[] = [
    { id: "child", title: "הילד/ה שלי", description: "פרופיל, ציונים ומצב לימודי עדכני", icon: Heart, color: "bg-[hsl(350,25%,93%)]", iconColor: "text-[hsl(350,40%,50%)]", path: `/students/${childId}` },
    { id: "roadmap", title: "מפת הדרך לבגרות", description: "התקדמות, חוסרים ושלבים הבאים", icon: Route, color: "bg-primary/10", iconColor: "text-primary", path: `/students/${childId}` },
    { id: "status", title: "התקדמות לימודית", description: "ציונים, נוכחות וסטטוס לפי מקצוע", icon: TrendingUp, color: "bg-[hsl(210,40%,93%)]", iconColor: "text-[hsl(210,45%,48%)]", path: `/students/${childId}` },
    { id: "calendar", title: "לוח שנה", description: "משימות, מבחנים ומפגשים קרובים", icon: Calendar, color: "bg-secondary", iconColor: "text-foreground/80", path: "/calendar" },
    { id: "messages", title: "הודעות והערות", description: "הערות מצוות החינוך", icon: MessageSquare, color: "bg-[hsl(270,25%,93%)]", iconColor: "text-[hsl(270,35%,50%)]", comingSoon: true },
  ];

  return <CardGrid cards={cards} navigate={navigate} />;
};

/* ═══ COACH ═══ */
const CoachHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: students = [] } = useStudents();
  const mySport = user?.scopeFilter?.[0] || "";
  const myStudents = mySport ? students.filter((s) => s.sport === mySport) : [];
  const redCount = myStudents.filter((s) => s.overall_status === "red").length;

  // Safety: coach account not linked to a sport yet
  if (!mySport) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Dumbbell className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
        <p className="text-[14px] font-medium text-foreground">החשבון שלך עדיין לא מקושר לענף ספורט</p>
        <p className="text-[12px] text-muted-foreground">פנה/י למנהל המערכת לחיבור הענף</p>
      </div>
    );
  }

  const cards: ActionCard[] = [
    { id: "status", title: "התקדמות לימודית לפי ענף", description: "סקירת התקדמות לימודית של הענף", icon: BookOpen, color: "bg-[hsl(210,40%,93%)]", iconColor: "text-[hsl(210,45%,48%)]", path: "/courses" },
    { id: "risk", title: "דורשים תשומת לב", description: "ספורטאים עם סטטוס אדום או צהוב", icon: AlertTriangle, color: "bg-[hsl(0,35%,94%)]", iconColor: "text-destructive", path: "/students?status=red" },
  ];

  return (
    <>
      <InsightStrip
        pageKey="home-coach"
        items={[
          { id: "coach-stat-total", label: `ספורטאי ${mySport}`, value: myStudents.length, icon: Dumbbell, color: "text-[hsl(25,50%,45%)]" },
          { id: "coach-stat-red", label: "בסיכון", value: redCount, icon: AlertTriangle, color: "text-destructive" },
        ]}
      />
      <AIInsightsPanel students={myStudents} role="coach" navigate={navigate} />
      <CardGrid cards={cards} navigate={navigate} />
    </>
  );
};

/* ═══ MAIN ═══ */
const RoleHomePage = () => {
  const { user } = useAuth();

  const roleContent: Record<string, JSX.Element> = {
    admin: <AdminHome />,
    teacher: <TeacherHome />,
    parent: <ParentHome />,
    coach: <CoachHome />,
  };

  const title = user ? roleTitles[user.role] : "תמונת מצב";

  return (
    <div className={`p-5 md:p-8 lg:p-10 mx-auto ${user?.role === "admin" ? "max-w-[1400px]" : "max-w-[880px]"}`}>
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
