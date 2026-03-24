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
      icon: <BookOpen className="h-7 w-7 text-[hsl(270,30%,52%)]" strokeWidth={1.8} />,
      iconBg: "bg-[hsl(270,28%,92%)]",
    },
    {
      id: "english",
      title: "אנגלית",
      subtitle: "Module E",
      progress: 40,
      icon: <Globe className="h-7 w-7 text-[hsl(210,32%,56%)]" strokeWidth={1.8} />,
      iconBg: "bg-[hsl(210,28%,91%)]",
    },
    {
      id: "math",
      title: "מתמטיקה",
      subtitle: "4/5 יחידות",
      progress: 30,
      icon: <Calculator className="h-7 w-7 text-[hsl(145,24%,44%)]" strokeWidth={1.8} />,
      iconBg: "bg-[hsl(145,18%,91%)]",
    },
    {
      id: "science-intro",
      title: "מבוא למדעים",
      subtitle: "יחידות פתיחה",
      progress: 20,
      icon: <FlaskConical className="h-7 w-7 text-[hsl(210,32%,56%)]" strokeWidth={1.8} />,
      iconBg: "bg-[hsl(210,28%,91%)]",
    },
  ];

  return (
    <div className="p-5 md:p-8 max-w-[760px] mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-[22px] md:text-[26px] font-medium tracking-tight text-right text-foreground">
          הקורסים שלי
        </h1>
        <p className="text-[13px] text-muted-foreground/70 text-right mt-1.5">
          כניסה מהירה לכל קורסי הלימוד שלך
        </p>
      </div>

      <div className="space-y-5">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => navigate(`/courses/${course.id}`)}
            className="w-full bg-white rounded-[30px] border border-[hsl(220,18%,93%)] shadow-[0_3px_14px_rgba(15,23,42,0.05)] px-6 py-6 flex items-center justify-between transition hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
          >
            <ChevronLeft
              className="h-6 w-6 text-muted-foreground/35 shrink-0"
              strokeWidth={1.8}
            />

            <div className="flex-1 px-6 text-center">
              <h2 className="text-[20px] md:text-[22px] font-medium tracking-tight text-foreground leading-tight">
                {course.title}
              </h2>
              <p className="text-[14px] text-muted-foreground/72 mt-1.5">
                {course.subtitle}
              </p>

              <div className="mt-4 w-full max-w-[320px] mx-auto bg-[hsl(220,16%,92%)] rounded-full h-[8px] overflow-hidden">
                <div
                  className="bg-[hsl(140,55%,47%)] h-[8px] rounded-full transition-all"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>

            <div
              className={`w-[94px] h-[94px] rounded-[28px] ${course.iconBg} flex items-center justify-center shrink-0`}
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
