import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, AlertCircle, CheckCircle2, Target, AlertTriangle, ShieldAlert, ChevronDown, Loader2, Pencil, FileText, Stethoscope, Languages, Save, Check } from "lucide-react";
import InitialsAvatar from "@/components/InitialsAvatar";
import { useStudent, useStudentProgress, useStudentRoadmap, useUpdateStudent, statusConfig, type StatusType } from "@/hooks/useStudents";
import { StatusBadge } from "@/components/StatusBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { InlineEdit, InlineSelect, ChipEditor } from "@/components/InlineEdit";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line,
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

  // Inline save helper
  const saveField = useCallback(async (field: string, value: any) => {
    if (!student) return;
    try {
      await updateStudent.mutateAsync({ id: student.id, data: { [field]: value } });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch (err: any) {
      toast.error("שגיאה בשמירה: " + err.message);
    }
  }, [student, updateStudent]);

  // Group roadmap items by subject
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
    if (currentCompleted) {
      await supabase.from("student_roadmap_progress").delete().eq("student_id", student.id).eq("roadmap_item_id", itemId);
    } else {
      await supabase.from("student_roadmap_progress").upsert({
        student_id: student.id, roadmap_item_id: itemId, completed: true, completion_date: new Date().toISOString(),
      }, { onConflict: "student_id,roadmap_item_id" });
    }
    queryClient.invalidateQueries({ queryKey: ["student-roadmap", student.id] });
  };

  const handleMathLevelChange = async (level: number) => {
    setMathLevel(level);
    await saveField("math_level", level);
  };

  const handleSubjectFieldSave = async (progressId: string, field: string, value: any) => {
    try {
      const { error } = await supabase.from("student_subject_progress").update({ [field]: value } as any).eq("id", progressId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["student-progress", student.id] });
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } catch (err: any) {
      toast.error("שגיאה: " + err.message);
    }
  };

  return (
    <div className="p-5 md:p-10 lg:p-12 space-y-6 md:space-y-8 max-w-[1400px]">
      {/* Saved indicator */}
      {savedMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-success text-success-foreground px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-[13px] font-medium animate-in slide-in-from-top-2 duration-200">
          <Check className="h-4 w-4" />
          השינויים נשמרו
        </div>
      )}

      {/* Back button */}
      <button
        onClick={() => navigate("/students")}
        className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors duration-150"
      >
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        <span>חזרה לרשימת ספורטאים</span>
      </button>

      {/* Hero Card - Editable */}
      <div className="card-premium p-5 md:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-5 md:gap-7">
          <InitialsAvatar name={student.full_name} size="lg" />
          <div className="flex-1 min-w-0 space-y-3">
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
                displayClassName="text-xl md:text-2xl font-semibold text-foreground tracking-tight"
              />
              <InlineSelect
                value={student.overall_status}
                options={STATUS_OPTIONS}
                onSave={(v) => saveField("overall_status", v)}
                editable={isEditable}
              />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" strokeWidth={1.5} />
                <InlineEdit
                  value={student.sport}
                  onSave={(v) => saveField("sport", v)}
                  editable={isEditable}
                  placeholder="ענף ספורט"
                />
              </span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1">
                כיתה
                <InlineSelect
                  value={student.class_name}
                  options={CLASS_OPTIONS}
                  onSave={(v) => saveField("class_name", v)}
                  editable={isEditable}
                />
              </span>
              <span className="text-border">·</span>
              <span>ממוצע {student.avg_score}</span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1">
                מתמטיקה
                <InlineSelect
                  value={String(effectiveMathLevel)}
                  options={MATH_LEVEL_OPTIONS}
                  onSave={(v) => handleMathLevelChange(parseInt(v))}
                  editable={isEditable}
                />
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            <ProgressRing value={overallProgress} />
            <span className="text-[12px] text-muted-foreground">ציון משוקלל</span>
          </div>
        </div>
      </div>

      {/* Student Details - Editable */}
      <div className="card-premium p-5 md:p-7">
        <h3 className="text-[15px] font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
          פרטים נוספים
          {isEditable && <span className="text-[10px] text-muted-foreground font-normal bg-accent px-2 py-0.5 rounded-full">לחצו על שדה לעריכה</span>}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Stethoscope className="h-3 w-3" />אבחון / לקות</p>
            <InlineEdit value={student.diagnosis_status || ""} onSave={(v) => saveField("diagnosis_status", v)} editable={isEditable} placeholder="לא הוזן" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">התאמות בגרות</p>
            <InlineEdit value={student.bagrut_accommodations || ""} onSave={(v) => saveField("bagrut_accommodations", v)} editable={isEditable} placeholder="לא הוזן" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Languages className="h-3 w-3" />תמיכה באנגלית</p>
            <InlineEdit value={student.english_support || ""} onSave={(v) => saveField("english_support", v)} editable={isEditable} placeholder="לא הוזן" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><BookOpen className="h-3 w-3" />ספר</p>
            <InlineEdit value={student.book_name || ""} onSave={(v) => saveField("book_name", v)} editable={isEditable} placeholder="שם הספר" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">ציון ספר</p>
            <InlineEdit value={student.book_grade != null ? String(student.book_grade) : ""} onSave={(v) => saveField("book_grade", v ? parseFloat(v) : null)} editable={isEditable} type="number" min={0} max={100} placeholder="0-100" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">בחינות שהושלמו</p>
            <InlineEdit value={student.exams_completed || ""} onSave={(v) => saveField("exams_completed", v)} editable={isEditable} placeholder="למשל: 3 מתוך 7" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground">הערכה מסכמת</p>
            <InlineEdit value={student.summative_assessment || ""} onSave={(v) => saveField("summative_assessment", v)} editable={isEditable} placeholder="הערכה מסכמת" />
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-2">
            <p className="text-[11px] text-muted-foreground">הערות</p>
            <InlineEdit value={student.notes || ""} onSave={(v) => saveField("notes", v)} editable={isEditable} type="textarea" placeholder="הערות נוספות..." />
          </div>
        </div>
      </div>

      {/* Math Level Selector */}
      <div className="card-premium p-5 md:p-7">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">רמת מתמטיקה</h3>
            <p className="text-[13px] text-muted-foreground mt-1">בחירת מספר יחידות לימוד משנה את דרישות ההשלמה</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => isEditable && handleMathLevelChange(level)}
              disabled={!isEditable}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                effectiveMathLevel === level
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-accent text-muted-foreground hover:bg-accent/80 hover:text-foreground"
              } ${!isEditable ? "cursor-default" : "cursor-pointer"}`}
            >
              {level} יח״ל
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      {subjectProgress.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          <div className="card-premium p-5 md:p-7">
            <div className="mb-6">
              <h3 className="text-[15px] font-semibold text-foreground">ציונים לפי מקצוע</h3>
              <p className="text-[13px] text-muted-foreground mt-1">השוואת ציונים בין המקצועות</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectProgress.map(sp => ({ name: (sp as any).subjects?.subject_name || "", ציון: sp.grade || 0 }))} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, direction: "rtl" }} cursor={{ fill: "hsl(var(--accent))", radius: 8 }} />
                <Bar dataKey="ציון" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card-premium p-5 md:p-7">
            <div className="mb-6">
              <h3 className="text-[15px] font-semibold text-foreground">פרופיל אקדמי</h3>
              <p className="text-[13px] text-muted-foreground mt-1">מיפוי רמות לפי מקצוע</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={subjectProgress.map(sp => ({ subject: (sp as any).subjects?.subject_name || "", ציון: sp.grade || 0, fullMark: 100 }))}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="ציון" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      <div className="card-premium p-5 md:p-7">
        <div className="mb-6">
          <h3 className="text-[15px] font-semibold text-foreground">מגמת ממוצע</h3>
          <p className="text-[13px] text-muted-foreground mt-1">התפתחות הציון הממוצע &middot; סמסטר א׳ תשפ״ה</p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={(() => {
            const base = overallProgress;
            const months = ["ספט׳", "אוק׳", "נוב׳", "דצמ׳", "ינו׳", "פבר׳"];
            return months.map((m, i) => ({
              month: m,
              ממוצע: Math.max(40, Math.min(100, Math.round(base - 15 + i * 3 + (Math.sin(i * 1.5) * 4)))),
            }));
          })()} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
            <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, direction: "rtl" }} />
            <Line type="monotone" dataKey="ממוצע" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--card))", stroke: "hsl(var(--primary))", strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Subject Progress Detail - Editable */}
      <div>
        <h3 className="text-[15px] font-semibold text-foreground mb-4">פירוט לפי מקצוע</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {subjectProgress.map((sp) => {
            const subjName = (sp as any).subjects?.subject_name || "";
            const isOpen = expanded === subjName;
            const status = sp.status as StatusType;
            const subjectRoadmap = roadmapBySubject.get(subjName) || [];
            const doneCount = subjectRoadmap.filter(r => r.completed).length;
            const totalCount = subjectRoadmap.length;
            const isMath = sp.subject_id === MATH_SUBJECT_ID;

            return (
              <div key={sp.id} className={`card-premium transition-all duration-200 ${isOpen ? "sm:col-span-2 lg:col-span-3" : ""}`}>
                <button
                  onClick={() => setExpanded(isOpen ? null : subjName)}
                  className="w-full p-5 flex items-start justify-between text-start group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      <span className="text-[14px] font-medium text-foreground">{subjName}</span>
                      {isMath && <span className="text-[12px] text-muted-foreground">{effectiveMathLevel} יח״ל</span>}
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[12px] text-muted-foreground">ציון</p>
                        <p className="text-[28px] font-semibold text-foreground leading-none mt-1">{sp.grade}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {sp.absences > 0 && (
                          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>{sp.absences} חיסורים</span>
                          </div>
                        )}
                        {totalCount > 0 && (
                          <span className="text-[11px] text-muted-foreground">{doneCount}/{totalCount} שלבים</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 rounded-full bg-accent overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${statusConfig[status].dotClass}`} style={{ width: `${sp.grade || 0}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ms-4 shrink-0">
                    <StatusBadge type={status} />
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-border animate-fade-in-up" style={{ animationDuration: "200ms" }}>
                    {/* Editable subject controls */}
                    {isEditable && (
                      <div className="pt-4 pb-3 mb-3 border-b border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-[11px] text-muted-foreground font-medium">סטטוס מקצוע</p>
                          <InlineSelect
                            value={sp.status}
                            options={STATUS_OPTIONS}
                            onSave={(v) => handleSubjectFieldSave(sp.id, "status", v)}
                            editable={isEditable}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] text-muted-foreground font-medium">ציון</p>
                          <InlineEdit
                            value={String(sp.grade || 0)}
                            onSave={(v) => handleSubjectFieldSave(sp.id, "grade", parseFloat(v) || 0)}
                            editable={isEditable}
                            type="number"
                            min={0}
                            max={100}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] text-muted-foreground font-medium">אחוז השלמה</p>
                          <InlineEdit
                            value={String(sp.completion_percent)}
                            onSave={(v) => handleSubjectFieldSave(sp.id, "completion_percent", parseInt(v) || 0)}
                            editable={isEditable}
                            type="number"
                            min={0}
                            max={100}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      {/* Roadmap */}
                      {subjectRoadmap.length > 0 && (
                        <div>
                          <p className="text-[12px] font-medium text-muted-foreground mb-3">שלבי התקדמות</p>
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
                                    className={`text-[13px] pt-1 text-start transition-colors duration-150 cursor-pointer hover:text-foreground ${
                                      item.completed ? "text-muted-foreground line-through decoration-success/40" : "text-muted-foreground/60"
                                    }`}
                                  >
                                    {item.topic_name}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">הושלמו {doneCount} מתוך {totalCount}</span>
                            <div className="w-20 h-1.5 rounded-full bg-accent overflow-hidden">
                              <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Topics - Editable */}
                      <div>
                        {(sp.covered_topics && sp.covered_topics.length > 0 || isEditable) && (
                          <div className="mb-4">
                            <p className="text-[12px] font-medium text-muted-foreground mb-2">נושאים שנלמדו</p>
                            <ChipEditor
                              items={sp.covered_topics || []}
                              onSave={(items) => handleSubjectFieldSave(sp.id, "covered_topics", items)}
                              editable={isEditable}
                              chipColor="bg-success/10 text-success"
                              placeholder="הוסף נושא..."
                            />
                          </div>
                        )}
                        <div>
                          <p className="text-[12px] font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-warning" strokeWidth={1.5} />
                            נושאים להשלמה
                          </p>
                          <ChipEditor
                            items={sp.missing_items || []}
                            onSave={(items) => handleSubjectFieldSave(sp.id, "missing_items", items)}
                            editable={isEditable}
                            chipColor="bg-warning/10 text-warning"
                            placeholder="הוסף חוסר..."
                          />
                        </div>
                        <div className="mt-4">
                          <p className="text-[11px] text-muted-foreground mb-1 font-medium">הערות מקצוע</p>
                          <InlineEdit
                            value={sp.notes || ""}
                            onSave={(v) => handleSubjectFieldSave(sp.id, "notes", v)}
                            editable={isEditable}
                            type="textarea"
                            placeholder="הוסף הערה..."
                          />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="space-y-4">
                        <div className="card-premium p-4 bg-accent/30 border-border/50">
                          <p className="text-[11px] text-muted-foreground mb-1">ציון נוכחי</p>
                          <p className="text-[32px] font-bold text-foreground leading-none">{sp.grade}</p>
                        </div>
                        <div className="card-premium p-4 bg-accent/30 border-border/50">
                          <p className="text-[11px] text-muted-foreground mb-1">היעדרויות</p>
                          <p className={`text-[24px] font-bold leading-none ${sp.absences > 3 ? "text-destructive" : "text-foreground"}`}>{sp.absences}</p>
                        </div>
                        <div className="card-premium p-4 bg-accent/30 border-border/50">
                          <p className="text-[11px] text-muted-foreground mb-1">התקדמות</p>
                          <p className="text-[24px] font-bold text-foreground leading-none">{sp.completion_percent}%</p>
                        </div>
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
