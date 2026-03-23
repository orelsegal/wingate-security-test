import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, Lock, Clock, BookOpen, FileText,
  ClipboardList, Sparkles, Scroll, ChevronDown, ChevronUp
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudentProgress } from "@/hooks/useStudents";
import { Progress } from "@/components/ui/progress";

/* ── Course structure — 70% rubric sections ── */
interface Section {
  id: string;
  title: string;
  topics: string[];
}

const courseSections: Section[] = [
  {
    id: "ww2",
    title: "מלחמת העולם השנייה",
    topics: [
      "עליית הנאציזם בגרמניה",
      "פרוץ המלחמה והחזיתות",
      "מפנה המלחמה – סטלינגרד ואל-עלמיין",
      "סיום המלחמה והשלכותיה",
    ],
  },
  {
    id: "holocaust",
    title: "השואה",
    topics: [
      "חוקי נירנברג והדרה",
      "גטאות ומחנות ריכוז",
      'הפתרון הסופי',
      "התנגדות יהודית ולא-יהודית",
      "שחרור ועדויות",
    ],
  },
  {
    id: "state",
    title: "הקמת המדינה",
    topics: [
      "הציונות כתנועה לאומית",
      "המנדט הבריטי ומאבקי היישוב",
      "החלטת החלוקה (כ\"ט בנובמבר)",
      "הכרזת העצמאות ומלחמת העצמאות",
    ],
  },
  {
    id: "conflict",
    title: "סכסוך ערבי-ישראלי",
    topics: [
      "שורשי הסכסוך",
      "מלחמות ישראל (1956, 1967, 1973)",
      "הסכמי שלום ותהליכי מו\"מ",
      "האינתיפאדות והמצב הנוכחי",
    ],
  },
];

/* ── Demo assignments ── */
const demoAssignments = [
  { id: "a1", title: "עבודה – מלחמת העולם השנייה", grade: 82, submitted: true },
  { id: "a2", title: "בוחן – השואה", grade: 75, submitted: true },
  { id: "a3", title: "מטלה – הקמת המדינה", grade: undefined, submitted: false },
];

const HistoryCoursePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: progress = [] } = useStudentProgress(studentId);
  const [expandedSection, setExpandedSection] = useState<string | null>(courseSections[0]?.id || null);

  const historyProgress = useMemo(
    () => progress.find((p: any) => p.subjects?.subject_name === "היסטוריה"),
    [progress]
  );

  const coveredTopics: string[] = historyProgress?.covered_topics || [];
  const notes = historyProgress?.notes;
  const grade = historyProgress?.grade;

  const allTopics = courseSections.flatMap(s => s.topics);
  const completedCount = allTopics.filter(t => coveredTopics.includes(t)).length;
  const totalCount = allTopics.length;
  const coursePct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Find next incomplete topic
  const nextSection = courseSections.find(s => s.topics.some(t => !coveredTopics.includes(t)));
  const nextTopic = nextSection?.topics.find(t => !coveredTopics.includes(t));

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[720px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/subjects/${encodeURIComponent("היסטוריה")}`)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[hsl(35,30%,94%)] flex items-center justify-center shrink-0">
              <Scroll className="h-4 w-4 text-[hsl(35,40%,45%)]" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold text-foreground tracking-tight leading-tight">קורס היסטוריה</h1>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-normal">70% · מבנה למידה מלא</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress overview */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)] mb-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-muted-foreground font-medium">התקדמות בקורס</span>
          <span className="text-[11px] font-semibold text-foreground tabular-nums">{coursePct}%</span>
        </div>
        <Progress value={coursePct} className="h-2 bg-muted/50 mb-3" />
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[15px] font-semibold text-foreground leading-none">{completedCount}</p>
            <p className="text-[9px] text-muted-foreground mt-1 font-medium">נושאים הושלמו</p>
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-foreground leading-none">{totalCount - completedCount}</p>
            <p className="text-[9px] text-muted-foreground mt-1 font-medium">נותרו</p>
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-foreground leading-none">{courseSections.length}</p>
            <p className="text-[9px] text-muted-foreground mt-1 font-medium">פרקים</p>
          </div>
        </div>
      </div>

      {/* Next step */}
      {nextTopic && nextSection && (
        <div className="bg-primary/5 rounded-2xl border border-primary/10 p-4 mb-6 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-primary/60 font-medium mb-0.5">הצעד הבא</p>
              <p className="text-[12px] font-semibold text-foreground leading-tight">{nextTopic}</p>
              <p className="text-[9.5px] text-muted-foreground font-normal">{nextSection.title}</p>
            </div>
          </div>
        </div>
      )}

      {/* Course sections */}
      <section className="mb-6">
        <h2 className="text-[12px] font-semibold text-primary/60 mb-3 tracking-tight flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
          פרקי הקורס
        </h2>
        <div className="flex flex-col gap-3">
          {courseSections.map((section, si) => {
            const sectionDone = section.topics.filter(t => coveredTopics.includes(t)).length;
            const sectionTotal = section.topics.length;
            const sectionPct = sectionTotal > 0 ? Math.round((sectionDone / sectionTotal) * 100) : 0;
            const isComplete = sectionPct === 100;
            const isExpanded = expandedSection === section.id;
            const isCurrentSection = section.id === nextSection?.id;

            return (
              <div
                key={section.id}
                className={`bg-card rounded-2xl border p-4 shadow-[var(--shadow-card)] animate-fade-in-up transition-all duration-200 ${
                  isCurrentSection ? "border-primary/20" : "border-border"
                }`}
                style={{ animationDelay: `${80 + si * 40}ms` }}
              >
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  className="w-full flex items-center gap-3"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isComplete ? "bg-[hsl(var(--success))]/12" : isCurrentSection ? "bg-primary/10" : "bg-muted/60"
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" strokeWidth={1.5} />
                    ) : (
                      <span className="text-[11px] font-semibold text-primary">{si + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 text-start">
                    <h3 className="text-[12.5px] font-semibold text-foreground leading-tight">{section.title}</h3>
                    <p className="text-[9.5px] text-muted-foreground font-normal mt-0.5">
                      {sectionDone} מתוך {sectionTotal} נושאים
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold tabular-nums ml-2 ${isComplete ? "text-[hsl(var(--success))]" : "text-muted-foreground"}`}>
                    {sectionPct}%
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Progress value={sectionPct} className="h-1.5 bg-muted/50 mb-3" />
                    <div className="flex flex-col gap-1.5">
                      {section.topics.map((topic, ti) => {
                        const done = coveredTopics.includes(topic);
                        const isCurrent = topic === nextTopic;
                        return (
                          <div key={ti} className={`flex items-center gap-2 py-1 px-2 rounded-lg ${isCurrent ? "bg-primary/5" : ""}`}>
                            {done ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))] shrink-0" strokeWidth={1.5} />
                            ) : isCurrent ? (
                              <Clock className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={1.5} />
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" strokeWidth={1.5} />
                            )}
                            <span className={`text-[11px] ${
                              done ? "text-foreground" : isCurrent ? "text-primary font-medium" : "text-muted-foreground/50"
                            }`}>
                              {topic}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Assignments */}
      <section className="mb-6">
        <h2 className="text-[12px] font-semibold text-primary/60 mb-3 tracking-tight flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" strokeWidth={1.5} />
          מטלות ומבחנים
        </h2>
        <div className="flex flex-col gap-2">
          {demoAssignments.map((a, i) => (
            <div
              key={a.id}
              className="bg-card rounded-xl border border-border p-3.5 shadow-[var(--shadow-card)] animate-fade-in-up flex items-center gap-3"
              style={{ animationDelay: `${260 + i * 40}ms` }}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                a.submitted ? "bg-[hsl(var(--success))]/10" : "bg-[hsl(var(--warning))]/10"
              }`}>
                {a.submitted ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" strokeWidth={1.5} />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-[hsl(var(--warning))]" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-foreground leading-tight truncate">{a.title}</p>
                <p className="text-[9.5px] text-muted-foreground font-normal mt-0.5">
                  {a.submitted ? "הוגש" : "ממתין להגשה"}
                </p>
              </div>
              {a.grade != null && (
                <span className="text-[13px] font-semibold text-foreground tabular-nums">{a.grade}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Grades summary */}
      <section className="mb-6">
        <div className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)] animate-fade-in-up" style={{ animationDelay: "380ms" }}>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-foreground font-medium">ציון ממוצע</span>
              <span className="text-[13px] font-semibold text-foreground tabular-nums">{grade ?? "—"}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-foreground font-medium">מטלות שהוגשו</span>
              <span className="text-[13px] font-semibold text-foreground tabular-nums">
                {demoAssignments.filter(a => a.submitted).length} / {demoAssignments.length}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-foreground font-medium">התקדמות בקורס</span>
              <span className="text-[13px] font-semibold text-foreground tabular-nums">{coursePct}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Teacher notes */}
      {notes && (
        <section className="mb-6 animate-fade-in-up" style={{ animationDelay: "420ms" }}>
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

export default HistoryCoursePage;
