/** Admin-controlled manual traffic light. Never computed from grades or
 *  averages; a student without a row (or decision) is gray — טרם הוגדר.
 *  Stored in student_admin_status (RLS: admin-only read & write). */

export type AdminStatus = "gray" | "green" | "orange" | "red";

export const ADMIN_STATUS_ORDER: AdminStatus[] = ["red", "orange", "green", "gray"];

export const adminStatusConfig: Record<AdminStatus, { label: string; chip: string; dot: string }> = {
  gray:   { label: "טרם הוגדר",  chip: "bg-muted/50 text-muted-foreground border-border",        dot: "bg-muted-foreground/50" },
  green:  { label: "תקין",        chip: "bg-success/10 text-success border-success/30",           dot: "bg-success" },
  orange: { label: "במעקב",       chip: "bg-warning/10 text-warning border-warning/30",           dot: "bg-warning" },
  red:    { label: "דורש טיפול", chip: "bg-destructive/10 text-destructive border-destructive/30", dot: "bg-destructive" },
};

export interface AdminStatusRow {
  status: AdminStatus;
  status_note: string | null;
  status_updated_at: string | null;
  status_updated_by_name: string | null;
}

export const formatStatusUpdated = (r?: AdminStatusRow | null): string | null => {
  if (!r?.status_updated_at) return null;
  const d = new Date(r.status_updated_at);
  const when = d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit" }) +
    " " + d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  return r.status_updated_by_name ? `עודכן ע"י ${r.status_updated_by_name} · ${when}` : `עודכן ${when}`;
};
