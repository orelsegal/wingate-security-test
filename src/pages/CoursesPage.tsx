import { useNavigate } from "react-router-dom";
import { BookOpen, FlaskConical, Calculator, Globe, ChevronLeft } from "lucide-react";

const CoursesPage = () => {
  const navigate = useNavigate();

  const courses = [
    {
      id: "history-30",
      title: "היסטוריה",
      subtitle: "30% לבגרות",
      progress: 60,
      icon: <BookOpen className="h-6 w-6 text-[hsl(270,35%,50%)]" strokeWidth={1.8} />,
      color: "bg-[hsl(270,25%,93%)]",
    },
    {
      id: "english",
      title: "אנגלית",
      subtitle: "Module E",
      progress: 40,
      icon: <Globe className="h-6 w-6 text-[hsl(210,45%,48%)]" strokeWidth={1.8} />,
      color: "bg-[hsl(210,40%,93%)]",
    },
    {
      id: "math",
      title: "מתמטיקה",
      subtitle: "4/5 יחידות",
      progress: 30,
      icon: <Calculator className="h-6 w-6 text-[hsl(150,35%,42%)]" strokeWidth={1.8} />,
      color: "bg-[hsl(150,25%,93%)]",
    },
    {
      id: "science-intro",
      title: "מבוא למדעים",
      subtitle: "יחידות פתיחה",
      progress: 20,
      icon: <FlaskConical className="h-6 w-6 text-[hsl(210,45%,48%)]" strokeWidth={1.8} />,
      color: "bg-[hsl(210,40%,93%)]",
    },
  ];

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-[22px] md:text-[28px] font-bold text-foreground text-right">
          הקורסים שלי
        </h1>
      </div>

      <div className="space-y-5">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => navigate(`/courses/${course.id}`)}
            className="w-full bg-white rounded-[28px] border border-black/5 shadow-[0_4px_18px_rgba(0,0,0,0.06)] px-6 py-7 flex items-center justify-between text-right transition hover:shadow-[0_6px_22px_rgba(0,0,0,0.08)]"
          >
            <ChevronLeft className="h-7 w-7 text-muted-foreground/60 shrink-0" strokeWidth={1.8} />

            <div className="flex-1 px-4 min-w-0">
              <h2 className="text-[18px] md:text-[20px] font-bold text-foreground leading-tight">
                {course.title}
              </h2>
              <p className="text-[14px] text-muted-foreground mt-1">
                {course.subtitle}
              </p>

              <div className="mt-4 w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>

            <div className={`w-24 h-24 rounded-[24px] ${course.color} flex items-center justify-center shrink-0`}>
              {course.icon}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CoursesPage;
