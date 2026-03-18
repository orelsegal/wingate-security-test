import { LayoutDashboard, Users, BookOpen, BarChart3, Settings, GraduationCap, Medal, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, roleLabels } from "@/context/AuthContext";
import wingateLogoSrc from "@/assets/wingate-logo.png";

const allMenuItems = [
  { title: "סקירה כללית", icon: LayoutDashboard, path: "/", roles: ["admin", "teacher", "parent", "coach"] },
  { title: "הספורטאים שלנו", icon: Users, path: "/students", roles: ["admin", "teacher", "coach"] },
  { title: "מקצועות לימוד", icon: BookOpen, path: "/courses", roles: ["admin", "teacher"] },
  { title: "ציונים והערכות", icon: GraduationCap, path: "/grades", roles: ["admin", "teacher"] },
  { title: "דוחות וניתוח", icon: BarChart3, path: "/reports", roles: ["admin"] },
  { title: "הגדרות מערכת", icon: Settings, path: "/settings", roles: ["admin"] },
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
    <aside className="w-[260px] min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-s border-sidebar-border relative overflow-hidden" dir="rtl">
      {/* Subtle vertical track lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
        <div className="absolute inset-y-0 start-[85px] w-px bg-sidebar-foreground" />
        <div className="absolute inset-y-0 start-[87px] w-px bg-sidebar-foreground" />
      </div>

      {/* Logo & Branding */}
      <div className="px-6 py-6 border-b border-sidebar-border relative">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sidebar-accent p-1.5 flex items-center justify-center shrink-0">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold tracking-tight text-start leading-tight text-sidebar-foreground">האקדמיה למצוינות</h1>
            <p className="text-[12px] text-sidebar-muted mt-0.5 text-start">מכון וינגייט</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-5 space-y-0.5 relative">
        <p className="text-[11px] font-medium text-sidebar-muted/50 tracking-wider px-4 mb-3">תפריט</p>
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.title}
              onClick={() => { navigate(item.path); onNavigate?.(); }}
              className={`w-full flex flex-row items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 text-start ${
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-sidebar-primary" : ""}`} strokeWidth={1.8} />
              <span>{item.title}</span>
            </button>
          );
        })}
      </nav>

      {/* Semester */}
      <div className="px-5 pb-3 relative">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sidebar-accent/60 text-[12px] text-sidebar-muted">
          <Medal className="h-3.5 w-3.5 shrink-0 text-sidebar-primary/60" />
          <span>סמסטר א׳ תשפ״ה</span>
        </div>
      </div>

      {/* User */}
      <div className="px-5 py-5 border-t border-sidebar-border relative">
        <div className="flex flex-row items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-[13px] font-semibold text-sidebar-primary shrink-0">
            {user?.name.split(" ").map(n => n[0]).join("") || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate text-start text-sidebar-foreground">{user?.name}</p>
            <p className="text-[11px] text-sidebar-muted truncate text-start">
              {user ? roleLabels[user.role] : ""}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-sidebar-muted/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-150"
            title="התנתק"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
