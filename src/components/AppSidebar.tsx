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
    <aside className="w-[260px] min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-s border-sidebar-border" dir="rtl">
      {/* Logo & Branding */}
      <button onClick={() => { navigate("/"); onNavigate?.(); }} className="px-6 pt-7 pb-6 w-full text-start group cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-card border border-sidebar-border p-1.5 flex items-center justify-center shrink-0 transition-opacity duration-150 group-hover:opacity-75">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[14px] font-semibold tracking-tight text-start leading-tight text-sidebar-foreground">האקדמיה למצוינות</h1>
            <p className="text-[11px] text-sidebar-muted mt-0.5 text-start">מכון וינגייט</p>
          </div>
        </div>
      </button>

      {/* Divider */}
      <div className="mx-5 h-px bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-4 pt-6 pb-4">
        <p className="text-[10px] font-semibold text-sidebar-muted/60 tracking-widest uppercase px-3 mb-4">תפריט</p>
        <div className="space-y-1">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.title}
                onClick={() => { navigate(item.path); onNavigate?.(); }}
                className={`w-full flex flex-row items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150 text-start ${
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground font-medium"
                }`}
              >
                <item.icon className={`h-[17px] w-[17px] shrink-0 ${active ? "text-primary" : "text-sidebar-muted"}`} strokeWidth={1.5} />
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Semester */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-sidebar-muted">
          <Medal className="h-3.5 w-3.5 shrink-0 text-sidebar-muted/50" strokeWidth={1.5} />
          <span>סמסטר א׳ תשפ״ה</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-sidebar-border" />

      {/* User */}
      <div className="px-5 py-5">
        <div className="flex flex-row items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-[12px] font-semibold text-primary shrink-0">
            {user?.name.split(" ").map(n => n[0]).join("") || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate text-start text-sidebar-foreground">{user?.name}</p>
            <p className="text-[10px] text-sidebar-muted truncate text-start">
              {user ? roleLabels[user.role] : ""}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-sidebar-muted/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-150"
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
