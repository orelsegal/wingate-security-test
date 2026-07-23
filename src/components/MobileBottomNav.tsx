/**
 * MobileBottomNav — fixed bottom navigation bar, visible on mobile only (md:hidden).
 * Shows 4-5 role-aware shortcuts so users can navigate without opening the sidebar.
 */
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Users, CalendarDays, Layers, BookOpen, ClipboardEdit, LayoutDashboard, Gamepad2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  label: string;
  icon: typeof Home;
  path: string;
}

const navByRole: Record<string, BottomNavItem[]> = {
  admin: [
    { label: "בית",       icon: Home,         path: "/" },
    { label: "תלמידים",   icon: Users,        path: "/students" },
    { label: "קבוצות",   icon: Layers,       path: "/groups" },
    { label: "לוח שנה",  icon: CalendarDays, path: "/calendar" },
    { label: "נתונים",   icon: LayoutDashboard, path: "/data-management" },
  ],
  teacher: [
    { label: "בית",       icon: Home,         path: "/" },
    { label: "תלמידים",   icon: Users,        path: "/students" },
    { label: "הקבוצות שלי", icon: Layers,    path: "/my-groups" },
    { label: "הזנת ציונים", icon: ClipboardEdit, path: "/grade-entry" },
    { label: "לוח שנה",  icon: CalendarDays, path: "/calendar" },
  ],
  coach: [
    { label: "בית",       icon: Home,         path: "/" },
    { label: "תלמידים",   icon: Users,        path: "/students" },
    { label: "קבוצות",   icon: Layers,       path: "/groups" },
    { label: "לוח שנה",  icon: CalendarDays, path: "/calendar" },
  ],
  student: [
    { label: "בית",       icon: Home,         path: "/student-home" },
    { label: "מקצועות",  icon: BookOpen,     path: "/subjects" },
    { label: "תרגול",     icon: Gamepad2,     path: "/play" },
    { label: "לוח שנה",  icon: CalendarDays, path: "/calendar" },
  ],
  parent: [
    { label: "בית",       icon: Home,         path: "/" },
    { label: "לוח שנה",  icon: CalendarDays, path: "/calendar" },
  ],
};

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const items = navByRole[user.role] ?? navByRole.admin;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-sidebar/95 backdrop-blur-md border-t border-sidebar-border safe-area-inset-bottom animate-fade-in-up"
      dir="rtl"
      aria-label="ניווט תחתון"
    >
      <div className="flex items-stretch">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-all duration-200 active:scale-95",
                isActive
                  ? "text-primary"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center w-8 h-6 rounded-lg transition-all duration-200",
                isActive && "bg-primary/10"
              )}>
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] transition-all duration-200",
                    isActive ? "stroke-[2]" : "stroke-[1.5]"
                  )}
                />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={cn(
                "text-[9px] font-medium leading-none transition-all duration-200",
                isActive ? "text-primary font-semibold" : "text-sidebar-foreground/50"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Safe area padding for iPhone home indicator */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
};

export default MobileBottomNav;
