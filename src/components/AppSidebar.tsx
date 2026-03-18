import { LayoutDashboard, Users, BookOpen, BarChart3, Settings, GraduationCap, Trophy, Medal, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, roleLabels } from "@/context/AuthContext";
import wingateLogoSrc from "@/assets/wingate-logo.png";

const allMenuItems = [
  { title: "לוח ראשי", icon: LayoutDashboard, path: "/", roles: ["admin", "teacher", "parent", "coach"] },
  { title: "ספורטאים", icon: Users, path: "/students", roles: ["admin", "teacher", "coach"] },
  { title: "קורסים", icon: BookOpen, path: "/courses", roles: ["admin", "teacher"] },
  { title: "ציונים", icon: GraduationCap, path: "/grades", roles: ["admin", "teacher"] },
  { title: "דוחות", icon: BarChart3, path: "/reports", roles: ["admin"] },
  { title: "הגדרות", icon: Settings, path: "/settings", roles: ["admin"] },
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
    <aside className="w-[260px] min-h-screen bg-sidebar text-sidebar-foreground flex flex-col" dir="rtl">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-card p-1.5 flex items-center justify-center shrink-0 border border-sidebar-border">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain rounded-sm" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold tracking-tight text-start leading-tight">האקדמיה למצוינות</h1>
            <p className="text-[12px] opacity-50 mt-0.5 text-start flex items-center gap-1">
              <Trophy className="h-3 w-3 inline" />
              מכון וינגייט
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-5 space-y-0.5">
        <p className="text-[11px] font-medium text-sidebar-foreground/40 uppercase tracking-wider px-4 mb-2">ניווט ראשי</p>
        {menuItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.title}
              onClick={() => { navigate(item.path); onNavigate?.(); }}
              className={`w-full flex flex-row items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 text-start ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              <span>{item.title}</span>
            </button>
          );
        })}
      </nav>

      {/* Semester */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sidebar-accent/30 text-[12px] text-sidebar-foreground/60">
          <Medal className="h-3.5 w-3.5 shrink-0" />
          <span>סמסטר א׳ תשפ״ה</span>
        </div>
      </div>

      {/* User + Logout */}
      <div className="px-5 py-5 border-t border-sidebar-border">
        <div className="flex flex-row items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-[13px] font-semibold shrink-0">
            {user?.name.split(" ").map(n => n[0]).join("") || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate text-start">{user?.name}</p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate text-start">
              {user ? roleLabels[user.role] : ""}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-150"
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
