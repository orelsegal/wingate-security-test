import { useAuth, roleLabels } from "@/context/AuthContext";
import type { UserRole } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useStudents } from "@/hooks/useStudents";
import { useMemo } from "react";
import {
  LayoutDashboard, Users, Database, BarChart3, BookOpen, ClipboardEdit,
  Route, Calendar, Heart, AlertTriangle, Target, TrendingUp, MessageSquare,
  Dumbbell, ChevronLeft,
} from "lucide-react";
import wingateLogoSrc from "@/assets/wingate-logo.png";
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
        }`}
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

/* ═══ ADMIN ═══ */
const AdminHome = () => {
  const navigate = useNavigate();
  const { data: students = [] } = useStudents();
  const redCount = students.filter((s) => s.overall_status === "red").length;
  const yellowCount = students.filter((s) => s.overall_status === "yellow").length;

  const cards: ActionCard[] = [
    { id: "overview", title: "דשבורד ניהולי", description: "נתונים, KPIs וסטטיסטיקות כלליות", icon: LayoutDashboard, color: "bg-primary/10", iconColor: "text-primary", path: "/dashboard" },
    { id: "students", title: "ניהול ספורטאים", description: "רשימת ספורטאים, פילטרים ופרופילים", icon: Users, color: "bg-[hsl(210,40%,93%)]", iconColor: "text-[hsl(210,45%,48%)]", path: "/students" },
    { id: "data-mgmt", title: "ניהול מערכת", description: "ענפי ספורט, מקצועות וכיתות", icon: Database, color: "bg-[hsl(35,35%,93%)]", iconColor: "text-[hsl(35,45%,42%)]", path: "/data-management" },
    { id: "courses", title: "מעקב לימודי", description: "מעקב מקצועות והתקדמות לימודית", icon: BookOpen, color: "bg-[hsl(270,25%,93%)]", iconColor: "text-[hsl(270,35%,50%)]", path: "/courses" },
    { id: "data-entry", title: "הזנת נתונים", description: "עדכון ציונים, סטטוסים והערות", icon: ClipboardEdit, color: "bg-[hsl(180,25%,92%)]", iconColor: "text-[hsl(180,35%,40%)]", path: "/data-entry" },
    { id: "reports", title: "דוחות וניתוח", description: "ניתוח נתונים ודוחות מתקדמים", icon: BarChart3, color: "bg-muted", iconColor: "text-muted-foreground", comingSoon: true },
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
    { id: "students", title: "הספורטאים שלי", description: "צפייה בכל הספורטאים וסטטוס לימודי", icon: Users, color: "bg-[hsl(210,40%,93%)]", iconColor: "text-[hsl(210,45%,48%)]", path: "/students" },
    { id: "courses", title: "מפת מצב לימודית", description: "סקירת מקצועות והתקדמות כללית", icon: BookOpen, color: "bg-[hsl(270,25%,93%)]", iconColor: "text-[hsl(270,35%,50%)]", path: "/courses" },
    { id: "data-entry", title: "עדכון ציונים והערות", description: "הזנה ועדכון נתוני ספורטאים", icon: ClipboardEdit, color: "bg-[hsl(35,35%,93%)]", iconColor: "text-[hsl(35,45%,42%)]", path: "/data-entry" },
    { id: "overview", title: "סקירה כללית", description: "דשבורד עם מבט על מצב כללי", icon: LayoutDashboard, color: "bg-primary/10", iconColor: "text-primary", path: "/dashboard" },
  ];

  return (
    <>
      <InsightStrip
        items={[
          { label: "סה״כ ספורטאים", value: students.length, icon: Users, color: "text-primary" },
          { label: "בסיכון", value: redCount, icon: AlertTriangle, color: "text-destructive" },
        ]}
      />
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
    { id: "child", title: "הילד/ה שלי", description: "פרופיל, ציונים ומצב לימודי עדכני", icon: Heart, color: "bg-[hsl(350,25%,93%)]", iconColor: "text-[hsl(350,40%,50%)]", path: childId ? `/students/${childId}` : "/students" },
    { id: "roadmap", title: "מפת הדרך לבגרות", description: "התקדמות, חוסרים ושלבים הבאים", icon: Route, color: "bg-primary/10", iconColor: "text-primary", path: childId ? `/students/${childId}` : "/students" },
    { id: "status", title: "מצב לימודי", description: "ציונים, נוכחות וסטטוס לפי מקצוע", icon: TrendingUp, color: "bg-[hsl(210,40%,93%)]", iconColor: "text-[hsl(210,45%,48%)]", path: childId ? `/students/${childId}` : "/students" },
    { id: "schedule", title: "מערכת שעות", description: "צפייה בלוח הזמנים השבועי", icon: Calendar, color: "bg-[hsl(35,35%,93%)]", iconColor: "text-[hsl(35,45%,42%)]", external: "https://tailor-my-tutor.lovable.app" },
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
  const myStudents = students.filter((s) => s.sport === mySport);
  const redCount = myStudents.filter((s) => s.overall_status === "red").length;

  const cards: ActionCard[] = [
    { id: "students", title: "ספורטאי הענף", description: `צפייה בספורטאי ${mySport || "הענף"}`, icon: Dumbbell, color: "bg-[hsl(25,35%,92%)]", iconColor: "text-[hsl(25,50%,45%)]", path: "/students" },
    { id: "status", title: "מצב לימודי לפי ענף", description: "סקירת התקדמות לימודית של הענף", icon: BookOpen, color: "bg-[hsl(210,40%,93%)]", iconColor: "text-[hsl(210,45%,48%)]", path: "/courses" },
    { id: "risk", title: "דורשים תשומת לב", description: "ספורטאים עם סטטוס אדום או צהוב", icon: AlertTriangle, color: "bg-[hsl(0,35%,94%)]", iconColor: "text-destructive", path: "/students?status=red" },
    { id: "data-entry", title: "עדכונים", description: "הזנת נתונים והערות", icon: ClipboardEdit, color: "bg-primary/10", iconColor: "text-primary", path: "/data-entry" },
  ];

  return (
    <>
      <InsightStrip
        items={[
          { label: `ספורטאי ${mySport}`, value: myStudents.length, icon: Dumbbell, color: "text-[hsl(25,50%,45%)]" },
          { label: "בסיכון", value: redCount, icon: AlertTriangle, color: "text-destructive" },
        ]}
      />
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

  const title = user ? roleTitles[user.role] : "עמוד הבית";

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto">
      {/* Welcome */}
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
            <div
              className="mt-3 h-[1.5px] w-[72px] rounded-full"
              style={{ background: "linear-gradient(to left, transparent, hsl(var(--primary-soft) / 0.5), transparent)" }}
            />
          </div>
        </div>
      </section>

      {/* Section heading */}
      <section>
        <h2 className="text-[11.5px] font-medium text-primary/60 mb-5 tracking-tight">{title}</h2>
        {user && roleContent[user.role]}
      </section>

      {/* Branding */}
      <div className="mt-14 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/[0.04] border border-primary/[0.08]">
          <div className="w-4 h-4 rounded-full overflow-hidden">
            <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
          </div>
          <span className="text-[10.5px] text-primary/70 font-medium">האקדמיה למצוינות · מכון וינגייט</span>
        </div>
      </div>
    </div>
  );
};

export default RoleHomePage;
