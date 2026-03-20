import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, Brain, BookOpen, Loader2 } from "lucide-react";
import { useState } from "react";

const titles: Record<string, { title: string; subtitle: string; icon: typeof Calendar; iconColor: string; iconBg: string }> = {
  schedule: { title: "מערכת שעות", subtitle: "צפייה בלוח הזמנים השבועי", icon: Calendar, iconColor: "text-[hsl(210,40%,50%)]", iconBg: "bg-[hsl(210,30%,94%)]" },
  smartbase: { title: "וינגייט חכם", subtitle: "כלים חכמים ומשאבי למידה", icon: Brain, iconColor: "text-[hsl(270,35%,50%)]", iconBg: "bg-[hsl(270,25%,94%)]" },
  learning: { title: "התחל למידה", subtitle: "גישה לקורסים ומשאבי למידה", icon: BookOpen, iconColor: "text-[hsl(35,40%,45%)]", iconBg: "bg-[hsl(35,30%,94%)]" },
};

const ExternalWrapperPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const url = params.get("url") || "";
  const type = params.get("type") || "schedule";
  const meta = titles[type] || titles.schedule;
  const Icon = meta.icon;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]" dir="rtl">
      {/* Sub-header */}
      <div className="flex items-center gap-3.5 px-4 md:px-7 py-3 bg-card border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div className={`w-9 h-9 rounded-xl ${meta.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-[15px] w-[15px] ${meta.iconColor}`} strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-[13px] font-medium text-foreground leading-tight">{meta.title}</h2>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-normal">{meta.subtitle}</p>
        </div>
      </div>

      {/* Content */}
      {url ? (
        <div className="flex-1 relative bg-background">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-[10.5px] text-muted-foreground/60 font-normal">טוען תוכן...</p>
              </div>
            </div>
          )}
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={meta.title}
            allow="clipboard-write"
            onLoad={() => setLoading(false)}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-background">
          <p className="text-muted-foreground/60 text-[11.5px] font-normal">התוכן עדיין לא זמין</p>
        </div>
      )}
    </div>
  );
};

export default ExternalWrapperPage;
