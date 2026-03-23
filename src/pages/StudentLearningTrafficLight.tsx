import { useAuth } from "@/context/AuthContext";
import { useStudent, useStudentProgress, statusConfig, type StatusType } from "@/hooks/useStudents";
import { ArrowRight, BookOpen, Loader2, ChevronDown, CheckCircle2, AlertTriangle, Clock, Target, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { Progress } from "@/components/ui/progress";

type FilterType = "all" | "green" | "yellow" | "red";

const filterLabels: Record<FilterType, string> = {
  all: "הכל",
  green: "במסלול",
  yellow: "פערים",
  red: "בסיכון",
};

const StudentLearningTrafficLight = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: student, isLoading } = useStudent(studentId);
  const { data: progress = [], isLoading: progressLoading } = useStudentProgress(studentId);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const stats = useMemo(() => {
    const green = progress.filter((p) => p.status === "green").length;
    const yellow = progress.filter((p) => p.status === "yellow").length;
    const red = progress.filter((p) => p.status === "red").length;
    const avgGrade = progress.length > 0 ? Math.round(progress.reduce((s, p) => s + (p.grade || 0), 0) / progress.length) : 0;
    return { green, yellow, red, total: progress.length, avgGrade };
  }, [progress]);

  const filtered = useMemo(() => {
    if (filter === "all") return progress;
    return progress.filter((p) => p.status === filter);
  }, [progress, filter]);

  if (isLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/student-home")}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-[17px] md:text-[21px] font-semibold text-foreground tracking-tight leading-tight">
            רמזור למידה
          </h1>
          <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">
            {student?.full_name} · מצב לימודי לפי מקצוע
          </p>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: CheckCircle2, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success))]/10", value: stats.green, label: "במסלול" },
          { icon: AlertTriangle, color: "text-[hsl(var(--warning))]", bg: "bg-[hsl(var(--warning))]/10", value: stats.yellow, label: "פערים" },
          { icon: Target, color: "text-destructive", bg: "bg-destructive/10", value: stats.red, label: "בסיכון" },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-card rounded-xl border border-border p-3.5 text-center shadow-[var(--shadow-card)] animate-fade-in-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-center justify-center mb-1.5">
              <s.icon className={`h-4 w-4 ${s.color}`} strokeWidth={1.5} />
            </div>
            <p className="text-[20px] font-bold text-foreground leading-none tabular-nums">{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(["all", "green", "yellow", "red"] as FilterType[]).map((f) => {
          const active = filter === f;
          const dotColor = f === "green" ? "bg-success" : f === "yellow" ? "bg-warning" : f === "red" ? "bg-destructive" : "";
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-[11.5px] font-medium transition-all duration-150 flex items-center gap-1.5 ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {f !== "all" && <span className={`w-[6px] h-[6px] rounded-full ${active ? "bg-primary-foreground" : dotColor}`} />}
              {filterLabels[f]}
            </button>
          );
        })}
      </div>

      {/* Subject cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-[13px]">
            אין מקצועות בקטגוריה זו
          </div>
        )}
        {filtered.map((sp, i) => {
          const subjName = (sp as any).subjects?.subject_name || "מקצוע";
          const status = sp.status as StatusType;
          const config = statusConfig[status];
          const isOpen = expanded === sp.id;
          const completedTopics = sp.covered_topics || [];
          const missingItems = sp.missing_items || [];

          return (
            <div
              key={sp.id}
              className="card-premium overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${60 + i * 30}ms` }}
            >
              {/* Card header */}
              <button
                onClick={() => setExpanded(isOpen ? null : sp.id)}
                className="w-full p-4 md:p-5 flex items-center justify-between text-start group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bgClass}`}>
                    <BookOpen className="h-4 w-4" style={{ color: `hsl(var(--${status === "green" ? "success" : status === "yellow" ? "warning" : "destructive"}))` }} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[13.5px] font-semibold text-foreground block">{subjName}</span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-muted-foreground tabular-nums">ציון: {sp.grade || 0}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">השלמה: {sp.completion_percent}%</span>
                      {sp.absences > 0 && (
                        <span className={`text-[11px] tabular-nums ${sp.absences > 3 ? "text-destructive" : "text-muted-foreground"}`}>
                          חיסורים: {sp.absences}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] gap-1.5 ${config.bgClass}`}>
                    <span className={`w-[6px] h-[6px] rounded-full ${config.dotClass}`} />
                    <span className={`font-medium ${config.textClass}`}>{config.label}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    strokeWidth={1.5}
                  />
                </div>
              </button>

              {/* Progress bar */}
              <div className="mx-5 -mt-1 mb-3">
                <Progress
                  value={sp.completion_percent || 0}
                  className="h-1.5 bg-accent"
                />
              </div>

              {/* Expanded details */}
              {isOpen && (
                <div className="px-5 pb-5 border-t border-border/50 pt-4 space-y-4 animate-in slide-in-from-top-1 duration-200">
                  {/* Grade & progress summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "ציון", value: String(sp.grade || 0), icon: TrendingUp },
                      { label: "אחוז השלמה", value: `${sp.completion_percent}%`, icon: Target },
                      { label: "חיסורים", value: String(sp.absences), icon: Clock },
                      { label: "סטטוס", value: config.label, icon: CheckCircle2 },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-accent/30 rounded-lg p-3 text-center">
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-1" strokeWidth={1.5} />
                        <p className="text-[16px] font-bold text-foreground tabular-nums">{item.value}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Completed topics */}
                  {completedTopics.length > 0 && (
                    <div>
                      <p className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" strokeWidth={1.5} />
                        נושאים שהושלמו
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {completedTopics.map((t, idx) => (
                          <span key={idx} className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] text-[11px] px-2.5 py-1 rounded-full font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing items */}
                  {missingItems.length > 0 && (
                    <div>
                      <p className="text-[12px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))]" strokeWidth={1.5} />
                        נושאים להשלמה
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {missingItems.map((m, idx) => (
                          <span key={idx} className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] text-[11px] px-2.5 py-1 rounded-full font-medium">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {sp.notes && (
                    <div>
                      <p className="text-[12px] font-semibold text-foreground mb-1.5">הערות מורה</p>
                      <p className="text-[12px] text-muted-foreground bg-accent/30 rounded-lg p-3 leading-relaxed">{sp.notes}</p>
                    </div>
                  )}

                  {/* Next step suggestion */}
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Target className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">השלב הבא</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {status === "red"
                          ? `יש ${missingItems.length} נושאים להשלמה. מומלץ לפנות למורה לתיאום שיעורי השלמה.`
                          : status === "yellow"
                          ? `יש פערים קטנים. מומלץ לחזור על ${missingItems.length > 0 ? missingItems[0] : "הנושאים החסרים"}.`
                          : "המשך כך! כל הנושאים במסלול."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center">
        <span className="text-[8.5px] text-muted-foreground/20 font-normal tracking-wider">
          האקדמיה למצוינות · מכון וינגייט
        </span>
      </div>
    </div>
  );
};

export default StudentLearningTrafficLight;
