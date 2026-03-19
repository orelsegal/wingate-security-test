import { Bell, Search, Menu, ChevronLeft } from "lucide-react";
import { useAuth, roleLabels } from "@/context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import wingateLogoSrc from "@/assets/wingate-logo.png";

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

interface Crumb {
  label: string;
  path?: string;
}

const pageTitles: Record<string, string> = {
  "/": "סקירה כללית",
  "/students": "הספורטאים שלנו",
  "/courses": "מקצועות לימוד",
  "/data-entry": "הזנת נתונים",
  "/reports": "דוחות וניתוח",
  "/settings": "הגדרות מערכת",
};

const useBreadcrumbs = (): { crumbs: Crumb[]; title: string } => {
  const location = useLocation();
  const path = location.pathname;

  if (path === "/") return { crumbs: [], title: "סקירה כללית" };

  const crumbs: Crumb[] = [{ label: "דשבורד", path: "/" }];
  let title = "";

  if (path.startsWith("/students")) {
    crumbs.push({ label: "ספורטאים", path: "/students" });
    title = "ספורטאים";
    const match = path.match(/^\/students\/(.+)/);
    if (match) {
      crumbs.push({ label: "פרופיל ספורטאי" });
      title = "פרופיל ספורטאי";
    }
  } else if (path.startsWith("/courses")) {
    crumbs.push({ label: "מקצועות לימוד" });
    title = "מקצועות לימוד";
  } else if (path.startsWith("/data-entry")) {
    crumbs.push({ label: "הזנת נתונים" });
    title = "הזנת נתונים";
  } else if (path.startsWith("/reports")) {
    crumbs.push({ label: "דוחות וניתוח" });
    title = "דוחות וניתוח";
  } else if (path.startsWith("/settings")) {
    crumbs.push({ label: "הגדרות מערכת" });
    title = "הגדרות מערכת";
  }

  return { crumbs, title: title || pageTitles[path] || "" };
};

const AppHeader = ({ onMenuToggle }: AppHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { crumbs, title } = useBreadcrumbs();
  const isHome = location.pathname === "/";

  return (
    <header className="h-auto bg-card border-b border-border sticky top-0 z-10" dir="rtl">
      <div className="h-[52px] flex items-center justify-between px-4 md:px-7">
        {/* RIGHT: Logo + Menu */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-border p-1 transition-all group-hover:border-primary/30">
              <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain" />
            </div>
            <span className="hidden md:inline text-[12px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              וינגייט
            </span>
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
          <h1 className="text-[14px] md:text-[15px] font-bold text-foreground tracking-tight leading-tight">
            {isHome ? "סקירה כללית" : title}
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
        <div className="h-[28px] flex items-center px-4 md:px-7 border-t border-border/50 bg-accent/20">
          <nav className="flex items-center gap-1 text-[11px]">
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronLeft className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" strokeWidth={1.5} />}
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
