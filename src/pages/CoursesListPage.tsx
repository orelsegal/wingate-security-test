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
      icon: <BookOpen className="h-5 w-5 text-[hsl(270,30%,52%)]" />,
      bg: "bg-[hsl(270,28%,92%)]",
    },
    {
      id: "english",
      title: "אנגלית",
      subtitle: "Module E",
      progress: 40,
      icon: <Globe className="h-5 w-5 text-[hsl(210,32%,56%)]" />,
      bg: "bg-[hsl(210,28%,91%)]",
    },
    {
      id: "math",
      title: "מתמטיקה",
      subtitle: "4/5 יחידות",
      progress: 30,
      icon: <Calculator className="h-5 w-5 text-[hsl(145,24%,44%)]" />,
      bg: "bg-[hsl(145,18%,91%)]",
    },
    {
      id: "science-intro",
      title: "מבוא למדעים",
      subtitle: "יחידות פתיחה",
      progress: 20,
      icon: <FlaskConical className="h-5 w-5 text-[hsl(210,32%,56%)]" />,
      bg: "bg-[hsl(210,28%,91%)]",
    },
  ];

  return (
    <div className="p-4 max-w-[520px] mx-auto" dir="rtl">
      <h1 className="text-[20px] font-medium text-center tracking-tight mb-2">
        הקורסים שלי
      </h1>
      <p className="text-[12px] text-muted-foreground text-center mb-5">
        כניסה מהירה לכל קורסי הלימוד שלך
      </p>

      <div className="space-y-3">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => navigate(`/courses/${course.id}`)}
            className="w-full bg-white rounded-[20px] border border-[hsl(220,18%,93%)] shadow-[0_2px_10px_rgba(15,23,42,0.04)] px-4 py-4 flex items-center justify-between text-right transition hover:shadow-[0_4px_14px_rgba(15,23,42,0.05)]"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground/40" />

            <div className="flex-1 px-3">
              <h2 className="text-[15px] font-medium leading-tight">
                {course.title}
              </h2>
              <p className="text-[12px] text-muted-foreground mt-1">
                {course.subtitle}
              </p>

              <div className="mt-2.5 w-full bg-[hsl(220,16%,92%)] rounded-full h-[5px] overflow-hidden">
                <div
                  className="bg-[hsl(140,55%,47%)] h-[5px] rounded-full"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>

            <div
              className={`w-[56px] h-[56px] rounded-[18px] ${course.bg} flex items-center justify-center`}
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
