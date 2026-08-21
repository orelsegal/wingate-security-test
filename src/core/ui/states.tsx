import type { ReactNode } from "react";

export function LoadingBlock({ rows = 3, label = "טוען…" }: { rows?: number; label?: string }) {
  return (
    <div className="stack" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="skeleton skeleton--line" style={{ width: "45%" }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton--card" />
      ))}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state" role="alert">
      <span aria-hidden="true" style={{ fontSize: 26 }}>⚠︎</span>
      <p className="state__title">לא הצלחנו לטעון את המסך</p>
      <p className="state__text">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
          נסי שוב
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="state">
      <p className="state__title">{title}</p>
      {text && <p className="state__text">{text}</p>}
      {action}
    </div>
  );
}
