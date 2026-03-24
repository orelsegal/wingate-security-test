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
        color: string;
        progress: number;
        units: { id: number; title: string; description: string; locked?: boolean }[];
      }
    > = {
      "history-30": {
        title: "היסטוריה",
        subtitle: "30% לבגרות",
        icon: <BookOpen className="h-5 w-5 text-[hsl(270,28%,56%)]" strokeWidth={1.7} />,
        color: "bg-[hsl(270,24%,93%)]",
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
        icon: <Globe className="h-5 w-5 text-[hsl(210,32%,58%)]" strokeWidth={1.7} />,
        color: "bg-[hsl(210,26%,93%)]",
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
        icon: <Calculator className="h-5 w-5 text-[hsl(145,24%,46%)]" strokeWidth={1.7} />,
        color: "bg-[hsl(145,18%,92%)]",
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
        icon: <FlaskConical className="h-5 w-5 text-[hsl(210,32%,58%)]" strokeWidth={1.7} />,
        color: "bg-[hsl(210,26%,93%)]",
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
      <div className="p-5 md:p-8 max-w-[700px] mx-auto" dir="rtl">
        <div className="bg-white rounded-[24px] border border-[hsl(220,18%,93%)] shadow-[0_2px_10px_rgba(15,23,42,0.04)] p-6 text-right">
          <h1 className="text-[20px] font-medium tracking-tight text-foreground">
            הקורס לא נמצא
          </h1>
          <p className="text-[13px] text-muted-foreground/75 mt-2">
            חזרי לרשימת הקורסים ונסי שוב.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-[700px] mx-auto" dir="rtl">
      <button
        onClick={() => navigate("/courses")}
        className="mb-5 inline-flex items-center gap-2 text-[13px] text-muted-foreground/75 hover:text-foreground transition"
      >
        <ChevronLeft className="h-4 w-4" />
        חזרה לקורסים
      </button>

      <div className="bg-white rounded-[24px] border border-[hsl(220,18%,93%)] shadow-[0_2px_10px_rgba(15,23,42,0.04)] px-5 py-5 mb-5">
        <div className="flex items-center justify-between gap-4">
          <div className={`w-[56px] h-[56px] rounded-[18px] ${course.color} flex items-center justify-center shrink-0`}>
            {course.icon}
          </div>

          <div className="flex-1 text-right">
            <h1 className="text-[21px] md:text-[24px] font-medium tracking-tight text-foreground leading-tight">
              {course.title}
            </h1>
            <p className="text-[12.5px] text-muted-foreground/75 mt-1">
              {course.subtitle}
            </p>

            <div className="mt-3 w-full bg-[hsl(220,16%,92%)] rounded-full h-[6px] overflow-hidden">
              <div
                className="bg-[hsl(140,55%,47%)] h-[6px] rounded-full transition-all"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        {course.units.map((unit) => (
          <button
            key={unit.id}
            disabled={!!unit.locked}
            className={`w-full rounded-[24px] border border-[hsl(220,18%,93%)] px-5 py-4 flex items-center justify-between text-right shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition ${
              unit.locked
                ? "bg-[hsl(0,0%,97%)] opacity-85 cursor-not-allowed"
                : "bg-white hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
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
              <h2 className="text-[15.5px] md:text-[16.5px] font-medium tracking-tight text-foreground">
                {unit.title}
              </h2>
              <p className="text-[12.5px] text-muted-foreground/75 mt-0.5">
                {unit.description}
              </p>
            </div>

            <div className="text-[12px] text-muted-foreground/65 shrink-0">
              {unit.locked ? "נעול" : `יחידה ${unit.id}`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CoursesPage;
