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
      icon: <BookOpen className="h-4 w-4 text-[hsl(270,28%,56%)]" strokeWidth={1.7} />,
      color: "bg-[hsl(270,24%,93%)]",
    },
    {
      id: "english",
      title: "אנגלית",
      subtitle: "Module E",
      progress: 40,
      icon: <Globe className="h-4 w-4 text-[hsl(210,32%,58%)]" strokeWidth={1.7} />,
      color: "bg-[hsl(210,26%,93%)]",
    },
    {
      id: "math",
      title: "מתמטיקה",
      subtitle: "4/5 יחידות",
      progress: 30,
      icon: <Calculator className="h-4 w-4 text-[hsl(145,24%,46%)]" strokeWidth={1.7} />,
      color: "bg-[hsl(145,18%,92%)]",
    },
    {
      id: "science-intro",
      title: "מבוא למדעים",
      subtitle: "יחידות פתיחה",
      progress: 20,
      icon: <FlaskConical className="h-4 w-4 text-[hsl(210,32%,58%)]" strokeWidth={1.7} />,
      color: "bg-[hsl(210,26%,93%)]",
    },
  ];

  return (
    <div className="p-5 md:p-8 max-w-[660px] mx-auto" dir="rtl">
      <div className="mb-6">
        <h1 className="text-[19px] md:text-[21px] font-medium tracking-tight text-foreground text-right">
          הקורסים שלי
        </h1>
        <p className="text-[12px] text-muted-foreground/70 text-right mt-1">
          כניסה מהירה לכל קורסי הלימוד שלך
        </p>
      </div>

      <div className="space-y-3">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => navigate(`/courses/${course.id}`)}
            className="w-full bg-white rounded-[22px] border border-[hsl(220,18%,93%)] shadow-[0_2px_8px_rgba(15,23,42,0.04)] px-4 py-4 flex items-center justify-between text-right transition duration-200 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]"
          >
            <ChevronLeft
              className="h-4 w-4 text-muted-foreground/30 shrink-0"
              strokeWidth={1.8}
            />

            <div className="flex-1 px-3 min-w-0">
              <h2 className="text-[15px] md:text-[15.5px] font-medium tracking-tight text-foreground leading-tight">
                {course.title}
              </h2>
              <p className="text-[12px] text-muted-foreground/72 mt-0.5">
                {course.subtitle}
              </p>

              <div className="mt-2.5 w-full bg-[hsl(220,16%,92%)] rounded-full h-[5px] overflow-hidden">
                <div
                  className="bg-[hsl(140,55%,47%)] h-[5px] rounded-full transition-all"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>

            <div
              className={`w-[46px] h-[46px] rounded-[16px] ${course.color} flex items-center justify-center shrink-0`}
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
