import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  GraduationCap,
  CalendarDays,
  LifeBuoy,
  ChevronLeft,
} from "lucide-react";

const ParentHomePage = () => {
  const navigate = useNavigate();

  const items = [
    {
      title: "התקדמות הילד/ה",
      subtitle: "תמונת מצב כללית על התקדמות אישית",
      icon: <TrendingUp className="h-5 w-5 text-[hsl(145,24%,44%)]" />,
      bg: "bg-[hsl(145,18%,91%)]",
      path: "/parent-progress",
    },
    {
      title: "ציונים",
      subtitle: "ציונים, מבדקים והישגים במקום אחד",
      icon: <GraduationCap className="h-5 w-5 text-[hsl(42,42%,44%)]" />,
      bg: "bg-[hsl(50,42%,90%)]",
      path: "/parent-grades",
    },
    {
      title: "לוח שנה",
      subtitle: "מבחנים, משימות ואירועים חשובים",
      icon: <CalendarDays className="h-5 w-5 text-[hsl(170,28%,45%)]" />,
      bg: "bg-[hsl(170,24%,90%)]",
      path: "/parent-calendar",
    },
    {
      title: "מרכז למידה ותמיכה",
      subtitle: "סיוע לימודי, התאמות וקשר עם הצוות",
      icon: <LifeBuoy className="h-5 w-5 text-[hsl(210,16%,42%)]" />,
      bg: "bg-[hsl(220,16%,93%)]",
      path: "/parent-support",
    },
  ];

  return (
    <div className="p-4 max-w-[520px] mx-auto" dir="rtl">
      <h1 className="text-[20px] font-medium text-center tracking-tight mb-2">
        התקדמות הילד/ה
      </h1>
      <p className="text-[12px] text-muted-foreground text-center mb-5">
        כל מה שחשוב לדעת על ההתקדמות הלימודית במקום אחד
      </p>

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

export default ParentHomePage;
