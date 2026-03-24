import bg from "@/assets/freepik__abstract-background-of-overlapping-soft-pastel-cir__2226.png";
import { useAuth } from "@/context/AuthContext";
import { useStudent, useStudentProgress, useStudentRoadmap } from "@/hooks/useStudents";
import {
  BookOpen,
  Loader2,
  CheckCircle2,
  Clock,
  CalendarDays,
  GraduationCap,
  TrendingUp,
  Play,
  ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import WingateBadge from "@/components/WingateBadge";

const LAST_VISITED_KEY = "wingate_last_visited";

interface LastVisited {
  path: string;
  label: string;
  timestamp: number;
}

interface StudentActionCard {
  id: string;
  title: string;
  description: string;
  icon: any;
  path: string;
  color: string;
  iconColor: string;
}

const getLastVisited = (): LastVisited | null => {
  try {
    const raw = localStorage.getItem(LAST_VISITED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const StudentHomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const studentId = user?.scopeFilter?.[0] || "";

  const { data: student, isLoading } = useStudent(studentId);
  const { data: progress = [] } = useStudentProgress(studentId);
  const { data: roadmap = [] } = useStudentRoadmap(studentId, student?.math_level ?? 3);

  const [last, setLast] = useState<LastVisited | null>(null);

  useEffect(() => {
    setLast(getLastVisited());
  }, []);

  const completedRoadmapCount = useMemo(
    () => roadmap.filter((r: any) => r.completed).length,
    [roadmap]
  );

  const totalRoadmapCount = roadmap.length;
  const progressPct =
    totalRoadmapCount > 0
      ? Math.round((completedRoadmapCount / totalRoadmapCount) * 100)
      : 0;

  const activeSubjectsCount = progress.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" dir="rtl">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const cards: StudentActionCard[] = [
    {
      id: "start-learning",
      title: "התחל למידה",
      description: "גישה מהירה למקצועות, קורסים וחומרי לימוד",
      icon: BookOpen,
      path: "/subjects",
      color: "bg-[rgba(234,225,248,0.78)]",
      iconColor: "text-[hsl(270,35%,50%)]",
    },
    {
      id: "progress",
      title: "ההתקדמות שלי",
      description: "התקדמות, משימות וסטטוס לימודי",
      icon: TrendingUp,
      path: "/courses",
      color: "bg-[rgba(220,232,247,0.82)]",
      iconColor: "text-[hsl(210,45%,48%)]",
    },
    {
      id: "grades",
      title: "ציונים",
      description: "מבחנים, עבודות והישגים",
      icon: GraduationCap,
      path: "/students",
      color: "bg-[rgba(242,233,221,0.85)]",
      iconColor: "text-[hsl(35,45%,42%)]",
    },
    {
      id: "calendar",
      title: "לוח שנה",
      description: "משימות, מבחנים, שיעורים ואירועים",
      icon: CalendarDays,
      path: "/calendar",
      color: "bg-[rgba(223,239,232,0.85)]",
      iconColor: "text-[hsl(150,35%,42%)]",
    },
  ];

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="min-h-screen bg-white/35 backdrop-blur-[1.5px]">
        <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto">
          <section className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <WingateBadge size="md" className="shadow-[var(--shadow-card-hover)]" />
              <div>
                <h1 className="text-[17px] md:text-[21px] font-medium text-foreground tracking-tight leading-tight">
                  שלום, {user?.name}
                </h1>
                <p className="text-[11px] text-muted-foreground/70 mt-1.5 font-normal">
                  תלמיד/ה · סמסטר א׳ תשפ״ה
                </p>
              </div>
            </div>
          </section>

          {last && (
            <div className="mb-6 animate-fade-in-up">
              <p className="text-[10.5px] font-medium text-primary/60 mb-2.5 tracking-tight">
                המשך מהפעם האחרונה
              </p>
              <button
                onClick={() => navigate(last.path)}
                className="w-full group rounded-2xl border border-white/40 bg-white/45 backdrop-blur-md p-4 text-start transition-all duration-300 hover:bg-white/55 shadow-[0_10px_30px_rgba(0,0,0,0.04)] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
                    <Play className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-foreground leading-tight">
                      {last.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      חזור למקום שעצרת
                    </p>
                  </div>
                  <ChevronLeft
                    className="h-4 w-4 text-primary/40 group-hover:text-primary/70 transition-colors"
                    strokeWidth={1.5}
                  />
                </div>
              </button>
            </div>
          )}

          <div className="grid gap-3 mb-7 grid-cols-3">
            <div className="rounded-xl border border-white/40 bg-white/45 backdrop-blur-md p-3.5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.04)] animate-fade-in-up">
              <div className="flex items-center justify-center mb-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-[18px] font-semibold text-foreground leading-none">
                {progressPct}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                התקדמות כללית
              </p>
            </div>

            <div
              className="rounded-xl border border-white/40 bg-white/45 backdrop-blur-md p-3.5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.04)] animate-fade-in-up"
              style={{ animationDelay: "40ms" }}
            >
              <div className="flex items-center justify-center mb-1.5">
                <Clock className="h-4 w-4 text-[hsl(var(--warning))]" strokeWidth={1.5} />
              </div>
              <p className="text-[18px] font-semibold text-foreground leading-none">
                {activeSubjectsCount}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                מקצועות פעילים
              </p>
            </div>

            <div
              className="rounded-xl border border-white/40 bg-white/45 backdrop-blur-md p-3.5 text-center shadow-[0_10px_30px_rgba(0,0,0,0.04)] animate-fade-in-up"
              style={{ animationDelay: "80ms" }}
            >
              <div className="flex items-center justify-center mb-1.5">
                <BookOpen className="h-4 w-4 text-[hsl(270,35%,50%)]" strokeWidth={1.5} />
              </div>
              <p className="text-[18px] font-semibold text-foreground leading-none">
                {completedRoadmapCount}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                שלבים שהושלמו
              </p>
            </div>
          </div>

          <h2 className="text-[11.5px] font-medium text-primary/70 mb-4 tracking-tight">
            כלים מרכזיים
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {cards.map((card, i) => (
              <button
                key={card.id}
                onClick={() => navigate(card.path)}
                className="group relative rounded-2xl border border-white/45 bg-white/48 backdrop-blur-md p-5 text-start transition-all duration-300 animate-fade-in-up shadow-[0_12px_30px_rgba(0,0,0,0.05)] hover:bg-white/58 hover:-translate-y-0.5 cursor-pointer"
                style={{ animationDelay: `${80 + i * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-11 h-11 rounded-xl ${card.color} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105`}
                  >
                    <card.icon
                      className={`h-[18px] w-[18px] ${card.iconColor}`}
                      strokeWidth={1.5}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13.5px] font-semibold text-foreground leading-tight">
                      {card.title}
                    </h3>
                    <p className="text-[11.5px] text-muted-foreground mt-1.5 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  <ChevronLeft
                    className="h-4 w-4 text-border shrink-0 mt-0.5 group-hover:text-primary/50 transition-colors duration-200"
                    strokeWidth={1.5}
                  />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-16 text-center">
            <span className="text-[8.5px] text-muted-foreground/35 font-normal tracking-wider">
              האקדמיה למצוינות · מכון וינגייט
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentHomePage;
