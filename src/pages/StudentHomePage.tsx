import { useNavigate } from "react-router-dom";
import bg from "@/assets/freepik__abstract-background-of-overlapping-soft-pastel-cir__2226.png";
import {
  BookOpen,
  TrendingUp,
  GraduationCap,
  CalendarDays,
  Wrench,
  ChevronLeft,
} from "lucide-react";

const StudentHomePage = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: "התחל למידה",
      description: "גישה מהירה לקורסים וחומרי לימוד",
      icon: <BookOpen size={24} />,
      path: "/courses",
      color: "bg-purple-100",
    },
    {
      title: "מפת הדרכים שלי",
      description: "התקדמות אישית וציונים",
      icon: <TrendingUp size={24} />,
      path: "/roadmap",
      color: "bg-green-100",
    },
    {
      title: "ציונים",
      description: "כל הציונים שלך במקום אחד",
      icon: <GraduationCap size={24} />,
      path: "/grades",
      color: "bg-yellow-100",
    },
    {
      title: "לוח שנה",
      description: "משימות, מבחנים ואירועים",
      icon: <CalendarDays size={24} />,
      path: "/calendar",
      color: "bg-teal-100",
    },
    {
      title: "ארגז כלים",
      description: "מחברת, קישורים ומשאבים",
      icon: <Wrench size={24} />,
      path: "/tools",
      color: "bg-gray-100",
    },
  ];

  return (
    <div
      className="min-h-screen p-4"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* כותרת */}
      <h1 className="text-xl font-bold text-right mb-6">
        המרחב שלי
      </h1>

      {/* כרטיסים */}
      <div className="space-y-4">
        {cards.map((card, index) => (
          <div
            key={index}
            onClick={() => navigate(card.path)}
            className="bg-white/90 p-4 rounded-2xl shadow flex items-center justify-between cursor-pointer hover:shadow-md transition"
          >
            {/* חץ */}
            <ChevronLeft className="text-gray-400" />

            {/* טקסט */}
            <div className="text-right flex-1 mr-3">
              <h2 className="font-bold text-lg">{card.title}</h2>
              <p className="text-sm text-gray-500">
                {card.description}
              </p>
            </div>

            {/* אייקון */}
            <div className={`${card.color} p-3 rounded-xl`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentHomePage;
