import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  GraduationCap,
  CalendarDays,
  LifeBuoy,
  ChevronLeft,
} from "lucide-react";

const ParentHomePage = () => {
  const navigate = useNavigate();

  const items = [
    {
      title: "התקדמות הילד/ה",
      subtitle: "תמונת מצב כללית על התקדמות אישית",
      icon: <TrendingUp className="h-5 w-5 text-[hsl(145,24%,44%)]" />,
      bg: "bg-[hsl(145,18%,91%)]",
      path: "/parent-progress",
    },
    {
      title: "ציונים",
      subtitle: "ציונים, מבדקים והישגים במקום אחד",
      icon: <GraduationCap className="h-5 w-5 text-[hsl(42,42%,44%)]" />,
      bg: "bg-[hsl(50,42%,90%)]",
      path: "/parent-grades",
    },
    {
      title: "לוח שנה",
      subtitle: "מבחנים, משימות ואירועים חשובים",
      icon: <CalendarDays className="h-5 w-5 text-[hsl(170,28%,45%)]" />,
      bg: "bg-[hsl(170,24%,90%)]",
      path: "/parent-calendar",
    },
    {
      title: "מרכז למידה ותמיכה",
      subtitle: "סיוע לימודי, התאמות וקשר עם הצוות",
      icon: <LifeBuoy className="h-5 w-5 text-[hsl(210,16%,42%)]" />,
      bg: "bg-[hsl(220,16%,93%)]",
      path: "/parent-support",
    },
  ];

  return (
    <div className="p-4 max-w-[520px] mx-auto" dir="rtl">
      <h1 className="text-[20px] font-medium
