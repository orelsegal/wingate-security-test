import { useState, useMemo } from "react";
import { Brain, AlertTriangle, TrendingUp, Users, Lightbulb, ChevronLeft, Loader2, Sparkles, BookOpen, Dumbbell } from "lucide-react";
import type { UserRole } from "@/context/AuthContext";

interface StudentData {
  id: string;
  full_name: string;
  sport: string;
  class_name: string;
  overall_status: string;
  avg_score?: number | null;
  completion_percent?: number;
}

interface AIInsight {
  id: string;
  type: "critical" | "warning" | "suggestion" | "info";
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  actionLabel?: string;
  actionPath?: string;
}

function generateInsights(students: StudentData[], role: UserRole): AIInsight[] {
  const insights: AIInsight[] = [];
  const redStudents = students.filter(s => s.overall_status === "red");
  const yellowStudents = students.filter(s => s.overall_status === "yellow");
  const lowAvg = students.filter(s => (s.avg_score ?? 0) < 55 && (s.avg_score ?? 0) > 0);

  // Group by sport
  const bySport = new Map<string, StudentData[]>();
  students.forEach(s => {
    if (!bySport.has(s.sport)) bySport.set(s.sport, []);
    bySport.get(s.sport)!.push(s);
  });

  // Group by class
  const byClass = new Map<string, StudentData[]>();
  students.forEach(s => {
    if (!byClass.has(s.class_name)) byClass.set(s.class_name, []);
    byClass.get(s.class_name)!.push(s);
  });

  // Critical: students at risk
  if (redStudents.length > 0) {
    insights.push({
      id: "red-alert",
      type: "critical",
      title: `${redStudents.length} ספורטאים בסיכון אקדמי`,
      description: `הספורטאים ${redStudents.slice(0, 3).map(s => s.full_name).join(", ")}${redStudents.length > 3 ? ` ועוד ${redStudents.length - 3}` : ""} מסומנים באדום — מומלץ לזמן לשיחה אישית ולתאם תגבור`,
      icon: AlertTriangle,
      actionLabel: "צפה בספורטאים",
      actionPath: "/students?status=red",
    });
  }

  // Warning: class trends
  byClass.forEach((classStudents, className) => {
    const classRed = classStudents.filter(s => s.overall_status === "red").length;
    const pct = classRed / classStudents.length;
    if (pct >= 0.3 && classStudents.length >= 3) {
      insights.push({
        id: `class-trend-${className}`,
        type: "warning",
        title: `כיתה ${className} במגמת ירידה`,
        description: `${Math.round(pct * 100)}% מתלמידי הכיתה בסטטוס אדום — מומלץ לבחון עומס לימודי ולשקול תגבור קבוצתי`,
        icon: TrendingUp,
      });
    }
  });

  // Coach-specific: sport branch risk
  if (role === "coach" || role === "admin") {
    bySport.forEach((sportStudents, sport) => {
      const sportRed = sportStudents.filter(s => s.overall_status === "red").length;
      if (sportRed >= 2) {
        insights.push({
          id: `sport-risk-${sport}`,
          type: "warning",
          title: `ענף ${sport}: ${sportRed} ספורטאים בסיכון`,
          description: `ספורטאים עם עומס אימונים גבוה וביצועים אקדמיים נמוכים — מומלץ להפנות למרכז למידה ולהפחית עומס אימונים`,
          icon: Dumbbell,
        });
      }
    });
  }

  // Suggestion: low averages
  if (lowAvg.length > 0) {
    insights.push({
      id: "low-avg",
      type: "suggestion",
      title: `${lowAvg.length} ספורטאים עם ממוצע מתחת ל-55`,
      description: "מומלץ לזהות מקצועות חלשים ולהציע שעות תגבור ממוקדות",
      icon: BookOpen,
    });
  }

  // Positive insight
  const greenPct = students.length > 0 ? students.filter(s => s.overall_status === "green").length / students.length : 0;
  if (greenPct >= 0.7 && students.length >= 5) {
    insights.push({
      id: "positive",
      type: "info",
      title: `${Math.round(greenPct * 100)}% מהספורטאים במסלול`,
      description: "ביצועים כלליים טובים — מומלץ לשמר עם חיזוקים חיוביים ולהרחיב אתגרים לתלמידים מצטיינים",
      icon: Sparkles,
    });
  }

  // General suggestions
  if (yellowStudents.length >= 3) {
    insights.push({
      id: "yellow-group",
      type: "suggestion",
      title: `${yellowStudents.length} ספורטאים עם פערים — הזדמנות לתגבור`,
      description: "ניתן ליצור קבוצת תגבור ממוקדת עבור ספורטאים עם סטטוס צהוב לפני שיגלשו לאדום",
      icon: Lightbulb,
    });
  }

  return insights.slice(0, 5);
}

const typeStyles: Record<string, { bg: string; border: string; iconColor: string }> = {
  critical: { bg: "bg-destructive/5", border: "border-destructive/15", iconColor: "text-destructive" },
  warning: { bg: "bg-[hsl(var(--warning))]/8", border: "border-[hsl(var(--warning))]/15", iconColor: "text-[hsl(var(--warning))]" },
  suggestion: { bg: "bg-primary/5", border: "border-primary/10", iconColor: "text-primary" },
  info: { bg: "bg-[hsl(var(--success))]/5", border: "border-[hsl(var(--success))]/15", iconColor: "text-[hsl(var(--success))]" },
};

export default function AIInsightsPanel({
  students,
  role,
  navigate,
}: {
  students: StudentData[];
  role: UserRole;
  navigate: (path: string) => void;
}) {
  const insights = useMemo(() => generateInsights(students, role), [students, role]);
  const [collapsed, setCollapsed] = useState(false);

  if (insights.length === 0) return null;

  return (
    <section className="mb-8 animate-fade-in-up">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-4 group cursor-pointer"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
          <Brain className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
        </div>
        <h2 className="text-[13px] font-semibold text-foreground tracking-tight">תובנות חכמות</h2>
        <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">AI</span>
        <ChevronLeft className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200 mr-auto ${collapsed ? "rotate-90" : "-rotate-90"}`} strokeWidth={1.5} />
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2.5">
          {insights.map((insight, i) => {
            const style = typeStyles[insight.type];
            return (
              <div
                key={insight.id}
                className={`${style.bg} rounded-xl border ${style.border} p-4 animate-fade-in-up`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <insight.icon className={`h-4 w-4 ${style.iconColor}`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[12px] font-semibold text-foreground leading-tight mb-1">{insight.title}</h3>
                    <p className="text-[10.5px] text-muted-foreground leading-relaxed">{insight.description}</p>
                    {insight.actionPath && (
                      <button
                        onClick={() => navigate(insight.actionPath!)}
                        className="mt-2 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                      >
                        {insight.actionLabel}
                        <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
