import { LayoutDashboard, Users, BookOpen, ClipboardEdit, Medal, LogOut, Database, Home, Layers, CalendarDays, Activity, Mail, CalendarRange, SlidersHorizontal, LayoutTemplate, Calculator, Globe, Languages, Scroll, Scale, Dumbbell, Feather, UserCog, Target, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/context/AuthContext";
import { useUiLabels } from "@/context/UiLabelsContext";
import { useIsSystemOwner } from "@/hooks/useSystemOwner";
import EditableElement from "@/components/builder/EditableElement";
import wingateLogoSrc from "@/assets/wingate-logo.png";

type NavKey = keyof ReturnType<typeof useUiLabels>["labels"]["nav"];

interface MenuItemDef {
  key: NavKey;
  icon: typeof Home;
  path: string;
  roles: UserRole[];
}

const allMenuItems: MenuItemDef[] = [
  { key: "dashboard",      icon: Home,         path: "/",                roles: ["developer", "admin", "teacher", "parent", "coach"] },
  { key: "studentHome",    icon: Home,         path: "/student-home",    roles: ["student"] },
  { key: "yearPlan",       icon: CalendarRange, path: "/year-plan-2026", roles: ["developer", "admin"] },
  { key: "myGroups",       icon: Layers,       path: "/my-groups",       roles: ["teacher"] },
  { key: "teacherCourses", icon: BookOpen,     path: "/teacher-courses", roles: ["teacher"] },
  { key: "students",       icon: Users,        path: "/students",        roles: ["developer", "admin", "teacher", "coach"] },
  { key: "groups",         icon: Layers,       path: "/groups",          roles: ["developer", "admin", "teacher", "coach"] },
  { key: "courses",        icon: BookOpen,     path: "/courses",         roles: ["developer", "admin", "teacher"] },
  // admin/developer only: student writes are admin-gated in RLS, so
  // teacher/coach could open the form but never save (P0 fix)
  { key: "dataEntry",      icon: ClipboardEdit, path: "/data-entry",     roles: ["developer", "admin"] },
  { key: "gradeEntry",     icon: BookOpen,     path: "/grade-entry",     roles: ["developer", "admin", "teacher"] },
  { key: "roadmaps",       icon: LayoutTemplate, path: "/roadmaps",      roles: ["developer", "admin", "teacher", "student"] },
  { key: "userActivity",   icon: Activity,     path: "/user-activity",   roles: ["developer", "admin"] },
  { key: "dataManagement", icon: Database,     path: "/data-management", roles: ["developer", "admin"] },
  { key: "adminLabels",    icon: SlidersHorizontal, path: "/admin/labels",    roles: ["developer", "admin"] },
  { key: "adminUsers",     icon: UserCog,           path: "/admin/users",     roles: ["developer", "admin"] },
  // System-Owner only (extra gate below — role admin alone is not enough)
  { key: "learningGroups", icon: Layers,            path: "/admin/learning-groups", roles: ["admin"] },
  { key: "guardians",      icon: Users,             path: "/admin/guardians",       roles: ["admin"] },
  { key: "staffMgmt",      icon: Dumbbell,          path: "/admin/staff",           roles: ["admin"] },
  { key: "dataImport",     icon: Database,          path: "/admin/data-import",     roles: ["admin"] },
  { key: "adminSettings",  icon: Settings,          path: "/admin/settings",  roles: ["developer", "admin"] },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

const AppSidebar = ({ onNavigate }: AppSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { labels } = useUiLabels();
  const { data: isSystemOwner } = useIsSystemOwner();

  const menuItems = allMenuItems.filter((item) => {
    if (!user || !item.roles.includes(user.role)) return false;
    // System-Owner-only screens — role admin alone is not enough
    if (["learningGroups", "guardians", "staffMgmt", "dataImport"].includes(item.key) && !isSystemOwner) return false;
    // Honor admin-set visibility (default true when key missing)
    const v = (labels.visibility?.nav as Record<string, boolean | undefined>)[item.key];
    return v !== false;
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="w-[256px] min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-s border-sidebar-border" dir="rtl">
      {/* Logo & Branding */}
      <button onClick={() => { navigate(user?.role === "student" ? "/student-home" : "/"); onNavigate?.(); }} className="px-5 pt-5 pb-4 w-full text-start group cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white border border-sidebar-border/70 p-1 flex items-center justify-center shrink-0 shadow-sm transition-all duration-200 group-hover:shadow-md">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[13.5px] font-bold tracking-tight text-start leading-tight text-sidebar-foreground font-heading">האקדמיה למצוינות</h1>
            <p className="text-[9.5px] text-sidebar-muted/70 mt-0.5 text-start font-medium tracking-wide">מכון וינגייט</p>
          </div>
        </div>
      </button>

      <div className="mx-5 h-px bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-3.5 pt-5 pb-4">
        <p className="text-[9px] font-semibold text-sidebar-muted/40 tracking-[0.12em] uppercase px-3 mb-3">
          {user ? labels.roleTitles[user.role] : "תפריט"}
        </p>
        <div className="space-y-0.5">
          {menuItems.map((item) => {
            const active = location.pathname === item.path || (item.path !== "/" && item.path !== "/student-home" && location.pathname.startsWith(item.path));
            const title = labels.nav[item.key];
            return (
              <EditableElement
                key={item.key + item.path}
                id={`sidebar.nav.${item.key}`}
                type="nav-item"
                pageKey="sidebar"
                defaultLabel={title}
              >
                {({ label }) => (
                  <button
                    onClick={() => { navigate(item.path); onNavigate?.(); }}
                    className={`w-full flex flex-row items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] transition-all duration-200 text-start ${
                      active
                        ? "bg-sidebar-primary text-white font-semibold shadow-sm"
                        : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium"
                    }`}
                  >
                    <item.icon className={`h-[15px] w-[15px] shrink-0 transition-colors ${active ? "text-white" : "text-sidebar-muted"}`} strokeWidth={active ? 2 : 1.5} />
                    <span>{label}</span>
                  </button>
                )}
              </EditableElement>
            );
          })}

          {/* Dev tools — developer only */}
          {user?.role === "developer" && (
            <>
              {[
                { path: "/admin/builder", label: "בונה עמודים" },
                { path: "/style-preview", label: "בחירת סגנון" },
                { path: "/font-lab",      label: "מעבדת פונטים" },
              ].map(({ path, label }) => (
                <button
                  key={path}
                  onClick={() => { navigate(path); onNavigate?.(); }}
                  className={`w-full flex flex-row items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] transition-all duration-200 text-start font-medium ${
                    location.pathname === path
                      ? "bg-sidebar-primary text-white font-semibold shadow-sm"
                      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  <LayoutTemplate className={`h-[15px] w-[15px] shrink-0 ${location.pathname === path ? "text-white" : "text-sidebar-muted"}`} strokeWidth={location.pathname === path ? 2 : 1.5} />
                  <span>{label}</span>
                </button>
              ))}
            </>
          )}

          {/* Subjects list — visible to students between dashboard and messages */}
          {user?.role === "student" && (() => {
            const subjects: { name: string; icon: typeof Home; path: string }[] = [
              { name: "תנ״ך",        icon: BookOpen,   path: "/subjects/" + encodeURIComponent("תנ״ך") },
              { name: "לשון",        icon: Languages,  path: "/subjects/" + encodeURIComponent("לשון") },
              { name: "היסטוריה",    icon: Scroll,     path: "/subjects/" + encodeURIComponent("היסטוריה") },
              { name: "אנגלית",      icon: Globe,      path: "/subjects/" + encodeURIComponent("אנגלית") },
              { name: "מתמטיקה",     icon: Calculator, path: "/roadmaps/math" },
              { name: "חינוך גופני", icon: Dumbbell,   path: "/subjects/" + encodeURIComponent("חינוך גופני") },
              { name: "ספרות",       icon: Feather,    path: "/subjects/" + encodeURIComponent("ספרות") + "/literature" },
              { name: "אזרחות",      icon: Scale,      path: "/subjects/" + encodeURIComponent("אזרחות") },
            ];
            return (
              <div className="pt-2 mt-1 border-t border-sidebar-border/60">
                <p className="text-[9px] font-semibold text-sidebar-muted/40 tracking-[0.12em] uppercase px-3 mt-3 mb-2">
                  מקצועות
                </p>
                {subjects.map((s) => {
                  const active = decodeURIComponent(location.pathname) === decodeURIComponent(s.path);
                  return (
                    <button
                      key={s.name}
                      onClick={() => { navigate(s.path); onNavigate?.(); }}
                      className={`w-full flex flex-row items-center gap-3 px-3 py-2 rounded-xl text-[12.5px] transition-all duration-200 text-start ${
                        active
                          ? "bg-sidebar-primary text-white font-semibold shadow-sm"
                          : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium"
                      }`}
                    >
                      <s.icon className={`h-[15px] w-[15px] shrink-0 ${active ? "text-white" : "text-sidebar-muted"}`} strokeWidth={active ? 2 : 1.5} />
                      <span>{s.name}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}


          {/* Practice area — secondary, calm styling (route unchanged) */}
          {(user?.role === "student" || user?.role === "admin" || user?.role === "developer") && (
            <button
              onClick={() => { navigate("/play"); onNavigate?.(); }}
              className={`w-full flex flex-row items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] transition-all duration-200 text-start font-medium ${
                location.pathname.startsWith("/play")
                  ? "bg-sidebar-primary text-white font-semibold shadow-sm"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <Target className={`h-[15px] w-[15px] shrink-0 ${location.pathname.startsWith("/play") ? "text-white" : "text-sidebar-muted"}`} strokeWidth={location.pathname.startsWith("/play") ? 2 : 1.5} />
              <span>אזור תרגול</span>
            </button>
          )}

          {/* Messages — coming soon, shown as clearly disabled until backend is live */}
          {labels.visibility?.nav?.messages !== false && (
            <div
              aria-disabled="true"
              className="w-full flex flex-row items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] text-start font-medium text-sidebar-muted/45 cursor-default select-none"
            >
              <Mail className="h-[15px] w-[15px] shrink-0 text-sidebar-muted/40" strokeWidth={1.5} />
              <span>{labels.nav.messages}</span>
              <span className="ms-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-sidebar-accent/60 text-sidebar-muted/60">
                בקרוב
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* Semester */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] text-sidebar-muted/60">
          <Medal className="h-3.5 w-3.5 shrink-0 text-sidebar-muted/35" strokeWidth={1.5} />
          <span>{labels.nav.semester}</span>
        </div>
      </div>

      <div className="mx-5 h-px bg-sidebar-border" />

      {/* User */}
      <div className="px-4 py-4 space-y-3">
        <div className="flex flex-row items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/15 border border-sidebar-primary/25 flex items-center justify-center text-[11px] font-semibold text-sidebar-primary shrink-0">
            {user?.name.split(" ").map(n => n[0]).join("") || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate text-start text-sidebar-foreground">{user?.name}</p>
            <p className="text-[10px] text-sidebar-muted truncate text-start">
              {user ? labels.roleLabels[user.role] : ""}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex flex-row items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-medium bg-sidebar-accent/60 text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-150"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>יציאה מהמערכת</span>
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
