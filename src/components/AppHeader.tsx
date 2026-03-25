import { Bell, Search, Menu, ChevronLeft, UserCircle } from "lucide-react";
import { useAuth, roleLabels, mockUsers } from "@/context/AuthContext";
import type { UserRole, AppUser } from "@/context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import WingateBadge from "@/components/WingateBadge";
import { useState, useRef, useEffect } from "react";
import InitialsAvatar from "@/components/InitialsAvatar";

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

interface Crumb {
  label: string;
  path?: string;
}

const roleTitles: Record<UserRole, string> = {
  admin: "מרכז ניהול",
  teacher: "מרכז עבודה",
  student: "המרחב שלי",
  parent: "התקדמות הילד/ה",
  coach: "מרכז המאמן",
};

const useBreadcrumbs = (role?: UserRole): { crumbs: Crumb[]; title: string } => {
  const location = useLocation();
  const path = location.pathname;
  const homeLabel = role ? roleTitles[role] : "עמוד הבית";

  if (path === "/" || path === "/student-home") return { crumbs: [], title: homeLabel };

  const crumbs: Crumb[] = [{ label: homeLabel, path: role === "student" ? "/student-home" : "/" }];
  let title = "";

  if (path.startsWith("/students")) {
    crumbs.push({ label: "ניהול ספורטאים", path: "/students" });
    title = "ניהול ספורטאים";
    if (path.match(/^\/students\/.+/)) {
      crumbs.push({ label: "פרופיל ספורטאי" });
      title = "פרופיל ספורטאי";
    }
  } else if (path.startsWith("/courses")) {
    crumbs.push({ label: "מעקב לימודי" });
    title = "מעקב לימודי";
  } else if (path.startsWith("/data-entry")) {
    crumbs.push({ label: "הזנת נתונים" });
    title = "הזנת נתונים";
  } else if (path.startsWith("/data-management")) {
    crumbs.push({ label: "ניהול מערכת" });
    title = "ניהול מערכת";
  } else if (path.startsWith("/dashboard")) {
    crumbs.push({ label: "דשבורד ניהולי" });
    title = "דשבורד ניהולי";
  } else if (path.startsWith("/reports")) {
    crumbs.push({ label: "דוחות וניתוח" });
    title = "דוחות וניתוח";
  } else if (path.startsWith("/external")) {
    const params = new URLSearchParams(location.search);
    const type = params.get("type") || "smartbase";
    const labels: Record<string, string> = { smartbase: "סמארטבייס", learning: "התחל למידה" };
    const label = labels[type] || "תוכן חיצוני";
    crumbs.push({ label });
    title = label;
  }

  return { crumbs, title };
};

const roleHomeMap: Record<string, string> = {
  admin: "/admin-dashboard",
  teacher: "/teacher-home",
  student: "/student-home",
  parent: "/",
  coach: "/",
};

const ProfileSwitcher = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const switchTo = (u: AppUser) => {
    login(u);
    setOpen(false);
    navigate(roleHomeMap[u.role] || "/");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-accent transition-colors duration-150"
      >
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
          {user?.name?.charAt(0) || "?"}
        </div>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-48 bg-card rounded-xl border border-border shadow-lg z-50 overflow-hidden animate-fade-in" dir="rtl">
          <div className="p-2.5 border-b border-border/50">
            <p className="text-[11px] font-semibold text-foreground">{user?.name}</p>
            <p className="text-[9.5px] text-muted-foreground">{user ? roleLabels[user.role] : ""}</p>
          </div>
          <div className="p-1.5">
            <p className="text-[9px] text-muted-foreground/60 px-2 py-1 font-medium">החלף פרופיל</p>
            {mockUsers.map((mu) => (
              <button
                key={mu.email}
                onClick={() => switchTo(mu)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-start transition-colors duration-150 ${
                  user?.email === mu.email ? "bg-primary/8 text-primary" : "hover:bg-accent text-foreground"
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                  {mu.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium leading-tight truncate">{mu.name}</p>
                  <p className="text-[9px] text-muted-foreground">{roleLabels[mu.role]}</p>
                </div>
                {user?.email === mu.email && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AppHeader = ({ onMenuToggle }: AppHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { crumbs, title } = useBreadcrumbs(user?.role);
  const isHome = location.pathname === "/" || location.pathname === "/student-home";

  return (
    <header className="h-auto bg-card border-b border-border sticky top-0 z-10" dir="rtl">
      <div className="h-[56px] flex items-center justify-between px-4 md:px-7">
        {/* RIGHT: Logo + Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(user?.role === "student" ? "/student-home" : "/")}
            className="group"
          >
            <WingateBadge size="sm" className="transition-all group-hover:border-primary/30 group-hover:shadow-[var(--shadow-card-hover)]" />
          </button>
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150 md:hidden"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* CENTER: Page title */}
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-[14px] md:text-[15px] font-semibold text-foreground tracking-tight leading-tight">
            {isHome ? (user ? roleTitles[user.role] : "עמוד הבית") : title}
          </h1>
        </div>

        {/* LEFT: Icons + Profile Switcher */}
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150">
            <Search className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150 relative">
            <Bell className="h-4 w-4" strokeWidth={1.5} />
            <span className="absolute top-1.5 start-1.5 w-[6px] h-[6px] bg-primary rounded-full ring-2 ring-card" />
          </button>
          <ProfileSwitcher />
        </div>
      </div>

      {/* Breadcrumbs row */}
      {crumbs.length > 0 && (
        <div className="h-[28px] flex items-center px-4 md:px-7 border-t border-border/40 bg-accent/15">
          <nav className="flex items-center gap-1 text-[11px]">
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronLeft className="h-2.5 w-2.5 text-muted-foreground/25 shrink-0" strokeWidth={1.5} />}
                  {isLast || !crumb.path ? (
                    <span className={isLast ? "text-foreground font-medium" : "text-muted-foreground"}>
                      {crumb.label}
                    </span>
                  ) : (
                    <button
                      onClick={() => navigate(crumb.path!)}
                      className="text-muted-foreground hover:text-foreground transition-colors duration-150"
                    >
                      {crumb.label}
                    </button>
                  )}
                </span>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};

export default AppHeader;
