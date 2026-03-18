import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, AlertCircle, CheckCircle2, Target, AlertTriangle } from "lucide-react";
import { studentsData, statusConfig } from "@/lib/studentData";
import { StatusBadge } from "@/components/StatusBadge";
import type { StatusType } from "@/lib/studentData";

interface SubjectData {
  name: string;
  grade: number;
  status: StatusType;
  absences: number;
  units?: number;
  coveredTopics?: string[];
  missingTopics?: string[];
}

interface RoadmapItem {
  title: string;
  done: boolean;
}

const getStudentDetails = (id: string) => {
  const student = studentsData.find((s) => s.id === id);
  if (!student) return null;

  const subjects: SubjectData[] = [
    { name: "מתמטיקה", grade: student.status === "red" ? 48 : student.status === "yellow" ? 65 : 88, status: student.status === "red" ? "red" : student.status === "yellow" ? "yellow" : "green", absences: student.status === "red" ? 6 : 1, units: student.status === "red" ? 3 : 4, coveredTopics: ["אלגברה", "גיאומטריה", "חדו״א"], missingTopics: student.status === "red" ? ["הסתברות", "טריגונומטריה", "סטטיסטיקה"] : student.status === "yellow" ? ["הסתברות", "טריגונומטריה"] : [] },
    { name: "אנגלית", grade: student.avg > 70 ? 82 : 59, status: student.avg > 70 ? "green" : "red", absences: student.avg > 70 ? 0 : 4 },
    { name: "היסטוריה", grade: student.avg > 80 ? 91 : 72, status: student.avg > 80 ? "green" : "yellow", absences: 2 },
    { name: "ספרות", grade: student.avg > 75 ? 86 : 68, status: student.avg > 75 ? "green" : "yellow", absences: 1 },
    { name: "מדעים", grade: student.avg > 85 ? 94 : 74, status: student.avg > 85 ? "green" : "yellow", absences: 0 },
    { name: "חינוך גופני", grade: 95, status: "green", absences: 0 },
  ];

  const absences = [
    { date: "12/01/2025", subject: "מתמטיקה", type: "לא מוצדק" },
    { date: "08/01/2025", subject: "אנגלית", type: "מוצדק" },
    { date: "03/01/2025", subject: "היסטוריה", type: "לא מוצדק" },
    { date: "28/12/2024", subject: "מתמטיקה", type: "לא מוצדק" },
  ];

  const roadmap: RoadmapItem[] = [
    { title: "הגשת עבודה במתמטיקה", done: true },
    { title: "שיחה עם מחנך/ת", done: true },
    { title: "מפגש תגבור אנגלית", done: false },
    { title: "מבחן מתכונת היסטוריה", done: false },
    { title: "פגישת הורים", done: false },
  ];

  const overallProgress = Math.round(
    (subjects.reduce((sum, s) => sum + s.grade, 0) / subjects.length)
  );

  return { ...student, subjects, absences, roadmap, overallProgress };
};

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
        <circle
          cx="48" cy="48" r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[22px] font-semibold text-foreground">{value}</span>
    </div>
  );
};

const StudentProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const student = getStudentDetails(id || "");

  if (!student) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">הספורטאי לא נמצא</p>
      </div>
    );
  }

  const initials = student.name.split(" ").map(n => n[0]).join("");

  return (
    <div className="p-5 md:p-10 lg:p-12 space-y-6 md:space-y-8 max-w-[1400px]">
      {/* Back button */}
      <button
        onClick={() => navigate("/students")}
        className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors duration-150"
      >
        <ArrowRight className="h-4 w-4" />
        <span>חזרה לרשימת ספורטאים</span>
      </button>

      {/* Hero Card - Student Info */}
      <div className="card-premium p-5 md:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-5 md:gap-7">
          {/* Avatar */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl md:text-3xl font-semibold shrink-0">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">{student.name}</h2>
              <StatusBadge type={student.status} size="md" />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                {student.branch}
              </span>
              <span className="text-border">·</span>
              <span>כיתה {student.grade}</span>
              <span className="text-border">·</span>
              <span>ממוצע {student.avg}</span>
            </div>
          </div>

          {/* Progress Ring */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <ProgressRing value={student.overallProgress} />
            <span className="text-[12px] text-muted-foreground">התקדמות כללית</span>
          </div>
        </div>
      </div>

      {/* Subjects Grid */}
      <div>
        <h3 className="text-[15px] font-semibold text-foreground mb-4">מקצועות לימוד</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {student.subjects.map((subject) => (
            <div key={subject.name} className="card-premium p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-[14px] font-medium text-foreground">{subject.name}</span>
                    {subject.units && (
                      <span className="text-[12px] text-muted-foreground ms-2">{subject.units} יח״ל</span>
                    )}
                  </div>
                </div>
                <StatusBadge type={subject.status} />
              </div>

              <div className="flex items-end justify-between mt-4">
                <div>
                  <p className="text-[12px] text-muted-foreground">ציון</p>
                  <p className="text-[28px] font-semibold text-foreground leading-none mt-1">{subject.grade}</p>
                </div>
                {subject.absences > 0 && (
                  <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{subject.absences} חיסורים</span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-1.5 rounded-full bg-accent overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${statusConfig[subject.status].dotClass}`}
                  style={{ width: `${subject.grade}%` }}
                />
              </div>

              {/* Topics section */}
              {subject.coveredTopics && subject.coveredTopics.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground mb-1.5">נושאים שנלמדו</p>
                    <div className="flex flex-wrap gap-1.5">
                      {subject.coveredTopics.map((topic) => (
                        <span key={topic} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/10 text-[11px] text-success font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>

                  {subject.missingTopics && subject.missingTopics.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-warning" />
                        נושאים חסרים
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {subject.missingTopics.map((topic) => (
                          <span key={topic} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/10 text-[11px] text-warning font-medium">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row: Absences + Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* Absences */}
        <div className="card-premium p-5 md:p-7">
          <div className="mb-6">
            <h3 className="text-[15px] font-semibold text-foreground">רשימת חיסורים</h3>
            <p className="text-[13px] text-muted-foreground mt-1">חיסורים אחרונים</p>
          </div>
          <div className="space-y-0.5">
            {student.absences.map((absence, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-3.5 ${
                  i < student.absences.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{absence.subject}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{absence.date}</p>
                  </div>
                </div>
                <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${
                  absence.type === "מוצדק" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                  {absence.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap */}
        <div className="card-premium p-5 md:p-7">
          <div className="mb-6">
            <h3 className="text-[15px] font-semibold text-foreground">מפת דרכים</h3>
            <p className="text-[13px] text-muted-foreground mt-1">משימות ויעדים קרובים</p>
          </div>
          <div className="space-y-1">
            {student.roadmap.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 py-3.5 ${
                  i < student.roadmap.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  item.done ? "bg-success/15" : "bg-accent"
                }`}>
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
                <span className={`text-[13px] ${
                  item.done ? "text-muted-foreground line-through" : "text-foreground font-medium"
                }`}>
                  {item.title}
                </span>
              </div>
            ))}
          </div>

          {/* Progress summary */}
          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">
              {student.roadmap.filter(r => r.done).length} מתוך {student.roadmap.length} הושלמו
            </span>
            <div className="w-24 h-1.5 rounded-full bg-accent overflow-hidden">
              <div
                className="h-full rounded-full bg-success transition-all duration-500"
                style={{ width: `${(student.roadmap.filter(r => r.done).length / student.roadmap.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;
