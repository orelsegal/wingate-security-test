import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
    first_name: "",
    last_name: "",
    sport: "",
    class_name: "",
    math_level: "3",
    diagnosis_status: "",
    bagrut_accommodations: "",
    english_support: "",
    book_name: "",
    book_grade: "",
    summative_assessment: "",
    exams_completed: "",
    notes: "",
    overall_status: "green",
  });

  useEffect(() => {
    if (student) {
      setForm({
        first_name: (student as any).first_name || student.full_name?.split(" ")[0] || "",
        last_name: (student as any).last_name || student.full_name?.split(" ").slice(1).join(" ") || "",
        sport: student.sport || "",
        class_name: student.class_name || "",
        math_level: String(student.math_level || 3),
        diagnosis_status: (student as any).diagnosis_status || "",
        bagrut_accommodations: (student as any).bagrut_accommodations || "",
        english_support: (student as any).english_support || "",
        book_name: (student as any).book_name || "",
        book_grade: (student as any).book_grade != null ? String((student as any).book_grade) : "",
        summative_assessment: (student as any).summative_assessment || "",
        exams_completed: (student as any).exams_completed || "",
        notes: (student as any).notes || "",
        overall_status: student.overall_status || "green",
      });
    } else {
      setForm({
        first_name: "", last_name: "", sport: "", class_name: "", math_level: "3",
        diagnosis_status: "", bagrut_accommodations: "", english_support: "",
        book_name: "", book_grade: "", summative_assessment: "", exams_completed: "",
        notes: "", overall_status: "green",
      });
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
      diagnosis_status: form.diagnosis_status,
      bagrut_accommodations: form.bagrut_accommodations,
      english_support: form.english_support,
      book_name: form.book_name,
      book_grade: form.book_grade ? parseFloat(form.book_grade) : null,
      summative_assessment: form.summative_assessment,
      exams_completed: form.exams_completed,
      notes: form.notes,
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

  const statusOptions = [
    { value: "green", label: "במסלול", color: "bg-success" },
    { value: "yellow", label: "פערים", color: "bg-warning" },
    { value: "red", label: "בסיכון", color: "bg-destructive" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "עריכת ספורטאי" : duplicate ? "שכפול ספורטאי" : "הוספת ספורטאי חדש"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">שם פרטי *</Label>
              <Input value={form.first_name} onChange={(e) => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="יעל" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">שם משפחה</Label>
              <Input value={form.last_name} onChange={(e) => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="כהן" />
            </div>
          </div>

          {/* Sport & Class */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ענף ספורט *</Label>
              <Select value={form.sport} onValueChange={(v) => setForm(p => ({ ...p, sport: v }))}>
                <SelectTrigger><SelectValue placeholder="בחר ענף..." /></SelectTrigger>
                <SelectContent>
                  {sportsList.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">כיתה *</Label>
              <Select value={form.class_name} onValueChange={(v) => setForm(p => ({ ...p, class_name: v }))}>
                <SelectTrigger><SelectValue placeholder="בחר כיתה..." /></SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Math & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">רמת מתמטיקה</Label>
              <Select value={form.math_level} onValueChange={(v) => setForm(p => ({ ...p, math_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 יח"ל</SelectItem>
                  <SelectItem value="4">4 יח"ל</SelectItem>
                  <SelectItem value="5">5 יח"ל</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">סטטוס</Label>
              <div className="flex gap-1.5">
                {statusOptions.map((opt) => (
                  <button key={opt.value} onClick={() => setForm(p => ({ ...p, overall_status: opt.value }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      form.overall_status === opt.value ? "border-primary/30 bg-primary/5 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-accent"
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Diagnosis & Accommodations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">אבחון / לקות</Label>
              <Input value={form.diagnosis_status} onChange={(e) => setForm(p => ({ ...p, diagnosis_status: e.target.value }))} placeholder="למשל: הפרעת קשב" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">התאמות בגרות</Label>
              <Input value={form.bagrut_accommodations} onChange={(e) => setForm(p => ({ ...p, bagrut_accommodations: e.target.value }))} placeholder="למשל: הארכת זמן 25%" />
            </div>
          </div>

          {/* English & Exams */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">תמיכה באנגלית</Label>
              <Input value={form.english_support} onChange={(e) => setForm(p => ({ ...p, english_support: e.target.value }))} placeholder="למשל: שיעור פרטי" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">בחינות שהושלמו</Label>
              <Input value={form.exams_completed} onChange={(e) => setForm(p => ({ ...p, exams_completed: e.target.value }))} placeholder="למשל: 3 מתוך 7" />
            </div>
          </div>

          {/* Book & Grade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">שם ספר</Label>
              <Input value={form.book_name} onChange={(e) => setForm(p => ({ ...p, book_name: e.target.value }))} placeholder="שם הספר" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ציון ספר (0-100)</Label>
              <Input type="number" min={0} max={100} value={form.book_grade} onChange={(e) => setForm(p => ({ ...p, book_grade: e.target.value }))} placeholder="85" />
            </div>
          </div>

          {/* Summative */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">הערכה מסכמת</Label>
            <Input value={form.summative_assessment} onChange={(e) => setForm(p => ({ ...p, summative_assessment: e.target.value }))} placeholder="הערכה מסכמת" />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">הערות</Label>
            <Textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="הערות נוספות..." className="min-h-[60px] resize-none" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "עדכן" : "שמור"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
