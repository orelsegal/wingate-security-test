import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, Brain, BookOpen, Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";

const titles: Record<string, { title: string; subtitle: string; icon: typeof Calendar }> = {
  schedule: { title: "מערכת שעות", subtitle: "צפייה בלוח הזמנים השבועי", icon: Calendar },
  smartbase: { title: "וינגייט חכם", subtitle: "כלים חכמים ומשאבי למידה", icon: Brain },
  learning: { title: "התחל למידה", subtitle: "גישה לקורסים ומשאבי למידה", icon: BookOpen },
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
      {/* Sub-header — fully native Wingate styling */}
      <div className="flex items-center gap-3 px-5 md:px-7 h-[52px] bg-card border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors duration-150"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
          <Icon className="h-[16px] w-[16px] text-primary" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[13px] font-semibold text-foreground leading-tight tracking-tight">{meta.title}</h2>
          <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-normal">{meta.subtitle}</p>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground transition-colors duration-150"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
          </a>
        )}
      </div>

      {/* Content */}
      {url ? (
        <div className="flex-1 relative bg-background">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" strokeWidth={1.5} />
                </div>
                <p className="text-[10.5px] text-muted-foreground/50 font-normal">טוען תוכן...</p>
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
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <Icon className="h-5 w-5 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
            <p className="text-muted-foreground/50 text-[11.5px] font-normal">התוכן עדיין לא זמין</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalWrapperPage;
