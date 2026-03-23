import { LayoutDashboard, Users, BookOpen, ClipboardEdit, Medal, LogOut, Database, Home, Layers, CalendarDays } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, roleLabels } from "@/context/AuthContext";
import type { UserRole } from "@/context/AuthContext";
import wingateLogoSrc from "@/assets/wingate-logo.png";

const roleTitles: Record<UserRole, string> = {
  admin: "מרכז ניהול",
  teacher: "מרכז עבודה",
  student: "המרחב שלי",
  parent: "התקדמות הילד/ה",
  coach: "מרכז המאמן",
};

const allMenuItems = [
  { title: "עמוד הבית", icon: Home, path: "/", roles: ["admin", "teacher", "parent", "coach"] },
  { title: "עמוד הבית", icon: Home, path: "/student-home", roles: ["student"] },
  { title: "דשבורד ניהולי", icon: LayoutDashboard, path: "/dashboard", roles: ["admin", "teacher"] },
  { title: "ניהול ספורטאים", icon: Users, path: "/students", roles: ["admin", "teacher", "coach"] },
  { title: "קבוצות", icon: Layers, path: "/groups", roles: ["admin", "teacher", "coach"] },
  { title: "מעקב לימודי", icon: BookOpen, path: "/courses", roles: ["admin", "teacher"] },
  { title: "הזנת נתונים", icon: ClipboardEdit, path: "/data-entry", roles: ["admin", "teacher", "coach"] },
  { title: "לוח שנה", icon: CalendarDays, path: "/calendar", roles: ["admin", "teacher", "coach", "student", "parent"] },
  { title: "ניהול מערכת", icon: Database, path: "/data-management", roles: ["admin"] },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

const AppSidebar = ({ onNavigate }: AppSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = allMenuItems.filter((item) => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-[256px] min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-s border-sidebar-border" dir="rtl">
      {/* Logo & Branding */}
      <button onClick={() => { navigate(user?.role === "student" ? "/student-home" : "/"); onNavigate?.(); }} className="px-6 pt-6 pb-5 w-full text-start group cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-card border border-sidebar-border p-1.5 flex items-center justify-center shrink-0 transition-opacity duration-150 group-hover:opacity-75">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[13px] font-semibold tracking-tight text-start leading-tight text-sidebar-foreground">האקדמיה למצוינות</h1>
            <p className="text-[10px] text-sidebar-muted mt-0.5 text-start">מכון וינגייט</p>
          </div>
        </div>
      </button>

      <div className="mx-5 h-px bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-3.5 pt-5 pb-4">
        <p className="text-[9px] font-semibold text-sidebar-muted/40 tracking-[0.12em] uppercase px-3 mb-3">
          {user ? roleTitles[user.role] : "תפריט"}
        </p>
        <div className="space-y-0.5">
          {menuItems.map((item) => {
            const active = location.pathname === item.path || (item.path !== "/" && item.path !== "/student-home" && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.title + item.path}
                onClick={() => { navigate(item.path); onNavigate?.(); }}
                className={`w-full flex flex-row items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] transition-all duration-150 text-start ${
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground font-medium"
                }`}
              >
                <item.icon className={`h-[15px] w-[15px] shrink-0 ${active ? "text-primary" : "text-sidebar-muted"}`} strokeWidth={1.5} />
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Semester */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] text-sidebar-muted/60">
          <Medal className="h-3.5 w-3.5 shrink-0 text-sidebar-muted/35" strokeWidth={1.5} />
          <span>סמסטר א׳ תשפ״ה</span>
        </div>
      </div>

      <div className="mx-5 h-px bg-sidebar-border" />

      {/* User */}
      <div className="px-4 py-4">
        <div className="flex flex-row items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-[11px] font-semibold text-primary shrink-0">
            {user?.name.split(" ").map(n => n[0]).join("") || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate text-start text-sidebar-foreground">{user?.name}</p>
            <p className="text-[10px] text-sidebar-muted truncate text-start">
              {user ? roleLabels[user.role] : ""}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-sidebar-muted/35 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-150"
            title="התנתק"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
