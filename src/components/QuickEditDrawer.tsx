import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useUpdateStudent, useSports, type Student } from "@/hooks/useStudents";
import InitialsAvatar from "@/components/InitialsAvatar";

const CLASSES = ["ט'1", "ט'2", "ט'3", "י'1", "י'2", "י'3", "יא'1", "יא'2", "יא'3"];

interface Props {
  open: boolean;
  onClose: () => void;
  student: Student | null;
}

export default function QuickEditDrawer({ open, onClose, student }: Props) {
  const updateStudent = useUpdateStudent();
  const { data: sports = [] } = useSports();
  const sportsList = sports.filter((s: any) => s.active !== false).map((s: any) => s.sport_name);

  const [form, setForm] = useState({
    sport: "", class_name: "", math_level: "3", overall_status: "green",
    diagnosis_status: "", english_support: "", notes: "",
  });

  useEffect(() => {
    if (student) {
      setForm({
        sport: student.sport || "",
        class_name: student.class_name || "",
        math_level: String(student.math_level || 3),
        overall_status: student.overall_status || "green",
        diagnosis_status: student.diagnosis_status || "",
        english_support: student.english_support || "",
        notes: student.notes || "",
      });
    }
  }, [student, open]);

  const handleSave = async () => {
    if (!student) return;
    try {
      await updateStudent.mutateAsync({
        id: student.id,
        data: {
          sport: form.sport,
          class_name: form.class_name,
          math_level: parseInt(form.math_level) || 3,
          overall_status: form.overall_status,
          diagnosis_status: form.diagnosis_status,
          english_support: form.english_support,
          notes: form.notes,
        }
      });
      toast.success("השינויים נשמרו ✓");
      onClose();
    } catch (err: any) {
      toast.error("שגיאה: " + err.message);
    }
  };

  const statusOptions = [
    { value: "green", label: "במסלול", color: "bg-success" },
    { value: "yellow", label: "פערים", color: "bg-warning" },
    { value: "red", label: "בסיכון", color: "bg-destructive" },
  ];

  if (!student) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0 overflow-y-auto" dir="rtl">
        <div className="p-6 space-y-6">
          <SheetHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <InitialsAvatar name={student.full_name} size="md" />
              <div>
                <SheetTitle className="text-[16px] font-semibold text-foreground">{student.full_name}</SheetTitle>
                <p className="text-[12px] text-muted-foreground">{student.sport} · {student.class_name}</p>
              </div>
            </div>
          </SheetHeader>

          {/* Quick Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">ענף ספורט</Label>
              <Select value={form.sport} onValueChange={(v) => setForm(p => ({ ...p, sport: v }))}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sportsList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">כיתה</Label>
              <Select value={form.class_name} onValueChange={(v) => setForm(p => ({ ...p, class_name: v }))}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">רמת מתמטיקה</Label>
              <div className="flex gap-1.5">
                {[3, 4, 5].map(l => (
                  <button
                    key={l}
                    onClick={() => setForm(p => ({ ...p, math_level: String(l) }))}
                    className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-medium transition-all border ${
                      form.math_level === String(l)
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {l} יח״ל
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">סטטוס</Label>
              <div className="flex gap-1.5">
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(p => ({ ...p, overall_status: opt.value }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all border ${
                      form.overall_status === opt.value
                        ? "border-primary/30 bg-primary/5 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">אבחון / לקות</Label>
              <Input
                value={form.diagnosis_status}
                onChange={(e) => setForm(p => ({ ...p, diagnosis_status: e.target.value }))}
                className="h-9 text-[13px]"
                placeholder="הפרעת קשב, דיסלקציה..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">תמיכה באנגלית</Label>
              <Input
                value={form.english_support}
                onChange={(e) => setForm(p => ({ ...p, english_support: e.target.value }))}
                className="h-9 text-[13px]"
                placeholder="שיעור פרטי..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">הערות</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                className="min-h-[60px] text-[13px] resize-none"
                placeholder="הערות נוספות..."
              />
            </div>
          </div>
        </div>

        {/* Sticky Save Bar */}
        <div className="sticky bottom-0 border-t border-border bg-card p-4 flex items-center gap-2">
          <Button onClick={handleSave} disabled={updateStudent.isPending} className="flex-1 gap-1.5">
            {updateStudent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            שמור שינויים
          </Button>
          <Button variant="outline" onClick={onClose} className="gap-1.5">
            <X className="h-4 w-4" />
            ביטול
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
