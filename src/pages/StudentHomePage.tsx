import { useAuth } from "@/context/AuthContext";
import { useStudent, useStudentProgress, useStudentRoadmap } from "@/hooks/useStudents";
import { Calendar, Brain, Route, BookOpen, Loader2, ChevronLeft, CheckCircle2, Clock, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import InitialsAvatar from "@/components/InitialsAvatar";
import wingateLogoSrc from "@/assets/wingate-logo.png";

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

  const subjectsAtRisk = useMemo(() =>
    progress.filter((p: any) => p.status === "red" || p.status === "yellow").length
  , [progress]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    {
      id: "schedule",
      title: "מערכת שעות",
      description: "צפייה בלוח זמנים שבועי ושיעורים",
      icon: Calendar,
      color: "bg-[hsl(210,40%,92%)]",
      iconColor: "text-[hsl(210,50%,45%)]",
      action: () => window.open("https://tailor-my-tutor.lovable.app", "_blank"),
      external: true,
    },
    {
      id: "smartbase",
      title: "סמארטבייס",
      description: "כלים חכמים ומשאבי למידה מותאמים אישית",
      icon: Brain,
      color: "bg-[hsl(270,30%,92%)]",
      iconColor: "text-[hsl(270,40%,50%)]",
      action: () => {},
      comingSoon: true,
    },
    {
      id: "roadmap",
      title: "מפת הדרך שלי לבגרות",
      description: `${completedRoadmapCount} מתוך ${totalRoadmapCount} שלבים הושלמו`,
      icon: Route,
      color: "bg-[hsl(150,25%,90%)]",
      iconColor: "text-primary",
      action: () => navigate(`/students/${studentId}`),
      badge: progressPct > 0 ? `${progressPct}%` : undefined,
    },
    {
      id: "learn",
      title: "התחל ללמוד",
      description: "גישה לקורסים ומשאבי למידה",
      icon: BookOpen,
      color: "bg-[hsl(35,40%,92%)]",
      iconColor: "text-[hsl(35,50%,45%)]",
      action: () => window.open("https://ancient-journeys.lovable.app", "_blank"),
      external: true,
    },
  ];

  return (
    <div className="p-5 md:p-10 lg:p-12 max-w-[900px] mx-auto">
      {/* Welcome Header */}
      <section className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <InitialsAvatar name={student?.full_name || user?.name || ""} size="lg" />
          <div>
            <h1 className="text-[22px] md:text-[26px] font-bold text-foreground tracking-tight">
              שלום, {student?.full_name || user?.name} 👋
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              {student?.sport} · {student?.class_name} · סמסטר א׳ תשפ״ה
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          <div className="card-premium p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-[22px] font-bold text-foreground">{progressPct}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">השלמת מפת דרכים</p>
          </div>
          <div className="card-premium p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.5} />
            </div>
            <p className="text-[22px] font-bold text-foreground">{progress.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">מקצועות פעילים</p>
          </div>
          <div className="card-premium p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-4 w-4 text-warning" strokeWidth={1.5} />
            </div>
            <p className="text-[22px] font-bold text-foreground">{subjectsAtRisk}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">דורשים תשומת לב</p>
          </div>
        </div>
      </section>

      {/* Main Action Cards */}
      <section>
        <h2 className="text-[15px] font-semibold text-foreground mb-4">מה תרצה לעשות?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={card.action}
              disabled={card.comingSoon}
              className={`card-premium p-5 text-start group transition-all duration-200 ${
                card.comingSoon
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:shadow-[0_8px_30px_-6px_hsl(150,20%,30%,0.12)] hover:-translate-y-0.5 cursor-pointer"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center shrink-0 transition-transform duration-200 ${!card.comingSoon ? "group-hover:scale-110" : ""}`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-foreground">{card.title}</h3>
                    {card.comingSoon && (
                      <span className="text-[9px] bg-accent px-2 py-0.5 rounded-full text-muted-foreground font-medium">בקרוב</span>
                    )}
                    {card.badge && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{card.badge}</span>
                    )}
                    {card.external && (
                      <span className="text-[9px] text-muted-foreground/50">↗</span>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{card.description}</p>
                </div>
                {!card.comingSoon && (
                  <ChevronLeft className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-1 group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Motivational Footer */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
          <div className="w-4 h-4 rounded-full overflow-hidden">
            <img src={wingateLogoSrc} alt="" className="w-full h-full object-contain" />
          </div>
          <span className="text-[11px] text-primary font-medium">האקדמיה למצוינות · מכון וינגייט</span>
        </div>
      </div>
    </div>
  );
};

export default StudentHomePage;
