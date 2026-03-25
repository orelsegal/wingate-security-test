import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronRight, Loader2, Users, Layers, BarChart3, Lightbulb, AlertTriangle, TrendingUp, TrendingDown, FileCheck, Download, Sparkles } from "lucide-react";
import { useStudents, useAllStudentProgress, type StatusType, statusConfig } from "@/hooks/useStudents";
import { StatusBadge } from "@/components/StatusBadge";
import InitialsAvatar from "@/components/InitialsAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeacherAIAssistant from "@/components/TeacherAIAssistant";

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

/* ═══ Smart Group definitions ═══ */
const SMART_GROUPS = [
  { id: "missing", label: "חסרי הגשות", icon: FileCheck, filter: (p: any) => (p.completion_percent || 0) < 20, color: "text-destructive" },
  { id: "below-60", label: "מתחת ל-60", icon: TrendingDown, filter: (p: any) => (p.grade || 0) < 60 && (p.grade || 0) > 0, color: "text-warning" },
  { id: "at-risk", label: "בסיכון לבגרות", icon: AlertTriangle, filter: (p: any) => p.status === "red", color: "text-destructive" },
  { id: "top", label: "מצטיינים", icon: TrendingUp, filter: (p: any) => (p.grade || 0) >= 85, color: "text-success" },
];

const TeacherCourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const course = COURSES[courseId || ""];
  const [activeTab, setActiveTab] = useState("students");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const { data: students = [], isLoading: sLoading } = useStudents();
  const { data: allProgress = [], isLoading: pLoading } = useAllStudentProgress();

  /* Filter progress for this course */
  const courseProgress = useMemo(() => {
    if (!course) return [];
    const studentIds = new Set(students.map(s => s.id));
    return allProgress.filter(
      p => studentIds.has(p.student_id) && (p as any).subjects?.subject_name?.includes(course.subjectMatch)
    );
  }, [students, allProgress, course]);

  /* Enrich students with course-specific data */
  const courseStudents = useMemo(() => {
    const progressMap = new Map(courseProgress.map(p => [p.student_id, p]));
    return students
      .filter(s => progressMap.has(s.id))
      .map(s => {
        const p = progressMap.get(s.id)!;
        return {
          ...s,
          courseGrade: p.grade || 0,
          courseStatus: p.status as StatusType,
          courseCompletion: p.completion_percent || 0,
          courseMissing: p.missing_items || [],
          courseNotes: p.notes || "",
        };
      })
      .sort((a, b) => {
        const order: Record<string, number> = { red: 0, yellow: 1, green: 2 };
        return (order[a.courseStatus] ?? 2) - (order[b.courseStatus] ?? 2);
      });
  }, [students, courseProgress]);

  /* Smart groups with counts */
  const smartGroups = useMemo(() => {
    return SMART_GROUPS.map(g => ({
      ...g,
      students: courseStudents.filter(s => {
        const p = courseProgress.find(cp => cp.student_id === s.id);
        return p && g.filter(p);
      }),
    }));
  }, [courseStudents, courseProgress]);

  /* Insights */
  const insights = useMemo(() => {
    const items: { icon: typeof AlertTriangle; text: string; type: "critical" | "warning" | "info" }[] = [];
    const redCount = courseStudents.filter(s => s.courseStatus === "red").length;
    const avg = courseStudents.length > 0
      ? courseStudents.reduce((s, st) => s + st.courseGrade, 0) / courseStudents.length
      : 0;
    const submissionRate = courseStudents.length > 0
      ? Math.round((courseStudents.filter(s => s.courseCompletion > 0).length / courseStudents.length) * 100)
      : 0;
    const lowStudents = courseStudents.filter(s => s.courseGrade > 0 && s.courseGrade < 60);

    if (redCount > 0) {
      items.push({ icon: AlertTriangle, text: `${redCount} תלמידים בסיכון — מומלץ לתת תגבור`, type: "critical" });
    }
    if (submissionRate < 70) {
      items.push({ icon: FileCheck, text: `שיעור ההגשות ${submissionRate}% — נדרש מעקב`, type: "warning" });
    }
    if (avg > 0 && avg < 65) {
      items.push({ icon: TrendingDown, text: `ממוצע הכיתה ${avg.toFixed(0)} — מומלץ לחזור על חומר`, type: "warning" });
    }
    if (lowStudents.length > 3) {
      items.push({ icon: Lightbulb, text: `${lowStudents.length} תלמידים מתחת ל-60 — שקול קבוצת תגבור`, type: "info" });
    }
    if (items.length === 0) {
      items.push({ icon: TrendingUp, text: "הקורס במצב טוב — המשך לעקוב", type: "info" });
    }
    return items;
  }, [courseStudents]);

  if (!course) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        <p>קורס לא נמצא</p>
        <button onClick={() => navigate("/teacher-courses")} className="text-primary text-[13px] mt-2 hover:underline">
          חזרה לקורסים
        </button>
      </div>
    );
  }

  if (sLoading || pLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const redCount = courseStudents.filter(s => s.courseStatus === "red").length;
  const yellowCount = courseStudents.filter(s => s.courseStatus === "yellow").length;
  const greenCount = courseStudents.filter(s => s.courseStatus === "green").length;
  const avgGrade = courseStudents.length > 0
    ? (courseStudents.reduce((s, st) => s + st.courseGrade, 0) / courseStudents.length).toFixed(0)
    : "—";

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[1000px] mx-auto" dir="rtl">
      {/* Back + Header */}
      <button
        onClick={() => navigate("/teacher-courses")}
        className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span>חזרה לקורסים</span>
      </button>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-[28px]">{course.icon}</span>
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold text-foreground tracking-tight">{course.name}</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">{courseStudents.length} תלמידים</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "ממוצע", value: avgGrade, color: "text-foreground" },
          { label: "במסלול", value: String(greenCount), color: "text-success" },
          { label: "פערים", value: String(yellowCount), color: "text-[hsl(var(--warning))]" },
          { label: "בסיכון", value: String(redCount), color: "text-destructive" },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-3 text-center">
            <p className={`text-[20px] font-semibold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-accent/40 rounded-xl mb-6">
          {[
            { value: "students", label: "תלמידים", icon: Users },
            { value: "groups", label: "קבוצות חכמות", icon: Layers },
            { value: "grades", label: "ציונים והגשות", icon: BarChart3 },
            { value: "insights", label: "תובנות", icon: Lightbulb },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1.5 text-[11px] md:text-[12px] py-2.5 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <tab.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══ TAB 1: STUDENTS ═══ */}
        <TabsContent value="students" className="space-y-2">
          {courseStudents.length === 0 ? (
            <p className="text-center text-muted-foreground text-[13px] py-12">אין תלמידים בקורס זה</p>
          ) : (
            courseStudents.map(s => (
              <button
                key={s.id}
                onClick={() => navigate(`/students/${s.id}`)}
                className="w-full flex items-center justify-between bg-card rounded-xl border border-border px-4 py-3.5 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <InitialsAvatar name={s.full_name} size="sm" />
                  <div className="text-start">
                    <p className="text-[13px] font-medium text-foreground">{s.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.sport} · {s.class_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.courseGrade > 0 && (
                    <span className="text-[12px] text-muted-foreground font-medium">{s.courseGrade}</span>
                  )}
                  <div className="flex items-center gap-1.5">
                    {s.courseCompletion > 0 ? (
                      <span className="text-[10px] text-success">✔</span>
                    ) : (
                      <span className="text-[10px] text-destructive">✗</span>
                    )}
                  </div>
                  <StatusBadge type={s.courseStatus} />
                </div>
              </button>
            ))
          )}
        </TabsContent>

        {/* ═══ TAB 2: SMART GROUPS ═══ */}
        <TabsContent value="groups" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {smartGroups.map(g => (
              <button
                key={g.id}
                onClick={() => setActiveGroup(activeGroup === g.id ? null : g.id)}
                className={`bg-card rounded-xl border border-border p-4 text-start transition-all ${
                  activeGroup === g.id ? "ring-2 ring-primary/20 border-primary/30" : "hover:bg-accent/30"
                } cursor-pointer`}
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

          {/* Expanded group */}
          {activeGroup && (() => {
            const group = smartGroups.find(g => g.id === activeGroup);
            if (!group || group.students.length === 0) return (
              <p className="text-[13px] text-muted-foreground text-center py-6">אין תלמידים בקבוצה זו</p>
            );
            return (
              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-foreground">{group.label}</span>
                  <span className="text-[11px] text-muted-foreground">{group.students.length} תלמידים</span>
                </div>
                {group.students.map(s => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/students/${s.id}`)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/20 transition-colors cursor-pointer"
                  >
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

          {/* AI Assistant */}
          <div className="mt-4">
            <TeacherAIAssistant defaultSubject={course.subjectMatch} />
          </div>
        </TabsContent>

        {/* ═══ TAB 3: GRADES & SUBMISSIONS ═══ */}
        <TabsContent value="grades">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Header */}
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
                  <div className="flex items-center justify-center md:justify-center">
                    <span className={`text-[13px] font-semibold ${
                      s.courseGrade >= 70 ? "text-success" : s.courseGrade >= 55 ? "text-[hsl(var(--warning))]" : s.courseGrade > 0 ? "text-destructive" : "text-muted-foreground"
                    }`}>
                      {s.courseGrade > 0 ? s.courseGrade : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-[12px] text-muted-foreground">{s.courseCompletion}%</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-[12px] text-muted-foreground">
                      {s.courseMissing.length > 0 ? s.courseMissing.length : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <StatusBadge type={s.courseStatus} />
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* ═══ TAB 4: INSIGHTS ═══ */}
        <TabsContent value="insights" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "שיעור הגשות", value: `${courseStudents.length > 0 ? Math.round((courseStudents.filter(s => s.courseCompletion > 0).length / courseStudents.length) * 100) : 0}%` },
              { label: "ממוצע כיתתי", value: courseStudents.length > 0 ? (courseStudents.reduce((s, st) => s + st.courseGrade, 0) / courseStudents.length).toFixed(0) : "—" },
              { label: "פער ביצועים", value: courseStudents.length > 0 ? `${Math.max(...courseStudents.map(s => s.courseGrade)) - Math.min(...courseStudents.filter(s => s.courseGrade > 0).map(s => s.courseGrade))}` : "—" },
              { label: "תלמידים פעילים", value: `${courseStudents.filter(s => s.courseCompletion > 20).length}/${courseStudents.length}` },
            ].map(m => (
              <div key={m.label} className="bg-card rounded-xl border border-border p-4 text-center">
                <p className="text-[18px] font-semibold text-foreground">{m.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {/* AI Insights */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <span className="text-[13px] font-semibold text-foreground">תובנות חכמות</span>
            </div>
            <div className="space-y-2.5">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 p-3 rounded-lg ${
                    insight.type === "critical" ? "bg-destructive/5" : insight.type === "warning" ? "bg-warning/5" : "bg-primary/5"
                  }`}
                >
                  <insight.icon className={`h-4 w-4 mt-0.5 shrink-0 ${
                    insight.type === "critical" ? "text-destructive" : insight.type === "warning" ? "text-[hsl(var(--warning))]" : "text-primary"
                  }`} strokeWidth={1.5} />
                  <p className="text-[12px] text-foreground leading-relaxed">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sport breakdown */}
          {(() => {
            const sportMap = new Map<string, { total: number; red: number; avg: number }>();
            courseStudents.forEach(s => {
              if (!sportMap.has(s.sport)) sportMap.set(s.sport, { total: 0, red: 0, avg: 0 });
              const entry = sportMap.get(s.sport)!;
              entry.total++;
              if (s.courseStatus === "red") entry.red++;
              entry.avg += s.courseGrade;
            });
            const sportStats = Array.from(sportMap.entries()).map(([name, d]) => ({
              name,
              total: d.total,
              red: d.red,
              avg: d.total > 0 ? Math.round(d.avg / d.total) : 0,
            }));
            if (sportStats.length <= 1) return null;
            return (
              <div className="bg-card rounded-xl border border-border p-4">
                <span className="text-[12px] font-medium text-muted-foreground mb-3 block">ביצועים לפי ענף</span>
                <div className="space-y-2">
                  {sportStats.map(s => (
                    <div key={s.name} className="flex items-center justify-between py-2">
                      <span className="text-[12px] font-medium text-foreground">{s.name}</span>
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span>ממוצע {s.avg}</span>
                        <span>{s.total} תלמידים</span>
                        {s.red > 0 && <span className="text-destructive">{s.red} בסיכון</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherCourseDetailPage;
