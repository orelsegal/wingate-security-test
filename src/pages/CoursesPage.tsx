import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Lock, CheckCircle2, FlaskConical, BookOpen, Globe, Calculator } from "lucide-react";

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
        icon: <BookOpen className="h-7 w-7 text-[hsl(270,35%,50%)]" strokeWidth={1.8} />,
        color: "bg-[hsl(270,25%,92%)]",
        progress: 60,
        units: [
          {
            id: 1,
            title: "מבוא לקורס",
            description: "פתיחה, מבנה הקורס והיכרות עם הנושאים",
          },
          {
            id: 2,
            title: "מדמוקרטיה לנאציזם",
            description: "תעמולה, חקיקה וטרור",
          },
          {
            id: 3,
            title: "נוער היטלר",
            description: "מקור היסטורי וניתוח שאלות",
          },
          {
            id: 4,
            title: "משימה מסכמת",
            description: "העלאה והגשה מסודרת",
            locked: true,
          },
        ],
      },

      english: {
        title: "אנגלית",
        subtitle: "Module E",
        icon: <Globe className="h-7 w-7 text-[hsl(210,45%,48%)]" strokeWidth={1.8} />,
        color: "bg-[hsl(210,35%,91%)]",
        progress: 40,
        units: [
          {
            id: 1,
            title: "Main Idea",
            description: "זיהוי רעיון מרכזי בטקסט",
          },
          {
            id: 2,
            title: "Supporting Details",
            description: "איתור פרטים תומכים",
          },
          {
            id: 3,
            title: "Text Types",
            description: "סוגי טקסטים בבגרות",
          },
          {
            id: 4,
            title: "Practice Quiz",
            description: "מבדק קצר לסיכום",
            locked: true,
          },
        ],
      },

      math: {
        title: "מתמטיקה",
        subtitle: "4/5 יחידות",
        icon: <Calculator className="h-7 w-7 text-[hsl(150,35%,42%)]" strokeWidth={1.8} />,
        color: "bg-[hsl(150,20%,91%)]",
        progress: 30,
        units: [
          {
            id: 1,
            title: "חזרה על יסודות",
            description: "חיזוק מיומנויות בסיס",
          },
          {
            id: 2,
            title: "פתרון משוואות",
            description: "תרגול מודרך",
          },
          {
            id: 3,
            title: "בעיות מילוליות",
            description: "יישום וחשיבה",
          },
          {
            id: 4,
            title: "מבדק מסכם",
            description: "בדיקת התקדמות",
            locked: true,
          },
        ],
      },

      "science-intro": {
        title: "מבוא למדעים",
        subtitle: "יחידות פתיחה",
        icon: <FlaskConical className="h-7 w-7 text-[hsl(210,45%,48%)]" strokeWidth={1.8} />,
        color: "bg-[hsl(210,35%,91%)]",
        progress: 20,
        units: [
          {
            id: 1,
            title: "מהו מדע?",
            description: "מושגי יסוד והיכרות עם התחום",
          },
          {
            id: 2,
            title: "שיטה מדעית",
            description: "שאלת חקר, השערה ומסקנה",
          },
          {
            id: 3,
            title: "ניסוי ותצפית",
            description: "סוגי בדיקה וניתוח תוצאות",
          },
          {
            id: 4,
            title: "משימת קלאסרום",
            description: "העלאה והגשה",
            locked: true,
          },
        ],
      },
    };

    return coursesMap[courseId || ""] || null;
  }, [courseId]);

  if (!course) {
    return (
      <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto" dir="rtl">
        <div className="bg-white rounded-[28px] border border-black/5 shadow-[0_4px_18px_rgba(0,0,0,0.06)] p-8 text-right">
          <h1 className="text-[22px] font-bold text-foreground">הקורס לא נמצא</h1>
          <p className="text-muted-foreground mt-2">חזרי לרשימת הקורסים ונסי שוב.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[880px] mx-auto" dir="rtl">
      <button
        onClick={() => navigate("/courses")}
        className="mb-5 inline-flex items-center gap-2 text-[14px] text-muted-foreground hover:text-foreground transition"
      >
        <ChevronLeft className="h-4 w-4" />
        חזרה לקורסים
      </button>

      <div className="bg-white rounded-[30px] border border-black/5 shadow-[0_4px_18px_rgba(0,0,0,0.06)] px-6 py-7 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className={`w-[86px] h-[86px] rounded-[26px] ${course.color} flex items-center justify-center shrink-0`}>
            {course.icon}
          </div>

          <div className="flex-1 text-right">
            <h1 className="text-[24px] md:text-[30px] font-bold text-foreground leading-tight">
              {course.title}
            </h1>
            <p className="text-[15px] text-muted-foreground mt-1">
              {course.subtitle}
            </p>

            <div className="mt-4 w-full bg-[hsl(220,14%,92%)] rounded-full h-3 overflow-hidden">
              <div
                className="bg-[hsl(140,60%,48%)] h-3 rounded-full transition-all"
                style={{ width: `${course.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {course.units.map((unit) => (
          <button
            key={unit.id}
            disabled={!!unit.locked}
            className={`w-full rounded-[28px] border border-black/5 px-6 py-6 flex items-center justify-between text-right shadow-[0_4px_18px_rgba(0,0,0,0.06)] transition ${
              unit.locked
                ? "bg-[hsl(0,0%,96%)] opacity-80 cursor-not-allowed"
                : "bg-white hover:shadow-[0_6px_22px_rgba(0,0,0,0.08)]"
            }`}
          >
            <div className="flex items-center gap-3 shrink-0">
              {unit.locked ? (
                <div className="w-11 h-11 rounded-xl bg-[hsl(0,0%,90%)] flex items-center justify-center">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl bg-[hsl(145,45%,92%)] flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-[hsl(145,50%,38%)]" />
                </div>
              )}
            </div>

            <div className="flex-1 px-4">
              <h2 className="text-[18px] font-bold text-foreground">
                {unit.title}
              </h2>
              <p className="text-[14px] text-muted-foreground mt-1">
                {unit.description}
              </p>
            </div>

            <div className="text-[14px] text-muted-foreground shrink-0">
              {unit.locked ? "נעול" : `יחידה ${unit.id}`}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CoursesPage;
