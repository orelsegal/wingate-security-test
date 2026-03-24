import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight, BookOpen, CheckCircle2, Lock, Clock, Loader2,
  GraduationCap, AlertTriangle, ChevronLeft
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudentProgress } from "@/hooks/useStudents";
import { Progress } from "@/components/ui/progress";
import { useMemo, useEffect } from "react";
import { saveLastVisited } from "@/pages/RoleHomePage";
import DataExportTools from "@/components/DataExportTools";

/* ── Part definitions ── */
interface PartDef {
  id: string;
  title: string;
  weight: string;
  topics: string[];
}

const subjectParts: Record<string, PartDef[]> = {
  "היסטוריה": [
    { id: "hist-30", title: "30% פנימי", weight: "30%", topics: ["הלאומיות באירופה", "מלחמת העולם הראשונה", "התקופה שבין המלחמות"] },
    { id: "hist-70", title: "70% חיצוני", weight: "70%", topics: ["מלחמת העולם השנייה", "השואה", "הקמת המדינה", "סכסוך ערבי-ישראלי"] },
  ],
  "אזרחות": [
    { id: "civ-30", title: "30% פנימי", weight: "30%", topics: ["עקרונות הדמוקרטיה", "זכויות האדם", "הכרזת העצמאות"] },
    { id: "civ-70", title: "70% חיצוני", weight: "70%", topics: ["מוסדות השלטון", "חוקה ומשפט", "אזרחות פעילה", "מיעוטים בישראל"] },
  ],
  "ספרות": [
    { id: "lit-30", title: "30% פנימי", weight: "30%", topics: ["שירה מודרנית", "סיפור קצר", "ניתוח טקסט"] },
    { id: "lit-70", title: "70% חיצוני", weight: "70%", topics: ["רומן", "דרמה", "שירה קלאסית", "חיבור השוואתי"] },
  ],
  "לשון": [
    { id: "heb-20", title: "20% פנימי", weight: "20%", topics: ["תחביר בסיסי", "חלקי דיבר", "פיסוק"] },
    { id: "heb-80", title: "80% חיצוני", weight: "80%", topics: ["הבנת הנקרא", "כתיבה אקדמית", "לשון פורמלית", "מבנה טקסט"] },
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

  useEffect(() => {
    if (decoded) saveLastVisited(`/subjects/${encodeURIComponent(decoded)}`, decoded);
  }, [decoded]);

  const subjectProgress = useMemo(
    () => progress.find((p: any) => p.subjects?.subject_name === decoded),
    [progress, decoded]
  );

  const parts = subjectParts[decoded] || [];
  const pct = subjectProgress?.completion_percent ?? 0;
  const grade = subjectProgress?.grade;
  const status = (subjectProgress?.status as string) || "gray";
  const coveredTopics: string[] = subjectProgress?.covered_topics || [];
  const missingItems: string[] = subjectProgress?.missing_items || [];

  const statusLabel =
    status === "green" ? "במסלול" : status === "yellow" ? "פערים" : status === "red" ? "בסיכון" : "—";
  const statusColor =
    status === "green" ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
    : status === "yellow" ? "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]"
    : status === "red" ? "bg-destructive/15 text-destructive"
    : "bg-muted text-muted-foreground";

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
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
          <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">מבנה בגרות ומעקב התקדמות</p>
        </div>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
      </div>

      {/* Export tools for staff */}
      {(user?.role === "admin" || user?.role === "teacher" || user?.role === "coach") && (
        <div className="mb-5">
          <DataExportTools
            subjectProgress={[{
              subjectName: decoded,
              grade: grade ?? undefined,
              status: status,
              completionPercent: pct,
              missingItems: missingItems,
              coveredTopics: coveredTopics,
            }]}
            label={decoded}
            contextLabel={decoded}
            compact
          />
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "התקדמות", value: `${pct}%` },
          { label: "ציון", value: grade != null ? `${grade}` : "—" },
          { label: "יחידות", value: `${parts.length}` },
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

      {/* Parts — click to enter course */}
      <section className="mb-6">
        <h2 className="text-[12px] font-semibold text-primary/60 mb-3 tracking-tight flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.5} />
          יחידות לימוד
        </h2>
        <div className="flex flex-col gap-3">
          {parts.map((part, pi) => {
            const topicsDone = part.topics.filter(t => coveredTopics.includes(t)).length;
            const partPct = part.topics.length > 0 ? Math.round((topicsDone / part.topics.length) * 100) : 0;
            const isComplete = partPct === 100;

            return (
              <button
                key={part.id}
                onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}/${part.id}`)}
                className="group bg-card rounded-2xl border border-border p-4 text-start shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${100 + pi * 50}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete ? "bg-[hsl(var(--success))]/12" : "bg-primary/8"}`}>
                    {isComplete ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-[hsl(var(--success))]" strokeWidth={1.5} />
                    ) : (
                      <BookOpen className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[13px] font-semibold text-foreground leading-tight">{part.title}</h3>
                    <p className="text-[10px] text-muted-foreground font-normal mt-0.5">{part.weight} · {topicsDone} מתוך {part.topics.length} נושאים</p>
                  </div>
                  <span className={`text-[10px] font-semibold tabular-nums ml-1 ${isComplete ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>{partPct}%</span>
                  <ChevronLeft className="h-4 w-4 text-border group-hover:text-primary/50 transition-colors shrink-0" strokeWidth={1.5} />
                </div>
                <Progress value={partPct} className="h-1.5 bg-muted/50" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Missing items */}
      {missingItems.length > 0 && (
        <section className="mb-6 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
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
    </div>
  );
};

export default SubjectDetailPage;
