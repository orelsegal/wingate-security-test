import { useState, useMemo, useEffect } from "react";
import { useStudents, useSubjects, useStudentProgress, useStudentRoadmap } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, UserPlus, BookOpen, ClipboardEdit, Route, Loader2, CheckCircle2 } from "lucide-react";

const SPORTS = ["כדורגל", "התעמלות", "שחייה", "אתלטיקה", "ג'ודו", "טניס"];
const CLASSES = ["ט'1", "ט'2", "ט'3", "י'1", "י'2", "י'3", "יא'1", "יא'2", "יא'3"];

const DataEntryPage = () => {
  const { data: students, isLoading: loadingStudents } = useStudents();
  const { data: subjects, isLoading: loadingSubjects } = useSubjects();
  const queryClient = useQueryClient();

  // === Add Athlete State ===
  const [athleteName, setAthleteName] = useState("");
  const [athleteSport, setAthleteSport] = useState("");
  const [athleteClass, setAthleteClass] = useState("");
  const [athleteMathLevel, setAthleteMathLevel] = useState("3");
  const [savingAthlete, setSavingAthlete] = useState(false);
  const [athleteSuccess, setAthleteSuccess] = useState(false);

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

  // Populate form when existing progress loads
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
        const { error } = await supabase
          .from("student_subject_progress")
          .update(payload)
          .eq("id", currentProgress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("student_subject_progress")
          .insert({
            student_id: selectedStudentId,
            subject_id: selectedSubjectId,
            ...payload,
          });
        if (error) throw error;
      }

      toast.success("הציון נשמר בהצלחה!");
      setGradeSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["student-progress"] });
      queryClient.invalidateQueries({ queryKey: ["all-student-progress"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
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

  const statusOptions = [
    { value: "green", label: "במסלול", color: "bg-success" },
    { value: "yellow", label: "פערים", color: "bg-warning" },
    { value: "red", label: "בסיכון", color: "bg-destructive" },
  ];

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
          ממשק ניהול
        </h1>
        <p className="text-sm text-muted-foreground">הוספת ספורטאים חדשים והזנת ציונים</p>
      </div>

      <Tabs defaultValue="add-athlete" dir="rtl">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="add-athlete" className="gap-2">
            <UserPlus className="h-4 w-4" />
            הוספת ספורטאי
          </TabsTrigger>
          <TabsTrigger value="grade-entry" className="gap-2">
            <BookOpen className="h-4 w-4" />
            הזנת ציונים
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
                <Input
                  value={athleteName}
                  onChange={(e) => setAthleteName(e.target.value)}
                  placeholder="לדוגמה: יעל כהן"
                  dir="rtl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">ענף ספורט</Label>
                  <Select value={athleteSport} onValueChange={setAthleteSport}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר ענף..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORTS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">כיתה</Label>
                  <Select value={athleteClass} onValueChange={setAthleteClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר כיתה..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">רמת מתמטיקה (3/4/5)</Label>
                <Select value={athleteMathLevel} onValueChange={setAthleteMathLevel}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 יח"ל</SelectItem>
                    <SelectItem value="4">4 יח"ל</SelectItem>
                    <SelectItem value="5">5 יח"ל</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleAddAthlete}
                  disabled={savingAthlete}
                  className="gap-2"
                  size="lg"
                >
                  {savingAthlete ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  שמור ספורטאי
                </Button>
                {athleteSuccess && (
                  <span className="flex items-center gap-1.5 text-sm text-success animate-fade-in">
                    <CheckCircle2 className="h-4 w-4" />
                    נשמר בהצלחה!
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== TAB 2: GRADE ENTRY ====== */}
        <TabsContent value="grade-entry" className="space-y-4 mt-4">
          {/* Select student + subject */}
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
                  <SelectTrigger>
                    <SelectValue placeholder="בחר ספורטאי..." />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} — {s.sport} ({s.class_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">מקצוע</Label>
                <Select
                  value={selectedSubjectId}
                  onValueChange={(v) => {
                    setSelectedSubjectId(v);
                    setGrade("");
                    setCompletionPercent("0");
                    setAbsences("0");
                    setNotes("");
                    setStatus("green");
                  }}
                  disabled={!selectedStudentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר מקצוע..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.subject_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Grade form */}
          {selectedStudentId && selectedSubjectId && (
            <Card className="card-premium animate-fade-in-up">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  ציונים והערכה
                  {currentProgress && (
                    <span className="text-xs font-normal text-muted-foreground mr-2">(עדכון רשומה קיימת)</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">ציון (0-100)</Label>
                    <Input
                      type="number" min={0} max={100}
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="85"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">אחוז השלמה</Label>
                    <Input
                      type="number" min={0} max={100}
                      value={completionPercent}
                      onChange={(e) => setCompletionPercent(e.target.value)}
                      placeholder="0-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">חיסורים</Label>
                    <Input
                      type="number" min={0}
                      value={absences}
                      onChange={(e) => setAbsences(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">סטטוס</Label>
                  <div className="flex gap-2 flex-wrap">
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setStatus(opt.value)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 border ${
                          status === opt.value
                            ? "border-primary/30 bg-primary/5 text-foreground shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">הערות</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="הערכה כללית, נקודות לשיפור..."
                    className="min-h-[80px] resize-none"
                  />
                </div>

                {/* Save */}
                <div className="flex items-center gap-3">
                  <Button onClick={handleSaveProgress} disabled={saving} className="gap-2" size="lg">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {currentProgress ? "עדכן ציון" : "שמור ציון"}
                  </Button>
                  {gradeSuccess && (
                    <span className="flex items-center gap-1.5 text-sm text-success animate-fade-in">
                      <CheckCircle2 className="h-4 w-4" />
                      נשמר בהצלחה!
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Roadmap */}
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
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                        item.completed
                          ? "bg-success/5 border-success/20"
                          : "bg-card border-border hover:bg-accent/50"
                      }`}
                    >
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => handleToggleRoadmapItem(item.id, item.completed, item.progress_id)}
                      />
                      <span className={`text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.topic_name}
                      </span>
                      {item.required_for_completion && (
                        <span className="mr-auto text-[10px] text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full">
                          נדרש להשלמה
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataEntryPage;
