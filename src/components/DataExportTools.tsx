import { useState } from "react";
import { Download, Upload, MessageCircle, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Student {
  full_name: string;
  sport: string;
  class_name: string;
  avg_score?: number | null;
  overall_status: string;
  completion_percent?: number;
  notes?: string | null;
}

interface SubjectProgress {
  subjectName: string;
  grade?: number | null;
  status?: string;
  completionPercent?: number;
  absences?: number;
  notes?: string | null;
  missingItems?: string[];
  coveredTopics?: string[];
}

interface DataExportToolsProps {
  students?: Student[];
  /** For single-student export */
  student?: Student;
  /** Subject progress for the student or group */
  subjectProgress?: SubjectProgress[];
  label?: string;
  /** Context info for WhatsApp message header */
  contextLabel?: string;
  /** Show import button */
  showImport?: boolean;
  /** Compact mode - fewer buttons */
  compact?: boolean;
}

const statusLabels: Record<string, string> = {
  green: "במסלול",
  yellow: "פערים",
  red: "בסיכון",
};

const statusEmoji: Record<string, string> = {
  green: "🟢",
  yellow: "🟡",
  red: "🔴",
};

export default function DataExportTools({
  students,
  student,
  subjectProgress,
  label = "ספורטאים",
  contextLabel,
  showImport = false,
  compact = false,
}: DataExportToolsProps) {
  const [importOpen, setImportOpen] = useState(false);

  const effectiveStudents = students || (student ? [student] : []);
  const header = contextLabel || label;

  const handleExcelExport = () => {
    if (subjectProgress && subjectProgress.length > 0) {
      // Export subject progress data
      const data = subjectProgress.map(sp => ({
        "מקצוע": sp.subjectName,
        "ציון": sp.grade ?? "—",
        "סטטוס": statusLabels[sp.status || ""] || sp.status || "—",
        "אחוז השלמה": sp.completionPercent ?? 0,
        "חיסורים": sp.absences ?? 0,
        "נושאים שנלמדו": (sp.coveredTopics || []).join(", "),
        "חוסרים": (sp.missingItems || []).join(", "),
        "הערות": sp.notes || "",
      }));

      // If single student, add student info sheet
      const wb = XLSX.utils.book_new();
      if (student) {
        const studentData = [{
          "שם מלא": student.full_name,
          "ענף": student.sport,
          "כיתה": student.class_name,
          "ממוצע": student.avg_score || 0,
          "סטטוס": statusLabels[student.overall_status] || student.overall_status,
          "אחוז השלמה": student.completion_percent || 0,
          "הערות": student.notes || "",
        }];
        const ws1 = XLSX.utils.json_to_sheet(studentData);
        XLSX.utils.book_append_sheet(wb, ws1, "פרטי תלמיד");
      }
      const ws2 = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws2, "מקצועות");
      XLSX.writeFile(wb, `${header}_ייצוא.xlsx`);
      toast.success(`נתוני ${header} יוצאו לאקסל`);
    } else {
      // Export students list
      const data = effectiveStudents.map(s => ({
        "שם מלא": s.full_name,
        "ענף": s.sport,
        "כיתה": s.class_name,
        "ממוצע": s.avg_score || 0,
        "סטטוס": statusLabels[s.overall_status] || s.overall_status,
        "אחוז השלמה": s.completion_percent || 0,
        "הערות": s.notes || "",
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, label);
      XLSX.writeFile(wb, `${label}_ייצוא.xlsx`);
      toast.success(`${data.length} ${label} יוצאו לאקסל`);
    }
  };

  const handleWhatsAppExport = () => {
    let text = `📊 דוח ${header} – האקדמיה למצוינות\n${"─".repeat(30)}\n`;

    if (subjectProgress && subjectProgress.length > 0 && student) {
      // Single student with subjects
      text += `👤 ${student.full_name} | ${student.sport} | ${student.class_name}\n`;
      text += `${statusEmoji[student.overall_status] || "⚪"} סטטוס: ${statusLabels[student.overall_status] || student.overall_status} | ממוצע: ${student.avg_score || "—"}\n`;
      text += `${"─".repeat(30)}\n📚 מקצועות:\n`;
      subjectProgress.forEach(sp => {
        const emoji = statusEmoji[sp.status || ""] || "⚪";
        text += `${emoji} ${sp.subjectName}: ציון ${sp.grade ?? "—"} | ${sp.completionPercent ?? 0}%`;
        if (sp.missingItems && sp.missingItems.length > 0) {
          text += ` | חוסרים: ${sp.missingItems.join(", ")}`;
        }
        if (sp.notes) text += ` | ${sp.notes}`;
        text += "\n";
      });
    } else {
      // Multiple students
      effectiveStudents.forEach(s => {
        const emoji = statusEmoji[s.overall_status] || "⚪";
        text += `${emoji} ${s.full_name} | ${s.sport} | ${s.class_name} | ממוצע: ${s.avg_score || "—"} | ${statusLabels[s.overall_status] || s.overall_status}`;
        if (s.notes) text += ` | הערה: ${s.notes}`;
        text += "\n";
      });
    }

    text += `${"─".repeat(30)}\nסה״כ: ${subjectProgress ? `${subjectProgress.length} מקצועות` : `${effectiveStudents.length} ${label}`}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
    toast.success("נפתח חלון שליחה לוואטסאפ");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        toast.success(`${rows.length} שורות נקראו מהקובץ. ייבוא נתונים בקרוב.`);
        setImportOpen(false);
      } catch {
        toast.error("שגיאה בקריאת הקובץ");
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button variant="outline" size="sm" className="gap-1.5 text-[11px]" onClick={handleExcelExport}>
          <FileSpreadsheet className="h-3.5 w-3.5" />
          {compact ? "אקסל" : "ייצא לאקסל"}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-[11px]" onClick={handleWhatsAppExport}>
          <MessageCircle className="h-3.5 w-3.5" />
          {compact ? "וואטסאפ" : "שלח לוואטסאפ"}
        </Button>
        {showImport && (
          <Button variant="outline" size="sm" className="gap-1.5 text-[11px]" onClick={() => setImportOpen(true)}>
            <Upload className="h-3.5 w-3.5" />
            ייבא מאקסל
          </Button>
        )}
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent dir="rtl" className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[15px]">ייבוא מאקסל</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-[12px] text-muted-foreground">העלה קובץ Excel (.xlsx) עם נתוני {label}</p>
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
              <Upload className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <label className="cursor-pointer">
                <span className="text-[12px] text-primary font-medium hover:underline">בחר קובץ</span>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
              </label>
            </div>
            <Button variant="outline" onClick={() => setImportOpen(false)} className="w-full text-[12px]">ביטול</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
