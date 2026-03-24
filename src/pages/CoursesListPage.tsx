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
      icon: <BookOpen className="h-5 w-5 text-[hsl(270,32%,52%)]" strokeWidth={1.7} />,
      color: "bg-[hsl(270,28%,92%)]",
    },
    {
      id: "english",
      title: "אנגלית",
      subtitle: "Module E",
      progress: 40,
      icon: <Globe className="h-5 w-5 text-[hsl(210,38%,56%)]" strokeWidth={1.7} />,
      color: "bg-[hsl(215,34%,91%)]",
    },
    {
      id: "math",
      title: "מתמטיקה",
      subtitle: "4/5 יחידות",
      progress: 30,
      icon: <Calculator className="h-5 w-5 text-[hsl(150,28%,45%)]" strokeWidth={1.7} />,
      color: "bg-[hsl(145,18%,90%)]",
    },
    {
      id: "science-intro",
      title: "מבוא למדעים",
      subtitle: "יחידות פתיחה",
      progress: 20,
      icon: <FlaskConical className="h-5 w-5 text-[hsl(210,38%,56%)]" strokeWidth={1.7} />,
      color: "bg-[hsl(215,34%,91%)]",
    },
  ];

  return (
    <div className="p-5 md:p-8 max-w-[760px] mx-auto" dir="rtl">
      <div className="mb-7">
        <h1 className="text-[22px] md:text-[26px] font-bold text-foreground text-right">
          הקורסים שלי
        </h1>
        <p className="text-[13px] text-muted-foreground/80 text-right mt-1.5">
          כניסה מהירה לכל קורסי הלימוד שלך
        </p>
      </div>

      <div className="space-y-4">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => navigate(`/courses
