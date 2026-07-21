/** Pure logic for the role-based operations board: derives ACTIONABLE
 *  alerts from real, permission-scoped data only. No network, no invented
 *  metrics — a domain without a data source stays out of the result. */

import { normalizeNid } from "@/lib/importPreview";

export interface OpsStudentRow {
  id: string; full_name: string; class_name: string | null; sport: string | null;
  archived?: boolean | null; national_id?: string | null; assigned_coach?: string | null;
}
export interface OpsAdminStatusRow { student_id: string; status: string; status_note: string | null }
export interface OpsLinks {
  guardian_links: { student_id: string; active: boolean }[];
  coach_links: { student_id: string; active: boolean }[];
}
export interface OpsAlertStudent { id: string; name: string; note?: string }
export interface OpsAlerts {
  /** manual admin traffic light on red/yellow — most urgent first */
  attention: (OpsAlertStudent & { status: string })[];
  /** active students with no legacy coach AND no active managed coach link */
  noCoach: OpsAlertStudent[];
  /** active students without any active guardian link; null when the links
   *  source is not available to this caller (owner-only RPC) */
  noGuardians: OpsAlertStudent[] | null;
  /** active students whose national id is missing or fails normalization */
  invalidNid: OpsAlertStudent[];
  activeCount: number;
  archivedCount: number;
}

export function computeOpsAlerts(
  students: OpsStudentRow[],
  adminStatuses: OpsAdminStatusRow[] | null,
  links: OpsLinks | null,
): OpsAlerts {
  const active = students.filter(s => !s.archived);
  const nameById = new Map(students.map(s => [s.id, s.full_name]));

  const attention = (adminStatuses || [])
    .filter(r => r.status === "red" || r.status === "yellow")
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "red" ? -1 : 1))
    .map(r => ({
      id: r.student_id,
      name: nameById.get(r.student_id) || "",
      status: r.status,
      note: r.status_note || undefined,
    }))
    .filter(r => r.name); // never surface ids without a resolvable student

  const coachLinked = new Set(
    (links?.coach_links || []).filter(l => l.active).map(l => l.student_id));
  const noCoach = active
    .filter(s => !(s.assigned_coach || "").trim() && !coachLinked.has(s.id))
    .map(s => ({ id: s.id, name: s.full_name }));

  let noGuardians: OpsAlertStudent[] | null = null;
  if (links) {
    const guardianLinked = new Set(
      links.guardian_links.filter(l => l.active).map(l => l.student_id));
    noGuardians = active
      .filter(s => !guardianLinked.has(s.id))
      .map(s => ({ id: s.id, name: s.full_name }));
  }

  const invalidNid = active
    .filter(s => !normalizeNid(s.national_id).valid)
    .map(s => ({ id: s.id, name: s.full_name }));

  return {
    attention, noCoach, noGuardians, invalidNid,
    activeCount: active.length,
    archivedCount: students.length - active.length,
  };
}

/** total open alerts a caller can actually see (null domains excluded) */
export const opsAlertCount = (a: OpsAlerts): number =>
  a.attention.length + a.noCoach.length + (a.noGuardians?.length ?? 0) + a.invalidNid.length;
