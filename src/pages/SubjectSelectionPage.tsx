import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Globe, Calculator, Languages, Scroll, Scale, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudentProgress } from "@/hooks/useStudents";
import { Progress } from "@/components/ui/progress";

const subjectMeta: Record<string, { icon: any; color: string; iconColor: string; subtitle: string }> = {
  "היסטוריה": { icon: Scroll, color: "bg-[hsl(35,30%,94%)]", iconColor: "text-[hsl(35,40%,45%)]", subtitle: "רובריקת 30% + רובריקת 70%" },
  "אזרחות": { icon: Scale, color: "bg-[hsl(180,20%,93%)]", iconColor: "text-[hsl(180,30%,42%)]", subtitle: "רובריקת 30% + רובריקת 70%" },
  "אנגלית": { icon: Globe, color: "bg-[hsl(210,30%,94%)]", iconColor: "text-[hsl(210,40%,50%)]", subtitle: "Module E · F · G" },
  "לשון": { icon: Languages, color: "bg-primary/8", iconColor: "text-primary", subtitle: "רובריקת 20% + רובריקת 80%" },
  "מתמטיקה": { icon: Calculator, color: "bg-[hsl(270,25%,94%)]", iconColor: "text-[hsl(270,35%,50%)]", subtitle: "לפי רמת יחידות לימוד" },
};

const subjectOrder = ["היסטוריה", "אזרחות", "אנגלית", "לשון", "מתמטיקה"];

const SubjectSelectionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: progress = [], isLoading } = useStudentProgress(studentId);

  const progressBySubject = new Map(
    progress.map((p: any) => [p.subjects?.subject_name, p])
  );

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
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-[17px] font-semibold text-foreground tracking-tight leading-tight">
            בחר מקצוע
          </h1>
          <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">
            גישה לקורסים ומשאבי למידה לפי מקצוע
          </p>
        </div>
      </div>

      {/* Subject Cards */}
      <div className="flex flex-col gap-3">
        {subjectOrder.map((name, i) => {
          const meta = subjectMeta[name];
          const prog = progressBySubject.get(name);
          const pct = prog?.completion_percent ?? 0;
          const status = prog?.status as string | undefined;
          const grade = prog?.grade;
          const Icon = meta.icon;

          const statusDot = status === "green"
            ? "bg-[hsl(var(--success))]"
            : status === "yellow"
            ? "bg-[hsl(var(--warning))]"
            : status === "red"
            ? "bg-destructive"
            : "bg-muted-foreground/30";

          return (
            <button
              key={name}
              onClick={() => navigate(`/subjects/${encodeURIComponent(name)}`)}
              className="group bg-card rounded-2xl border border-border p-4 text-start transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${60 + i * 40}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${meta.color} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105`}>
                  <Icon className={`h-5 w-5 ${meta.iconColor}`} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-[13.5px] font-semibold text-foreground leading-tight">{name}</h3>
                    <div className={`w-2 h-2 rounded-full ${statusDot}`} />
                    {grade != null && (
                      <span className="text-[9.5px] font-semibold text-muted-foreground mr-auto tabular-nums">ציון: {grade}</span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-muted-foreground font-normal mb-2">{meta.subtitle}</p>
                  <div className="flex items-center gap-2.5">
                    <Progress value={pct} className="h-1.5 flex-1 bg-muted/50" />
                    <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{pct}%</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubjectSelectionPage;
