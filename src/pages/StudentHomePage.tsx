import { useAuth } from "@/context/AuthContext";
import { useStudent, useStudentProgress, useStudentRoadmap } from "@/hooks/useStudents";
import {
  BookOpen,
  Loader2,
  CheckCircle2,
  Clock,
  Target,
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

  const subjectsAtRisk = useMemo(
    () => progress.filter((p: any) => p.status === "red" || p.status === "yellow").length,
    [progress]
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
      id: "subjects",
      title: "מקצועות",
      description: "כניסה למקצועות, חלקי בגרות וקורסים",
      icon: BookOpen,
      color: "bg-[hsl(270,25%,93%)]",
      iconColor: "text-[hsl(270,35%,50%)]",
      path: "/courses",
    },
    {
      id: "progress",
      title: "ההתקדמות שלי",
      description: "התקדמות, משימות וסטטוס לימודי",
      icon: TrendingUp,
      color: "bg-[hsl(210,40%,93%)]",
      iconColor: "text-[hsl(210,45%,48%)]",
      path: "/courses",
    },
    {
      id: "grades",
      title: "ציונים",
      description: "מבחנים, עבודות והישגים",
      icon: GraduationCap,
      color: "bg-[hsl(35,35%,93%)]",
      iconColor: "text-[hsl(35,45%,42%)]",
      path: "/courses",
    },
    {
      id: "calendar",
      title: "לוח שנה",
      description: "משימות, מבחנים, שיעורים ואירועים",
      icon: CalendarDays,
      color: "bg-[hsl(150,25%,93%)]",
      iconColor: "text-[hsl(150,35%,42%)]",
      path: "/calendar",
    },
  ];

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto">
      {/* Header */}
      <section className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <WingateBadge size="md" className="shadow-[var(--shadow-card-hover)]" />
          <div>
            <h1 className="text-[17px] md:text-[21px] font-medium text-foreground tracking-tight leading-tight">
              שלום, {user?.name}
            </h1>
            <p className="text-[11px] text-muted-foreground/60 mt-1.5 font-normal">
              תלמיד/ה · סמסטר א׳ תשפ״ה
            </p>
          </div>
        </div>
      </section>

      {/* Continue */}
      {last && (
        <div className="mb-6 animate-fade-in-up">
          <p className="text-[10.5px] font-medium text-primary/50 mb-2.5">
            המשך מהפעם האחרונה
          </p>
          <button
            onClick={() => navigate(last.path)}
            className="w-full bg-primary/5 rounded-2xl border border-primary/10 p-4 text-start"
          >
            <div className="flex items-center gap-3">
              <Play className="h-4 w-4 text-primary" />
              <span className="text-[12.5px] font-semibold">{last.label}</span>
            </div>
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        <div className="bg-card rounded-xl border p-3 text-center">
          <CheckCircle2 className="mx-auto mb-1 text-primary" />
          <p>{progressPct}%</p>
          <p className="text-xs">התקדמות</p>
        </div>

        <div className="bg-card rounded-xl border p-3 text-center">
          <Clock className="mx-auto mb-1 text-yellow-500" />
          <p>{progress.length}</p>
          <p className="text-xs">מקצועות</p>
        </div>

        <div className="bg-card rounded-xl border p-3 text-center">
          <Target className="mx-auto mb-1 text-red-500" />
          <p>{subjectsAtRisk}</p>
          <p className="text-xs">דורשים חיזוק</p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-3">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => navigate(card.path)}
            className="bg-card rounded-xl border p-4 text-start flex items-center gap-3"
          >
            <card.icon className="h-5 w-5" />
            <div>
              <p className="font-semibold">{card.title}</p>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </div>
            <ChevronLeft className="mr-auto" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default StudentHomePage;
