import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, AlertTriangle, ChevronLeft, TrendingUp, FileCheck } from "lucide-react";
import { useStudents, useAllStudentProgress, type StatusType, statusConfig } from "@/hooks/useStudents";
import { StatusBadge } from "@/components/StatusBadge";
import InitialsAvatar from "@/components/InitialsAvatar";

/* ═══ Course definitions — questionnaires teachers actually teach ═══ */
interface CourseCard {
  id: string;
  name: string;
  subjectId?: string; // maps to subjects table
  subjectMatch: string; // substring match on subject_name
  icon: string;
}

const TEACHER_COURSES: CourseCard[] = [
  { id: "module-e", name: "Module E", subjectMatch: "אנגלית", icon: "🇬🇧" },
  { id: "math-471", name: "שאלון 471", subjectMatch: "מתמטיקה", icon: "📐" },
  { id: "math-472", name: "שאלון 472", subjectMatch: "מתמטיקה", icon: "📊" },
  { id: "history", name: "היסטוריה", subjectMatch: "היסטוריה", icon: "📜" },
  { id: "civics", name: "אזרחות", subjectMatch: "אזרחות", icon: "⚖️" },
  { id: "literature", name: "ספרות", subjectMatch: "ספרות", icon: "📖" },
  { id: "lashon", name: "לשון", subjectMatch: "לשון", icon: "✏️" },
  { id: "science", name: "מדעים", subjectMatch: "מדעים", icon: "🔬" },
];

const TeacherCoursesPage = () => {
  const navigate = useNavigate();
  const { data: students = [], isLoading: sLoading } = useStudents();
  const { data: allProgress = [], isLoading: pLoading } = useAllStudentProgress();

  /* Priority students — red/yellow needing attention */
  const priorityStudents = useMemo(() => {
    return students
      .filter(s => s.overall_status === "red" || s.overall_status === "yellow")
      .sort((a, b) => {
        if (a.overall_status === "red" && b.overall_status !== "red") return -1;
        if (a.overall_status !== "red" && b.overall_status === "red") return 1;
        return (a.avg_score || 0) - (b.avg_score || 0);
      })
      .slice(0, 5);
  }, [students]);

  /* Build stats per course */
  const courseStats = useMemo(() => {
    const studentIds = new Set(students.map(s => s.id));
    return TEACHER_COURSES.map(course => {
      const courseProgress = allProgress.filter(
        p => studentIds.has(p.student_id) && (p as any).subjects?.subject_name?.includes(course.subjectMatch)
      );
      const studentCount = new Set(courseProgress.map(p => p.student_id)).size;
      const greenCount = courseProgress.filter(p => p.status === "green").length;
      const yellowCount = courseProgress.filter(p => p.status === "yellow").length;
      const redCount = courseProgress.filter(p => p.status === "red").length;
      const total = courseProgress.length || 1;
      const avgGrade = courseProgress.length > 0
        ? (courseProgress.reduce((s, p) => s + (p.grade || 0), 0) / courseProgress.length).toFixed(0)
        : "—";
      const submissionRate = courseProgress.length > 0
        ? Math.round((courseProgress.filter(p => (p.completion_percent || 0) > 0).length / courseProgress.length) * 100)
        : 0;

      return {
        ...course,
        studentCount,
        greenCount,
        yellowCount,
        redCount,
        avgGrade,
        submissionRate,
        greenPct: (greenCount / total) * 100,
        yellowPct: (yellowCount / total) * 100,
        redPct: (redCount / total) * 100,
      };
    });
  }, [students, allProgress]);

  if (sLoading || pLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[960px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[20px] md:text-[24px] font-semibold text-foreground tracking-tight">
          הקורסים שלי
        </h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          {students.length} תלמידים · {courseStats.filter(c => c.studentCount > 0).length} קורסים פעילים
        </p>
      </div>

      {/* ═══ Priority Banner ═══ */}
      {priorityStudents.length > 0 && (
        <div className="mb-8 bg-destructive/5 border border-destructive/10 rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
            <span className="text-[13px] font-semibold text-foreground">תלמידים הדורשים תשומת לב</span>
            <span className="text-[11px] text-destructive bg-destructive/10 px-2 py-0.5 rounded-full font-medium">
              {priorityStudents.length}
            </span>
          </div>
          <div className="space-y-2">
            {priorityStudents.map(s => (
              <button
                key={s.id}
                onClick={() => navigate(`/students/${s.id}`)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-card hover:bg-accent/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <InitialsAvatar name={s.full_name} size="sm" />
                  <div className="text-start">
                    <p className="text-[12.5px] font-medium text-foreground">{s.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.sport} · {s.class_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.avg_score != null && s.avg_score > 0 && (
                    <span className="text-[11px] text-muted-foreground">{Math.round(s.avg_score)}</span>
                  )}
                  <StatusBadge type={s.overall_status as StatusType} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Course Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {courseStats.map((course, i) => (
          <button
            key={course.id}
            onClick={() => navigate(`/teacher-course/${course.id}`)}
            className="group bg-card rounded-2xl border border-border p-5 text-start transition-all duration-200 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer animate-fade-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-[22px]">{course.icon}</span>
                <div>
                  <h3 className="text-[14px] font-semibold text-foreground leading-tight">{course.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Users className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-[11px] text-muted-foreground">{course.studentCount} תלמידים</span>
                  </div>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 text-border group-hover:text-primary/50 transition-colors shrink-0 mt-1" strokeWidth={1.5} />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <p className="text-[16px] font-semibold text-foreground">{course.avgGrade}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">ממוצע</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-semibold text-foreground">{course.submissionRate}%</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">הגשות</p>
              </div>
              <div className="text-center">
                {course.redCount > 0 ? (
                  <p className="text-[16px] font-semibold text-destructive">{course.redCount}</p>
                ) : (
                  <p className="text-[16px] font-semibold text-success">✓</p>
                )}
                <p className="text-[9px] text-muted-foreground mt-0.5">בסיכון</p>
              </div>
            </div>

            {/* Distribution Bar */}
            {course.studentCount > 0 && (
              <div className="flex h-1.5 rounded-full overflow-hidden bg-accent gap-px">
                {course.greenPct > 0 && <div className="bg-success rounded-s-full" style={{ width: `${course.greenPct}%` }} />}
                {course.yellowPct > 0 && <div className="bg-warning" style={{ width: `${course.yellowPct}%` }} />}
                {course.redPct > 0 && <div className="bg-destructive rounded-e-full" style={{ width: `${course.redPct}%` }} />}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TeacherCoursesPage;
