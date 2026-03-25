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

        {/* LEFT: Icons */}
        <div className="flex items-center gap-1">
          {user && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/60 text-[10px] font-medium text-muted-foreground me-1">
              {roleLabels[user.role]}
            </span>
          )}
          <button className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150">
            <Search className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150 relative">
            <Bell className="h-4 w-4" strokeWidth={1.5} />
            <span className="absolute top-1.5 start-1.5 w-[6px] h-[6px] bg-primary rounded-full ring-2 ring-card" />
          </button>
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
