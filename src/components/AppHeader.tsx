import { Bell, Search, Menu, ChevronLeft, LogOut } from "lucide-react";
import { useAuth, roleLabels } from "@/context/AuthContext";
import type { UserRole } from "@/context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import WingateBadge from "@/components/WingateBadge";
import EditableElement from "@/components/builder/EditableElement";
import { roleTitles } from "@/lib/schoolUtils";

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

interface Crumb {
  label: string;
  path?: string;
}

const useBreadcrumbs = (role?: UserRole): { crumbs: Crumb[]; title: string } => {
  const location = useLocation();
  const path = location.pathname;
  const homeLabel = role ? roleTitles[role] : "תמונת מצב";

  if (path === "/" || path === "/student-home") return { crumbs: [], title: homeLabel };

  const crumbs: Crumb[] = [{ label: homeLabel, path: role === "student" ? "/student-home" : "/" }];
  let title = "";

  if (path.startsWith("/students")) {
    crumbs.push({ label: "ספורטאים", path: "/students" });
    title = "ספורטאים";
    if (path.match(/^\/students\/.+/)) {
      crumbs.push({ label: "פרופיל ספורטאי" });
      title = "פרופיל ספורטאי";
    }
  } else if (path.startsWith("/courses")) {
    crumbs.push({ label: "התקדמות לימודית" });
    title = "התקדמות לימודית";
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
  } else if (path.startsWith("/groups")) {
    crumbs.push({ label: "קבוצות" });
    title = "קבוצות";
  } else if (path.startsWith("/calendar")) {
    crumbs.push({ label: "לוח שנה" });
    title = "לוח שנה";
  } else if (path.startsWith("/teacher-course/")) {
    crumbs.push({ label: "קורסים", path: "/teacher-courses" });
    crumbs.push({ label: "פרטי קורס" });
    title = "פרטי קורס";
  } else if (path.startsWith("/teacher-courses")) {
    crumbs.push({ label: "הקורסים שלי" });
    title = "הקורסים שלי";
  } else if (path.startsWith("/teacher-subjects")) {
    crumbs.push({ label: "עריכת מקצועות" });
    title = "עריכת מקצועות";
  } else if (path.startsWith("/bagrut-grading")) {
    crumbs.push({ label: "ציוני בגרות" });
    title = "ציוני בגרות";
  } else if (path.startsWith("/year-plan")) {
    crumbs.push({ label: "תכנית שנתית 2026" });
    title = "תכנית שנתית 2026";
  } else if (path.startsWith("/user-activity")) {
    crumbs.push({ label: "פעילות משתמשים" });
    title = "פעילות משתמשים";
  } else if (path.startsWith("/admin/labels")) {
    crumbs.push({ label: "ניהול תוויות" });
    title = "ניהול תוויות";
  } else if (path.startsWith("/subjects")) {
    crumbs.push({ label: "מקצועות", path: "/subjects" });
    title = "מקצועות";
    if (path.match(/^\/subjects\/[^/]+\/[^/]+/)) {
      crumbs.push({ label: "חלק" });
      title = "חלק בנושא";
    } else if (path.match(/^\/subjects\/.+/)) {
      crumbs.push({ label: "נושא" });
      title = "נושא";
    }
  } else if (path.startsWith("/student-learning")) {
    crumbs.push({ label: "רמזור למידה" });
    title = "רמזור למידה";
  } else if (path.startsWith("/student-roadmap")) {
    crumbs.push({ label: "מפת הדרכים" });
    title = "מפת הדרכים";
  } else if (path.startsWith("/science-intro")) {
    crumbs.push({ label: "מדעים — מבוא" });
    title = "מדעים — מבוא";
  } else if (path.startsWith("/history-course")) {
    crumbs.push({ label: "קורס היסטוריה" });
    title = "קורס היסטוריה";
  }

  return { crumbs, title };
};

const AppHeader = ({ onMenuToggle }: AppHeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { crumbs, title } = useBreadcrumbs(user?.role);
  const isHome = location.pathname === "/" || location.pathname === "/student-home";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

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
        <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 text-center">
          <EditableElement
            id="header-page-title"
            type="page-title"
            defaultLabel={isHome ? (user ? roleTitles[user.role] : "תמונת מצב") : title}
            pageKey="global"
            hideWhenInvisible={false}
          >
            {({ label, inlineStyle }) => (
              <h1
                className="text-[14px] md:text-[15px] font-semibold text-foreground tracking-tight leading-tight"
                style={inlineStyle}
              >
                {isHome ? (user ? roleTitles[user.role] : "תמונת מצב") : title}
              </h1>
            )}
          </EditableElement>
        </div>

        {/* LEFT: Icons */}
        <div className="flex items-center gap-1">
          {user && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/60 text-[10px] font-medium text-muted-foreground me-1">
              {roleLabels[user.role]}
            </span>
          )}
          {/* Search — inactive until search backend is live */}
          <button
            className="p-2 rounded-lg text-muted-foreground/40 cursor-default"
            title="חיפוש — בקרוב"
            aria-disabled="true"
            tabIndex={-1}
          >
            <Search className="h-4 w-4" strokeWidth={1.5} />
          </button>
          {/* Bell — visible but inactive until notification backend is live */}
          <button
            className="p-2 rounded-lg text-muted-foreground/40 cursor-default"
            title="התראות — בקרוב"
            aria-disabled="true"
            tabIndex={-1}
          >
            <Bell className="h-4 w-4" strokeWidth={1.5} />
          </button>
          {user && (
            <button
              onClick={handleLogout}
              title="יציאה מהמערכת"
              aria-label="יציאה מהמערכת"
              className="ms-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-border bg-card text-foreground hover:bg-accent transition-colors duration-150"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              <span>יציאה</span>
            </button>
          )}
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
