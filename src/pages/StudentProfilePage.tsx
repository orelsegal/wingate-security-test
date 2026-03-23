import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, AlertCircle, CheckCircle2, Target, AlertTriangle, ShieldAlert, ChevronDown, Loader2, FileText, Stethoscope, Languages, Check, GraduationCap, Hash, ClipboardList, PenLine } from "lucide-react";
import InitialsAvatar from "@/components/InitialsAvatar";
import { useStudent, useStudentProgress, useStudentRoadmap, useUpdateStudent, statusConfig, type StatusType } from "@/hooks/useStudents";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { InlineEdit, InlineSelect, ChipEditor } from "@/components/InlineEdit";
import DataExportTools from "@/components/DataExportTools";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const ProgressRing = ({ value }: { value: number }) => {
  const radius = 40;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "hsl(var(--success))" : value >= 65 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
        <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700 ease-out" />
      </svg>
      <span className="absolute text-[22px] font-semibold text-foreground">{value}</span>
    </div>
  );
};

const MATH_SUBJECT_ID = "a1111111-0000-0000-0000-000000000001";

const STATUS_OPTIONS = [
  { value: "green", label: "במסלול", color: "bg-success" },
  { value: "yellow", label: "פערים", color: "bg-warning" },
  { value: "red", label: "בסיכון", color: "bg-destructive" },
];

const MATH_LEVEL_OPTIONS = [
  { value: "3", label: "3 יח״ל" },
  { value: "4", label: "4 יח״ל" },
  { value: "5", label: "5 יח״ל" },
];

const CLASS_OPTIONS = ["ט'1", "ט'2", "ט'3", "י'1", "י'2", "י'3", "יא'1", "יא'2", "יא'3"].map(c => ({ value: c, label: c }));

const ENGLISH_OPTIONS = [
  { value: "", label: "לא מוגדר" },
  { value: "שיעור פרטי", label: "שיעור פרטי" },
  { value: "תגבור קבוצתי", label: "תגבור קבוצתי" },
  { value: "פטור", label: "פטור" },
  { value: "רגיל", label: "רגיל" },
];

const ASSESSMENT_OPTIONS = [
  { value: "", label: "לא הוגדר" },
  { value: "מצוין", label: "מצוין" },
  { value: "טוב מאוד", label: "טוב מאוד" },
  { value: "טוב", label: "טוב" },
  { value: "מספיק", label: "מספיק" },
  { value: "לא מספיק", label: "לא מספיק" },
];

const StudentProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updateStudent = useUpdateStudent();
  const { data: student, isLoading: studentLoading } = useStudent(id || "");
  const { data: subjectProgress = [], isLoading: progressLoading } = useStudentProgress(id || "");

  const [mathLevel, setMathLevel] = useState<number | null>(null);
  const effectiveMathLevel = mathLevel ?? student?.math_level ?? 3;
  const { data: roadmapItems = [] } = useStudentRoadmap(id || "", effectiveMathLevel);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const isEditable = user?.role === "admin" || user?.role === "teacher";

  const saveField = useCallback(async (field: string, value: any) => {
    if (!student) return;
    try {
      console.log(`[SaveField] ${field} =`, value);
      await updateStudent.mutateAsync({ id: student.id, data: { [field]: value } });
      toast.success("נשמר בהצלחה");
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (err: any) {
      console.error("[SaveField] Error:", err);
      toast.error("שמירה נכשלה: " + err.message);
    }
  }, [student, updateStudent]);

  const roadmapBySubject = useMemo(() => {
    const map = new Map<string, typeof roadmapItems>();
    roadmapItems.forEach((item) => {
      const subjName = (item as any).subjects?.subject_name || "אחר";
      if (!map.has(subjName)) map.set(subjName, []);
      map.get(subjName)!.push(item);
    });
    return map;
  }, [roadmapItems]);

  const overallProgress = useMemo(() => {
    if (subjectProgress.length > 0) {
      return Math.round(subjectProgress.reduce((sum, sp) => sum + (sp.grade || 0), 0) / subjectProgress.length);
    }
    return student?.completion_percent ?? 0;
  }, [subjectProgress, student]);

  if (studentLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">הספורטאי לא נמצא</p>
      </div>
    );
  }

  const hasAccess =
    user?.role === "admin" ||
    user?.role === "teacher" ||
    (user?.role === "parent" && user.scopeFilter?.includes(student.id)) ||
    (user?.role === "coach" && user.scopeFilter?.includes(student.sport));

  if (!hasAccess) {
    return (
      <div className="p-10 text-center space-y-3">
        <ShieldAlert className="h-10 w-10 text-destructive mx-auto" strokeWidth={1.5} />
        <p className="text-foreground font-medium">אין הרשאת גישה</p>
        <p className="text-muted-foreground text-[13px]">אין לך הרשאה לצפות בפרופיל זה.</p>
        <button onClick={() => navigate("/")} className="text-primary text-[13px] hover:underline mt-2">חזרה לדף הראשי</button>
      </div>
    );
  }

  const handleToggleRoadmapItem = async (itemId: string, currentCompleted: boolean) => {
    try {
      console.log(`[RoadmapToggle] itemId: ${itemId}, currently: ${currentCompleted}`);
      if (currentCompleted) {
        const { error } = await supabase.from("student_roadmap_progress").delete().eq("student_id", student.id).eq("roadmap_item_id", itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("student_roadmap_progress").upsert({
          student_id: student.id, roadmap_item_id: itemId, completed: true, completion_date: new Date().toISOString(),
        }, { onConflict: "student_id,roadmap_item_id" });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["student-roadmap", student.id] });
      toast.success("נשמר בהצלחה");
    } catch (err: any) {
      console.error("[RoadmapToggle] Error:", err);
      toast.error("שמירה נכשלה: " + err.message);
    }
  };

  const handleMathLevelChange = async (level: number) => {
    setMathLevel(level);
    await saveField("math_level", level);
  };

  const handleSubjectFieldSave = async (progressId: string, field: string, value: any) => {
    try {
      console.log(`[SubjectFieldSave] ${field} =`, value, "progressId:", progressId);
      const { error } = await supabase.from("student_subject_progress").update({ [field]: value } as any).eq("id", progressId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["student-progress", student.id] });
      toast.success("נשמר בהצלחה");
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (err: any) {
      console.error("[SubjectFieldSave] Error:", err);
      toast.error("שמירה נכשלה: " + err.message);
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-10 space-y-5 md:space-y-6 max-w-[1200px] pb-24">
      {/* Saved toast */}
      {savedMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success text-success-foreground px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-[13px] font-medium animate-in slide-in-from-top-2 duration-200">
          <Check className="h-4 w-4" />
          השינויים נשמרו
        </div>
      )}

      {/* Back button removed — breadcrumbs handle navigation */}

      {/* ═══ HERO CARD ═══ */}
      <div className="card-premium p-5 md:p-7">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <InitialsAvatar name={student.full_name} size="lg" />
          <div className="flex-1 min-w-0 space-y-4">
            {/* Name & Status */}
            <div className="flex flex-wrap items-center gap-3">
              <InlineEdit
                value={student.full_name}
                onSave={(v) => {
                  const parts = v.trim().split(" ");
                  saveField("full_name", v.trim());
                  saveField("first_name", parts[0] || "");
                  saveField("last_name", parts.slice(1).join(" ") || "");
                }}
                editable={isEditable}
                displayClassName="text-xl md:text-2xl font-semibold text-foreground tracking-tight !h-auto !border-0 !bg-transparent !px-0 hover:!bg-primary/[0.03]"
              />
            </div>
            {/* Core fields in grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium">סטטוס</p>
                <InlineSelect
                  value={student.overall_status}
                  options={STATUS_OPTIONS}
                  onSave={(v) => saveField("overall_status", v)}
                  editable={isEditable}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium">ענף ספורט</p>
                <InlineEdit
                  value={student.sport}
                  onSave={(v) => saveField("sport", v)}
                  editable={isEditable}
                  placeholder="ענף ספורט"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium">כיתה</p>
                <InlineSelect
                  value={student.class_name}
                  options={CLASS_OPTIONS}
                  onSave={(v) => saveField("class_name", v)}
                  editable={isEditable}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium">מתמטיקה</p>
                <InlineSelect
                  value={String(effectiveMathLevel)}
                  options={MATH_LEVEL_OPTIONS}
                  onSave={(v) => handleMathLevelChange(parseInt(v))}
                  editable={isEditable}
                />
              </div>
            </div>
          </div>
          {/* Score Ring + Export */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <ProgressRing value={overallProgress} />
            <span className="text-[11px] text-muted-foreground">ציון משוקלל</span>
            {(user?.role === "admin" || user?.role === "teacher" || user?.role === "coach") && (
              <DataExportTools
                student={student}
                subjectProgress={subjectProgress.map(sp => ({
                  subjectName: (sp as any).subjects?.subject_name || "",
                  grade: sp.grade,
                  status: sp.status,
                  completionPercent: sp.completion_percent,
                  absences: sp.absences,
                  notes: sp.notes,
                  missingItems: sp.missing_items || [],
                  coveredTopics: sp.covered_topics || [],
                }))}
                label={student.full_name}
                contextLabel={student.full_name}
                compact
              />
            )}
          </div>
        </div>
      </div>

      {/* ═══ MATH LEVEL SELECTOR ═══ */}
      <div className="card-premium p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <h3 className="text-[14px] font-semibold text-foreground">רמת מתמטיקה</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">בחירת רמה מעדכנת את דרישות ההשלמה</span>
        </div>
        <div className="flex gap-2">
          {[3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => isEditable && handleMathLevelChange(level)}
              disabled={!isEditable}
              className={`flex-1 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-150 border ${
                effectiveMathLevel === level
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground"
              } ${!isEditable ? "cursor-default" : "cursor-pointer"}`}
            >
              {level} יחידות לימוד
            </button>
          ))}
        </div>
      </div>

      {/* ═══ EXTRA DETAILS — REAL FORM ═══ */}
      <div className="card-premium p-5 md:p-6">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <h3 className="text-[14px] font-semibold text-foreground">פרטים נוספים</h3>
          {isEditable && <span className="text-[10px] text-primary/60 font-medium bg-primary/5 px-2 py-0.5 rounded-full mr-2">עריכה ישירה</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Stethoscope className="h-3 w-3" />
              אבחון / לקות
            </label>
            <InlineEdit value={student.diagnosis_status || ""} onSave={(v) => saveField("diagnosis_status", v)} editable={isEditable} placeholder="הפרעת קשב, דיסלקציה..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground font-medium">התאמות בגרות</label>
            <InlineEdit value={student.bagrut_accommodations || ""} onSave={(v) => saveField("bagrut_accommodations", v)} editable={isEditable} placeholder="הארכת זמן, הקראה..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Languages className="h-3 w-3" />
              תמיכה באנגלית
            </label>
            <InlineSelect
              value={student.english_support || ""}
              options={ENGLISH_OPTIONS}
              onSave={(v) => saveField("english_support", v)}
              editable={isEditable}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              ספר
            </label>
            <InlineEdit value={student.book_name || ""} onSave={(v) => saveField("book_name", v)} editable={isEditable} placeholder="שם הספר" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground font-medium">ציון ספר</label>
            <InlineEdit value={student.book_grade != null ? String(student.book_grade) : ""} onSave={(v) => saveField("book_grade", v ? parseFloat(v) : null)} editable={isEditable} type="number" min={0} max={100} placeholder="0–100" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <ClipboardList className="h-3 w-3" />
              בחינות שהושלמו
            </label>
            <InlineEdit value={student.exams_completed || ""} onSave={(v) => saveField("exams_completed", v)} editable={isEditable} placeholder="למשל: 3 מתוך 7" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <GraduationCap className="h-3 w-3" />
              הערכה מסכמת
            </label>
            <InlineSelect
              value={student.summative_assessment || ""}
              options={ASSESSMENT_OPTIONS}
              onSave={(v) => saveField("summative_assessment", v)}
              editable={isEditable}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <PenLine className="h-3 w-3" />
              הערות
            </label>
            <InlineEdit value={student.notes || ""} onSave={(v) => saveField("notes", v)} editable={isEditable} type="textarea" placeholder="הערות נוספות..." />
          </div>
        </div>
      </div>

      {/* ═══ CHARTS ═══ */}
      {subjectProgress.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-premium p-5 md:p-6">
            <h3 className="text-[14px] font-semibold text-foreground mb-4">ציונים לפי מקצוע</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subjectProgress.map(sp => ({ name: (sp as any).subjects?.subject_name || "", ציון: sp.grade || 0 }))} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, direction: "rtl" }} cursor={{ fill: "hsl(var(--accent))", radius: 8 }} />
                <Bar dataKey="ציון" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card-premium p-5 md:p-6">
            <h3 className="text-[14px] font-semibold text-foreground mb-4">פרופיל אקדמי</h3>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={subjectProgress.map(sp => ({ subject: (sp as any).subjects?.subject_name || "", ציון: sp.grade || 0, fullMark: 100 }))}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="ציון" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══ SUBJECT PROGRESS — EXPANDABLE ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-primary" strokeWidth={1.5} />
          <h3 className="text-[14px] font-semibold text-foreground">מקצועות לימוד</h3>
          <span className="text-[11px] text-muted-foreground/50 bg-accent/50 px-2 py-0.5 rounded-full">{subjectProgress.length}</span>
        </div>
        <div className="space-y-3">
          {subjectProgress.map((sp) => {
            const subjName = (sp as any).subjects?.subject_name || "";
            const isOpen = expanded === subjName;
            const status = sp.status as StatusType;
            const subjectRoadmap = roadmapBySubject.get(subjName) || [];
            const doneCount = subjectRoadmap.filter(r => r.completed).length;
            const totalCount = subjectRoadmap.length;
            const isMath = sp.subject_id === MATH_SUBJECT_ID;

            return (
              <div key={sp.id} className="card-premium overflow-hidden">
                {/* Header — always visible */}
                <button
                  onClick={() => setExpanded(isOpen ? null : subjName)}
                  className="w-full p-4 md:p-5 flex items-center justify-between text-start group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusConfig[status].bgClass}`}>
                      <BookOpen className="h-3.5 w-3.5" style={{ color: `hsl(var(--${status === "green" ? "success" : status === "yellow" ? "warning" : "destructive"}))` }} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[13px] font-semibold text-foreground block">{subjName}</span>
                      {isMath && <span className="text-[11px] text-muted-foreground">{effectiveMathLevel} יח״ל</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-end hidden sm:block">
                      <span className="text-[20px] font-bold text-foreground tabular-nums">{sp.grade || 0}</span>
                      <span className="text-[11px] text-muted-foreground block">ציון</span>
                    </div>
                    <div className="text-end hidden sm:block">
                      <span className="text-[14px] font-semibold text-foreground tabular-nums">{sp.completion_percent}%</span>
                      <span className="text-[11px] text-muted-foreground block">השלמה</span>
                    </div>
                    {sp.absences > 0 && (
                      <div className="text-end hidden md:block">
                        <span className={`text-[14px] font-semibold tabular-nums ${sp.absences > 3 ? "text-destructive" : "text-foreground"}`}>{sp.absences}</span>
                        <span className="text-[11px] text-muted-foreground block">חיסורים</span>
                      </div>
                    )}
                    <StatusBadge type={status} />
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                  </div>
                </button>

                {/* Progress bar */}
                <div className="mx-5 -mt-2 mb-3 h-1 rounded-full bg-accent overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${statusConfig[status].dotClass}`} style={{ width: `${sp.completion_percent || 0}%` }} />
                </div>

                {/* Expanded — full edit panel */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-border/50 animate-in slide-in-from-top-1 duration-200">
                    {/* Editable fields grid */}
                    <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground font-medium">סטטוס</label>
                        <InlineSelect
                          value={sp.status}
                          options={STATUS_OPTIONS}
                          onSave={(v) => handleSubjectFieldSave(sp.id, "status", v)}
                          editable={isEditable}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground font-medium">ציון</label>
                        <InlineEdit
                          value={String(sp.grade || 0)}
                          onSave={(v) => handleSubjectFieldSave(sp.id, "grade", parseFloat(v) || 0)}
                          editable={isEditable}
                          type="number"
                          min={0}
                          max={100}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground font-medium">אחוז השלמה</label>
                        <InlineEdit
                          value={String(sp.completion_percent)}
                          onSave={(v) => handleSubjectFieldSave(sp.id, "completion_percent", parseInt(v) || 0)}
                          editable={isEditable}
                          type="number"
                          min={0}
                          max={100}
                          suffix="%"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground font-medium">חיסורים</label>
                        <InlineEdit
                          value={String(sp.absences)}
                          onSave={(v) => handleSubjectFieldSave(sp.id, "absences", parseInt(v) || 0)}
                          editable={isEditable}
                          type="number"
                          min={0}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Roadmap */}
                      {subjectRoadmap.length > 0 && (
                        <div>
                          <p className="text-[12px] font-semibold text-foreground mb-3">שלבי התקדמות</p>
                          <div className="space-y-0">
                            {subjectRoadmap.map((item, idx) => {
                              const isLast = idx === subjectRoadmap.length - 1;
                              return (
                                <div key={item.id} className="flex items-start gap-3">
                                  <div className="flex flex-col items-center">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleToggleRoadmapItem(item.id, item.completed); }}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer hover:scale-110 ${
                                        item.completed ? "bg-success/15 hover:bg-success/25" : "bg-accent hover:bg-accent/80"
                                      }`}
                                      title={item.completed ? "סמן כלא הושלם" : "סמן כהושלם"}
                                    >
                                      {item.completed ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={1.5} />
                                      ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                                      )}
                                    </button>
                                    {!isLast && <div className={`w-px h-5 ${item.completed ? "bg-success/30" : "bg-border"}`} />}
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleRoadmapItem(item.id, item.completed); }}
                                    className={`text-[12px] pt-1 text-start transition-colors duration-150 cursor-pointer hover:text-foreground ${
                                      item.completed ? "text-muted-foreground line-through decoration-success/40" : "text-muted-foreground/70"
                                    }`}
                                  >
                                    {item.topic_name}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">{doneCount} מתוך {totalCount}</span>
                            <div className="w-20 h-1.5 rounded-full bg-accent overflow-hidden">
                              <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Topics & Missing */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-[12px] font-semibold text-foreground mb-2 block">נושאים שנלמדו</label>
                          <ChipEditor
                            items={sp.covered_topics || []}
                            onSave={(items) => handleSubjectFieldSave(sp.id, "covered_topics", items)}
                            editable={isEditable}
                            chipColor="bg-success/10 text-success"
                            placeholder="הוסף נושא..."
                          />
                        </div>
                        <div>
                          <label className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-warning" strokeWidth={1.5} />
                            נושאים להשלמה
                          </label>
                          <ChipEditor
                            items={sp.missing_items || []}
                            onSave={(items) => handleSubjectFieldSave(sp.id, "missing_items", items)}
                            editable={isEditable}
                            chipColor="bg-warning/10 text-warning"
                            placeholder="הוסף חוסר..."
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-[12px] font-semibold text-foreground mb-2 block">הערות מקצוע</label>
                        <InlineEdit
                          value={sp.notes || ""}
                          onSave={(v) => handleSubjectFieldSave(sp.id, "notes", v)}
                          editable={isEditable}
                          type="textarea"
                          placeholder="הוסף הערה למקצוע..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;
