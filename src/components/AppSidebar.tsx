import { LayoutDashboard, Users, BookOpen, BarChart3, Settings, GraduationCap } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const menuItems = [
  { title: "לוח ראשי", icon: LayoutDashboard, path: "/" },
  { title: "ספורטאים", icon: Users, path: "/students" },
  { title: "קורסים", icon: BookOpen, path: "/courses" },
  { title: "ציונים", icon: GraduationCap, path: "/grades" },
  { title: "דוחות", icon: BarChart3, path: "/reports" },
  { title: "הגדרות", icon: Settings, path: "/settings" },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

const AppSidebar = ({ onNavigate }: AppSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-[260px] min-h-screen bg-sidebar text-sidebar-foreground flex flex-col" dir="rtl">
      <div className="px-7 py-7 border-b border-sidebar-border">
        <h1 className="text-[17px] font-semibold tracking-tight text-start">אקדמיית וינגייט</h1>
        <p className="text-[13px] opacity-60 mt-1 text-start">מעקב אקדמי</p>
      </div>

      <nav className="flex-1 p-5 space-y-0.5">
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

      <div className="px-5 py-5 border-t border-sidebar-border">
        <div className="flex flex-row items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-[13px] font-semibold shrink-0">
            מנ
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate text-start">מנהל מערכת</p>
            <p className="text-[12px] opacity-50 truncate text-start">admin@wingate.ac.il</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
