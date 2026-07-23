import { LayoutDashboard, Users, BookOpen, ClipboardEdit, Medal, LogOut, Database, Home, Layers, CalendarDays, Activity, Mail, CalendarRange, SlidersHorizontal, LayoutTemplate, Calculator, Globe, Languages, Scroll, Scale, Dumbbell, Feather, UserCog, Target, Settings, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/context/AuthContext";
import { useUiLabels } from "@/context/UiLabelsContext";
import { useIsSystemOwner } from "@/hooks/useSystemOwner";
import EditableElement from "@/components/builder/EditableElement";
import wingateLogoSrc from "@/assets/wingate-logo.png";

type NavKey = keyof ReturnType<typeof useUiLabels>["labels"]["nav"];
type NavGroup = "work" | "content" | "management";

interface MenuItemDef {
  key: NavKey;
  icon: typeof Home;
  path: string;
  roles: UserRole[];
  group: NavGroup;
}

/* Admin/developer sidebar is grouped into three sections (report 5A).
   Array order = order within each section AND the flat order for the
   per-role lists below. No route changed, nothing removed. */
const allMenuItems: MenuItemDef[] = [
  // ── work (עבודה שוטפת) ──
  { key: "dashboard",      icon: Home,         path: "/",                roles: ["developer", "admin", "teacher", "parent", "coach"], group: "work" },
  { key: "studentHome",    icon: Home,         path: "/student-home",    roles: ["student"], group: "work" },
  { key: "myGroups",       icon: Layers,       path: "/my-groups",       roles: ["teacher"], group: "work" },
  { key: "students",       icon: Users,        path: "/students",        roles: ["developer", "admin", "teacher", "coach"], group: "work" },
  // System-Owner only (extra gate below — role admin alone is not enough)
  { key: "learningGroups", icon: Layers,            path: "/admin/learning-groups", roles: ["admin"], group: "work" },
  { key: "groups",         icon: Layers,       path: "/groups",          roles: ["developer", "admin", "teacher", "coach"], group: "work" },
  { key: "gradeEntry",     icon: BookOpen,     path: "/grade-entry",     roles: ["developer", "admin", "teacher"], group: "work" },
  { key: "courses",        icon: BookOpen,     path: "/courses",         roles: ["developer", "admin", "teacher"], group: "work" },
  // ── content & planning (תוכן ותכנון) ──
  { key: "teacherCourses", icon: BookOpen,     path: "/teacher-courses", roles: ["teacher"], group: "content" },
  { key: "roadmaps",       icon: LayoutTemplate, path: "/roadmaps",      roles: ["developer", "admin", "teacher", "student"], group: "content" },
  { key: "calendar",       icon: CalendarDays, path: "/calendar",        roles: ["developer", "admin", "coach", "parent"], group: "content" },
  { key: "yearPlan",       icon: CalendarRange, path: "/year-plan-2026", roles: ["developer", "admin"], group: "content" },
  // ── management (ניהול) ──
  { key: "adminUsers",     icon: UserCog,           path: "/admin/users",     roles: ["developer", "admin"], group: "management" },
  { key: "guardians",      icon: Users,             path: "/admin/guardians",       roles: ["admin"], group: "management" },
  { key: "staffMgmt",      icon: Dumbbell,          path: "/admin/staff",           roles: ["admin"], group: "management" },
  { key: "dataImport",     icon: Database,          path: "/admin/data-import",     roles: ["admin"], group: "management" },
  // admin/developer only: student writes are admin-gated in RLS (P0 fix)
  { key: "dataEntry",      icon: ClipboardEdit, path: "/data-entry",     roles: ["developer", "admin"], group: "management" },
  { key: "dataManagement", icon: Database,     path: "/data-management", roles: ["developer", "admin"], group: "management" },
  { key: "userActivity",   icon: Activity,     path: "/user-activity",   roles: ["developer", "admin"], group: "management" },
  { key: "adminLabels",    icon: SlidersHorizontal, path: "/admin/labels",    roles: ["developer", "admin"], group: "management" },
  { key: "adminSettings",  icon: Settings,          path: "/admin/settings",  roles: ["developer", "admin"], group: "management" },
];

const GROUP_META: { id: NavGroup; label: string }[] = [
  { id: "work",       label: "עבודה שוטפת" },
  { id: "content",    label: "תוכן ותכנון" },
  { id: "management", label: "ניהול" },
];

/* explicit flat order for the non-grouped roles (report 5A) */
const ROLE_ORDER: Partial<Record<UserRole, NavKey[]>> = {
  teacher: ["dashboard", "myGroups", "students", "gradeEntry", "teacherCourses", "groups", "courses", "roadmaps"],
  coach:   ["dashboard", "students", "groups", "calendar"],
  parent:  ["dashboard", "calendar"],
};

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

  const isGrouped = user?.role === "admin" || user?.role === "developer";
  const isActive = (path: string) =>
    location.pathname === path || (path !== "/" && path !== "/student-home" && location.pathname.startsWith(path));

  // collapsible group state. Defaults: only "work" open; the section
  // holding the ACTIVE route is always forced open (below) so the active
  // item can never hide inside a closed group. Manual open/close choices
  // persist in localStorage across screens and sessions.
  const NAV_GROUPS_KEY = "maslul_nav_groups";
  const [collapsed, setCollapsed] = useState<Record<NavGroup, boolean>>(() => {
    const defaults: Record<NavGroup, boolean> = { work: false, content: true, management: true };
    try {
      const raw = localStorage.getItem(NAV_GROUPS_KEY);
      if (!raw) return defaults;
      const saved = JSON.parse(raw);
      return {
        work: typeof saved.work === "boolean" ? saved.work : defaults.work,
        content: typeof saved.content === "boolean" ? saved.content : defaults.content,
        management: typeof saved.management === "boolean" ? saved.management : defaults.management,
      };
    } catch { return defaults; }
  });
  const toggleGroup = (id: NavGroup) =>
    setCollapsed(c => {
      const next = { ...c, [id]: !c[id] };
      try { localStorage.setItem(NAV_GROUPS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const renderItem = (item: MenuItemDef) => {
    const active = isActive(item.path);
    const title = labels.nav[item.key];
    return (
      <EditableElement key={item.key + item.path} id={`sidebar.nav.${item.key}`} type="nav-item" pageKey="sidebar" defaultLabel={title}>
        {({ label }) => (
          <button
            onClick={() => { navigate(item.path); onNavigate?.(); }}
            aria-current={active ? "page" : undefined}
            className={`w-full flex flex-row items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] transition-all duration-200 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/50 ${
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
  };

  // flat order for non-grouped roles
  const flatItems = (() => {
    const order = user ? ROLE_ORDER[user.role] : undefined;
    if (!order) return menuItems;
    const idx = (k: NavKey) => { const i = order.indexOf(k); return i < 0 ? 999 : i; };
    return [...menuItems].sort((a, b) => idx(a.key) - idx(b.key));
  })();

  return (
    <aside className="w-[256px] min-h-screen bg-sidebar text-sidebar-foreground flex flex-col border-s border-sidebar-border" dir="rtl">
      {/* Logo & Branding */}
      <button onClick={() => { navigate(user?.role === "student" ? "/student-home" : "/"); onNavigate?.(); }} className="px-5 pt-5 pb-4 w-full text-start group cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white border border-sidebar-border/70 p-1 flex items-center justify-center shrink-0 shadow-sm transition-all duration-200 group-hover:shadow-md">
            <img src={wingateLogoSrc} alt="מכון וינגייט" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold tracking-tight text-start leading-tight text-sidebar-foreground font-heading">מסלול</h1>
            <p className="text-[9.5px] text-sidebar-muted/70 mt-0.5 text-start font-medium tracking-wide">האקדמיה למצוינות בספורט</p>
          </div>
        </div>
      </button>

      <div className="mx-5 h-px bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-3.5 pt-5 pb-4">
        {isGrouped ? (
          /* admin/developer: three collapsible sections */
          <div className="space-y-4">
            {GROUP_META.map((g) => {
              const items = menuItems.filter(m => m.group === g.id);
              if (items.length === 0) return null;
              const hasActive = items.some(m => isActive(m.path));
              const open = !collapsed[g.id] || hasActive;
              return (
                <div key={g.id}>
                  <button
                    onClick={() => toggleGroup(g.id)}
                    className="w-full flex items-center justify-between px-3 py-1 mb-1 rounded-lg group hover:bg-sidebar-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary/50"
                    aria-expanded={open}
                  >
                    <span className="text-[10px] font-semibold text-sidebar-muted/70 tracking-[0.1em]">{g.label}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-sidebar-muted/60 transition-transform ${open ? "" : "-rotate-90"}`} strokeWidth={2} />
                  </button>
                  {open && <div className="space-y-0.5">{items.map(renderItem)}</div>}
                </div>
              );
            })}
          </div>
        ) : (
          /* teacher / coach / parent / student: flat, per-role order */
          <>
            <p className="text-[9px] font-semibold text-sidebar-muted/40 tracking-[0.12em] uppercase px-3 mb-3">
              {user ? labels.roleTitles[user.role] : "תפריט"}
            </p>
            <div className="space-y-0.5">{flatItems.map(renderItem)}</div>
          </>
        )}

        <div className="space-y-0.5 mt-1">
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
