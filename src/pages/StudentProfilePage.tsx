import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, AlertCircle, CheckCircle2, Target, AlertTriangle, ShieldAlert, ChevronDown, X } from "lucide-react";
import { studentsData, statusConfig } from "@/lib/studentData";
import { StatusBadge } from "@/components/StatusBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import type { StatusType } from "@/lib/studentData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line,
} from "recharts";

type MilestoneStatus = "done" | "in_progress" | "missing";

interface SubjectMilestone {
  title: string;
  status: MilestoneStatus;
}

interface SubjectData {
  name: string;
  grade: number;
  status: StatusType;
  absences: number;
  units?: number;
  coveredTopics?: string[];
  missingTopics?: string[];
  milestones?: SubjectMilestone[];
}

interface RoadmapItem {
  title: string;
  done: boolean;
}

const getStudentDetails = (id: string) => {
  const student = studentsData.find((s) => s.id === id);
  if (!student) return null;

  const subjects: SubjectData[] = [
    { name: "מתמטיקה", grade: student.status === "red" ? 48 : student.status === "yellow" ? 65 : 88, status: student.status === "red" ? "red" : student.status === "yellow" ? "yellow" : "green", absences: student.status === "red" ? 6 : 1, units: student.status === "red" ? 3 : 4, coveredTopics: ["אלגברה", "גיאומטריה", "חדו״א"], missingTopics: student.status === "red" ? ["הסתברות", "טריגונומטריה", "סטטיסטיקה"] : student.status === "yellow" ? ["הסתברות", "טריגונומטריה"] : [],
      milestones: [
        { title: "מבוא לאלגברה", status: "done" },
        { title: "משוואות ריבועיות", status: "done" },
        { title: "גיאומטריה אנליטית", status: student.status === "green" ? "done" : "in_progress" },
        { title: "חדו״א א׳", status: student.status === "green" ? "done" : "missing" },
        { title: "הסתברות", status: student.status === "red" ? "missing" : student.status === "yellow" ? "missing" : "in_progress" },
        { title: "מבחן בגרות", status: "missing" },
      ]
    },
    { name: "אנגלית", grade: student.avg > 70 ? 82 : 59, status: student.avg > 70 ? "green" : "red", absences: student.avg > 70 ? 0 : 4,
      milestones: [
        { title: "קריאה והבנה", status: "done" },
        { title: "כתיבה אקדמית", status: student.avg > 70 ? "done" : "in_progress" },
        { title: "ספרות אנגלית", status: student.avg > 70 ? "in_progress" : "missing" },
        { title: "מבחן בגרות", status: "missing" },
      ]
    },
    { name: "היסטוריה", grade: student.avg > 80 ? 91 : 72, status: student.avg > 80 ? "green" : "yellow", absences: 2,
      milestones: [
        { title: "תקופה עתיקה", status: "done" },
        { title: "ימי הביניים", status: "done" },
        { title: "עת חדשה", status: student.avg > 80 ? "done" : "in_progress" },
        { title: "עבודת חקר", status: student.avg > 80 ? "in_progress" : "missing" },
        { title: "מבחן בגרות", status: "missing" },
      ]
    },
    { name: "ספרות", grade: student.avg > 75 ? 86 : 68, status: student.avg > 75 ? "green" : "yellow", absences: 1,
      milestones: [
        { title: "שירה", status: "done" },
        { title: "סיפורת", status: student.avg > 75 ? "done" : "in_progress" },
        { title: "עבודת סיכום", status: "missing" },
      ]
    },
    { name: "מדעים", grade: student.avg > 85 ? 94 : 74, status: student.avg > 85 ? "green" : "yellow", absences: 0,
      milestones: [
        { title: "פיזיקה בסיסית", status: "done" },
        { title: "כימיה", status: student.avg > 85 ? "done" : "in_progress" },
        { title: "ביולוגיה", status: student.avg > 85 ? "in_progress" : "missing" },
        { title: "פרויקט מעבדה", status: "missing" },
      ]
    },
    { name: "חינוך גופני", grade: 95, status: "green", absences: 0,
      milestones: [
        { title: "כושר גופני", status: "done" },
        { title: "מבחן שנתי", status: "in_progress" },
      ]
    },
    { name: "השכלה כללית", grade: student.status === "red" ? 45 : student.status === "yellow" ? 62 : 84, status: student.status === "red" ? "red" : student.status === "yellow" ? "yellow" : "green", absences: student.status === "red" ? 3 : 0,
      coveredTopics: ["אזרחות", "תנ״ך"],
      missingTopics: student.status === "red" ? ["מעורבות חברתית", "פרויקט גמר", "בחינה מסכמת"] : student.status === "yellow" ? ["פרויקט גמר", "בחינה מסכמת"] : [],
      milestones: [
        { title: "אזרחות — בחינה", status: "done" },
        { title: "תנ״ך — בחינה", status: student.status === "green" ? "done" : "in_progress" },
        { title: "מעורבות חברתית", status: student.status === "red" ? "missing" : student.status === "yellow" ? "missing" : "done" },
        { title: "פרויקט גמר", status: student.status === "red" ? "missing" : student.status === "yellow" ? "missing" : "in_progress" },
        { title: "בחינה מסכמת", status: "missing" },
      ]
    },
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

const SubjectGrid = ({ subjects }: { subjects: SubjectData[] }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  // Track milestone overrides: { "מתמטיקה-2": "done" }
  const [overrides, setOverrides] = useState<Record<string, MilestoneStatus>>({});

  const getMilestoneStatus = (subjectName: string, idx: number, original: MilestoneStatus): MilestoneStatus => {
    return overrides[`${subjectName}-${idx}`] ?? original;
  };

  const toggleMilestone = (subjectName: string, idx: number, current: MilestoneStatus) => {
    const key = `${subjectName}-${idx}`;
    setOverrides(prev => ({
      ...prev,
      [key]: current === "done" ? "missing" : "done",
    }));
  };

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-foreground mb-4">פירוט לפי מקצוע</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {subjects.map((subject) => {
          const isOpen = expanded === subject.name;
          const resolvedMilestones = subject.milestones?.map((ms, idx) => ({
            ...ms,
            status: getMilestoneStatus(subject.name, idx, ms.status),
          }));
          const doneCount = resolvedMilestones?.filter(m => m.status === "done").length ?? 0;
          const totalCount = resolvedMilestones?.length ?? 0;
          const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

          return (
            <div key={subject.name} className={`card-premium transition-all duration-200 ${isOpen ? "sm:col-span-2 lg:col-span-3" : ""}`}>
              {/* Clickable header */}
              <button
                onClick={() => setExpanded(isOpen ? null : subject.name)}
                className="w-full p-5 flex items-start justify-between text-start group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-[14px] font-medium text-foreground">{subject.name}</span>
                    {subject.units && (
                      <span className="text-[12px] text-muted-foreground">{subject.units} יח״ל</span>
                    )}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[12px] text-muted-foreground">ציון</p>
                      <p className="text-[28px] font-semibold text-foreground leading-none mt-1">{subject.grade}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {subject.absences > 0 && (
                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span>{subject.absences} חיסורים</span>
                        </div>
                      )}
                      {totalCount > 0 && (
                        <span className="text-[11px] text-muted-foreground">{doneCount}/{totalCount} שלבים</span>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-4 h-1.5 rounded-full bg-accent overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${statusConfig[subject.status].dotClass}`}
                      style={{ width: `${subject.grade}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 ms-4 shrink-0">
                  <StatusBadge type={subject.status} />
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                </div>
              </button>

              {/* Expanded detail panel */}
              {isOpen && (
                <div className="px-5 pb-5 border-t border-border animate-fade-in-up" style={{ animationDuration: "200ms" }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
                    {/* Column 1: Milestones roadmap */}
                    {resolvedMilestones && resolvedMilestones.length > 0 && (
                      <div>
                        <p className="text-[12px] font-medium text-muted-foreground mb-3">שלבי התקדמות</p>
                        <div className="space-y-0">
                          {resolvedMilestones.map((ms, idx) => {
                            const isLast = idx === resolvedMilestones.length - 1;
                            return (
                              <div key={idx} className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleMilestone(subject.name, idx, ms.status); }}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer hover:scale-110 ${
                                      ms.status === "done" ? "bg-success/15 hover:bg-success/25"
                                      : ms.status === "in_progress" ? "bg-primary/15 hover:bg-primary/25"
                                      : "bg-accent hover:bg-accent/80"
                                    }`}
                                    title={ms.status === "done" ? "סמן כלא הושלם" : "סמן כהושלם"}
                                  >
                                    {ms.status === "done" ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={1.5} />
                                    ) : ms.status === "in_progress" ? (
                                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    ) : (
                                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                                    )}
                                  </button>
                                  {!isLast && (
                                    <div className={`w-px h-5 ${ms.status === "done" ? "bg-success/30" : "bg-border"}`} />
                                  )}
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleMilestone(subject.name, idx, ms.status); }}
                                  className={`text-[13px] pt-1 text-start transition-colors duration-150 cursor-pointer hover:text-foreground ${
                                    ms.status === "done"
                                      ? "text-muted-foreground line-through decoration-success/40"
                                      : ms.status === "in_progress"
                                      ? "text-foreground font-medium"
                                      : "text-muted-foreground/60"
                                  }`}
                                >
                                  {ms.title}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        {/* Progress summary */}
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">
                            הושלמו {doneCount} מתוך {totalCount}
                          </span>
                          <div className="w-20 h-1.5 rounded-full bg-accent overflow-hidden">
                            <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Column 2: Topics covered */}
                    <div>
                      {subject.coveredTopics && subject.coveredTopics.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[12px] font-medium text-muted-foreground mb-2">נושאים שנלמדו</p>
                          <div className="flex flex-wrap gap-1.5">
                            {subject.coveredTopics.map((topic) => (
                              <span key={topic} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-success/10 text-[12px] text-success font-medium">
                                <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {subject.missingTopics && subject.missingTopics.length > 0 && (
                        <div>
                          <p className="text-[12px] font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-warning" strokeWidth={1.5} />
                            נושאים להשלמה
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {subject.missingTopics.map((topic) => (
                              <span key={topic} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warning/10 text-[12px] text-warning font-medium">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Column 3: Summary stats */}
                    <div className="space-y-4">
                      <div className="card-premium p-4 bg-accent/30 border-border/50">
                        <p className="text-[11px] text-muted-foreground mb-1">ציון נוכחי</p>
                        <p className="text-[32px] font-bold text-foreground leading-none">{subject.grade}</p>
                      </div>
                      <div className="card-premium p-4 bg-accent/30 border-border/50">
                        <p className="text-[11px] text-muted-foreground mb-1">היעדרויות</p>
                        <p className={`text-[24px] font-bold leading-none ${subject.absences > 3 ? "text-destructive" : "text-foreground"}`}>{subject.absences}</p>
                      </div>
                      <div className="card-premium p-4 bg-accent/30 border-border/50">
                        <p className="text-[11px] text-muted-foreground mb-1">התקדמות</p>
                        <p className="text-[24px] font-bold text-foreground leading-none">{progressPct}%</p>
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
  );
};

const StudentProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const student = getStudentDetails(id || "");

  if (!student) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">הספורטאי לא נמצא</p>
      </div>
    );
  }

  // Strict access control
  const hasAccess =
    user?.role === "admin" ||
    user?.role === "teacher" ||
    (user?.role === "parent" && user.scopeFilter?.includes(student.id)) ||
    (user?.role === "coach" && user.scopeFilter?.includes(student.branch));

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

  const initials = student.name.split(" ").map(n => n[0]).join("");

  return (
    <div className="p-5 md:p-10 lg:p-12 space-y-6 md:space-y-8 max-w-[1400px]">
      {/* Back button */}
      <button
        onClick={() => navigate("/students")}
        className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors duration-150"
      >
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        <span>חזרה לרשימת ספורטאים</span>
      </button>

      {/* Hero Card - Student Info */}
      <div className="card-premium p-5 md:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-5 md:gap-7">
          {/* Avatar */}
          <img src={student.avatar} alt={student.name} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-accent object-cover shrink-0" />

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">{student.name}</h2>
              <StatusBadge type={student.status} size="md" />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" strokeWidth={1.5} />
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
            <span className="text-[12px] text-muted-foreground">ציון משוקלל</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* Bar Chart - Grades per Subject */}
        <div className="card-premium p-5 md:p-7">
          <div className="mb-6">
            <h3 className="text-[15px] font-semibold text-foreground">ציונים לפי מקצוע</h3>
            <p className="text-[13px] text-muted-foreground mt-1">השוואת ציונים בין המקצועות</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={student.subjects.map(s => ({ name: s.name, ציון: s.grade }))} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
              <RechartsTooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, direction: "rtl" }}
                cursor={{ fill: "hsl(var(--accent))", radius: 8 }}
              />
              <Bar dataKey="ציון" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart - Overall Profile */}
        <div className="card-premium p-5 md:p-7">
          <div className="mb-6">
            <h3 className="text-[15px] font-semibold text-foreground">פרופיל אקדמי</h3>
            <p className="text-[13px] text-muted-foreground mt-1">מיפוי רמות לפי מקצוע</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={student.subjects.map(s => ({ subject: s.name, ציון: s.grade, fullMark: 100 }))}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="ציון" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend Chart - Simulated semester progress */}
      <div className="card-premium p-5 md:p-7">
        <div className="mb-6">
          <h3 className="text-[15px] font-semibold text-foreground">מגמת ממוצע</h3>
          <p className="text-[13px] text-muted-foreground mt-1">התפתחות הציון הממוצע &middot; סמסטר א׳ תשפ״ה</p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={(() => {
            const base = student.overallProgress;
            const months = ["ספט׳", "אוק׳", "נוב׳", "דצמ׳", "ינו׳", "פבר׳"];
            return months.map((m, i) => ({
              month: m,
              ממוצע: Math.max(40, Math.min(100, Math.round(base - 15 + i * 3 + (Math.sin(i * 1.5) * 4)))),
            }));
          })()} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
            <RechartsTooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, direction: "rtl" }}
            />
            <Line type="monotone" dataKey="ממוצע" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--card))", stroke: "hsl(var(--primary))", strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Subjects Grid */}
      <SubjectGrid subjects={student.subjects} />

      {/* Bottom Row: Absences + Roadmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* Absences */}
        <div className="card-premium p-5 md:p-7">
          <div className="mb-6">
            <h3 className="text-[15px] font-semibold text-foreground">נוכחות והיעדרויות</h3>
            <p className="text-[13px] text-muted-foreground mt-1">היעדרויות אחרונות שנרשמו</p>
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
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
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
            <h3 className="text-[15px] font-semibold text-foreground">משימות ויעדים</h3>
            <p className="text-[13px] text-muted-foreground mt-1">פעולות נדרשות להשלמה</p>
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
                    <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.5} />
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
              הושלמו {student.roadmap.filter(r => r.done).length} מתוך {student.roadmap.length}
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
