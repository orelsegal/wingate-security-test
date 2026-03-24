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
      icon: <BookOpen className="h-5 w-5" />,
      color: "bg-purple-100",
    },
    {
      id: "english",
      title: "אנגלית",
      subtitle: "Module E",
      progress: 40,
      icon: <Globe className="h-5 w-5" />,
      color: "bg-blue-100",
    },
    {
      id: "math",
      title: "מתמטיקה",
      subtitle: "4/5 יחידות",
      progress: 30,
      icon: <Calculator className="h-5 w-5" />,
      color: "bg-green-100",
    },
    {
      id: "science-intro",
      title: "מבוא למדעים",
      subtitle: "יחידות פתיחה",
      progress: 20,
      icon: <FlaskConical className="h-5 w-5" />,
      color: "bg-blue-100",
    },
  ];

  return (
    <div className="p-5 max-w-[700px] mx-auto" dir="rtl">
      <h1 className="text-xl font-bold text-right mb-6">הקורסים שלי</h1>

      <div className="space-y-4">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => navigate(`/courses/${course.id}`)}
            className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between text-right"
          >
            <ChevronLeft className="h-5 w-5 text-gray-400" />

            <div className="flex-1 px-3">
              <h2 className="text-base font-bold">{course.title}</h2>
              <p className="text-sm text-gray-500">{course.subtitle}</p>

              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>

            <div className={`w-12 h-12 rounded-xl ${course.color} flex items-center justify-center`}>
              {course.icon}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CoursesListPage;
