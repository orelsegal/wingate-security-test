import { useNavigate } from "react-router-dom";
import { BookOpen, Globe, Calculator, Languages, Scroll, Scale, Dumbbell, Feather, Eye, Pencil } from "lucide-react";

const subjects: { name: string; icon: any; bg: string; iconColor: string }[] = [
  { name: "תנ״ך",        icon: BookOpen,   bg: "bg-[hsl(45,35%,94%)]",  iconColor: "text-[hsl(45,45%,42%)]" },
  { name: "לשון",        icon: Languages,  bg: "bg-primary/8",          iconColor: "text-primary" },
  { name: "מתמטיקה",     icon: Calculator, bg: "bg-[hsl(270,25%,94%)]", iconColor: "text-[hsl(270,35%,50%)]" },
  { name: "אנגלית",      icon: Globe,      bg: "bg-[hsl(210,30%,94%)]", iconColor: "text-[hsl(210,40%,50%)]" },
  { name: "היסטוריה",    icon: Scroll,     bg: "bg-[hsl(35,30%,94%)]",  iconColor: "text-[hsl(35,40%,45%)]" },
  { name: "חינוך גופני", icon: Dumbbell,   bg: "bg-[hsl(150,25%,93%)]", iconColor: "text-[hsl(150,35%,40%)]" },
  { name: "ספרות",       icon: Feather,    bg: "bg-[hsl(320,25%,94%)]", iconColor: "text-[hsl(320,35%,50%)]" },
  { name: "אזרחות",      icon: Scale,      bg: "bg-[hsl(180,20%,93%)]", iconColor: "text-[hsl(180,30%,42%)]" },
];

const RoadmapsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[1100px] mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-[20px] font-semibold text-foreground tracking-tight leading-tight font-heading">
          מפות דרכים
        </h1>
        <p className="text-[12.5px] text-muted-foreground mt-1.5">
          חלוקה לפי מקצועות — צפייה של התלמיד או הזנת חומר לימוד של המורה
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.name}
              className="group bg-card border border-border/60 rounded-2xl p-5 transition-all duration-200 hover:shadow-md hover:border-border"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${s.iconColor}`} strokeWidth={1.6} />
                </div>
                <h3 className="text-[15px] font-semibold text-foreground tracking-tight">{s.name}</h3>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/subjects/${encodeURIComponent(s.name)}`)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[12.5px] font-medium text-foreground bg-muted/50 hover:bg-muted transition-colors duration-150 text-start"
                >
                  <Eye className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <span>צפייה של התלמיד</span>
                </button>
                <button
                  onClick={() => navigate(`/teacher-subjects?subject=${encodeURIComponent(s.name)}`)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[12.5px] font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors duration-150 text-start"
                >
                  <Pencil className="h-4 w-4" strokeWidth={1.5} />
                  <span>הזנת חומר לימוד של המורה</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoadmapsPage;
