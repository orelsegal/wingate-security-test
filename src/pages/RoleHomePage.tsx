import { useAuth, roleLabels } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useStudents } from "@/hooks/useStudents";
import { useMemo } from "react";
import {
  LayoutDashboard, Users, Database, BarChart3, BookOpen, ClipboardEdit,
  Route, Calendar, Heart, AlertTriangle, Target, Brain, GraduationCap,
  Dumbbell, ChevronLeft, TrendingUp, MessageSquare, Bell
} from "lucide-react";
import wingateLogoSrc from "@/assets/wingate-logo.png";

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

const CardGrid = ({ cards, navigate }: { cards: ActionCard[]; navigate: (p: string) => void }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {cards.map((card) => (
      <button
        key={card.id}
        onClick={() => {
          if (card.comingSoon) return;
          if (card.external) window.open(card.external, "_blank");
          else if (card.path) navigate(card.path);
        }}
        disabled={card.comingSoon}
        className={`card-premium p-5 text-start group transition-all duration-200 ${
          card.comingSoon
            ? "opacity-50 cursor-not-allowed"
            : "hover:shadow-[0_8px_30px_-6px_hsl(150,20%,30%,0.12)] hover:-translate-y-0.5 cursor-pointer"
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center shrink-0 transition-transform duration-200 ${!card.comingSoon ? "group-hover:scale-110" : ""}`}>
            <card.icon className={`h-5 w-5 ${card.iconColor}`} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-foreground">{card.title}</h3>
              {card.comingSoon && (
                <span className="text-[9px] bg-accent px-2 py-0.5 rounded-full text-muted-foreground font-medium">בקרוב</span>
              )}
              {card.badge && (
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{card.badge}</span>
              )}
              {card.external && (
                <span className="text-[9px] text-muted-foreground/50">↗</span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{card.description}</p>
          </div>
          {!card.comingSoon && (
            <ChevronLeft className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-1 group-hover:text-foreground transition-colors" strokeWidth={1.5} />
          )}
        </div>
      </button>
    ))}
  </div>
);

const InsightStrip = ({ items }: { items: { label: string; value: string | number; icon: typeof Users; color: string }[] }) => (
  <div className={`grid gap-3 mb-6`} style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
    {items.map((item, i) => (
      <div key={i} className="card-premium p-4 text-center">
        <div className="flex items-center justify-center mb-2">
          <item.icon className={`h-4 w-4 ${item.color}`} strokeWidth={1.5} />
        </div>
        <p className="text-[22px] font-bold text-foreground">{item.value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
      </div>
    ))}
  </div>
);

/* ════════════════════════════════════════════
   ADMIN HOME
   ════════════════════════════════════════════ */
const AdminHome = () => {
  const navigate = useNavigate();
  const { data: students = [] } = useStudents();
  const redCount = students.filter(s => s.overall_status === "red").length;
  const yellowCount = students.filter(s => s.overall_status === "yellow").length;

  const cards: ActionCard[] = [
    { id: "overview", title: "סקירה כללית", description: "דשבורד עם נתונים, KPIs וסטטיסטיקות", icon: LayoutDashboard, color: "bg-[hsl(150,25%,90%)]", iconColor: "text-primary", path: "/dashboard" },
    { id: "students", title: "ספורטאים", description: "רשימת ספורטאים, פילטרים ופרופילים", icon: Users, color: "bg-[hsl(210,40%,92%)]", iconColor: "text-[hsl(210,50%,45%)]", path: "/students" },
    { id: "data-mgmt", title: "ניהול נתונים", description: "ענפי ספורט, מקצועות וכיתות", icon: Database, color: "bg-[hsl(35,40%,92%)]", iconColor: "text-[hsl(35,50%,45%)]", path: "/data-management" },
    { id: "courses", title: "סטטוס לימודי", description: "מעקב מקצועות והתקדמות לימודית", icon: BookOpen, color: "bg-[hsl(270,30%,92%)]", iconColor: "text-[hsl(270,40%,50%)]", path: "/courses" },
    { id: "data-entry", title: "הזנת נתונים", description: "עדכון ציונים, סטטוסים והערות", icon: ClipboardEdit, color: "bg-[hsl(180,30%,90%)]", iconColor: "text-[hsl(180,40%,40%)]", path: "/data-entry" },
    { id: "reports", title: "דוחות וניתוח", description: "ניתוח נתונים ודוחות מתקדמים", icon: BarChart3, color: "bg-[hsl(0,0%,93%)]", iconColor: "text-muted-foreground", comingSoon: true },
  ];

  return (
    <>
      <InsightStrip items={[
        { label: "סה״כ ספורטאים", value: students.length, icon: Users, color: "text-primary" },
        { label: "בסיכון", value: redCount, icon: AlertTriangle, color: "text-destructive" },
        { label: "דורשים תשומת לב", value: yellowCount, icon: Target, color: "text-warning" },
      ]} />
      <CardGrid cards={cards} navigate={navigate} />
    </>
  );
};

/* ════════════════════════════════════════════
   TEACHER HOME
   ════════════════════════════════════════════ */
const TeacherHome = () => {
  const navigate = useNavigate();
  const { data: students = [] } = useStudents();
  const redCount = students.filter(s => s.overall_status === "red").length;

  const cards: ActionCard[] = [
    { id: "students", title: "הספורטאים שלי", description: "צפייה בכל הספורטאים וסטטוס לימודי", icon: Users, color: "bg-[hsl(210,40%,92%)]", iconColor: "text-[hsl(210,50%,45%)]", path: "/students" },
    { id: "courses", title: "מפת מצב לימודית", description: "סקירת מקצועות והתקדמות כללית", icon: BookOpen, color: "bg-[hsl(270,30%,92%)]", iconColor: "text-[hsl(270,40%,50%)]", path: "/courses" },
    { id: "data-entry", title: "עדכון ציונים והערות", description: "הזנה ועדכון נתוני ספורטאים", icon: ClipboardEdit, color: "bg-[hsl(35,40%,92%)]", iconColor: "text-[hsl(35,50%,45%)]", path: "/data-entry" },
    { id: "overview", title: "סקירה כללית", description: "דשבורד עם מבט על מצב התלמידים", icon: LayoutDashboard, color: "bg-[hsl(150,25%,90%)]", iconColor: "text-primary", path: "/dashboard" },
  ];

  return (
    <>
      <InsightStrip items={[
        { label: "סה״כ ספורטאים", value: students.length, icon: Users, color: "text-primary" },
        { label: "בסיכון", value: redCount, icon: AlertTriangle, color: "text-destructive" },
      ]} />
      <CardGrid cards={cards} navigate={navigate} />
    </>
  );
};

/* ════════════════════════════════════════════
   PARENT HOME
   ════════════════════════════════════════════ */
const ParentHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const childId = user?.scopeFilter?.[0] || "";

  const cards: ActionCard[] = [
    { id: "child", title: "הילד/ה שלי", description: "צפייה בפרופיל, ציונים ומצב לימודי", icon: Heart, color: "bg-[hsl(350,30%,93%)]", iconColor: "text-[hsl(350,40%,50%)]", path: childId ? `/students/${childId}` : "/students" },
    { id: "roadmap", title: "מפת הדרך לבגרות", description: "התקדמות, חוסרים ושלבים הבאים", icon: Route, color: "bg-[hsl(150,25%,90%)]", iconColor: "text-primary", path: childId ? `/students/${childId}` : "/students" },
    { id: "status", title: "מצב לימודי עדכני", description: "ציונים, נוכחות וסטטוס לפי מקצוע", icon: TrendingUp, color: "bg-[hsl(210,40%,92%)]", iconColor: "text-[hsl(210,50%,45%)]", path: childId ? `/students/${childId}` : "/students" },
    { id: "schedule", title: "מערכת שעות", description: "צפייה בלוח הזמנים השבועי", icon: Calendar, color: "bg-[hsl(35,40%,92%)]", iconColor: "text-[hsl(35,50%,45%)]", external: "https://tailor-my-tutor.lovable.app" },
    { id: "messages", title: "הודעות / הערות", description: "הערות מצוות החינוך", icon: MessageSquare, color: "bg-[hsl(270,30%,92%)]", iconColor: "text-[hsl(270,40%,50%)]", comingSoon: true },
  ];

  return <CardGrid cards={cards} navigate={navigate} />;
};

/* ════════════════════════════════════════════
   COACH HOME
   ════════════════════════════════════════════ */
const CoachHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: students = [] } = useStudents();
  const mySport = user?.scopeFilter?.[0] || "";
  const myStudents = students.filter(s => s.sport === mySport);
  const redCount = myStudents.filter(s => s.overall_status === "red").length;

  const cards: ActionCard[] = [
    { id: "students", title: "הספורטאים בענף שלי", description: `צפייה בספורטאי ${mySport || "הענף"}`, icon: Dumbbell, color: "bg-[hsl(25,45%,91%)]", iconColor: "text-[hsl(25,55%,45%)]", path: "/students" },
    { id: "status", title: "מצב לימודי לפי ענף", description: "סקירת התקדמות לימודית של הענף", icon: BookOpen, color: "bg-[hsl(210,40%,92%)]", iconColor: "text-[hsl(210,50%,45%)]", path: "/courses" },
    { id: "risk", title: "תלמידים שדורשים תשומת לב", description: "ספורטאים עם סטטוס אדום או צהוב", icon: AlertTriangle, color: "bg-[hsl(0,40%,93%)]", iconColor: "text-destructive", path: "/students?status=red" },
    { id: "data-entry", title: "עדכונים", description: "הזנת נתונים והערות", icon: ClipboardEdit, color: "bg-[hsl(150,25%,90%)]", iconColor: "text-primary", path: "/data-entry" },
  ];

  return (
    <>
      <InsightStrip items={[
        { label: `ספורטאי ${mySport}`, value: myStudents.length, icon: Dumbbell, color: "text-[hsl(25,55%,45%)]" },
        { label: "בסיכון", value: redCount, icon: AlertTriangle, color: "text-destructive" },
      ]} />
      <CardGrid cards={cards} navigate={navigate} />
    </>
  );
};

/* ════════════════════════════════════════════
   MAIN ROLE HOME PAGE
   ════════════════════════════════════════════ */
const RoleHomePage = () => {
  const { user } = useAuth();

  const roleContent: Record<string, JSX.Element> = {
    admin: <AdminHome />,
    teacher: <TeacherHome />,
    parent: <ParentHome />,
    coach: <CoachHome />,
  };

  return (
    <div className="p-5 md:p-10 lg:p-12 max-w-[900px] mx-auto">
      {/* Welcome */}
      <section className="mb-6">
        <h1 className="text-[22px] md:text-[26px] font-bold text-foreground tracking-tight">
          שלום, {user?.name} 👋
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          {user ? roleLabels[user.role] : ""} · סמסטר א׳ תשפ״ה
        </p>
      </section>

      {/* Role-specific content */}
      <section>
        <h2 className="text-[15px] font-semibold text-foreground mb-4">מה תרצה לעשות?</h2>
        {user && roleContent[user.role]}
      </section>

      {/* Branding footer */}
      <div className="mt-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
          <div className="w-4 h-4 rounded-full overflow-hidden">
            <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
          </div>
          <span className="text-[11px] text-primary font-medium">האקדמיה למצוינות · מכון וינגייט</span>
        </div>
      </div>
    </div>
  );
};

export default RoleHomePage;
