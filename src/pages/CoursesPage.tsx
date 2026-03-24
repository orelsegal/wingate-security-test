import { useParams, useNavigate } from "react-router-dom";

const CoursesPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const units = [
    { id: 1, title: "מבוא", unlocked: true },
    { id: 2, title: "יחידה 1", unlocked: true },
    { id: 3, title: "יחידה 2", unlocked: false },
  ];

  const progress = Math.round(
    (units.filter((u) => u.unlocked).length / units.length) * 100
  );

  return (
    <div className="p-4">

      {/* כותרת */}
      <h1 className="text-xl font-bold text-right mb-2">
        קורס: {courseId}
      </h1>

      {/* פס התקדמות */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <div
          className="bg-green-500 h-3 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* יחידות */}
      {units.map((unit) => (
        <div
          key={unit.id}
          onClick={() =>
            unit.unlocked &&
            navigate(`/courses/${courseId}/unit/${unit.id}`)
          }
          className={`p-4 mb-3 rounded-xl flex justify-between items-center cursor-pointer
          ${
            unit.unlocked
              ? "bg-white shadow hover:shadow-md"
              : "bg-gray-200"
          }`}
        >
          <span>{unit.title}</span>
          {!unit.unlocked && <span>🔒</span>}
        </div>
      ))}
    </div>
  );
};

export default CoursesPage;
