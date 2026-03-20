import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Globe, Calculator, Languages, Scroll, Scale } from "lucide-react";

const subjects = [
  { id: "history", name: "היסטוריה", icon: Scroll, color: "bg-[hsl(35,30%,94%)]", iconColor: "text-[hsl(35,40%,45%)]", url: "https://ancient-journeys.lovable.app" },
  { id: "english", name: "אנגלית", icon: Globe, color: "bg-[hsl(210,30%,94%)]", iconColor: "text-[hsl(210,40%,50%)]", url: "" },
  { id: "math", name: "מתמטיקה", icon: Calculator, color: "bg-[hsl(270,25%,94%)]", iconColor: "text-[hsl(270,35%,50%)]", url: "" },
  { id: "hebrew", name: "לשון", icon: Languages, color: "bg-primary/8", iconColor: "text-primary", url: "" },
  { id: "literature", name: "ספרות", icon: BookOpen, color: "bg-[hsl(350,20%,95%)]", iconColor: "text-[hsl(350,35%,52%)]", url: "" },
  { id: "civics", name: "אזרחות", icon: Scale, color: "bg-[hsl(180,20%,93%)]", iconColor: "text-[hsl(180,30%,42%)]", url: "" },
];

const SubjectSelectionPage = () => {
  const navigate = useNavigate();

  const handleSelect = (subject: typeof subjects[0]) => {
    if (subject.url) {
      navigate(`/external?type=learning&url=${encodeURIComponent(subject.url)}`);
    }
  };

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
            בחר מקצוע
          </h1>
          <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">
            גישה לקורסים ומשאבי למידה לפי מקצוע
          </p>
        </div>
      </div>

      {/* Subject Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        {subjects.map((subject, i) => {
          const available = !!subject.url;
          return (
            <button
              key={subject.id}
              onClick={() => handleSelect(subject)}
              disabled={!available}
              className={`group bg-card rounded-2xl border border-border p-5 flex flex-col items-center gap-3 text-center transition-all duration-300 animate-fade-in-up ${
                available
                  ? "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer"
                  : "opacity-40 cursor-not-allowed"
              }`}
              style={{ animationDelay: `${60 + i * 40}ms` }}
            >
              <div className={`w-11 h-11 rounded-xl ${subject.color} flex items-center justify-center transition-transform duration-300 ${available ? "group-hover:scale-105" : ""}`}>
                <subject.icon className={`h-[18px] w-[18px] ${subject.iconColor}`} strokeWidth={1.5} />
              </div>
              <p className={`text-[12.5px] font-medium leading-tight ${available ? "text-foreground/75" : "text-muted-foreground"}`}>
                {subject.name}
              </p>
              {!available && (
                <span className="text-[8.5px] text-muted-foreground/50 font-normal">בקרוב</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubjectSelectionPage;
