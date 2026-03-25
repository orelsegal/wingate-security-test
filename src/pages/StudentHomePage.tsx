import { useAuth } from "@/context/AuthContext";
import { useStudent, useStudentProgress, useStudentRoadmap } from "@/hooks/useStudents";
import { BookOpen, Loader2, ChevronLeft, Target, CalendarDays, GraduationCap, BarChart3, Sparkles, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import WingateBadge from "@/components/WingateBadge";
import { Progress } from "@/components/ui/progress";
import { calculateTrafficLight, getStatusLabel, type TrafficResult } from "@/lib/trafficLight";

/* ═══ Status Card ═══ */
const StatusCard = ({ result }: { result: TrafficResult }) => {
  const bg = result.status === "green" ? "bg-[hsl(var(--success))]/8 border-[hsl(var(--success))]/15"
    : result.status === "yellow" ? "bg-[hsl(var(--warning))]/8 border-[hsl(var(--warning))]/15"
    : "bg-destructive/5 border-destructive/10";
  const dot = result.status === "green" ? "bg-[hsl(var(--success))]"
    : result.status === "yellow" ? "bg-[hsl(var(--warning))]"
    : "bg-destructive";
  const textColor = result.status === "green" ? "text-[hsl(var(--success))]"
    : result.status === "yellow" ? "text-[hsl(var(--warning))]"
    : "text-destructive";

  return (
    <div className={`rounded-2xl border ${bg} p-4 mb-6 animate-fade-in-up`}>
      <div className="flex items-center gap-2.5 mb-2">
        <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
        <span className={`text-[13px] font-semibold ${textColor}`}>{getStatusLabel(result.status)}</span>
      </div>
      <div className="space-y-1">
        {result.reasons.map((r, i) => (
          <p key={i} className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
            {r}
          </p>
        ))}
      </div>
    </div>
  );
};

const StudentHomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: student, isLoading } = useStudent(studentId);
  const { data: progress = [] } = useStudentProgress(studentId);
  const { data: roadmap = [] } = useStudentRoadmap(studentId, student?.math_level ?? 3);

  const completedRoadmapCount = useMemo(() => roadmap.filter((r: any) => r.completed).length, [roadmap]);
  const totalRoadmapCount = roadmap.length;
  const progressPct = totalRoadmapCount > 0 ? Math.round((completedRoadmapCount / totalRoadmapCount) * 100) : 0;

  const avgGrade = useMemo(() => {
    const graded = progress.filter((p: any) => p.grade != null && p.grade > 0);
    return graded.length > 0 ? Math.round(graded.reduce((s: number, p: any) => s + p.grade, 0) / graded.length) : 0;
  }, [progress]);

  // Auto traffic light
  const trafficResult = useMemo(() => {
    if (progress.length === 0) return { status: "green" as const, reasons: ["אין נתונים עדיין"] };
    return calculateTrafficLight(progress.map((p: any) => ({
      grade: p.grade,
      completionPercent: p.completion_percent || 0,
      missingItems: p.missing_items || [],
      absences: p.absences || 0,
    })));
  }, [progress]);

  // Missing tasks
  const missingTasks = useMemo(() => {
    return progress
      .filter((p: any) => p.missing_items && p.missing_items.length > 0)
      .flatMap((p: any) => (p.missing_items || []).map((item: string) => ({
        subject: (p as any).subjects?.subject_name || "",
        task: item,
      })))
      .slice(0, 5);
  }, [progress]);

  // AI suggestion — weakest subject
  const weakSubject = useMemo(() => {
    const sorted = [...progress].filter((p: any) => p.grade != null && p.grade > 0).sort((a: any, b: any) => a.grade - b.grade);
    return sorted[0] as any;
  }, [progress]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const mainCards = [
    { id: "subjects", title: "התחלת למידה", description: "כנס למקצועות ויחידות לימוד", icon: BookOpen, color: "bg-[hsl(270,25%,94%)]", iconColor: "text-[hsl(270,35%,50%)]", action: () => navigate("/subjects") },
    { id: "profile", title: "מפת הדרכים שלי", description: "התקדמות ושלבים הבאים", icon: GraduationCap, color: "bg-primary/10", iconColor: "text-primary", action: () => navigate(`/students/${studentId}`) },
    { id: "grades", title: "ציונים", description: "ציונים עדכניים בכל מקצוע", icon: BarChart3, color: "bg-[hsl(150,25%,93%)]", iconColor: "text-[hsl(150,35%,42%)]", action: () => navigate(`/students/${studentId}`) },
    { id: "calendar", title: "לוח שנה", description: "משימות ומועדים קרובים", icon: CalendarDays, color: "bg-secondary", iconColor: "text-foreground/80", action: () => navigate("/calendar") },
  ];

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto">
      {/* Welcome */}
      <section className="mb-6">
        <div className="flex items-center gap-4 mb-5">
          <WingateBadge size="md" className="shadow-[var(--shadow-card-hover)]" />
          <div>
            <h1 className="text-[17px] md:text-[21px] font-medium text-foreground tracking-tight leading-tight">
              שלום, {student?.full_name || user?.name}
            </h1>
            <p className="text-[11px] text-muted-foreground/60 mt-1.5 font-normal">
              {student?.sport} · {student?.class_name} · סמסטר א׳ תשפ״ה
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {[
            { icon: Target, color: "text-primary", value: `${progressPct}%`, label: "התקדמות" },
            { icon: BarChart3, color: "text-[hsl(var(--success))]", value: avgGrade || "—", label: "ממוצע" },
            { icon: Clock, color: "text-[hsl(var(--warning))]", value: missingTasks.length, label: "חסרות" },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border p-3 text-center shadow-[var(--shadow-card)] animate-fade-in-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center justify-center mb-1">
                <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} strokeWidth={1.5} />
              </div>
              <p className="text-[16px] font-semibold text-foreground leading-none">{stat.value}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Traffic Light Status — student sees WHY */}
      <StatusCard result={trafficResult} />

      {/* Missing Tasks */}
      {missingTasks.length > 0 && (
        <section className="mb-6 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <h2 className="text-[11.5px] font-medium text-destructive/70 mb-3 tracking-tight">משימות חסרות</h2>
          <div className="bg-card rounded-2xl border border-border divide-y divide-border shadow-[var(--shadow-card)]">
            {missingTasks.map((t, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-medium text-foreground truncate">{t.task}</p>
                  <p className="text-[10px] text-muted-foreground">{t.subject}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI Feedback */}
      {weakSubject && (
        <section className="mb-6 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
          <div className="bg-primary/5 rounded-2xl border border-primary/10 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-primary/60 font-medium mb-0.5">המלצה אישית</p>
                <p className="text-[11.5px] text-foreground leading-relaxed">
                  כדאי לחזק את <strong>{weakSubject.subjects?.subject_name}</strong> (ציון {weakSubject.grade}) — שיפור יפה אפשרי עם תרגול ממוקד
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Subject Progress */}
      {progress.length > 0 && (
        <section className="mb-7">
          <h2 className="text-[11.5px] font-medium text-primary/60 mb-3 tracking-tight">מצב לימודי לפי מקצוע</h2>
          <div className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-3">
              {progress.slice(0, 6).map((sp: any, i: number) => {
                const name = sp.subjects?.subject_name || "";
                const pct = sp.completion_percent ?? 0;
                const grade = sp.grade;
                const st = sp.status;
                const dotColor = st === "green" ? "bg-[hsl(var(--success))]" : st === "yellow" ? "bg-[hsl(var(--warning))]" : st === "red" ? "bg-destructive" : "bg-muted-foreground/30";
                return (
                  <button
                    key={i}
                    onClick={() => navigate(`/subjects/${encodeURIComponent(name)}`)}
                    className="flex items-center gap-3 group cursor-pointer hover:bg-accent/30 rounded-lg p-1 -m-1 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                    <span className="text-[11px] font-medium text-foreground w-16 truncate text-start">{name}</span>
                    <Progress value={pct} className="h-1.5 flex-1 bg-muted/50" />
                    <span className="text-[10px] font-semibold text-muted-foreground tabular-nums w-8 text-end">{grade ?? "—"}</span>
                    <ChevronLeft className="h-3 w-3 text-border group-hover:text-primary/50 transition-colors shrink-0" strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Action Cards — המרחב שלי */}
      <section>
        <h2 className="text-[11.5px] font-medium text-primary/60 mb-4 tracking-tight">המרחב שלי</h2>
        <div className="grid grid-cols-2 gap-3">
          {mainCards.map((card, i) => (
            <button
              key={card.id}
              onClick={card.action}
              className="group bg-card rounded-2xl border border-border p-4 text-start transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${80 + i * 50}ms` }}
            >
              <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-2.5 transition-transform duration-300 group-hover:scale-105`}>
                <card.icon className={`h-[18px] w-[18px] ${card.iconColor}`} strokeWidth={1.5} />
              </div>
              <h3 className="text-[12.5px] font-semibold text-foreground leading-tight mb-0.5">{card.title}</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{card.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Branding */}
      <div className="mt-16 text-center">
        <span className="text-[8.5px] text-muted-foreground/20 font-normal tracking-wider">
          האקדמיה למצוינות · מכון וינגייט
        </span>
      </div>
    </div>
  );
};

export default StudentHomePage;
