import type { ReactNode } from "react";

type Tone = "info" | "wait" | "fix" | "done";

export function Banner({
  tone,
  title,
  children,
}: {
  tone: Tone;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={`banner banner--${tone}`} role="status">
      <span className="banner__title">{title}</span>
      {children && <p>{children}</p>}
    </div>
  );
}
