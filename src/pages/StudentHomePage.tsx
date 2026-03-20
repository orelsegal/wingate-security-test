import { useAuth } from "@/context/AuthContext";
import { useStudent, useStudentProgress, useStudentRoadmap } from "@/hooks/useStudents";
import { Calendar, Brain, Route, BookOpen, Loader2, ChevronLeft, CheckCircle2, Clock, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import WingateBadge from "@/components/WingateBadge";
import wingateLogoSrc from "@/assets/wingate-logo.png";

const SMARTBASE_URL = ""; // Replace with actual URL when ready

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

  const subjectsAtRisk = useMemo(
    () => progress.filter((p: any) => p.status === "red" || p.status === "yellow").length,
    [progress],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    {
      id: "schedule",
      title: "מערכת שעות",
      description: "צפייה בלוח הזמנים השבועי",
      icon: Calendar,
      color: "bg-[hsl(210,40%,93%)]",
      iconColor: "text-[hsl(210,45%,48%)]",
      action: () => navigate(`/external?type=schedule&url=${encodeURIComponent("https://tailor-my-tutor.lovable.app")}`),
    },
    {
      id: "smartbase",
      title: "סמארטבייס",
      description: "כניסה לכלים חכמים ומשאבי למידה",
      icon: Brain,
      color: "bg-[hsl(270,25%,93%)]",
      iconColor: "text-[hsl(270,35%,50%)]",
      action: SMARTBASE_URL ? () => navigate(`/external?type=smartbase&url=${encodeURIComponent(SMARTBASE_URL)}`) : () => {},
      comingSoon: !SMARTBASE_URL,
    },
    {
      id: "roadmap",
      title: "מפת הדרך לבגרות",
      description: `${completedRoadmapCount} מתוך ${totalRoadmapCount} שלבים הושלמו`,
      icon: Route,
      color: "bg-primary/10",
      iconColor: "text-primary",
      action: () => navigate(`/students/${studentId}`),
      badge: progressPct > 0 ? `${progressPct}%` : undefined,
    },
    {
      id: "learning",
      title: "התחל למידה",
      description: "גישה לקורסים ומשאבי למידה",
      icon: BookOpen,
      color: "bg-[hsl(35,35%,93%)]",
      iconColor: "text-[hsl(35,45%,42%)]",
      action: () => navigate(`/external?type=learning&url=${encodeURIComponent("https://ancient-journeys.lovable.app")}`),
    },
  ];

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto">
      {/* Welcome */}
      <section className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <WingateBadge size="md" className="shadow-[var(--shadow-card-hover)]" />
          <div>
            <h1 className="text-[18px] md:text-[22px] font-semibold text-foreground tracking-tight leading-tight">
              שלום, {student?.full_name || user?.name}
            </h1>
            <p className="text-[11.5px] text-muted-foreground mt-1.5 font-medium">
              {student?.sport} · {student?.class_name} · סמסטר א׳ תשפ״ה
            </p>
            <div
              className="mt-3 h-px w-[80px]"
              style={{ background: "linear-gradient(to left, transparent, hsl(var(--primary-soft) / 0.45))" }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Target, color: "text-primary", value: `${progressPct}%`, label: "השלמת מפת דרכים" },
            { icon: CheckCircle2, color: "text-[hsl(var(--success))]", value: progress.length, label: "מקצועות פעילים" },
            { icon: Clock, color: "text-[hsl(var(--warning))]", value: subjectsAtRisk, label: "דורשים תשומת לב" },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-card rounded-xl border border-border p-3.5 text-center shadow-[var(--shadow-card)] animate-fade-in-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center justify-center mb-1.5">
                <stat.icon className={`h-4 w-4 ${stat.color}`} strokeWidth={1.5} />
              </div>
              <p className="text-[18px] font-semibold text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Action Cards */}
      <section>
        <h2 className="text-[12.5px] font-semibold text-primary/70 mb-5 tracking-tight">המרחב שלי</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {cards.map((card, i) => (
            <button
              key={card.id}
              onClick={card.action}
              disabled={card.comingSoon}
              className={`group relative bg-card rounded-2xl border border-border p-5 text-start transition-all duration-300 animate-fade-in-up ${
                card.comingSoon
                  ? "opacity-45 cursor-not-allowed"
                  : "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer"
              }`}
              style={{ animationDelay: `${80 + i * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-11 h-11 rounded-xl ${card.color} flex items-center justify-center shrink-0 transition-transform duration-300 ${
                    !card.comingSoon ? "group-hover:scale-105" : ""
                  }`}
                >
                  <card.icon className={`h-[18px] w-[18px] ${card.iconColor}`} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13.5px] font-semibold text-foreground leading-tight">{card.title}</h3>
                    {card.comingSoon && (
                      <span className="text-[9px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                        בקרוב
                      </span>
                    )}
                    {card.badge && (
                      <span className="text-[9.5px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-muted-foreground mt-1.5 leading-relaxed">{card.description}</p>
                </div>
                {!card.comingSoon && (
                  <ChevronLeft
                    className="h-4 w-4 text-border shrink-0 mt-0.5 group-hover:text-primary/50 transition-colors duration-200"
                    strokeWidth={1.5}
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Branding */}
      <div className="mt-14 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/[0.04] border border-primary/[0.08]">
          <div className="w-4 h-4 rounded-full overflow-hidden">
            <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
          </div>
          <span className="text-[10.5px] text-primary/70 font-medium">האקדמיה למצוינות · מכון וינגייט</span>
        </div>
      </div>
    </div>
  );
};

export default StudentHomePage;
