import { useNavigate } from "react-router-dom";
import bg from "@/assets/freepik__abstract-background-of-overlapping-soft-pastel-cir__2226.png";
import {
  BookOpen,
  FlaskConical,
  TrendingUp,
  CalendarDays,
  GraduationCap,
  Wrench,
} from "lucide-react";

const StudentHomePage = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: "התחל למידה",
      description: "גישה מהירה לקורסים וחומרי לימוד",
      icon: <BookOpen />,
      path: "/courses/history-30",
      color: "bg-purple-100",
    },
    {
      title: "מבוא למדעים",
      description: "כניסה ישירה לקורס מדעים",
      icon: <FlaskConical />,
      path: "/courses/science-intro",
      color: "bg-blue-100",
    },
    {
      title: "מפת הדרכים שלי",
      description: "התקדמות אישית וציונים",
      icon: <TrendingUp />,
      path: "/roadmap",
      color: "bg-green-100",
    },
    {
      title: "ציונים",
      description: "כל הציונים שלך במקום אחד",
      icon: <GraduationCap />,
      path: "/grades",
      color: "bg-yellow-100",
    },
    {
      title: "לוח שנה",
      description: "משימות, מבחנים ואירועים",
      icon: <CalendarDays />,
      path: "/calendar",
      color: "bg-teal-100",
    },
    {
      title: "ארגז כלים",
      description: "מחברת, קישורים ומשאבים",
      icon: <Wrench />,
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
      <h1 className="text-xl font-bold mb-4 text-right">המרחב שלי</h1>

      <div className="space-y-4">
        {cards.map((card, index) => (
          <div
            key={index}
            onClick={() => navigate(card.path)}
            className="bg-white/80 backdrop-blur-md p-4 rounded-2xl flex justify-between items-center cursor-pointer shadow"
          >
            <div className={`p-3 rounded-xl ${card.color}`}>
              {card.icon}
            </div>

            <div className="text-right">
              <h2 className="font-bold">{card.title}</h2>
              <p className="text-sm text-gray-500">{card.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentHomePage;
