import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  TrendingUp,
  GraduationCap,
  CalendarDays,
  Wrench,
  ChevronLeft,
} from "lucide-react";

const StudentHomePage = () => {
  const navigate = useNavigate();

  const items = [
    {
      title: "התחל למידה",
      subtitle: "גישה מהירה לקורסים וחומרי לימוד",
      icon: <BookOpen className="h-5 w-5 text-[hsl(270,30%,52%)]" />,
      bg: "bg-[hsl(270,28%,92%)]",
      path: "/courses",
    },
    {
      title: "מפת הדרכים שלי",
      subtitle: "התקדמות אישית וציונים",
      icon: <TrendingUp className="h-5 w-5 text-[hsl(145,24%,44%)]" />,
      bg: "bg-[hsl(145,18%,91%)]",
      path: "/roadmap",
    },
    {
      title: "ציונים",
      subtitle: "כל הציונים שלך במקום אחד",
      icon: <GraduationCap className="h-5 w-5 text-[hsl(42,42%,44%)]" />,
      bg: "bg-[hsl(50,42%,90%)]",
      path: "/grades",
    },
    {
      title: "לוח שנה",
      subtitle: "משימות, מבחנים ואירועים",
      icon: <CalendarDays className="h-5 w-5 text-[hsl(170,28%,45%)]" />,
      bg: "bg-[hsl(170,24%,90%)]",
      path: "/calendar",
    },
    {
      title: "ארגז כלים",
      subtitle: "מחברת, קישורים ומשאבים",
      icon: <Wrench className="h-5 w-5 text-[hsl(210,16%,42%)]" />,
      bg: "bg-[hsl(220,16%,93%)]",
      path: "/tools",
    },
  ];

  return (
    <div className="p-4 max-w-[520px] mx-auto" dir="rtl">
      <h1 className="text-[20px] font-medium text-right mb-4">
        המרחב שלי
      </h1>

      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.title}
            onClick={() => navigate(item.path)}
            className="w-full bg-white rounded-[20px] border border-[hsl(220,18%,93%)] shadow-[0_2px_10px_rgba(15,23,42,0.04)] px-4 py-4 flex items-center justify-between text-right transition hover:shadow-[0_4px_14px_rgba(15,23,42,0.05)]"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground/40" />

            <div className="flex-1 px-3">
              <h2 className="text-[15px] font-medium leading-tight">
                {item.title}
              </h2>
              <p className="text-[12px] text-muted-foreground mt-1 leading-snug">
                {item.subtitle}
              </p>
            </div>

            <div
              className={`w-[56px] h-[56px] rounded-[18px] ${item.bg} flex items-center justify-center`}
            >
              {item.icon}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StudentHomePage;
