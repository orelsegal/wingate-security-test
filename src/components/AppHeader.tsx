import { Bell, Search, Menu, ChevronLeft, ArrowRight } from "lucide-react";
import { useAuth, roleLabels } from "@/context/AuthContext";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { studentsData } from "@/lib/studentData";
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

  const crumbs: Crumb[] = [{ label: "דשבורד", path: "/" }];

  if (path.startsWith("/students")) {
    crumbs.push({ label: "ספורטאים", path: "/students" });

    const match = path.match(/^\/students\/(\d+)/);
    if (match) {
      const student = studentsData.find(s => s.id === match[1]);
      crumbs.push({ label: student?.name ?? "פרופיל" });
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
    <header className="h-[56px] bg-card border-b border-border flex items-center justify-between px-5 md:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 -me-1 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        {/* Small logo in header on mobile */}
        <div className="w-7 h-7 rounded-lg overflow-hidden md:hidden shrink-0">
          <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
        </div>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-[13px]" dir="rtl">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronLeft className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
                {isLast || !crumb.path ? (
                  <span className={`${isLast ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
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

      <div className="flex items-center gap-2">
        {user && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-[12px] font-medium text-muted-foreground me-1">
            {roleLabels[user.role]}
          </span>
        )}
        <button className="p-2.5 rounded-xl text-muted-foreground hover:bg-accent transition-colors duration-150">
          <Search className="h-[18px] w-[18px]" />
        </button>
        <button className="p-2.5 rounded-xl text-muted-foreground hover:bg-accent transition-colors duration-150 relative">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute top-2 start-2 w-[7px] h-[7px] bg-primary rounded-full ring-2 ring-card" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
