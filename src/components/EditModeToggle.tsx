import { Pencil, Eye } from "lucide-react";
import { useEditMode } from "@/context/EditModeContext";
import { cn } from "@/lib/utils";

/**
 * Admin-only toggle to enter/exit Edit Mode.
 * Renders nothing for non-admin users.
 */
export function EditModeToggle({ className }: { className?: string }) {
  const { enabled, canToggle, toggle } = useEditMode();
  if (!canToggle) return null;

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[12.5px] font-medium border transition-all duration-150",
        enabled
          ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90"
          : "bg-card text-foreground border-border hover:border-primary/40 hover:bg-primary/[0.03]",
        className,
      )}
      aria-pressed={enabled}
      title={enabled ? "יציאה ממצב עריכה" : "כניסה למצב עריכה"}
    >
      {enabled ? <Eye className="h-3.5 w-3.5" strokeWidth={1.7} /> : <Pencil className="h-3.5 w-3.5" strokeWidth={1.7} />}
      {enabled ? "סיום עריכה" : "מצב עריכה"}
    </button>
  );
}

/**
 * Small pencil badge to mark an editable field while in Edit Mode.
 * Only renders when Edit Mode is active for the current user.
 */
export function EditableIndicator({ className }: { className?: string }) {
  const { canEdit } = useEditMode();
  if (!canEdit) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary",
        className,
      )}
      aria-hidden
    >
      <Pencil className="h-2.5 w-2.5" strokeWidth={2} />
    </span>
  );
}
