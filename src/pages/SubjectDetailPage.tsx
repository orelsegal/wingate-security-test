import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight, BookOpen, CheckCircle2, Lock, Clock, FileText, Loader2,
  ClipboardList, GraduationCap, AlertTriangle, Sparkles, Play, TrafficCone, Map
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudentProgress } from "@/hooks/useStudents";
import { Progress } from "@/components/ui/progress";
import { useMemo, useEffect } from "react";
import { saveLastVisited } from "@/pages/RoleHomePage";

/* ── rubric / module definitions ── */
interface RubricDef {
  id: string;
  title: string;
  weight: string;
  topics: string[];
  courseUrl?: string;
  courseLabel?: string;
}

const subjectRubrics: Record<string, RubricDef[]> = {
  "היסטוריה": [
    { id: "hist-30", title: "30%", weight: "30%", topics: ["הלאומיות באירופה", "מלחמת העולם הראשונה", "התקופה שבין המלחמות"] },
    {
      id: "hist-70", title: "70%", weight: "70%",
      topics: ["מלחמת העולם השנייה", "השואה", "הקמת המדינה", "סכסוך ערבי-ישראלי"],
      courseUrl: "/history-course",
      courseLabel: "כניסה לקורס היסטוריה"
    },
  ],
  "אזרחות": [
    { id: "civ-30", title: "30%", weight: "30%", topics: ["עקרונות הדמוקרטיה", "זכויות האדם", "הכרזת העצמאות"] },
    { id: "civ-70", title: "70%", weight: "70%", topics: ["מוסדות השלטון", "חוקה ומשפט", "אזרחות פעילה", "מיעוטים בישראל"] },
  ],
  "לשון": [
    { id: "heb-20", title: "20%", weight: "20%", topics: ["תחביר בסיסי", "חלקי דיבר", "פיסוק"] },
    { id: "heb-80", title: "80%", weight: "80%", topics: ["הבנת הנקרא", "כתיבה אקדמית", "לשון פורמלית", "מבנה טקסט"] },
  ],
  "מתמטיקה": [
    { id: "math-1", title: "אלגברה ופונקציות", weight: "~35%", topics: ["משוואות", "פונקציה ליניארית", "פונקציה ריבועית"] },
    { id: "math-2", title: "גיאומטריה וטריגונומטריה", weight: "~35%", topics: ["משולשים", "מעגל", "טריגונומטריה"] },
    { id: "math-3", title: "הסתברות וסטטיסטיקה", weight: "~30%", topics: ["הסתברות", "התפלגויות", "סטטיסטיקה תיאורית"] },
  ],
  "אנגלית": [
    { id: "eng-e", title: "Module E", weight: "Literature", topics: ["Unseen passages", "Literature – Play", "Literature – Poem"] },
    { id: "eng-f", title: "Module F", weight: "Writing", topics: ["Essay writing", "Formal letter", "Report"] },
    { id: "eng-g", title: "Module G", weight: "Oral", topics: ["Oral presentation", "Listening comprehension"] },
  ],
};

const SubjectDetailPage = () => {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: progress = [], isLoading } = useStudentProgress(studentId);
  const decoded = decodeURIComponent(subjectName || "");

  const subjectProgress = useMemo(
    () => progress.find((p: any) => p.subjects?.subject_name === decoded),
    [progress, decoded]
  );

  const rubrics = subjectRubrics[decoded] || [];
  const pct = subjectProgress?.completion_percent ?? 0;
  const grade = subjectProgress?.grade;
  const absences = subjectProgress?.absences ?? 0;
  const status = (subjectProgress?.status as string) || "gray";
  const coveredTopics: string[] = subjectProgress?.covered_topics || [];
  const missingItems: string[] = subjectProgress?.missing_items || [];
  const notes = subjectProgress?.notes;

  const statusLabel =
    status === "green" ? "במסלול" : status === "yellow" ? "פערים" : status === "red" ? "בסיכון" : "—";
  const statusColor =
    status === "green" ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
    : status === "yellow" ? "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]"
    : status === "red" ? "bg-destructive/15 text-destructive"
    : "bg-muted text-muted-foreground";

  const allTopics = rubrics.flatMap(r => r.topics);
  const nextTopic = allTopics.find(t => !coveredTopics.includes(t));
  const nextRubric = rubrics.find(r => r.topics.some(t => !coveredTopics.includes(t)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[720px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/subjects")} className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150">
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-semibold text-foreground tracking-tight leading-tight">{decoded}</h1>
          <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">מבנה למידה ומעקב התקדמות</p>
        </div>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "התקדמות", value: `${pct}%` },
          { label: "ציון", value: grade != null ? `${grade}` : "—" },
          { label: "חיסורים", value: `${absences}` },
        ].map((kpi, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-3 text-center shadow-[var(--shadow-card)] animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
            <p className="text-[16px] font-semibold text-foreground leading-none">{kpi.value}</p>
            <p className="text-[9.5px] text-muted-foreground mt-1 font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Overall progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10.5px] text-muted-foreground font-medium">התקדמות כללית</span>
          <span className="text-[10.5px] font-semibold text-foreground tabular-nums">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2 bg-muted/50" />
      </div>

      {/* Quick Links — Traffic Lights */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => navigate("/student-learning")}
          className="group bg-card rounded-2xl border border-border p-3.5 text-start shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center shrink-0">
              <TrafficCone className="h-4 w-4 text-[hsl(var(--success))]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[11.5px] font-semibold text-foreground leading-tight">רמזור למידה</p>
              <p className="text-[9.5px] text-muted-foreground font-normal mt-0.5">מצב לימודי</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => navigate("/student-roadmap")}
          className="group bg-card rounded-2xl border border-border p-3.5 text-start shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up"
          style={{ animationDelay: "100ms" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Map className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[11.5px] font-semibold text-foreground leading-tight">מפת דרכים</p>
              <p className="text-[9.5px] text-muted-foreground font-normal mt-0.5">נתיב בגרות</p>
            </div>
          </div>
        </button>
      </div>

      {/* Next Step Card */}
      {nextTopic && nextRubric && (
        <div className="bg-primary/5 rounded-2xl border border-primary/10 p-4 mb-6 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-primary/60 font-medium mb-0.5">הצעד הבא</p>
              <p className="text-[12px] font-semibold text-foreground leading-tight">{nextTopic}</p>
              <p className="text-[9.5px] text-muted-foreground font-normal">{nextRubric.title}</p>
            </div>
          </div>
        </div>
      )}

      {/* Rubrics / Modules */}
      <section className="mb-6">
        <h2 className="text-[12px] font-semibold text-primary/60 mb-3 tracking-tight flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.5} />
          יחידות לימוד
        </h2>
        <div className="flex flex-col gap-3">
          {rubrics.map((rubric, ri) => {
            const topicsDone = rubric.topics.filter(t => coveredTopics.includes(t)).length;
            const rubricPct = rubric.topics.length > 0 ? Math.round((topicsDone / rubric.topics.length) * 100) : 0;
            const isComplete = rubricPct === 100;

            return (
              <div
                key={rubric.id}
                className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)] animate-fade-in-up"
                style={{ animationDelay: `${140 + ri * 50}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isComplete ? "bg-[hsl(var(--success))]/12" : "bg-primary/8"}`}>
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" strokeWidth={1.5} />
                    ) : (
                      <BookOpen className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[12.5px] font-semibold text-foreground leading-tight">{rubric.title}</h3>
                    <p className="text-[9.5px] text-muted-foreground font-normal">{rubric.weight}</p>
                  </div>
                  <span className={`text-[10px] font-semibold tabular-nums ${isComplete ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>{rubricPct}%</span>
                </div>
                <Progress value={rubricPct} className="h-1.5 bg-muted/50 mb-3" />

                {/* Course entry point */}
                {rubric.courseUrl && (
                  <button
                    onClick={() => navigate(rubric.courseUrl!)}
                    className="w-full flex items-center gap-2.5 mb-3 p-2.5 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors duration-150"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Play className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-semibold text-primary">{rubric.courseLabel}</span>
                  </button>
                )}

                <div className="flex flex-col gap-1.5">
                  {rubric.topics.map((topic, ti) => {
                    const done = coveredTopics.includes(topic);
                    const missing = missingItems.includes(topic);
                    return (
                      <div key={ti} className="flex items-center gap-2 py-0.5">
                        {done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))] shrink-0" strokeWidth={1.5} />
                        ) : missing ? (
                          <Clock className="h-3.5 w-3.5 text-[hsl(var(--warning))] shrink-0" strokeWidth={1.5} />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
                        )}
                        <span className={`text-[11px] ${done ? "text-foreground" : missing ? "text-[hsl(var(--warning))]" : "text-muted-foreground/60"}`}>
                          {topic}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Assignments & Exams */}
      <section className="mb-6">
        <h2 className="text-[12px] font-semibold text-primary/60 mb-3 tracking-tight flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" strokeWidth={1.5} />
          מטלות ומבחנים
        </h2>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)] animate-fade-in-up" style={{ animationDelay: "280ms" }}>
          {grade != null ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-foreground font-medium">ציון אחרון</span>
                <span className="text-[13px] font-semibold text-foreground tabular-nums">{grade}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-foreground font-medium">חיסורים</span>
                <span className={`text-[13px] font-semibold tabular-nums ${absences > 3 ? "text-destructive" : "text-foreground"}`}>{absences}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-foreground font-medium">השלמה</span>
                <span className="text-[13px] font-semibold text-foreground tabular-nums">{pct}%</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground/60 text-center py-2">אין נתונים עדיין</p>
          )}
        </div>
      </section>

      {/* Missing items */}
      {missingItems.length > 0 && (
        <section className="mb-6 animate-fade-in-up" style={{ animationDelay: "320ms" }}>
          <h2 className="text-[12px] font-semibold text-destructive/60 mb-3 tracking-tight flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
            דורש השלמה
          </h2>
          <div className="bg-destructive/5 rounded-xl border border-destructive/10 p-4">
            <div className="flex flex-col gap-1.5">
              {missingItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-destructive/60 shrink-0" strokeWidth={1.5} />
                  <span className="text-[11px] text-destructive/80">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Teacher notes */}
      {notes && (
        <section className="mb-6 animate-fade-in-up" style={{ animationDelay: "360ms" }}>
          <h2 className="text-[12px] font-semibold text-primary/60 mb-3 tracking-tight flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
            הערות מורה
          </h2>
          <div className="bg-card rounded-xl border border-border p-4 shadow-[var(--shadow-card)]">
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">{notes}</p>
          </div>
        </section>
      )}
    </div>
  );
};

export default SubjectDetailPage;
