import { useNavigate } from "react-router-dom";
import { BookOpen, Globe, Calculator, Languages, Scroll, Scale, Dumbbell, Feather, ChevronLeft, Route } from "lucide-react";
import { openSubjectAppSameWindow } from "@/lib/openSubjectApp";

/**
 * מסלולי למידה — לפי טבלת מקור האמת (אושרה):
 *   ספרות → שער האפליקציות הקנוניות (30% לרוץ עם מילים · 70% ספרות לבגרות)
 *   אזרחות → האפליקציה הקנונית, באותו חלון (דפוס הספרות)
 *   תנ״ך → מפת השנה המאושרת (מוצר פנימי)
 *   אנגלית → אפליקציית מפת הדרכים, באותו חלון. פיילוט: הדגמה חזותית בלבד.
 *   מתמטיקה/לשון/היסטוריה/חינוך גופני → "בהכנה": תוכן פנימי גנרי
 *     שטרם אושר — לא לחיץ, לא מבטיח מסלול. העמודים נשארים ב-URL ישיר בלבד.
 * (מדעים נכנס מהבית, מהסיידבר וממסך המקצועות — זהו launcher של מסלולים,
 *  ומדעים החיצוני אינו מסלול פנימי.)
 */

type Entry = {
  name: string;
  icon: typeof BookOpen;
  bg: string;
  fg: string;
  kind: "internal" | "gate" | "canonical" | "prep";
  action?: (navigate: (p: string) => void) => void;
  cta?: string;
};

const ENTRIES: Entry[] = [
  {
    name: "תנ״ך", icon: BookOpen, bg: "bg-[hsl(45,35%,93%)]", fg: "text-[hsl(38,50%,38%)]",
    kind: "internal", cta: "לכניסה למפת השנה",
    action: (nav) => nav(`/subjects/${encodeURIComponent("תנ״ך")}/tanakh-30`),
  },
  {
    name: "ספרות", icon: Feather, bg: "bg-[hsl(320,25%,94%)]", fg: "text-[hsl(322,35%,42%)]",
    kind: "gate", cta: "לשער המקצוע",
    action: (nav) => nav(`/subjects/${encodeURIComponent("ספרות")}/literature`),
  },
  {
    name: "אזרחות", icon: Scale, bg: "bg-[hsl(180,20%,93%)]", fg: "text-[hsl(190,40%,34%)]",
    kind: "canonical", cta: "מעבר לאפליקציה",
    action: () => openSubjectAppSameWindow("civics-70"),
  },
  {
    name: "אנגלית", icon: Globe, bg: "bg-[hsl(210,30%,94%)]", fg: "text-[hsl(210,40%,45%)]",
    kind: "canonical", cta: "מעבר לאפליקציה",
    action: () => openSubjectAppSameWindow("english-11"),
  },
  { name: "מתמטיקה",     icon: Calculator, bg: "bg-[hsl(270,25%,94%)]", fg: "text-[hsl(262,38%,46%)]", kind: "prep" },
  { name: "לשון",        icon: Languages,  bg: "bg-[hsl(150,25%,93%)]", fg: "text-[hsl(150,32%,34%)]", kind: "prep" },
  { name: "היסטוריה",    icon: Scroll,     bg: "bg-[hsl(35,30%,94%)]",  fg: "text-[hsl(28,48%,42%)]",  kind: "prep" },
  { name: "חינוך גופני", icon: Dumbbell,   bg: "bg-[hsl(168,25%,93%)]", fg: "text-[hsl(168,35%,34%)]", kind: "prep" },
];

const RoadmapsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[1100px] mx-auto" dir="rtl">
      <div className="mb-8 flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Route className="h-5 w-5 text-primary" strokeWidth={1.7} />
        </span>
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight leading-tight font-heading">
            מסלולי למידה
          </h1>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            כל מקצוע הוא מסע שנתי. בחרו מקצוע כדי להיכנס למסלול שלו
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ENTRIES.map((e) => {
          const Icon = e.icon;

          const inner = (
            <div className="flex items-center gap-3.5">
              <span className={`w-12 h-12 rounded-2xl ${e.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 ${e.fg}`} strokeWidth={1.7} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="block text-[15px] font-bold text-foreground tracking-tight">{e.name}</span>
                  {e.kind === "prep" && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      בהכנה
                    </span>
                  )}
                </span>
                {e.kind === "prep" ? (
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    המסלול יעלה כשהתוכן יאושר
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 text-[11.5px] font-semibold mt-0.5 ${e.fg}`}>
                    {e.cta}
                    <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 motion-reduce:group-hover:translate-x-0 transition-transform" strokeWidth={2} />
                  </span>
                )}
              </span>
            </div>
          );

          if (e.kind === "prep") {
            return (
              <div
                key={e.name}
                aria-disabled="true"
                className="bg-card/70 border border-border/50 rounded-2xl p-5 text-start select-none"
              >
                {inner}
              </div>
            );
          }

          return (
            <button
              key={e.name}
              onClick={() => e.action?.(navigate)}
              className="group bg-card border border-border/60 rounded-2xl p-5 transition-all duration-200 hover:shadow-md hover:border-border hover:-translate-y-px motion-reduce:hover:translate-y-0 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RoadmapsPage;
