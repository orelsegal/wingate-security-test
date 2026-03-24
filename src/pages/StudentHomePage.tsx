import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  TrendingUp,
  GraduationCap,
  CalendarDays,
  Wrench,
  FlaskConical,
} from "lucide-react";

const StudentHomePage = () => {
  const navigate = useNavigate();

  const items = [
    {
      title: "התחל למידה",
      subtitle: "גישה מהירה לקורסים וחומרי לימוד",
      icon: <BookOpen className="h-7 w-7 text-[hsl(270,30%,52%)]" />,
      bg: "bg-[hsl(270,28%,92%)]",
      path: "/courses",
    },
    {
      title: "מפת הדרכים שלי",
      subtitle: "התקדמות אישית וציונים",
      icon: <TrendingUp className="h-7 w-7 text-[hsl(145,24%,44%)]" />,
      bg: "bg-[hsl(145,18%,91%)]",
      path: "/student-roadmap",
    },
    {
      title: "ציונים",
      subtitle: "כל הציונים שלך במקום אחד",
      icon: <GraduationCap className="h-7 w-7 text-[hsl(40,40%,45%)]" />,
      bg: "bg-[hsl(45,35%,90%)]",
      path: "/grades",
    },
    {
      title: "לוח שנה",
      subtitle: "משימות, מבחנים ואירועים",
      icon: <CalendarDays className="h-7 w-7 text-[hsl(170,30%,45%)]" />,
      bg: "bg-[hsl(170,22%,90%)]",
      path: "/calendar",
    },
    {
      title: "ארגז כלים",
      subtitle: "מחברת, קישורים ומשאבים",
      icon: <Wrench className="h-7 w-7 text-[hsl(210,20%,45%)]" />,
      bg: "bg-[hsl(210,18%,92%)]",
      path: "/tools",
    },
  ];

  return (
    <div className="p-5 max-w-[760px] mx-auto" dir="rtl">
      <h1 className="text-[24px] font-medium text-right mb-6">
        המרחב שלי
      </h1>

      <div className="space-y-5">
        {items.map((item) => (
          <button
            key={item.title}
            onClick={() => navigate(item.path)}
            className="w-full bg-white rounded-[30px] border border-[hsl(220,18%,93%)] shadow-[0_3px_14px_rgba(15,23,42,0.05)] px-6 py-6 flex items-center justify-between text-right transition hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
          >
            <div className="flex-1 px-6">
              <h2 className="text-[20px] font-medium">
                {item.title}
              </h2>
              <p className="text-[14px] text-muted-foreground mt-1">
                {item.subtitle}
              </p>
            </div>

            <div
              className={`w-[90px] h-[90px] rounded-[26px] ${item.bg} flex items-center justify-center`}
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
