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
      icon: <BookOpen />,
      color: "bg-purple-100",
    },
    {
      id: "english",
      title: "אנגלית",
      subtitle: "Module E",
      progress: 40,
      icon: <Globe />,
      color: "bg-blue-100",
    },
    {
      id: "math",
      title: "מתמטיקה",
      subtitle: "4/5 יחידות",
      progress: 30,
      icon: <Calculator />,
      color: "bg-green-100",
    },
    {
      id: "science-intro",
      title: "מבוא למדעים",
      subtitle: "יחידות פתיחה",
      progress: 20,
      icon: <FlaskConical />,
      color: "bg-yellow-100",
    },
  ];

  return (
    <div className="p-4">

      {/* כותרת */}
      <h1 className="text-xl font-bold text-right mb-6">
        הקורסים שלי
      </h1>

      {/* רשימת קורסים */}
      <div className="space-y-4">
        {courses.map((course, index) => (
          <div
            key={index}
            onClick={() => navigate(`/courses/${course.id}`)}
            className="bg-white p-4 rounded-2xl shadow flex items-center justify-between cursor-pointer hover:shadow-md transition"
          >
            {/* חץ */}
            <ChevronLeft className="text-gray-400" />

            {/* טקסט */}
            <div className="text-right flex-1 mr-3">
              <h2 className="font-bold">{course.title}</h2>
              <p className="text-sm text-gray-500">
                {course.subtitle}
              </p>

              {/* פס התקדמות */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>

            {/* אייקון */}
            <div className={`${course.color} p-3 rounded-xl`}>
              {course.icon}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoursesListPage;
