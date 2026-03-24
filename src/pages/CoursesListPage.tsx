import { useNavigate } from "react-router-dom";
import { BookOpen, FlaskConical, Calculator, Globe, ChevronLeft } from "lucide-react";

const CoursesListPage = () => {
  const navigate = useNavigate();

  const courses = [
    {
      id: "history-30",
      title: "היסטוריה",
      subtitle: "30% לבגרות",
      progress: 60,
      icon: <BookOpen className="h-6 w-6 text-[hsl(270,32%,52%)]" strokeWidth={1.7} />,
      color: "bg-[hsl(270,28%,92%)]",
    },
    {
      id: "english",
      title: "אנגלית",
      subtitle: "Module E",
      progress: 40,
      icon: <Globe className="h-6 w-6 text-[hsl(210,38%,56%)]" strokeWidth={1.7} />,
      color: "bg-[hsl(215,34%,91%)]",
    },
    {
      id: "math",
      title: "מתמטיקה",
      subtitle: "4/5 יחידות",
      progress: 30,
      icon: <Calculator className="h-6 w-6 text-[hsl(150,28%,45%)]" strokeWidth={1.7} />,
      color: "bg-[hsl(145,18%,90%)]",
    },
    {
      id: "science-intro",
      title: "מבוא למדעים",
      subtitle: "יחידות פתיחה",
      progress: 20,
      icon: <FlaskConical className="h-6 w-6 text-[hsl(210,38%,56%)]" strokeWidth={1.7} />,
      color: "bg-[hsl(215,34%,91%)]",
    },
  ];

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[920px] mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-[24px] md:text-[30px] font-bold text-foreground text-right">
          הקורסים שלי
        </h1>
        <p className="text-[14px] text-muted-foreground/80 text-right mt-2">
          כניסה מהירה לכל קורסי הלימוד שלך
        </p>
      </div>

      <div className="space-y-5">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => navigate(`/courses/${course.id}`)}
            className="w-full bg-white rounded-[32px] border border-[hsl(220,20%,92%)] shadow-[0_6px_20px_rgba(15,23,42,0.05)] px-6 py-6 md:px-7 md:py-7 flex items-center justify-between text-right transition duration-200 hover:shadow-[0_8px_24px_rgba(15,23,42,0.07)]"
          >
            <ChevronLeft
              className="h-7 w-7 text-muted-foreground/45 shrink-0"
              strokeWidth={1.8}
            />

            <div className="flex-1 px-4 min-w-0">
              <h2 className="text-[20px] md:text-[22px] font-bold text-foreground leading-tight">
                {course.title}
              </h2>
              <p className="text-[14px] md:text-[15px] text-muted-foreground/80 mt-1">
                {course.subtitle}
              </p>

              <div className="mt-5 w-full bg-[hsl(220,18%,91%)] rounded-full h-[10px] overflow-hidden">
                <div
                  className="bg-[hsl(140,60%,48%)] h-[10px] rounded-full transition-all"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>

            <div
              className={`w-[88px] h-[88px] md:w-[96px] md:h-[96px] rounded-[28px] ${course.color} flex items-center justify-center shrink-0`}
            >
              {course.icon}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CoursesListPage;
