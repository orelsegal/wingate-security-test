import { Bell, Search, Menu, ChevronLeft, ArrowRight } from "lucide-react";
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

const useBreadcrumbs = (): Crumb[] => {
  const location = useLocation();
  const path = location.pathname;

  // On home page, no breadcrumbs needed
  if (path === "/") return [];

  const crumbs: Crumb[] = [{ label: "דשבורד", path: "/" }];

  if (path.startsWith("/students")) {
    crumbs.push({ label: "ספורטאים", path: "/students" });
    const match = path.match(/^\/students\/(.+)/);
    if (match) {
      crumbs.push({ label: "פרופיל ספורטאי" });
    }
  } else if (path.startsWith("/courses")) {
    crumbs.push({ label: "מקצועות לימוד" });
  } else if (path.startsWith("/grades")) {
    crumbs.push({ label: "ציונים והערכות" });
  } else if (path.startsWith("/reports")) {
    crumbs.push({ label: "דוחות וניתוח" });
  } else if (path.startsWith("/settings")) {
    crumbs.push({ label: "הגדרות מערכת" });
  }

  return crumbs;
};

const AppHeader = ({ onMenuToggle }: AppHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const crumbs = useBreadcrumbs();
  const isInnerPage = location.pathname !== "/";

  return (
    <header className="h-[50px] bg-card border-b border-border flex items-center justify-between px-5 md:px-7 sticky top-0 z-10">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onMenuToggle}
          className="p-2 -me-1 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150 md:hidden"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="w-5 h-5 rounded overflow-hidden md:hidden shrink-0">
          <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
        </div>

        {/* Breadcrumbs — only on inner pages */}
        {crumbs.length > 0 && (
          <nav className="hidden md:flex items-center gap-1 text-[12px]" dir="rtl">
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronLeft className="h-3 w-3 text-muted-foreground/25 shrink-0" strokeWidth={1.5} />}
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
        )}

        {/* Mobile: show current page name only on inner pages */}
        {isInnerPage && crumbs.length > 0 && (
          <span className="md:hidden text-[13px] font-medium text-foreground">
            {crumbs[crumbs.length - 1].label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {isInnerPage && (
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 me-1"
          >
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>חזרה</span>
          </button>
        )}
        {user && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/60 text-[11px] font-medium text-muted-foreground me-1">
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
    </header>
  );
};

export default AppHeader;
