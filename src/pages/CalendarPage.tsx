import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Lock,
  CheckCircle2,
  FlaskConical,
  BookOpen,
  Globe,
  Calculator,
} from "lucide-react";

const CoursesPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const course = useMemo(() => {
    const coursesMap: Record<
      string,
      {
        title: string;
        subtitle: string;
        icon: JSX.Element;
        bg: string;
        progress: number;
        units: { id: number; title: string; description: string; locked?: boolean }[];
      }
    > = {
      "history-30": {
        title: "היסטוריה",
        subtitle: "30% לבגרות",
        icon: <BookOpen className="h-5 w-5 text-[hsl(270,30%,52%)]" />,
        bg: "bg-[hsl(270,28%,92%)]",
        progress: 60,
        units: [
          { id: 1, title: "מבוא לקורס", description: "פתיחה, מבנה הקורס והיכרות עם הנושאים" },
          { id: 2, title: "מדמוקרטיה לנאציזם", description: "תעמולה, חקיקה וטרור" },
          { id: 3, title: "נוער היטלר", description: "מקור היסטורי וניתוח שאלות" },
          { id: 4, title: "משימה מסכמת", description: "העלאה והגשה מסודרת", locked: true },
        ],
      },
      english: {
        title: "אנגלית",
        subtitle: "Module E",
        icon: <Globe className="h-5 w-5 text-[hsl(210,32%,56%)]" />,
        bg: "bg-[hsl(210,28%,91%)]",
        progress: 40,
        units: [
          { id: 1, title: "Main Idea", description: "זיהוי רעיון מרכזי בטקסט" },
          { id: 2, title: "Supporting Details", description: "איתור פרטים תומכים" },
          { id: 3, title: "Text Types", description: "סוגי טקסטים בבגרות" },
          { id: 4, title: "Practice Quiz", description: "מבדק קצר לסיכום", locked: true },
        ],
      },
      math: {
        title: "מתמטיקה",
        subtitle: "4/5 יחידות",
        icon: <Calculator className="h-5 w-5 text-[hsl(145,24%,44%)]" />,
        bg: "bg-[hsl(145,18%,91%)]",
        progress: 30,
        units: [
          { id: 1, title: "חזרה על יסודות", description: "חיזוק מיומנויות בסיס" },
          { id: 2, title: "פתרון משוואות", description: "תרגול מודרך" },
          { id: 3, title: "בעיות מילוליות", description: "יישום וחשיבה" },
          { id: 4, title: "מבדק מסכם", description: "בדיקת התקדמות", locked: true },
        ],
      },
      "science-intro": {
        title: "מבוא למדעים",
        subtitle: "יחידות פתיחה",
        icon: <FlaskConical className="h-5 w-5 text-[hsl(210,32%,56%)]" />,
        bg: "bg-[hsl(210,28%,91%)]",
        progress: 20,
        units: [
          { id: 1, title: "מהו מדע?", description: "מושגי יסוד והיכרות עם התחום" },
          { id: 2, title: "שיטה מדעית", description: "שאלת חקר, השערה ומסקנה" },
          { id: 3, title: "ניסוי ותצפית", description: "סוגי בדיקה וניתוח תוצאות" },
          { id: 4, title: "משימת קלאסרום", description: "העלאה והגשה", locked: true },
        ],
      },
    };

    return coursesMap[courseId || ""] || null;
  }, [courseId]);

  if (!course) {
    return (
      <div className="p-4 max-w-[520px] mx-auto" dir="rtl">
        <div className="bg-white rounded-[20px] border border-[hsl(220,18%,93%)] shadow-[0_2px_10px_rgba(15,23,42,0.04)] p-5 text-center">
          <h1 className="text-[18px] font-medium">הקורס לא נמצא</h1>
          <p className="text-[12px] text-muted-foreground mt-2">
            חזרי לרשימת הקורסים ונסי שוב
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-[520px] mx-auto" dir="rtl">
      <button
        onClick={() => navigate("/courses")}
        className="mb-4 inline-flex items-center gap-2 text-[12px] text-muted-foreground/75 hover:text-foreground transition"
      >
        <ChevronLeft className="h-4 w-4" />
        חזרה לקורסים
      </button>

      <h1 className="text-[20px] font-medium text-center tracking-tight mb-2">
        {course.title}
      </h1>
      <p className="text-[12px] text-muted-foreground text-center mb-5">
        {course.subtitle}
      </p>

      <div className="bg-white rounded-[20px] border border-[hsl(220,18%,93%)] shadow-[0_2px_10px_rgba(15,23,42,0.04)] px-4 py-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className={`w-[56px] h-[56px] rounded-[18px] ${course.bg} flex items-center justify-center`}>
            {course.icon}
          </div>

          <div className="flex-1 text-right">
            <div className="mt-2 w-full bg-[hsl(220,16%,92%)] rounded-full h-[5px] overflow-hidden">
              <div
                className="bg-[hsl(140,55%,47%)] h-[5px] rounded-full"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {course.units.map((unit) => (
          <button
            key={unit.id}
            disabled={!!unit.locked}
            className={`w-full rounded-[20px] border border-[hsl(220,18%,93%)] px-4 py-4 flex items-center justify-between text-right shadow-[0_2px_10px_rgba(15,23,42,0.04)] ${
              unit.locked
                ? "bg-[hsl(0,0%,97%)] opacity-85 cursor-not-allowed"
                : "bg-white hover:shadow-[0_4px_14px_rgba(15,23,42,0.05)] transition"
            }`}
          >
            <div className="flex items-center gap-3 shrink-0">
              {unit.locked ? (
                <div className="w-9 h-9 rounded-[14px] bg-[hsl(0,0%,92%)] flex items-center justify-center">
                  <Lock className="h-4 w-4 text-muted-foreground/70" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-[14px] bg-[hsl(145,36%,92%)] flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(145,42%,38%)]" />
                </div>
              )}
            </div>

            <div className="flex-1 px-3">
              <h2 className="text-[15px] font-medium leading-tight">
                {unit.title}
              </h2>
              <p className="text-[12px] text-muted-foreground mt-1 leading-snug">
                {unit.description}
              </p>
            </div>

            <div className="text-[11px] text-muted-foreground/70 shrink-0">
              {unit.locked ? "נעול" : `יחידה ${unit.id}`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CoursesPage;
