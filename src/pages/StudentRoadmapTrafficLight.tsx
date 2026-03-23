import { useAuth } from "@/context/AuthContext";
import { useStudent, useStudentRoadmap, useStudentProgress } from "@/hooks/useStudents";
import { ArrowRight, Loader2, CheckCircle2, Lock, Circle, ChevronDown, Route, Target, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { Progress } from "@/components/ui/progress";

const StudentRoadmapTrafficLight = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: student, isLoading } = useStudent(studentId);
  const { data: progress = [] } = useStudentProgress(studentId);
  const { data: roadmap = [], isLoading: roadmapLoading } = useStudentRoadmap(studentId, student?.math_level ?? 3);

  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  // Group roadmap items by subject
  const subjectGroups = useMemo(() => {
    const map = new Map<string, { subjectName: string; subjectId: string; items: typeof roadmap }>();
    roadmap.forEach((item) => {
      const subjName = (item as any).subjects?.subject_name || "אחר";
      const subjId = item.subject_id;
      if (!map.has(subjId)) {
        map.set(subjId, { subjectName: subjName, subjectId: subjId, items: [] });
      }
      map.get(subjId)!.items.push(item);
    });
    return Array.from(map.values());
  }, [roadmap]);

  // Overall stats
  const totalItems = roadmap.length;
  const completedItems = roadmap.filter((r: any) => r.completed).length;
  const overallPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Find the next incomplete item
  const nextStep = useMemo(() => {
    for (const item of roadmap) {
      if (!(item as any).completed) {
        return { topic: item.topic_name, subject: (item as any).subjects?.subject_name || "" };
      }
    }
    return null;
  }, [roadmap]);

  if (isLoading || roadmapLoading) {
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
            רמזור מפת דרכים
          </h1>
          <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">
            {student?.full_name} · מפת הדרך לבגרות
          </p>
        </div>
      </div>

      {/* Overall progress hero */}
      <div className="card-premium p-5 md:p-6 mb-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Route className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">התקדמות כללית</p>
              <p className="text-[11px] text-muted-foreground">{completedItems} מתוך {totalItems} שלבים הושלמו</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[28px] font-bold text-primary tabular-nums leading-none">{overallPct}%</p>
          </div>
        </div>
        <Progress value={overallPct} className="h-2 bg-accent" />

        {/* Next step */}
        {nextStep && (
          <div className="mt-4 bg-primary/5 border border-primary/10 rounded-xl p-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Flag className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-foreground">השלב הבא</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {nextStep.subject} — {nextStep.topic}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: CheckCircle2, color: "text-[hsl(var(--success))]", value: completedItems, label: "הושלמו" },
          { icon: Circle, color: "text-[hsl(var(--warning))]", value: totalItems - completedItems, label: "בתהליך" },
          { icon: Target, color: "text-primary", value: totalItems, label: "סה״כ שלבים" },
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

      {/* Subject roadmap cards */}
      <div className="space-y-3">
        {subjectGroups.map((group, gi) => {
          const done = group.items.filter((r: any) => r.completed).length;
          const total = group.items.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const isOpen = expandedSubject === group.subjectId;

          // Get subject progress for traffic light
          const subjectProg = progress.find((p) => p.subject_id === group.subjectId);
          const status = subjectProg?.status || "green";
          const statusColor = status === "green" ? "bg-success" : status === "yellow" ? "bg-warning" : "bg-destructive";
          const statusLabel = status === "green" ? "במסלול" : status === "yellow" ? "פערים" : "בסיכון";
          const statusBg = status === "green" ? "bg-success/10" : status === "yellow" ? "bg-warning/10" : "bg-destructive/10";
          const statusText = status === "green" ? "text-[hsl(var(--success))]" : status === "yellow" ? "text-[hsl(var(--warning))]" : "text-destructive";

          return (
            <div
              key={group.subjectId}
              className="card-premium overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${60 + gi * 30}ms` }}
            >
              {/* Subject header */}
              <button
                onClick={() => setExpandedSubject(isOpen ? null : group.subjectId)}
                className="w-full p-4 md:p-5 flex items-center justify-between text-start group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusBg}`}>
                    <Route className={`h-4 w-4 ${statusText}`} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[13.5px] font-semibold text-foreground block">{group.subjectName}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{done} מתוך {total} שלבים · {pct}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] gap-1.5 ${statusBg}`}>
                    <span className={`w-[6px] h-[6px] rounded-full ${statusColor}`} />
                    <span className={`font-medium ${statusText}`}>{statusLabel}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    strokeWidth={1.5}
                  />
                </div>
              </button>

              {/* Progress bar */}
              <div className="mx-5 -mt-1 mb-3">
                <Progress value={pct} className="h-1.5 bg-accent" />
              </div>

              {/* Expanded milestone list */}
              {isOpen && (
                <div className="px-5 pb-5 border-t border-border/50 pt-4 animate-in slide-in-from-top-1 duration-200">
                  <div className="space-y-0">
                    {group.items.map((item, idx) => {
                      const isCompleted = (item as any).completed;
                      const isLast = idx === group.items.length - 1;
                      // Determine if locked: items after the first incomplete are locked
                      const firstIncompleteIdx = group.items.findIndex((r: any) => !r.completed);
                      const isLocked = !isCompleted && idx > firstIncompleteIdx && firstIncompleteIdx !== -1;
                      const isCurrent = idx === firstIncompleteIdx;

                      return (
                        <div key={item.id} className="flex items-start gap-3">
                          {/* Timeline dot + connector */}
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                                isCompleted
                                  ? "bg-success/15"
                                  : isCurrent
                                  ? "bg-primary/10 ring-2 ring-primary/20"
                                  : isLocked
                                  ? "bg-muted"
                                  : "bg-accent"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" strokeWidth={1.5} />
                              ) : isLocked ? (
                                <Lock className="h-3 w-3 text-muted-foreground/40" strokeWidth={1.5} />
                              ) : (
                                <Circle className="h-3 w-3 text-primary" strokeWidth={2} />
                              )}
                            </div>
                            {!isLast && (
                              <div className={`w-px h-5 ${isCompleted ? "bg-success/30" : "bg-border"}`} />
                            )}
                          </div>

                          {/* Content */}
                          <div className={`pt-1 pb-1 flex-1 min-w-0 ${isLocked ? "opacity-50" : ""}`}>
                            <p
                              className={`text-[12px] leading-tight ${
                                isCompleted
                                  ? "text-muted-foreground line-through decoration-success/40"
                                  : isCurrent
                                  ? "text-foreground font-semibold"
                                  : "text-muted-foreground/70"
                              }`}
                            >
                              {item.topic_name}
                            </p>
                            {isCurrent && (
                              <span className="text-[9.5px] text-primary font-medium mt-0.5 inline-block">
                                ← השלב הנוכחי
                              </span>
                            )}
                            {isCompleted && (item as any).completion_date && (
                              <span className="text-[9.5px] text-muted-foreground/50 mt-0.5 inline-block">
                                הושלם {new Date((item as any).completion_date).toLocaleDateString("he-IL")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Subject summary */}
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{done} מתוך {total} שלבים הושלמו</span>
                    <div className="w-24 h-1.5 rounded-full bg-accent overflow-hidden">
                      <div
                        className="h-full rounded-full bg-success transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {subjectGroups.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-[13px]">
          לא נמצאו שלבים במפת הדרכים
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 text-center">
        <span className="text-[8.5px] text-muted-foreground/20 font-normal tracking-wider">
          האקדמיה למצוינות · מכון וינגייט
        </span>
      </div>
    </div>
  );
};

export default StudentRoadmapTrafficLight;
