/**
 * LiteratureHubPage — חלוקת ספרות לשני חלקים:
 *   • 30% — הערכה פנימית (לרוץ עם מילים)
 *   • 70% — בגרות חיצונית
 * שני הכרטיסים פותחים את אפליקציית המקצוע החיצונית דרך ה-registry
 * (Phase A). העמודים הפנימיים נשארים בקוד וזמינים ב-URL ישיר ל-rollback.
 */
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, GraduationCap, ChevronLeft } from "lucide-react";
import { openSubjectApp, isSubjectAppAvailable } from "@/lib/openSubjectApp";

const LiteratureHubPage = () => {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(subjectName || "ספרות");

  const cards = [
    {
      id: "30",
      title: "הערכה פנימית · 30%",
      subtitle: "לרוץ עם מילים — יחידת הערכה בית-ספרית",
      meta: "פעיל · נפתח בטאב חדש",
      Icon: BookOpen,
      iconBg: "bg-[hsl(270,25%,94%)]",
      iconColor: "text-[hsl(270,35%,50%)]",
      onClick: () => openSubjectApp("literature-30"),
      disabled: !isSubjectAppAvailable("literature-30"),
    },
    {
      id: "70",
      title: "בגרות חיצונית · 70%",
      subtitle: "8 יחידות בגרות — פרוזה, שירה ודרמה",
      meta: "פעיל · נפתח בטאב חדש",
      Icon: GraduationCap,
      iconBg: "bg-[hsl(35,30%,94%)]",
      iconColor: "text-[hsl(35,40%,45%)]",
      onClick: () => openSubjectApp("literature-70"),
      disabled: !isSubjectAppAvailable("literature-70"),
    },
  ];

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[1100px] mx-auto" dir="rtl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-5 flex-wrap">
        <button
          onClick={() => navigate("/roadmaps")}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium"
        >
          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          חזרה למפות דרכים
        </button>
        <span className="text-border">|</span>
        <span>{decoded}</span>
      </div>

      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-foreground tracking-tight leading-tight font-heading">
          {decoded}
        </h1>
        <p className="text-[12.5px] text-muted-foreground mt-1.5">
          בחירת חלק — הערכה פנימית 30% או בגרות חיצונית 70%
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((c) => {
          const Icon = c.Icon;
          return (
            <button
              key={c.id}
              onClick={c.onClick}
              disabled={c.disabled}
              className={`group bg-card border border-border/60 rounded-2xl p-6 text-start transition-all duration-200 ${
                c.disabled
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:shadow-md hover:border-border hover:-translate-y-[1px]"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${c.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${c.iconColor}`} strokeWidth={1.6} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15.5px] font-semibold text-foreground tracking-tight">
                    {c.title}
                  </h3>
                  <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">
                    {c.subtitle}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span>{c.meta}</span>
                    {!c.disabled && (
                      <ChevronLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2} />
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LiteratureHubPage;
