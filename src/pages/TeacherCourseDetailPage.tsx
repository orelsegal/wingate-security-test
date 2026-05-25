import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronRight, Loader2, Users, Layers, BarChart3, Lightbulb, AlertTriangle, TrendingUp, TrendingDown, FileCheck, Sparkles, BookOpen } from "lucide-react";
import { useStudents, useAllStudentProgress, type StatusType } from "@/hooks/useStudents";
import { StatusBadge } from "@/components/StatusBadge";
import InitialsAvatar from "@/components/InitialsAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeacherAIAssistant from "@/components/TeacherAIAssistant";
import { calculateTrafficLight, getStatusLabel } from "@/lib/trafficLight";

/* ═══ Course mapping ═══ */
const COURSES: Record<string, { name: string; subjectMatch: string; icon: string }> = {
  "module-e": { name: "Module E", subjectMatch: "אנגלית", icon: "🇬🇧" },
  "math-471": { name: "שאלון 471", subjectMatch: "מתמטיקה", icon: "📐" },
  "math-472": { name: "שאלון 472", subjectMatch: "מתמטיקה", icon: "📊" },
  "history": { name: "היסטוריה", subjectMatch: "היסטוריה", icon: "📜" },
  "civics": { name: "אזרחות", subjectMatch: "אזרחות", icon: "⚖️" },
  "literature": { name: "ספרות", subjectMatch: "ספרות", icon: "📖" },
  "lashon": { name: "לשון", subjectMatch: "לשון", icon: "✏️" },
  "science": { name: "מדעים", subjectMatch: "מדעים", icon: "🔬" },
};

const SMART_GROUPS = [
  { id: "missing", label: "חסרי הגשות", icon: FileCheck, filter: (p: any) => (p.completion_percent || 0) < 20, color: "text-destructive" },
  { id: "below-60", label: "מתחת ל-60", icon: TrendingDown, filter: (p: any) => (p.grade || 0) < 60 && (p.grade || 0) > 0, color: "text-[hsl(var(--warning))]" },
  { id: "at-risk", label: "בסיכון לבגרות", icon: AlertTriangle, filter: (p: any) => p.status === "red", color: "text-destructive" },
  { id: "top", label: "מצטיינים", icon: TrendingUp, filter: (p: any) => (p.grade || 0) >= 85, color: "text-[hsl(var(--success))]" },
];

const TeacherCourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const course = COURSES[courseId || ""];
  const [activeTab, setActiveTab] = useState("course");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const { data: students = [], isLoading: sLoading } = useStudents();
  const { data: allProgress = [], isLoading: pLoading } = useAllStudentProgress();

  const courseProgress = useMemo(() => {
    if (!course) return [];
    const studentIds = new Set(students.map(s => s.id));
    return allProgress.filter(
      p => studentIds.has(p.student_id) && (p as any).subjects?.subject_name?.includes(course.subjectMatch)
    );
  }, [students, allProgress, course]);

  const courseStudents = useMemo(() => {
    const progressMap = new Map(courseProgress.map(p => [p.student_id, p]));
    return students
      .filter(s => progressMap.has(s.id))
      .map(s => {
        const p = progressMap.get(s.id)!;
        // Auto traffic light per student for this course
        const tl = calculateTrafficLight([{
          grade: p.grade || 0,
          completionPercent: p.completion_percent || 0,
          missingItems: p.missing_items || [],
          absences: p.absences || 0,
        }]);
        return {
          ...s,
          courseGrade: p.grade || 0,
          courseStatus: tl.status as StatusType,
          courseCompletion: p.completion_percent || 0,
          courseMissing: p.missing_items || [],
          trafficReasons: tl.reasons,
        };
      })
      .sort((a, b) => {
        const order: Record<string, number> = { red: 0, yellow: 1, green: 2 };
        return (order[a.courseStatus] ?? 2) - (order[b.courseStatus] ?? 2);
      });
  }, [students, courseProgress]);

  const smartGroups = useMemo(() => {
    return SMART_GROUPS.map(g => ({
      ...g,
      students: courseStudents.filter(s => {
        const p = courseProgress.find(cp => cp.student_id === s.id);
        return p && g.filter(p);
      }),
    }));
  }, [courseStudents, courseProgress]);

  if (!course) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        <p>קורס לא נמצא</p>
        <button onClick={() => navigate("/teacher-courses")} className="text-primary text-[13px] mt-2 hover:underline">חזרה</button>
      </div>
    );
  }

  if (sLoading || pLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const redCount = courseStudents.filter(s => s.courseStatus === "red").length;
  const avgGrade = courseStudents.length > 0
    ? (courseStudents.reduce((s, st) => s + st.courseGrade, 0) / courseStudents.length).toFixed(0) : "—";
  const submissionRate = courseStudents.length > 0
    ? Math.round((courseStudents.filter(s => s.courseCompletion > 0).length / courseStudents.length) * 100) : 0;

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[1000px] mx-auto" dir="rtl">
      {/* Back */}
      <button onClick={() => navigate("/teacher-courses")} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-5">
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span>חזרה לקורסים</span>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-[28px]">{course.icon}</span>
          <div>
            <h1 className="text-[20px] md:text-[24px] font-semibold text-foreground tracking-tight">{course.name}</h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">{courseStudents.length} תלמידים</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/grade-entry")}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-[11.5px] font-semibold hover:bg-primary/90 transition-colors shadow-sm shrink-0"
        >
          <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} />
          הזן ציונים
        </button>
      </div>

      {/* Tabs: הקורס · ניהול תלמידים · קבוצות · עדכון ציונים */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-accent/40 rounded-xl mb-6">
          {[
            { value: "course", label: "הקורס", icon: BookOpen },
            { value: "students", label: "ניהול תלמידים", icon: Users },
            { value: "groups", label: "קבוצות", icon: Layers },
            { value: "grades", label: "עדכון ציונים", icon: BarChart3 },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5 text-[10px] md:text-[12px] py-2.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <tab.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══ TAB 1: COURSE OVERVIEW ═══ */}
        <TabsContent value="course" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "ממוצע", value: avgGrade, color: "text-foreground" },
              { label: "הגשות", value: `${submissionRate}%`, color: "text-foreground" },
              { label: "בסיכון", value: String(redCount), color: redCount > 0 ? "text-destructive" : "text-[hsl(var(--success))]" },
            ].map(stat => (
              <div key={stat.label} className="bg-card rounded-xl border border-border p-4 text-center">
                <p className={`text-[20px] font-semibold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Insights */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <span className="text-[13px] font-semibold text-foreground">תובנות</span>
            </div>
            <div className="space-y-2">
              {redCount > 0 && (
                <p className="text-[12px] text-foreground bg-destructive/5 rounded-lg p-3">{redCount} תלמידים בסיכון — מומלץ לתת תגבור</p>
              )}
              {submissionRate < 70 && (
                <p className="text-[12px] text-foreground bg-[hsl(var(--warning))]/5 rounded-lg p-3">שיעור ההגשות {submissionRate}% — נדרש מעקב</p>
              )}
              {redCount === 0 && submissionRate >= 70 && (
                <p className="text-[12px] text-foreground bg-[hsl(var(--success))]/5 rounded-lg p-3">הקורס במצב טוב — המשך לעקוב</p>
              )}
            </div>
          </div>

          {/* AI Assistant */}
          <TeacherAIAssistant defaultSubject={course.subjectMatch} />
        </TabsContent>

        {/* ═══ TAB 2: STUDENTS (Traffic Light Cards) ═══ */}
        <TabsContent value="students" className="space-y-2">
          {/* Priority banner */}
          {redCount > 0 && (
            <div className="bg-destructive/5 border border-destructive/10 rounded-xl p-3 mb-2">
              <p className="text-[12px] font-medium text-foreground flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                {redCount} תלמידים דורשים תשומת לב מיידית
              </p>
            </div>
          )}

          {courseStudents.length === 0 ? (
            <p className="text-center text-muted-foreground text-[13px] py-12">אין תלמידים בקורס זה</p>
          ) : (
            courseStudents.map(s => (
              <button
                key={s.id}
                onClick={() => navigate(`/students/${s.id}`)}
                className="w-full bg-card rounded-xl border border-border px-4 py-3.5 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-3">
                    <InitialsAvatar name={s.full_name} size="sm" />
                    <div className="text-start">
                      <p className="text-[13px] font-medium text-foreground">{s.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.sport} · {s.class_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.courseGrade > 0 && <span className="text-[12px] text-muted-foreground font-medium">{s.courseGrade}</span>}
                    {s.courseCompletion > 0 ? <span className="text-[10px] text-[hsl(var(--success))]">✔</span> : <span className="text-[10px] text-destructive">✗</span>}
                    <StatusBadge type={s.courseStatus} />
                  </div>
                </div>
                {/* Learning status — why this traffic light */}
                {s.courseStatus !== "green" && (
                  <p className="text-[10px] text-muted-foreground text-start mr-10 mt-0.5">
                    {s.trafficReasons.slice(0, 2).join(" · ")}
                  </p>
                )}
              </button>
            ))
          )}
        </TabsContent>

        {/* ═══ TAB 3: GROUPS ═══ */}
        <TabsContent value="groups" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {smartGroups.map(g => (
              <button
                key={g.id}
                onClick={() => setActiveGroup(activeGroup === g.id ? null : g.id)}
                className={`bg-card rounded-xl border border-border p-4 text-start transition-all cursor-pointer ${
                  activeGroup === g.id ? "ring-2 ring-primary/20 border-primary/30" : "hover:bg-accent/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <g.icon className={`h-4 w-4 ${g.color}`} strokeWidth={1.5} />
                  <span className="text-[12px] font-medium text-foreground">{g.label}</span>
                </div>
                <p className="text-[20px] font-semibold text-foreground">{g.students.length}</p>
                <p className="text-[10px] text-muted-foreground">תלמידים</p>
              </button>
            ))}
          </div>

          {activeGroup && (() => {
            const group = smartGroups.find(g => g.id === activeGroup);
            if (!group || group.students.length === 0) return <p className="text-[13px] text-muted-foreground text-center py-6">אין תלמידים בקבוצה זו</p>;
            return (
              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-foreground">{group.label}</span>
                  <span className="text-[11px] text-muted-foreground">{group.students.length} תלמידים</span>
                </div>
                {group.students.map(s => (
                  <button key={s.id} onClick={() => navigate(`/students/${s.id}`)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/20 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <InitialsAvatar name={s.full_name} size="sm" />
                      <span className="text-[12.5px] font-medium text-foreground">{s.full_name}</span>
                    </div>
                    <StatusBadge type={s.courseStatus} />
                  </button>
                ))}
              </div>
            );
          })()}
        </TabsContent>

        {/* ═══ TAB 4: GRADES (Excel-like) ═══ */}
        <TabsContent value="grades">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_80px_80px_80px_90px] gap-3 px-5 py-3 border-b border-border bg-accent/30">
              <span className="text-[11px] font-medium text-muted-foreground">תלמיד</span>
              <span className="text-[11px] font-medium text-muted-foreground text-center">ציון</span>
              <span className="text-[11px] font-medium text-muted-foreground text-center">השלמה</span>
              <span className="text-[11px] font-medium text-muted-foreground text-center">חוסרים</span>
              <span className="text-[11px] font-medium text-muted-foreground text-center">מצב למידה</span>
            </div>

            {courseStudents.length === 0 ? (
              <p className="text-center text-muted-foreground text-[13px] py-12">אין נתונים</p>
            ) : (
              courseStudents.map((s, i) => (
                <div
                  key={s.id}
                  className={`grid grid-cols-1 md:grid-cols-[1fr_80px_80px_80px_90px] gap-2 md:gap-3 px-5 py-3.5 ${
                    i < courseStudents.length - 1 ? "border-b border-border" : ""
                  } hover:bg-accent/20 transition-colors`}
                >
                  <div className="flex items-center gap-2.5">
                    <InitialsAvatar name={s.full_name} size="sm" />
                    <div>
                      <p className="text-[12.5px] font-medium text-foreground">{s.full_name}</p>
                      <p className="text-[10px] text-muted-foreground md:hidden">{s.sport}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className={`text-[13px] font-semibold ${
                      s.courseGrade >= 70 ? "text-[hsl(var(--success))]" : s.courseGrade >= 55 ? "text-[hsl(var(--warning))]" : s.courseGrade > 0 ? "text-destructive" : "text-muted-foreground"
                    }`}>
                      {s.courseGrade > 0 ? s.courseGrade : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-[12px] text-muted-foreground">{s.courseCompletion}%</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-[12px] text-muted-foreground">{s.courseMissing.length > 0 ? s.courseMissing.length : "—"}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <StatusBadge type={s.courseStatus} />
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherCourseDetailPage;
