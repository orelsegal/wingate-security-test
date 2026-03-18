import { LayoutDashboard, Users, BookOpen, BarChart3, Settings, GraduationCap } from "lucide-react";

const menuItems = [
  { title: "לוח ראשי", icon: LayoutDashboard, active: true },
  { title: "ספורטאים", icon: Users },
  { title: "קורסים", icon: BookOpen },
  { title: "ציונים", icon: GraduationCap },
  { title: "דוחות", icon: BarChart3 },
  { title: "הגדרות", icon: Settings },
];

const AppSidebar = () => {
  return (
    <aside className="w-[260px] min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-s border-sidebar-border" dir="rtl">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-lg font-semibold tracking-tight text-start">אקדמיית וינגייט</h1>
        <p className="text-sm opacity-70 mt-0.5 text-start">מעקב אקדמי</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.title}
            className={`w-full flex flex-row items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-start ${
              item.active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            }`}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            <span>{item.title}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex flex-row items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold shrink-0">
            מנ
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-start">מנהל מערכת</p>
            <p className="text-xs opacity-60 truncate text-start">admin@wingate.ac.il</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
