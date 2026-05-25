import { useState, useMemo, useEffect, useCallback } from "react";
import { useStudents, useSubjects, useStudentProgress, useStudentRoadmap, useSports } from "@/hooks/useStudents";
import { useUiLabels } from "@/context/UiLabelsContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, UserPlus, BookOpen, ClipboardEdit, Route, Loader2, CheckCircle2, Upload, History, FileSpreadsheet, Download, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

const CLASSES = ["ט'1", "ט'2", "ט'3", "ט-1", "י'1", "י'2", "י'3", "י-1", "יא'1", "יא'2", "יא'3", "י\"א-1"];

const DataEntryPageInner = () => {
  const { labels } = useUiLabels();
  const { data: students, isLoading: loadingStudents } = useStudents();
  const { data: subjects, isLoading: loadingSubjects } = useSubjects();
  const { data: sportsData = [] } = useSports();
  const SPORTS = useMemo(() => (sportsData as any[]).filter(s => s.active !== false).map(s => s.sport_name), [sportsData]);
  const queryClient = useQueryClient();

  // === Add Athlete State ===
  const [athleteName, setAthleteName] = useState("");
  const [athleteLastName, setAthleteLastName] = useState("");
  const [athleteSport, setAthleteSport] = useState("");
  const [athleteClass, setAthleteClass] = useState("");
  const [athleteMathLevel, setAthleteMathLevel] = useState("3");
  const [athleteNationalId, setAthleteNationalId] = useState("");
  const [athletePhone, setAthletePhone] = useState("");
  const [athleteEmergency, setAthleteEmergency] = useState("");
  const [athleteCoach, setAthleteCoach] = useState("");
  const [athleteNotes, setAthleteNotes] = useState("");
  const [savingAthlete, setSavingAthlete] = useState(false);
  const [athleteSuccess, setAthleteSuccess] = useState(false);

  // Coaches list for "assigned coach" selector
  const { data: coachesList = [] } = useQuery({
    queryKey: ["coaches-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_users")
        .select("id, full_name, linked_sport")
        .eq("role", "coach");
      if (error) throw error;
      return data || [];
    },
  });

  // === Grade Entry State ===
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [gradeSuccess, setGradeSuccess] = useState(false);
  const [grade, setGrade] = useState("");
  const [completionPercent, setCompletionPercent] = useState("0");
  const [absences, setAbsences] = useState("0");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("green");

  // === CSV Import State ===
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const selectedStudent = useMemo(
    () => students?.find((s) => s.id === selectedStudentId),
    [students, selectedStudentId]
  );

  const { data: existingProgress } = useStudentProgress(selectedStudentId);
  const currentProgress = useMemo(
    () => existingProgress?.find((p) => p.subject_id === selectedSubjectId),
    [existingProgress, selectedSubjectId]
  );

  const { data: roadmapItems } = useStudentRoadmap(selectedStudentId, selectedStudent?.math_level ?? 3);
  const subjectRoadmap = useMemo(
    () => roadmapItems?.filter((r) => r.subject_id === selectedSubjectId) || [],
    [roadmapItems, selectedSubjectId]
  );

  // === Recent entries ===
  const { data: recentEntries } = useQuery({
    queryKey: ["recent-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_subject_progress")
        .select("*, students(full_name), subjects(subject_name)")
        .order("id", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (currentProgress) {
      setGrade(currentProgress.grade?.toString() || "");
      setCompletionPercent(currentProgress.completion_percent?.toString() || "0");
      setAbsences(currentProgress.absences?.toString() || "0");
      setNotes(currentProgress.notes || "");
      setStatus(currentProgress.status || "green");
    }
  }, [currentProgress]);

  // === Add Athlete Handler ===
  const handleAddAthlete = async () => {
    if (!athleteName.trim() || !athleteSport || !athleteClass) {
      toast.error("יש למלא שם, ענף ספורט וכיתה");
      return;
    }
    setSavingAthlete(true);
    setAthleteSuccess(false);
    try {
      const { error } = await supabase.from("students").insert({
        full_name: athleteName.trim(),
        sport: athleteSport,
        class_name: athleteClass,
        math_level: parseInt(athleteMathLevel) || 3,
        overall_status: "green",
        completion_percent: 0,
      });
      if (error) throw error;
      toast.success(`הספורטאי "${athleteName.trim()}" נוסף בהצלחה!`);
      setAthleteSuccess(true);
      setAthleteName("");
      setAthleteSport("");
      setAthleteClass("");
      setAthleteMathLevel("3");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setTimeout(() => setAthleteSuccess(false), 3000);
    } catch (err: any) {
      toast.error("שגיאה בהוספת ספורטאי: " + err.message);
    } finally {
      setSavingAthlete(false);
    }
  };

  // === Grade Entry Handler ===
  const handleSaveProgress = async () => {
    if (!selectedStudentId || !selectedSubjectId) {
      toast.error("יש לבחור ספורטאי ומקצוע");
      return;
    }
    setSaving(true);
    setGradeSuccess(false);
    try {
      const payload = {
        grade: grade ? parseFloat(grade) : null,
        completion_percent: parseInt(completionPercent) || 0,
        absences: parseInt(absences) || 0,
        notes: notes || null,
        status,
      };
      if (currentProgress) {
        const { error } = await supabase.from("student_subject_progress").update(payload).eq("id", currentProgress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("student_subject_progress").insert({ student_id: selectedStudentId, subject_id: selectedSubjectId, ...payload });
        if (error) throw error;
      }
      toast.success("הציון נשמר בהצלחה!");
      setGradeSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["student-progress"] });
      queryClient.invalidateQueries({ queryKey: ["all-student-progress"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["recent-entries"] });
      setTimeout(() => setGradeSuccess(false), 3000);
    } catch (err: any) {
      toast.error("שגיאה בשמירה: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRoadmapItem = async (itemId: string, currentCompleted: boolean, progressId: string | null) => {
    try {
      if (currentCompleted && progressId) {
        await supabase.from("student_roadmap_progress").delete().eq("id", progressId);
      } else {
        await supabase.from("student_roadmap_progress").insert({
          student_id: selectedStudentId,
          roadmap_item_id: itemId,
          completed: true,
          completion_date: new Date().toISOString(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["student-roadmap"] });
      toast.success(currentCompleted ? "סומן כלא הושלם" : "סומן כהושלם ✓");
    } catch (err: any) {
      toast.error("שגיאה: " + err.message);
    }
  };

  // === CSV/Excel Import ===
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErrors([]);
    setImportPreview(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!rows.length) {
          setImportErrors(["הקובץ ריק"]);
          return;
        }

        // Validate required columns
        const requiredCols = ["שם_תלמיד", "מקצוע", "ציון"];
        const firstRow = rows[0];
        const missingCols = requiredCols.filter((c) => !(c in firstRow));
        if (missingCols.length) {
          setImportErrors([`עמודות חסרות: ${missingCols.join(", ")}. נדרש: שם_תלמיד, מקצוע, ציון`]);
          return;
        }

        setImportPreview(rows);
      } catch {
        setImportErrors(["שגיאה בקריאת הקובץ. ודא שזה קובץ Excel או CSV תקין."]);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }, []);

  const handleImportConfirm = async () => {
    if (!importPreview?.length || !students?.length || !subjects?.length) return;
    setImporting(true);
    const errors: string[] = [];
    let successCount = 0;

    const studentMap = new Map(students.map((s) => [s.full_name, s.id]));
    const subjectMap = new Map(subjects.map((s) => [s.subject_name, s.id]));

    for (let i = 0; i < importPreview.length; i++) {
      const row = importPreview[i];
      const studentName = String(row["שם_תלמיד"] || "").trim();
      const subjectName = String(row["מקצוע"] || "").trim();
      const gradeVal = parseFloat(row["ציון"]);
      const compVal = parseInt(row["אחוז_השלמה"]) || 0;
      const absVal = parseInt(row["חיסורים"]) || 0;
      const statusVal = String(row["סטטוס"] || "green").trim();
      const notesVal = row["הערות"] ? String(row["הערות"]) : null;

      const studentId = studentMap.get(studentName);
      const subjectId = subjectMap.get(subjectName);

      if (!studentId) { errors.push(`שורה ${i + 2}: תלמיד "${studentName}" לא נמצא`); continue; }
      if (!subjectId) { errors.push(`שורה ${i + 2}: מקצוע "${subjectName}" לא נמצא`); continue; }
      if (isNaN(gradeVal)) { errors.push(`שורה ${i + 2}: ציון לא תקין`); continue; }

      // Check for existing record
      const { data: existing } = await supabase
        .from("student_subject_progress")
        .select("id")
        .eq("student_id", studentId)
        .eq("subject_id", subjectId)
        .maybeSingle();

      const payload = {
        grade: gradeVal,
        completion_percent: compVal,
        absences: absVal,
        status: ["green", "yellow", "red"].includes(statusVal) ? statusVal : "green",
        notes: notesVal,
      };

      if (existing) {
        const { error } = await supabase.from("student_subject_progress").update(payload).eq("id", existing.id);
        if (error) { errors.push(`שורה ${i + 2}: ${error.message}`); continue; }
      } else {
        const { error } = await supabase.from("student_subject_progress").insert({ student_id: studentId, subject_id: subjectId, ...payload });
        if (error) { errors.push(`שורה ${i + 2}: ${error.message}`); continue; }
      }
      successCount++;
    }

    setImporting(false);
    setImportErrors(errors);
    if (successCount > 0) {
      toast.success(`${successCount} ציונים יובאו בהצלחה!`);
      setImportPreview(null);
      queryClient.invalidateQueries({ queryKey: ["student-progress"] });
      queryClient.invalidateQueries({ queryKey: ["all-student-progress"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["recent-entries"] });
    }
    if (errors.length) {
      toast.error(`${errors.length} שגיאות בייבוא`);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { "שם_תלמיד": "שטיינר נועם", "מקצוע": "מתמטיקה", "ציון": 85, "אחוז_השלמה": 60, "חיסורים": 2, "סטטוס": "green", "הערות": "משתפר" },
      { "שם_תלמיד": "שטיינר נועם", "מקצוע": "אנגלית", "ציון": 78, "אחוז_השלמה": 50, "חיסורים": 1, "סטטוס": "yellow", "הערות": "" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ציונים");
    XLSX.writeFile(wb, "תבנית_ייבוא_ציונים.xlsx");
  };

  const statusOptions = [
    { value: "green", label: "במסלול", color: "bg-success" },
    { value: "yellow", label: "פערים", color: "bg-warning" },
    { value: "red", label: "בסיכון", color: "bg-destructive" },
  ];

  const statusLabel = (s: string) => statusOptions.find((o) => o.value === s)?.label || s;

  if (loadingStudents || loadingSubjects) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardEdit className="h-6 w-6 text-primary" strokeWidth={1.5} />
          {labels.pages.dataEntry.title}
        </h1>
        <p className="text-sm text-muted-foreground">{labels.pages.dataEntry.subtitle}</p>
      </div>

      <Tabs defaultValue="add-athlete" dir="rtl">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="add-athlete" className="gap-1 text-xs md:text-sm">
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden md:inline">הוספת ספורטאי</span>
            <span className="md:hidden">הוספה</span>
          </TabsTrigger>
          <TabsTrigger value="grade-entry" className="gap-1 text-xs md:text-sm">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden md:inline">הזנת ציונים</span>
            <span className="md:hidden">ציונים</span>
          </TabsTrigger>
          <TabsTrigger value="bulk-import" className="gap-1 text-xs md:text-sm">
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden md:inline">ייבוא מאסיבי</span>
            <span className="md:hidden">ייבוא</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1 text-xs md:text-sm">
            <History className="h-3.5 w-3.5" />
            <span className="hidden md:inline">היסטוריה</span>
            <span className="md:hidden">היסטוריה</span>
          </TabsTrigger>
        </TabsList>

        {/* ====== TAB 1: ADD ATHLETE ====== */}
        <TabsContent value="add-athlete" className="space-y-4 mt-4">
          <Card className="card-premium">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" strokeWidth={1.5} />
                פרטי ספורטאי חדש
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">שם מלא</Label>
                <Input value={athleteName} onChange={(e) => setAthleteName(e.target.value)} placeholder="לדוגמה: יעל כהן" dir="rtl" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">ענף ספורט</Label>
                  <Select value={athleteSport} onValueChange={setAthleteSport}>
                    <SelectTrigger><SelectValue placeholder="בחר ענף..." /></SelectTrigger>
                    <SelectContent>{SPORTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">כיתה</Label>
                  <Select value={athleteClass} onValueChange={setAthleteClass}>
                    <SelectTrigger><SelectValue placeholder="בחר כיתה..." /></SelectTrigger>
                    <SelectContent>{CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">רמת מתמטיקה (3/4/5)</Label>
                <Select value={athleteMathLevel} onValueChange={setAthleteMathLevel}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 יח"ל</SelectItem>
                    <SelectItem value="4">4 יח"ל</SelectItem>
                    <SelectItem value="5">5 יח"ל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleAddAthlete} disabled={savingAthlete} className="gap-2" size="lg">
                  {savingAthlete ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  שמור ספורטאי
                </Button>
                {athleteSuccess && (
                  <span className="flex items-center gap-1.5 text-sm text-success animate-fade-in-up">
                    <CheckCircle2 className="h-4 w-4" /> נשמר בהצלחה!
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== TAB 2: GRADE ENTRY ====== */}
        <TabsContent value="grade-entry" className="space-y-4 mt-4">
          <Card className="card-premium">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" strokeWidth={1.5} />
                בחירת ספורטאי ומקצוע
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">ספורטאי</Label>
                <Select value={selectedStudentId} onValueChange={(v) => { setSelectedStudentId(v); setSelectedSubjectId(""); }}>
                  <SelectTrigger><SelectValue placeholder="בחר ספורטאי..." /></SelectTrigger>
                  <SelectContent>
                    {students?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.sport} ({s.class_name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">מקצוע</Label>
                <Select value={selectedSubjectId} onValueChange={(v) => { setSelectedSubjectId(v); setGrade(""); setCompletionPercent("0"); setAbsences("0"); setNotes(""); setStatus("green"); }} disabled={!selectedStudentId}>
                  <SelectTrigger><SelectValue placeholder="בחר מקצוע..." /></SelectTrigger>
                  <SelectContent>
                    {subjects?.map((s) => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selectedStudentId && selectedSubjectId && (
            <Card className="card-premium animate-fade-in-up">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  ציונים והערכה
                  {currentProgress && <span className="text-xs font-normal text-muted-foreground mr-2">(עדכון רשומה קיימת)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">ציון (0-100)</Label>
                    <Input type="number" min={0} max={100} value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="85" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">אחוז השלמה</Label>
                    <Input type="number" min={0} max={100} value={completionPercent} onChange={(e) => setCompletionPercent(e.target.value)} placeholder="0-100" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">חיסורים</Label>
                    <Input type="number" min={0} value={absences} onChange={(e) => setAbsences(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">סטטוס</Label>
                  <div className="flex gap-2 flex-wrap">
                    {statusOptions.map((opt) => (
                      <button key={opt.value} onClick={() => setStatus(opt.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 border ${
                          status === opt.value ? "border-primary/30 bg-primary/5 text-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:bg-accent"
                        }`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">הערות</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="הערכה כללית, נקודות לשיפור..." className="min-h-[80px] resize-none" />
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={handleSaveProgress} disabled={saving} className="gap-2" size="lg">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {currentProgress ? "עדכן ציון" : "שמור ציון"}
                  </Button>
                  {gradeSuccess && (
                    <span className="flex items-center gap-1.5 text-sm text-success animate-fade-in-up">
                      <CheckCircle2 className="h-4 w-4" /> נשמר בהצלחה!
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedStudentId && selectedSubjectId && subjectRoadmap.length > 0 && (
            <Card className="card-premium animate-fade-in-up">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Route className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  מפת דרכים — סימון נושאים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {subjectRoadmap.map((item) => (
                    <label key={item.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                      item.completed ? "bg-success/5 border-success/20" : "bg-card border-border hover:bg-accent/50"
                    }`}>
                      <Checkbox checked={item.completed} onCheckedChange={() => handleToggleRoadmapItem(item.id, item.completed, item.progress_id)} />
                      <span className={`text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.topic_name}</span>
                      {item.required_for_completion && (
                        <span className="mr-auto text-[10px] text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full">נדרש להשלמה</span>
                      )}
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ====== TAB 3: BULK IMPORT ====== */}
        <TabsContent value="bulk-import" className="space-y-4 mt-4">
          <Card className="card-premium">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" strokeWidth={1.5} />
                ייבוא ציונים מקובץ Excel / CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">הוראות:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>הורד את קובץ התבנית למטה</li>
                  <li>מלא את הנתונים: שם_תלמיד, מקצוע, ציון (חובה), ואופציונלי: אחוז_השלמה, חיסורים, סטטוס, הערות</li>
                  <li>שמות התלמידים והמקצועות חייבים להיות זהים לשמות במערכת</li>
                  <li>סטטוס: green / yellow / red</li>
                </ol>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  הורד תבנית Excel
                </Button>
                <label className="cursor-pointer inline-flex">
                  <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    העלה קובץ
                  </span>
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>

              {importErrors.length > 0 && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-1">
                  <p className="text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    שגיאות בייבוא:
                  </p>
                  <ul className="text-xs text-destructive/80 space-y-0.5 max-h-32 overflow-y-auto">
                    {importErrors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </div>
              )}

              {importPreview && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">תצוגה מקדימה ({importPreview.length} שורות):</p>
                  <div className="max-h-64 overflow-auto border rounded-xl">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">שם תלמיד</TableHead>
                          <TableHead className="text-right">מקצוע</TableHead>
                          <TableHead className="text-right">ציון</TableHead>
                          <TableHead className="text-right">אחוז השלמה</TableHead>
                          <TableHead className="text-right">סטטוס</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-right">{row["שם_תלמיד"]}</TableCell>
                            <TableCell className="text-right">{row["מקצוע"]}</TableCell>
                            <TableCell className="text-right">{row["ציון"]}</TableCell>
                            <TableCell className="text-right">{row["אחוז_השלמה"] || "-"}</TableCell>
                            <TableCell className="text-right">{row["סטטוס"] || "green"}</TableCell>
                          </TableRow>
                        ))}
                        {importPreview.length > 10 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground">...ועוד {importPreview.length - 10} שורות</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleImportConfirm} disabled={importing} className="gap-2">
                      {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      אשר ייבוא ({importPreview.length} שורות)
                    </Button>
                    <Button variant="outline" onClick={() => { setImportPreview(null); setImportErrors([]); }}>
                      ביטול
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== TAB 4: HISTORY ====== */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card className="card-premium">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" strokeWidth={1.5} />
                הזנות אחרונות
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!recentEntries?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">אין הזנות עדיין</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">ספורטאי</TableHead>
                        <TableHead className="text-right">מקצוע</TableHead>
                        <TableHead className="text-right">ציון</TableHead>
                        <TableHead className="text-right">אחוז השלמה</TableHead>
                        <TableHead className="text-right">חיסורים</TableHead>
                        <TableHead className="text-right">סטטוס</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-right font-medium">{(entry.students as any)?.full_name || "—"}</TableCell>
                          <TableCell className="text-right">{(entry.subjects as any)?.subject_name || "—"}</TableCell>
                          <TableCell className="text-right">{entry.grade ?? "—"}</TableCell>
                          <TableCell className="text-right">{entry.completion_percent}%</TableCell>
                          <TableCell className="text-right">{entry.absences}</TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
                              entry.status === "green" ? "bg-success/10 text-success" :
                              entry.status === "yellow" ? "bg-warning/10 text-warning" :
                              "bg-destructive/10 text-destructive"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                entry.status === "green" ? "bg-success" :
                                entry.status === "yellow" ? "bg-warning" : "bg-destructive"
                              }`} />
                              {statusLabel(entry.status)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataEntryPageInner;
