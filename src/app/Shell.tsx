import type { ReactNode } from "react";
import { useApp } from "../data/appContext";

interface Props {
  children: ReactNode;
  wide?: boolean;
}

/** Product shell: same header and rhythm on every screen of every subject. */
export function Shell({ children, wide }: Props) {
  const { theme, session, signOut } = useApp();
  const containerClass = `container${wide ? " container--wide" : ""}`;

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        דילוג לתוכן
      </a>

      <header className="header">
        <div className={`${containerClass} header__inner`}>
          <div className="header__brand">
            <span className="header__mark" aria-hidden="true">
              {theme.icon}
            </span>
            <span>
              <span className="header__title">{theme.subjectName}</span>
              {session && (
                <span className="header__sub" style={{ display: "block" }}>
                  {session.role === "teacher" ? "מסך מורה" : session.name}
                </span>
              )}
            </span>
          </div>

          {theme.percentBadge && <span className="badge-pct">{theme.percentBadge}</span>}

          <span className="header__spacer" />

          {session && (
            <button type="button" className="back-link" onClick={signOut}>
              יציאה
            </button>
          )}
        </div>
      </header>

      <main id="main" className="main">
        <div className={containerClass}>{children}</div>
      </main>
    </div>
  );
}
