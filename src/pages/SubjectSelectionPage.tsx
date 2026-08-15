import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Globe, Calculator, Languages, Scroll, Scale, Loader2, Lightbulb } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudentProgress } from "@/hooks/useStudents";
import { ChevronLeft } from "lucide-react";
import { openSubjectApp, openSubjectAppSameWindow } from "@/lib/openSubjectApp";

/**
 * מסך המקצועות — לפי טבלת מקור האמת:
 *   ספרות → שער האפליקציות הקנוניות (דרך ה-redirect של /subjects/ספרות)
 *   אזרחות → האפליקציה הקנונית, באותו חלון (דפוס הספרות)
 *   מבוא למדעים → האפליקציה הקנונית (טאב חדש, Phase A)
 *   אנגלית/מתמטיקה/היסטוריה/לשון → "בהכנה": תוכן פנימי גנרי שטרם אושר —
 *     הכרטיס אינו לחיץ ואינו מבטיח מסלול. העמודים נשארים ב-URL ישיר בלבד.
 * נקודות הסטטוס אדום/צהוב/ירוק הוסרו מכרטיסי המקצועות (אישור מפורש).
 */

const subjectMeta: Record<string, { icon: any; color: string; iconColor: string; subtitle: string; cta?: string }> = {
  "אנגלית": { icon: Globe, color: "bg-[hsl(210,30%,94%)]", iconColor: "text-[hsl(210,40%,50%)]", subtitle: "5 יח״ל" },
  "מתמטיקה": { icon: Calculator, color: "bg-[hsl(270,25%,94%)]", iconColor: "text-[hsl(270,35%,50%)]", subtitle: "4/5 יח״ל · לפי רמה" },
  "היסטוריה": { icon: Scroll, color: "bg-[hsl(35,30%,94%)]", iconColor: "text-[hsl(35,40%,45%)]", subtitle: "30% + 70%" },
  "אזרחות": { icon: Scale, color: "bg-[hsl(180,20%,93%)]", iconColor: "text-[hsl(180,30%,42%)]", subtitle: "מרחב הלמידה לבגרות", cta: "מעבר לאפליקציה" },
  "ספרות": { icon: BookOpen, color: "bg-[hsl(320,25%,94%)]", iconColor: "text-[hsl(320,35%,50%)]", subtitle: "30% ו־70% · אפליקציות הלמידה", cta: "לשער המקצוע" },
  "לשון": { icon: Languages, color: "bg-primary/8", iconColor: "text-primary", subtitle: "20% + 80%" },
  "מבוא למדעים": { icon: Lightbulb, color: "bg-[hsl(45,35%,93%)]", iconColor: "text-[hsl(45,45%,42%)]", subtitle: "קורס אינטראקטיבי · נפתח בטאב חדש", cta: "מעבר לאפליקציה" },
};

const subjectOrder = ["אנגלית", "מתמטיקה", "היסטוריה", "אזרחות", "ספרות", "לשון", "מבוא למדעים"];

/** תוכן פנימי גנרי שטרם אושר כמוצר — מוקפא, לא לחיץ */
const IN_PREPARATION = new Set(["אנגלית", "מתמטיקה", "היסטוריה", "לשון"]);

const SubjectSelectionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: progress = [], isLoading } = useStudentProgress(studentId);

  const progressBySubject = new Map(
    progress.map((p: any) => [p.subjects?.subject_name, p])
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[720px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-[17px] font-semibold text-foreground tracking-tight leading-tight">
            מקצועות
          </h1>
          <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">
            גישה לקורסים ומשאבי למידה לפי מקצוע
          </p>
        </div>
      </div>

      {/* Subject Cards */}
      <div className="flex flex-col gap-3">
        {subjectOrder.map((name, i) => {
          const meta = subjectMeta[name];
          const prog = progressBySubject.get(name);
          const grade = prog?.grade;
          const Icon = meta.icon;
          const inPrep = IN_PREPARATION.has(name);

          const cardInner = (
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${meta.color} flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 ${meta.iconColor}`} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-[13.5px] font-semibold text-foreground leading-tight">{name}</h3>
                  {inPrep && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      בהכנה
                    </span>
                  )}
                  {grade != null && (
                    <span className="text-[9.5px] font-semibold text-muted-foreground mr-auto tabular-nums">ציון: {grade}</span>
                  )}
                </div>
                <p className="text-[10.5px] text-muted-foreground font-normal mb-1.5">
                  {inPrep ? "מסלול הלמידה יעלה כשהתוכן יאושר" : meta.subtitle}
                </p>
                {/* Canonical apps carry NO progress bar / percentage here:
                    the shell has no progress sync from those apps, so any
                    number would be invented. A clear nav action instead. */}
                {!inPrep && meta.cta && (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${meta.iconColor}`}>
                    {meta.cta}
                    <ChevronLeft className="h-3 w-3 group-hover:-translate-x-0.5 motion-reduce:group-hover:translate-x-0 transition-transform" strokeWidth={2} />
                  </span>
                )}
              </div>
            </div>
          );

          if (inPrep) {
            return (
              <div
                key={name}
                aria-disabled="true"
                className="bg-card/70 rounded-2xl border border-border/60 p-4 text-start select-none animate-fade-in-up"
                style={{ animationDelay: `${60 + i * 40}ms` }}
              >
                {cardInner}
              </div>
            );
          }

          return (
            <button
              key={name}
              onClick={() => {
                // Phase A: קנוניות דרך ה-registry, fail-closed.
                if (name === "מבוא למדעים") { openSubjectApp("science"); return; }
                if (name === "אזרחות") { openSubjectAppSameWindow("civics-70"); return; }
                navigate(`/subjects/${encodeURIComponent(name)}`);
              }}
              className="group bg-card rounded-2xl border border-border p-4 text-start transition-all duration-300 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${60 + i * 40}ms` }}
            >
              {cardInner}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubjectSelectionPage;
