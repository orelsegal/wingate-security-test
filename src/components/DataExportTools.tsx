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

interface DataExportToolsProps {
  students: Student[];
  label?: string;
}

const statusLabels: Record<string, string> = {
  green: "במסלול",
  yellow: "פערים",
  red: "בסיכון",
};

export default function DataExportTools({ students, label = "ספורטאים" }: DataExportToolsProps) {
  const [importOpen, setImportOpen] = useState(false);

  const handleExcelExport = () => {
    const data = students.map(s => ({
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
  };

  const handleWhatsAppExport = () => {
    const lines = students.map(s => {
      const status = statusLabels[s.overall_status] || s.overall_status;
      const emoji = s.overall_status === "green" ? "🟢" : s.overall_status === "yellow" ? "🟡" : "🔴";
      return `${emoji} ${s.full_name} | ${s.sport} | ${s.class_name} | ממוצע: ${s.avg_score || "—"} | ${status}${s.notes ? ` | הערה: ${s.notes}` : ""}`;
    });

    const text = `📊 דוח ${label} – האקדמיה למצוינות\n${"─".repeat(30)}\n${lines.join("\n")}\n${"─".repeat(30)}\nסה״כ: ${students.length} ${label}`;

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
          ייצא לאקסל
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-[11px]" onClick={handleWhatsAppExport}>
          <MessageCircle className="h-3.5 w-3.5" />
          שלח לוואטסאפ
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-[11px]" onClick={() => setImportOpen(true)}>
          <Upload className="h-3.5 w-3.5" />
          ייבא מאקסל
        </Button>
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
