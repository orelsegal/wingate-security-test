/**
 * DemoShell — sidebar + header + content frame shared by the three demo
 * dashboards. Each role gets its OWN menu items so the experiences feel
 * genuinely different, not a visual reskin.
 *
 *  - "Switch demo role" returns to the demo entry screen.
 *  - "Logout demo" clears the mock user.
 */
import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, RefreshCw, type LucideIcon } from "lucide-react";
import { useAuth, roleLabels } from "@/context/AuthContext";
import WingateBadge from "@/components/WingateBadge";
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

  const switchRole = () => {
    demoLogout();
    navigate("/login", { replace: true });
  };
  const logoutDemo = () => {
    demoLogout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      {/* Sidebar */}
      <aside className="w-[252px] shrink-0 bg-sidebar text-sidebar-foreground border-s border-sidebar-border flex flex-col">
        <div className="px-5 pt-5 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-card border border-sidebar-border p-1.5 flex items-center justify-center">
            <WingateBadge size="sm" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-tight truncate">{workspaceLabel}</p>
            <p className="text-[10px] text-sidebar-muted">מכון וינגייט · DEMO</p>
          </div>
        </div>

        <div className="mx-5 h-px bg-sidebar-border" />

        <nav className="flex-1 px-3 pt-4 space-y-0.5">
          <p className="text-[9px] font-semibold tracking-[0.14em] uppercase text-sidebar-muted/50 px-3 mb-2">
            תפריט
          </p>
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
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

        <div className="mx-5 h-px bg-sidebar-border" />

        {/* Current role + actions */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/40">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold"
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
            onClick={switchRole}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11.5px] font-medium text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            החלף תפקיד דמו
          </button>
          <button
            onClick={logoutDemo}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11.5px] font-medium text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="h-3 w-3" />
            יציאה מדמו
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 border-b bg-card flex items-center px-5 gap-3">
          <span
            className="text-[10px] tracking-[0.16em] uppercase font-semibold px-2 py-0.5 rounded"
            style={{ background: `${tint}18`, color: tint }}
          >
            {user ? roleLabels[user.role] : ""} · DEMO
          </span>
          <span className="text-[12px] text-muted-foreground">{workspaceLabel}</span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default DemoShell;
