import type { UnitStatus } from "../../data/types";
import { statusLabel, statusTone } from "../logic/progress";

interface Props {
  status: UnitStatus;
  audience?: "teacher" | "student";
}

/** Verbal + colour status. The word is always there — colour never carries meaning alone. */
export function StatusPill({ status, audience = "student" }: Props) {
  return (
    <span className={`pill pill--${statusTone(status)}`}>
      <span className="pill__dot" aria-hidden="true" />
      {statusLabel(status, audience)}
    </span>
  );
}
