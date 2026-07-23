import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, ChevronLeft } from "lucide-react";
import { useStudents, useAllStudentProgress } from "@/hooks/useStudents";

/* ═══ Course definitions ═══ */
const TEACHER_COURSES = [
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

  const courseStats = useMemo(() => {
    const studentIds = new Set(students.map(s => s.id));
    return TEACHER_COURSES.map(course => {
      const courseProgress = allProgress.filter(
        p => studentIds.has(p.student_id) && (p as any).subjects?.subject_name?.includes(course.subjectMatch)
      );
      const studentCount = new Set(courseProgress.map(p => p.student_id)).size;
      const avgGrade = courseProgress.length > 0
        ? (courseProgress.reduce((s, p) => s + (p.grade || 0), 0) / courseProgress.length).toFixed(0)
        : "—";
      const submissionRate = courseProgress.length > 0
        ? Math.round((courseProgress.filter(p => (p.completion_percent || 0) > 0).length / courseProgress.length) * 100)
        : 0;

      return { ...course, studentCount, avgGrade, submissionRate };
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
      <div className="mb-8">
        <h1 className="text-[20px] md:text-[24px] font-semibold text-foreground tracking-tight">
          תוכן לימודי
        </h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          {courseStats.filter(c => c.studentCount > 0).length} קורסים פעילים
        </p>
      </div>

      {/* Active courses first, then empty */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...courseStats].sort((a, b) => b.studentCount - a.studentCount).map((course, i) => (
          <button
            key={course.id}
            onClick={() => navigate(`/teacher-course/${course.id}`)}
            className={`group bg-card rounded-2xl border p-5 text-start transition-all duration-200 shadow-[var(--shadow-card)] animate-fade-in-up ${
              course.studentCount > 0
                ? "border-border hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer"
                : "border-border/40 opacity-50 cursor-default"
            }`}
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

            {/* Minimal stats */}
            <div className="flex items-center gap-6 text-muted-foreground">
              <div className="text-center">
                <p className="text-[15px] font-semibold text-foreground">{course.avgGrade}</p>
                <p className="text-[9px] mt-0.5">ממוצע</p>
              </div>
              <div className="text-center">
                <p className="text-[15px] font-semibold text-foreground">{course.submissionRate}%</p>
                <p className="text-[9px] mt-0.5">הגשות</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TeacherCoursesPage;
