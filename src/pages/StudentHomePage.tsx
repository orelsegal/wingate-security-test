import { useNavigate } from "react-router-dom";
import bg from "@/assets/freepik__abstract-background-of-overlapping-soft-pastel-cir__2226.png";
import {
  BookOpen,
  TrendingUp,
  GraduationCap,
  CalendarDays,
  Wrench,
} from "lucide-react";

const StudentHomePage = () => {
  const navigate = useNavigate();

  const items = [
    {
      title: "התחל למידה",
      subtitle: "גישה מהירה לקורסים וחומרי לימוד",
      icon: <BookOpen className="h-7 w-7 text-[hsl(270,30%,52%)]" strokeWidth={1.8} />,
      bg: "bg-[hsl(270,28%,92%)]",
      path: "/courses",
    },
    {
      title: "מפת הדרכים שלי",
      subtitle: "התקדמות אישית וציונים",
      icon: <TrendingUp className="h-7 w-7 text-[hsl(145,24%,44%)]" strokeWidth={1.8} />,
      bg: "bg-[hsl(145,18%,91%)]",
      path: "/roadmap",
    },
    {
      title: "ציונים",
      subtitle: "כל הציונים שלך במקום אחד",
      icon: <GraduationCap className="h-7 w-7 text-[hsl(42,42%,44%)]" strokeWidth={1.8} />,
      bg: "bg-[hsl(50,42%,90%)]",
      path: "/grades",
    },
    {
      title: "לוח שנה",
      subtitle: "משימות, מבחנים ואירועים",
      icon: <CalendarDays className="h-7 w-7 text-[hsl(170,28%,45%)]" strokeWidth={1.8} />,
      bg: "bg-[hsl(170,24%,90%)]",
      path: "/calendar",
    },
    {
      title: "ארגז כלים",
      subtitle: "מחברת, קישורים ומשאבים",
      icon: <Wrench className="h-7 w-7 text-[hsl(210,16%,42%)]" strokeWidth={1.8} />,
      bg: "bg-[hsl(220,16%,93%)]",
      path: "/tools",
    },
  ];

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="min-h-screen bg-white/40 backdrop-blur-[1px]">
        <div className="max-w-[860px] mx-auto px-5 pt-10 pb-12">
          {/* Hero */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-[108px] h-[108px] rounded-[30px] bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.08)] border border-white/70 flex items-center justify-center mb-7">
              <img
                src="/lovable-uploads/wingate-logo.png"
                alt="Wingate"
                className="w-[76px] h-[76px] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>

            <h1 className="text-[32px] md:text-[42px] font-medium tracking-tight text-[hsl(var(--primary))]">
              האקדמיה למצוינות בספורט
            </h1>

            <div className="w-16 h-[4px] rounded-full bg-[hsl(var(--primary))/0.25] mt-5 mb-5" />

            <p className="text-[16px] md:text-[18px] text-muted-foreground/75 max-w-[560px] leading-relaxed">
              למידה וניהול מותאמים לספורטאים מצטיינים
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {items.map((item, index) => {
              const wide = index >= 3;

              return (
                <button
                  key={item.title}
                  onClick={() => navigate(item.path)}
                  className={`bg-white/88 backdrop-blur-sm rounded-[30px] border border-white/70 shadow-[0_6px_22px_rgba(15,23,42,0.06)] px-5 py-7 transition hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] hover:-translate-y-[1px]
                  ${wide ? "col-span-1 md:col-span-1" : ""}`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`w-[96px] h-[96px] rounded-full ${item.bg} flex items-center justify-center mb-5`}
                    >
                      {item.icon}
                    </div>

                    <h2 className="text-[20px] md:text-[22px] font-medium tracking-tight text-foreground">
                      {item.title}
                    </h2>

                    <p className="text-[14px] text-muted-foreground/72 mt-2 leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-14 flex items-center justify-center gap-4 opacity-50">
            <div className="w-14 h-px bg-border" />
            <span className="text-[12px] tracking-[0.18em] text-muted-foreground/70 uppercase">
              Wingate Institute
            </span>
            <div className="w-14 h-px bg-border" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentHomePage;
