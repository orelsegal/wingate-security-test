/**
 * DemoShell — sidebar + header + content frame shared by the three demo
 * dashboards. Each role gets its OWN menu items so the experiences feel
 * genuinely different, not a visual reskin.
 *
 * Demo-role switching is FRICTIONLESS:
 *  - Always-visible sticky footer in the sidebar with "Switch role" + "Logout".
 *  - Visible role indicator chip at the top of the sidebar AND in the header.
 *  - Header has a "Switch role" shortcut (icon + label on desktop, icon on mobile).
 *  - Sidebar collapses into a slide-in drawer on mobile via a header menu button.
 *  - Tapping "Switch role" opens a 3-card modal; choosing a card immediately
 *    updates localStorage, app state, closes the modal, and redirects.
 */
import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, RefreshCw, X, type LucideIcon } from "lucide-react";
import { useAuth, roleLabels } from "@/context/AuthContext";
import WingateBadge from "@/components/WingateBadge";
import RoleSwitcherDialog from "@/components/demo/RoleSwitcherDialog";
import { cn } from "@/lib/utils";

export interface DemoNavItem { label: string; path: string; icon: LucideIcon; }

interface Props {
  children: ReactNode;
  nav: DemoNavItem[];
  tint: string; // accent colour per role
  workspaceLabel: string;
}

const DemoShell = ({ children, nav, tint, workspaceLabel }: Props) => {
  const navigate = useNavigate();
  const { user, demoLogout } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const openSwitcher = () => { setMobileNavOpen(false); setSwitcherOpen(true); };
  const logoutDemo = () => {
    demoLogout();
    navigate("/login", { replace: true });
  };

  const roleChip = (
    <span
      className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: `${tint}14`, color: tint }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tint }} />
      מצב דמו: {user ? roleLabels[user.role] : ""}
    </span>
  );


  const sidebarBody = (
    <>
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-card border border-sidebar-border p-1.5 flex items-center justify-center">
          <WingateBadge size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold leading-tight truncate">{workspaceLabel}</p>
          <p className="text-[10px] text-sidebar-muted">מכון וינגייט · DEMO</p>
        </div>
        <button
          className="md:hidden p-1.5 rounded-lg text-sidebar-muted hover:bg-sidebar-accent/60"
          onClick={() => setMobileNavOpen(false)}
          aria-label="סגור תפריט"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Role indicator pill at top */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-sidebar-accent/40">
          <span className="text-[10px] text-sidebar-muted">תפקיד דמו נוכחי</span>
          {roleChip}
        </div>
      </div>

      <div className="mx-5 h-px bg-sidebar-border" />

      <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-2 space-y-0.5">
        <p className="text-[9px] font-semibold tracking-[0.14em] uppercase text-sidebar-muted/50 px-3 mb-2">
          תפריט
        </p>
        {nav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            onClick={() => setMobileNavOpen(false)}
            className={({ isActive }) =>
              cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] transition-colors",
                isActive
                  ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground font-medium",
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className="h-[15px] w-[15px] shrink-0"
                  strokeWidth={1.6}
                  style={{ color: isActive ? tint : undefined }}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sticky footer — always visible, no scrolling required */}
      <div className="shrink-0 border-t border-sidebar-border bg-sidebar p-3 space-y-2">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/40">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
            style={{ background: `${tint}22`, color: tint }}
          >
            {user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium truncate text-sidebar-foreground">{user?.name}</p>
            <p className="text-[10px] truncate" style={{ color: tint }}>
              {user ? roleLabels[user.role] : ""} · DEMO
            </p>
          </div>
        </div>
        <button
          onClick={openSwitcher}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-[12.5px] font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          החלף תפקיד דמו
        </button>
        <button
          onClick={logoutDemo}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-[11.5px] font-medium text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          יציאה מדמו
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[252px] shrink-0 bg-sidebar text-sidebar-foreground border-s border-sidebar-border flex-col">
        {sidebarBody}
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" dir="rtl">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative w-[280px] max-w-[85vw] bg-sidebar text-sidebar-foreground border-s border-sidebar-border flex flex-col shadow-2xl ms-auto">
            {sidebarBody}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 border-b bg-card flex items-center px-3 md:px-5 gap-3 sticky top-0 z-20">
          <button
            className="md:hidden p-2 -ms-1 rounded-lg text-muted-foreground hover:bg-accent"
            onClick={() => setMobileNavOpen(true)}
            aria-label="פתח תפריט"
          >
            <Menu className="h-5 w-5" />
          </button>
          {roleChip}
          <span className="hidden sm:inline text-[12px] text-muted-foreground truncate">{workspaceLabel}</span>
          <div className="flex-1" />
          <button
            onClick={openSwitcher}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-foreground text-background text-[11.5px] font-semibold hover:opacity-90 active:scale-[0.98] transition"
            aria-label="החלפת תפקיד"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden xs:inline sm:inline">החלפת תפקיד</span>
          </button>

        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      <RoleSwitcherDialog open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </div>
  );
};

export default DemoShell;
