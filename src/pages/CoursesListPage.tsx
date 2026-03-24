import { useNavigate } from "react-router-dom";
import { BookOpen, FlaskConical, ChevronLeft } from "lucide-react";

const CoursesListPage = () => {
  const navigate = useNavigate();

  const courses = [
    {
      id: "history-30",
      title: "היסטוריה",
      subtitle: "30% לבגרות",
      icon: <BookOpen />,
      progress: 60,
      color: "bg-purple-100",
    },
    {
      id: "science-intro",
      title: "מבוא למדעים",
      subtitle: "יחידות פתיחה",
      icon: <FlaskConical />,
      progress: 20,
      color: "bg-blue-100",
    },
  ];

  return (
    <div className="p-4">

      <h1 className="text-xl font-bold text-right mb-6">
        הקורסים שלי
      </h1>

      <div className="space-y-4">
        {courses.map((course) => (
          <div
            key={course.id}
            onClick={() => navigate(`/courses/${course.id}`)}
            className="bg-white p-4 rounded-2xl shadow flex items-center justify-between cursor-pointer hover:shadow-md transition"
          >
            <ChevronLeft className="text-gray-400" />

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
