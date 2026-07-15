import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { adminStatusConfig, formatStatusUpdated, type AdminStatus, type AdminStatusRow } from "@/lib/adminStatus";

/** Admin-only editor for the manual traffic light (student_admin_status).
 *  RLS enforces admin-only writes; this dialog is only mounted for admins. */
const AdminStatusEditor = ({ student, current, open, onOpenChange }: {
  student: { id: string; full_name: string } | null;
  current?: AdminStatusRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AdminStatus>("gray");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(current?.status || "gray");
      setNote(current?.status_note || "");
    }
  }, [open, current]);

  const save = async () => {
    if (!student) return;
    setSaving(true);
    const { error } = await supabase
      .from("student_admin_status" as any)
      .upsert(
        {
          student_id: student.id,
          status,
          status_note: note.trim() || null,
          status_updated_by_name: user?.name || user?.email || null,
        } as any,
        { onConflict: "student_id" },
      );
    setSaving(false);
    if (error) {
      toast.error("שמירת הסטטוס נכשלה: " + error.message);
      return;
    }
    toast.success("הסטטוס נשמר");
    queryClient.invalidateQueries({ queryKey: ["admin-status"] });
    onOpenChange(false);
  };

  const updatedLine = formatStatusUpdated(current);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[15px]">סטטוס ניהולי — {student?.full_name}</DialogTitle>
          <DialogDescription className="text-[12px]">
            הסטטוס נקבע ידנית בלבד ואינו מחושב מציונים.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(adminStatusConfig) as AdminStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`h-10 px-3 rounded-xl border text-[12.5px] font-medium inline-flex items-center gap-2 justify-start transition-colors ${
                status === s ? `${adminStatusConfig[s].chip} ring-1 ring-current` : "bg-card text-foreground border-border hover:bg-accent/40"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${adminStatusConfig[s].dot}`} />
              {adminStatusConfig[s].label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] text-muted-foreground font-medium">הערה (אופציונלי)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="למשל: ממתינה לציון אזרחות, שיחה עם ההורים ב..."
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {updatedLine && <p className="text-[11px] text-muted-foreground">{updatedLine}</p>}

        <div className="flex items-center justify-start gap-2 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-medium disabled:opacity-60"
          >
            {saving ? "שומר..." : "שמירה"}
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-xl border border-border bg-card text-[12.5px] text-foreground"
          >
            ביטול
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminStatusEditor;
