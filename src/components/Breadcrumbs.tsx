import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, Home } from "lucide-react";

type Crumb = { label: string; to?: string };

// Trails per route. First crumb is always the contextual hub.
// Use functions to support dynamic segments.
const buildTrail = (
  pathname: string,
  params: Record<string, string | undefined>,
  search: URLSearchParams
): Crumb[] => {
  const p = pathname;

  // Admin hub pages
  const adminHub: Crumb = { label: "מרכז ניהול", to: "/dashboard" };
  const roadmapsHub: Crumb = { label: "מפות דרכים", to: "/roadmaps" };

  if (p === "/" || p === "/dashboard") return [{ label: "מרכז ניהול" }];
  if (p === "/students") return [adminHub, { label: "ספורטאים" }];
  if (p.startsWith("/students/")) return [adminHub, { label: "ספורטאים", to: "/students" }, { label: "פרופיל ספורטאי" }];
  if (p === "/courses") return [adminHub, { label: "התקדמות לימודית" }];
  if (p === "/data-entry") return [adminHub, { label: "הזנת נתונים" }];
  if (p === "/grade-entry") return [adminHub, { label: "הזנת ציונים" }];
  if (p === "/data-management") return [adminHub, { label: "ניהול מערכת" }];
  if (p === "/groups") return [adminHub, { label: "קבוצות" }];
  if (p === "/calendar") return [adminHub, { label: "לוח שנה" }];
  if (p === "/user-activity") return [adminHub, { label: "פעילות משתמשים" }];
  if (p === "/year-plan-2026") return [adminHub, { label: "שנת 2026" }];
  if (p === "/admin/labels") return [adminHub, { label: "עורך תוויות" }];
  if (p === "/roadmaps") return [adminHub, { label: "מפות דרכים" }];
  if (p === "/roadmaps/math") return [adminHub, roadmapsHub, { label: "מתמטיקה — יחידות לימוד" }];

  // Subject view (student-facing)
  if (p.startsWith("/subjects/") && params.partId) {
    const subject = decodeURIComponent(params.subjectName || "");
    return [
      adminHub, roadmapsHub,
      { label: subject, to: `/subjects/${encodeURIComponent(subject)}` },
      { label: "יחידת לימוד" },
    ];
  }
  if (p.startsWith("/subjects/")) {
    const subject = decodeURIComponent(params.subjectName || "");
    return [adminHub, roadmapsHub, { label: `צפיית תלמיד — ${subject}` }];
  }
  if (p === "/subjects") return [adminHub, { label: "מקצועות" }];

  // Teacher subject editor
  if (p === "/teacher-subjects") {
    const subject = search.get("subject");
    return [
      adminHub,
      roadmapsHub,
      { label: "ניהול מבנה למידה" },
      ...(subject ? [{ label: `עריכת ${subject}` }] : []),
    ];
  }

  if (p === "/teacher-courses") return [adminHub, { label: "המקצועות שלי" }];
  if (p.startsWith("/teacher-course/")) return [adminHub, { label: "המקצועות שלי", to: "/teacher-courses" }, { label: "ניהול מקצוע" }];
  if (p === "/bagrut-grading") return [adminHub, { label: "ציוני בגרות" }];
  if (p === "/history-course") return [adminHub, roadmapsHub, { label: "היסטוריה" }];
  if (p === "/science-intro") return [adminHub, roadmapsHub, { label: "מבוא למדעים" }];
  if (p === "/external") return [adminHub, { label: "תוכן חיצוני" }];

  // Student-facing
  if (p === "/student-home") return [{ label: "המרחב שלי" }];
  if (p === "/student-learning") return [{ label: "המרחב שלי", to: "/student-home" }, { label: "ההתקדמות שלי" }];
  if (p === "/student-roadmap") return [{ label: "המרחב שלי", to: "/student-home" }, { label: "מפת הדרכים שלי" }];

  return [];
};

const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const params = useParams();
  const [search] = useSearchParams();

  const trail = buildTrail(pathname, params as Record<string, string | undefined>, search);
  if (trail.length === 0) return null;

  return (
    <nav
      aria-label="ניווט נתיב"
      dir="rtl"
      className="w-full border-b border-border/40 bg-background/60 backdrop-blur-sm"
    >
      <ol className="max-w-[1400px] mx-auto flex items-center flex-wrap gap-x-1 gap-y-1 px-5 md:px-8 py-2.5 text-[11.5px] text-muted-foreground">
        <li className="flex items-center">
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            aria-label="בית"
          >
            <Home className="h-3 w-3" strokeWidth={1.6} />
          </Link>
        </li>
        {trail.map((c, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              <ChevronLeft className="h-3 w-3 text-muted-foreground/40" strokeWidth={1.6} />
              {c.to && !isLast ? (
                <Link to={c.to} className="hover:text-foreground transition-colors">
                  {c.label}
                </Link>
              ) : (
                <span className={isLast ? "text-foreground font-medium" : ""}>{c.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
