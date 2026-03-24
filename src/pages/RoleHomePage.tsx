import { useAuth, roleLabels } from "@/context/AuthContext";
import type { UserRole } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useStudents } from "@/hooks/useStudents";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Database,
  BarChart3,
  BookOpen,
  ClipboardEdit,
  Route,
  Calendar,
  Heart,
  AlertTriangle,
  Target,
  TrendingUp,
  MessageSquare,
  Dumbbell,
  ChevronLeft,
  GraduationCap,
  Layers,
  Play,
} from "lucide-react";
import WingateBadge from "@/components/WingateBadge";

/* ═══ Role Titles ═══ */
const roleTitles: Record<UserRole, string> = {
  admin: "מרכז ניהול",
  teacher: "מרכז עבודה",
  student: "המרחב שלי",
  parent: "התקדמות הילד/ה",
  coach: "מרכז המאמן",
};

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
const CardGrid = ({
  cards,
  navigate,
}: {
  cards: ActionCard[];
  navigate: (p: string) => void;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
    {cards.map((card, i) => (
      <button
        key={card.id}
        onClick={() => {
          if (card.comingSoon) return;
          if (card.external) {
            navigate(`/external?type=${card.id}&url=${encodeURIComponent(card.external)}`);
          } else if (card.path) {
            navigate(card.path);
          }
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
              <h3 className="text-[13.5px] font-semibold text-foreground leading-tight">
                {card.title}
              </h3>

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

            <p className="text-[11.5px] text-muted-foreground mt-1.5 leading-relaxed">
              {card.description}
            </p>
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
}: {
  items: { label: string; value: string | number; icon: typeof Users; color: string }[];
}) => (
  <div className="grid gap-3 mb-7" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
    {items.map((item, i) => (
      <div
        key={i}
        className="bg-card rounded-xl border border-border p-3.5 text-center shadow-[var(--shadow-card)] animate-fade-in-up"
        style={{ animationDelay: `${i * 40}ms` }}
      >
        <div className="flex items-center justify-center mb-1.5">
          <item.icon className={`h-4 w-4 ${item.color}`} strokeWidth={1.5} />
        </div>
        <p className="text-[18px] font-semibold text-foreground leading-none">{item.value}</p>
        <p className="text-[10px] text-muted-foreground mt-1 font-medium">{item.label}</p>
      </div>
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

const getLastVisited = (): LastVisited | null => {
  try {
    const raw = localStorage.getItem(LAST_VISITED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveLastVisited = (path: string, label: string) => {
  try {
    localStorage.setItem(
      LAST_VISITED_KEY,
      JSON.stringify({ path, label, timestamp: Date.now() })
    );
  } catch {}
};

const ContinueCard = ({ navigate }: { navigate: (p: string) => void }) => {
  const [last, setLast] = useState<LastVisited | null>(null);

  useEffect(() => {
    setLast(getLastVisited());
  }, []);

  if (!last) return null;

  return (
    <div className="mb-6 animate-fade-in-up">
      <p className="text-[10.5px] font-medium text-primary/50 mb-2.5 tracking-tight">
        המשך מהפעם האחרונה
      </p>
      <button
        onClick={() => navigate(last.path)}
        className="w-full group bg-primary/5 rounded-2xl border border-primary/10 p-4 text-start transition-all duration-300 hover:bg-primary/8 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Play className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold text-foreground leading-tight">
              {last.label}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              חזור למקום שעצרת
            </p>
          </div>
          <ChevronLeft
            className="h-4 w-4 text-primary/30 group-hover:text-primary/60 transition-colors"
            strokeWidth={1.5}
          />
        </div>
      </button>
    </div>
  );
};

/* ═══ Main Entry Buttons ═══ */
const MainEntryButtons = ({ navigate }: { navigate: (p: string) => void }) => {
  const entries = [
    {
      id: "subjects",
      title: "מקצועות",
      icon: BookOpen,
      color: "bg-[hsl(270,25%,94%)]",
      iconColor: "text-[hsl(270,35%,50%)]",
      path: "/courses",
    },
    {
      id: "students",
      title: "תלמידים",
      icon: Users,
      color: "bg-[hsl(210,40%,93%)]",
      iconColor: "text-[hsl(210,45%,48%)]",
      path: "/students",
    },
    {
      id: "groups",
      title: "קבוצות",
      icon: Layers,
      color: "bg-[hsl(35,35%,93%)]",
      iconColor: "text-[hsl(35,45%,42%)]",
      path: "/groups",
    },
    {
      id: "calendar",
      title: "לוח שנה",
      icon: Calendar,
      color: "bg-[hsl(150,25%,93%)]",
      iconColor: "text-[hsl(150,35%,42%)]",
      path: "/calendar",
    },
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
            <div
              className={`w-12 h-12 rounded-xl ${entry.color} flex items-center justify-center mx-auto mb-2.5 transition-transform duration-300 group-hover:scale-110`}
            >
              <entry.icon className={`h-5 w-5 ${entry.iconColor}`} strokeWidth={1.5} />
            </div>
            <h3 className="text-[13px] font-semibold text-foreground leading-tight">
              {entry.title}
            </h3>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ═══ ADMIN ═══ */
const AdminHome = () => {
  const navigate = useNavigate();
  const { data: students = [] } = useStudents();

  const redCount = students.filter((s) => s.overall_status === "red").length;
  const yellowCount = students.filter((s) => s.overall_status === "yellow").length;

  const cards: ActionCard[] = [
    {
      id: "overview",
      title: "דשבורד ניהולי",
      description: "נתונים, KPIs וסטטיסטיקות כלליות",
      icon: LayoutDashboard,
      color: "bg-primary/10",
      iconColor: "text-primary",
      path: "/dashboard",
    },
    {
      id: "data-mgmt",
      title: "ניהול מערכת",
      description: "ענפי ספורט, מקצועות וכיתות",
      icon: Database,
      color: "bg-[hsl(35,35%,93%)]",
      iconColor: "text-[hsl(35,45%,42%)]",
      path: "/data-management",
    },
    {
      id: "courses",
      title: "מעקב לימודי",
      description: "מעקב מקצועות והתקדמות לימודית",
      icon: GraduationCap,
      color: "bg-[hsl(270,25%,93%)]",
      iconColor: "text-[hsl(270,35%,50%)]",
      path: "/courses",
    },
    {
      id: "calendar",
      title: "לוח שנה",
      description: "משימות, מבחנים, שיעורים ואירועים",
      icon: Calendar,
      color: "bg-[hsl(150,25%,93%)]",
      iconColor: "text-[hsl(150,35%,42%)]",
      path: "/calendar",
    },
    {
      id: "data-entry",
      title: "הזנת נתונים",
      description: "עדכון ציונים, סטטוסים והערות",
      icon: ClipboardEdit,
      color: "bg-[hsl(180,25%,92%)]",
      iconColor: "text-[hsl(180,35%,40%)]",
      path: "/data-entry",
    },
    {
      id: "reports",
      title: "דוחות וניתוח",
      description: "ניתוח נתונים ודוחות מתקדמים",
      icon: BarChart3,
      color: "bg-muted",
      iconColor: "text-muted-foreground",
      comingSoon: true,
    },
  ];

  return (
    <>
      <InsightStrip
        items={[
          { label: "סה״כ ספורטאים", value: students.length, icon: Users, color: "text-primary" },
          { label: "בסיכון", value: redCount, icon: AlertTriangle, color: "text-destructive" },
          { label: "דורשים תשומת לב", value: yellowCount, icon: Target, color: "text-[hsl(var(--warning))]" },
        ]}
      />
      <ContinueCard navigate={navigate} />
      <MainEntryButtons navigate={navigate} />
      <h2 className="text-[11.5px] font-medium text-primary/60 mb-4 tracking-tight">כלים נוספים</h2>
      <CardGrid cards={cards} navigate={navigate} />
    </>
  );
};

/* ═══ TEACHER ═══ */
const TeacherHome = () => {
  const navigate = useNavigate();
  const { data: students = [] } = useStudents();
  const redCount = students.filter((s) => s.overall_status === "red").length;

  const cards: ActionCard[] = [
    {
      id: "overview",
      title: "סקירה כללית",
      description: "דשבורד עם מבט על מצב כללי",
      icon: LayoutDashboard,
      color: "bg-primary/10",
      iconColor: "text-primary",
      path: "/dashboard",
    },
    {
      id: "courses",
      title: "מפת מצב לימודית",
      description: "סקירת מקצועות והתקדמות כללית",
      icon: GraduationCap,
      color: "bg-[hsl(270,25%,93%)]",
      iconColor: "text-[hsl(270,35%,50%)]",
      path: "/courses",
    },
    {
      id: "calendar",
      title: "לוח שנה",
      description: "ניהול משימות, מבחנים, שיעורים ואירועים",
      icon: Calendar,
      color: "bg-[hsl(150,25%,93%)]",
      iconColor: "text-[hsl(150,35%,42%)]",
      path: "/calendar",
    },
    {
      id: "data-entry",
      title: "עדכון ציונים והערות",
      description: "הזנה ועדכון נתוני ספורטאים",
      icon: ClipboardEdit,
      color: "bg-[hsl(35,35%,93%)]",
      iconColor: "text-[hsl(35,45%,42%)]",
      path: "/data-entry",
    },
    {
      id: "subject-editor",
      title: "ניהול מבנה למידה",
      description: "עריכת יחידות לימוד ומבנה קורסים",
      icon: Route,
      color: "bg-[hsl(180,25%,92%)]",
      iconColor: "text-[hsl(180,35%,40%)]",
      path: "/teacher-subjects",
    },
  ];

  return (
    <>
      <InsightStrip
        items={[
          { label: "סה״כ ספורטאים", value: students.length, icon: Users, color: "text-primary" },
          { label: "בסיכון", value: redCount, icon: AlertTriangle, color: "text-destructive" },
        ]}
      />
      <ContinueCard navigate={navigate} />
      <MainEntryButtons navigate={navigate} />
      <h2 className="text-[11.5px] font-medium text-primary/60 mb-4 tracking-tight">כלים נוספים</h2>
      <CardGrid cards={cards} navigate={navigate} />
    </>
  );
};

/* ═══ PARENT ═══ */
const ParentHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const childId = user?.scopeFilter?.[0] || "";

  const cards: ActionCard[] = [
    {
      id: "child",
      title: "הילד/ה שלי",
      description: "פרופיל, ציונים ומצב לימודי עדכני",
      icon: Heart,
      color: "bg-[hsl(350,25%,93%)]",
      iconColor: "text-[hsl(350,40%,50%)]",
      path: childId ? `/students/${childId}` : "/students",
    },
    {
      id: "roadmap",
      title: "מפת הדרך לבגרות",
      description: "התקדמות, חוסרים ושלבים הבאים",
      icon: Route,
      color: "bg-primary/10",
      iconColor: "text-primary",
      path: childId ? `/students/${childId}` : "/students",
    },
    {
      id: "status",
      title: "מצב לימודי",
      description: "ציונים, נוכחות וסטטוס לפי מקצוע",
      icon: TrendingUp,
      color: "bg-[hsl(210,40%,93%)]",
      iconColor: "text-[hsl(210,45%,48%)]",
      path: childId ? `/students/${childId}` : "/students",
    },
    {
      id: "calendar",
      title: "לוח שנה",
      description: "משימות, מבחנים ומפגשים קרובים",
      icon: Calendar,
      color: "bg-secondary",
      iconColor: "text-foreground/80",
      path: "/calendar",
    },
    {
      id: "messages",
      title: "הודעות והערות",
      description: "הערות מצוות החינוך",
      icon: MessageSquare,
      color: "bg-[hsl(270,25%,93%)]",
      iconColor: "text-[hsl(270,35%,50%)]",
      comingSoon: true,
    },
  ];

  return <CardGrid cards={cards} navigate={navigate} />;
};

/* ═══ COACH ═══ */
const CoachHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: students = [] } = useStudents();

  const mySport = user?.scopeFilter?.[0] || "";
  const myStudents = students.filter((s) => s.sport === mySport);
  const redCount = myStudents.filter((s) => s.overall_status === "red").length;

  const cards: ActionCard[] = [
    {
      id: "students",
      title: "ספורטאי הענף",
      description: `צפייה בספורטאי ${mySport || "הענף"}`,
      icon: Dumbbell,
      color: "bg-[hsl(25,35%,92%)]",
      iconColor: "text-[hsl(25,50%,45%)]",
      path: "/students",
    },
    {
      id: "status",
      title: "מצב לימודי לפי ענף",
      description: "סקירת התקדמות לימודית של הענף",
      icon: BookOpen,
      color: "bg-[hsl(210,40%,93%)]",
      iconColor: "text-[hsl(210,45%,48%)]",
      path: "/courses",
    },
    {
      id: "calendar",
      title: "לוח שנה",
      description: "צפייה וניהול אירועים, משימות ומפגשים",
      icon: Calendar,
      color: "bg-[hsl(150,25%,93%)]",
      iconColor: "text-[hsl(150,35%,42%)]",
      path: "/calendar",
    },
    {
      id: "risk",
      title: "דורשים תשומת לב",
      description: "ספורטאים עם סטטוס אדום או צהוב",
      icon: AlertTriangle,
      color: "bg-[hsl(0,35%,94%)]",
      iconColor: "text-destructive",
      path: "/students?status=red",
    },
    {
      id: "data-entry",
      title: "עדכונים",
      description: "הזנת נתונים והערות",
      icon: ClipboardEdit,
      color: "bg-primary/10",
      iconColor: "text-primary",
      path: "/data-entry",
    },
  ];

  return (
    <>
      <InsightStrip
        items={[
          {
            label: `ספורטאי ${mySport || "הענף"}`,
            value: myStudents.length,
            icon: Dumbbell,
            color: "text-[hsl(25,50%,45%)]",
          },
          { label: "בסיכון", value: redCount, icon: AlertTriangle, color: "text-destructive" },
        ]}
      />
      <ContinueCard navigate={navigate} />
      <MainEntryButtons navigate={navigate} />
      <h2 className="text-[11.5px] font-medium text-primary/60 mb-4 tracking-tight">כלים נוספים</h2>
      <CardGrid cards={cards} navigate={navigate} />
    </>
  );
};

/* ═══ STUDENT ═══ */
const StudentHome = () => {
  const navigate = useNavigate();

  const cards: ActionCard[] = [
    {
      id: "start-learning",
      title: "התחל למידה",
      description: "גישה לקורסים ומשאבי למידה",
      icon: BookOpen,
      color: "bg-[hsl(270,25%,93%)]",
      iconColor: "text-[hsl(270,35%,50%)]",
      path: "/subjects",
    },
    {
      id: "progress",
      title: "ההתקדמות שלי",
      description: "התקדמות, משימות וסטטוס לימודי",
      icon: TrendingUp,
      color: "bg-[hsl(210,40%,93%)]",
      iconColor: "text-[hsl(210,45%,48%)]",
      path: "/courses",
    },
    {
      id: "grades",
      title: "ציונים",
      description: "מבחנים, עבודות והישגים",
      icon: GraduationCap,
      color: "bg-[hsl(35,35%,93%)]",
      iconColor: "text-[hsl(35,45%,42%)]",
      path: "/students",
    },
    {
      id: "calendar",
      title: "לוח שנה",
      description: "משימות, מבחנים, שיעורים ואירועים",
      icon: Calendar,
      color: "bg-[hsl(150,25%,93%)]",
      iconColor: "text-[hsl(150,35%,42%)]",
      path: "/calendar",
    },
  ];

  return (
    <>
      <ContinueCard navigate={navigate} />
      <h2 className="text-[11.5px] font-medium text-primary/60 mb-4 tracking-tight">
        כלים מרכזיים
      </h2>
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
    student: <StudentHome />,
  };

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto">
      <section className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <WingateBadge size="md" className="shadow-[var(--shadow-card-hover)]" />
          <div>
            <h1 className="text-[17px] md:text-[21px] font-medium text-foreground tracking-tight leading-tight">
              שלום, {user?.name}
            </h1>
            <p className="text-[11px] text-muted-foreground/60 mt-1.5 font-normal">
              {user ? roleLabels[user.role] : ""} · סמסטר א׳ תשפ״ה
            </p>
          </div>
        </div>
      </section>

      <section>{user && roleContent[user.role]}</section>

      <div className="mt-16 text-center">
        <span className="text-[8.5px] text-muted-foreground/20 font-normal tracking-wider">
          האקדמיה למצוינות · מכון וינגייט
        </span>
      </div>
    </div>
  );
};

export default RoleHomePage;
