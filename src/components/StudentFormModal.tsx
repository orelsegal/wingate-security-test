import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useCreateStudent, useUpdateStudent, useSports, type Student } from "@/hooks/useStudents";

const CLASSES = ["ט'1", "ט'2", "ט'3", "י'1", "י'2", "י'3", "יא'1", "יא'2", "יא'3"];

interface Props {
  open: boolean;
  onClose: () => void;
  student?: Student | null;
  duplicate?: boolean;
}

export default function StudentFormModal({ open, onClose, student, duplicate }: Props) {
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const { data: sports = [] } = useSports();
  const isEdit = !!student && !duplicate;

  const [form, setForm] = useState({
    first_name: "", last_name: "", sport: "", class_name: "", math_level: "3", overall_status: "green",
  });

  useEffect(() => {
    if (student) {
      setForm({
        first_name: (student as any).first_name || student.full_name?.split(" ")[0] || "",
        last_name: (student as any).last_name || student.full_name?.split(" ").slice(1).join(" ") || "",
        sport: student.sport || "",
        class_name: student.class_name || "",
        math_level: String(student.math_level || 3),
        overall_status: student.overall_status || "green",
      });
    } else {
      setForm({ first_name: "", last_name: "", sport: "", class_name: "", math_level: "3", overall_status: "green" });
    }
  }, [student, open]);

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.sport || !form.class_name) {
      toast.error("יש למלא שם פרטי, ענף ספורט וכיתה");
      return;
    }
    const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
    const payload: Record<string, any> = {
      full_name: fullName,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      sport: form.sport,
      class_name: form.class_name,
      math_level: parseInt(form.math_level) || 3,
      overall_status: form.overall_status,
    };

    try {
      if (isEdit) {
        await updateStudent.mutateAsync({ id: student!.id, data: payload });
        toast.success(`"${fullName}" עודכן בהצלחה`);
      } else {
        await createStudent.mutateAsync({ ...payload, completion_percent: 0 });
        toast.success(`"${fullName}" נוסף בהצלחה`);
      }
      onClose();
    } catch (err: any) {
      toast.error("שגיאה: " + err.message);
    }
  };

  const saving = createStudent.isPending || updateStudent.isPending;
  const sportsList = sports.filter((s: any) => s.active !== false).map((s: any) => s.sport_name);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-bold">
            {isEdit ? "עריכת ספורטאי" : duplicate ? "שכפול ספורטאי" : "הוספת ספורטאי חדש"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* GROUP 1: Name */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-wide">פרטים אישיים</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">שם פרטי *</Label>
                <Input value={form.first_name} onChange={(e) => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="יעל" className="h-9 text-[13px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">שם משפחה</Label>
                <Input value={form.last_name} onChange={(e) => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="כהן" className="h-9 text-[13px]" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">כיתה *</Label>
              <Select value={form.class_name} onValueChange={(v) => setForm(p => ({ ...p, class_name: v }))}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="בחר כיתה..." /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* GROUP 2: Sport & Math */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-wide">ענף ורמה</p>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">ענף ספורט *</Label>
              <Select value={form.sport} onValueChange={(v) => setForm(p => ({ ...p, sport: v }))}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="בחר ענף..." /></SelectTrigger>
                <SelectContent>
                  {sportsList.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">רמת מתמטיקה</Label>
              <div className="flex gap-1.5">
                {[3, 4, 5].map(l => (
                  <button
                    key={l}
                    onClick={() => setForm(p => ({ ...p, math_level: String(l) }))}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${
                      form.math_level === String(l)
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {l} יח״ל
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* GROUP 3: Save */}
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} size="sm" className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5 flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "עדכן" : "שמור ספורטאי"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
