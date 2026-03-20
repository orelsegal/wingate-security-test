import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const titles: Record<string, { title: string; subtitle: string }> = {
  schedule: { title: "מערכת שעות", subtitle: "צפייה בלוח הזמנים השבועי" },
  smartbase: { title: "סמארטבייס", subtitle: "כניסה לכלים חכמים ומשאבי למידה" },
  learning: { title: "התחל למידה", subtitle: "גישה לקורסים ומשאבי למידה" },
};

const ExternalWrapperPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const url = params.get("url") || "";
  const type = params.get("type") || "schedule";
  const meta = titles[type] || titles.schedule;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]" dir="rtl">
      {/* Sub-header */}
      <div className="flex items-center gap-3 px-4 md:px-7 py-3 bg-card border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150"
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div>
          <h2 className="text-[14px] font-semibold text-foreground leading-tight">{meta.title}</h2>
          <p className="text-[10.5px] text-muted-foreground mt-0.5 font-medium">{meta.subtitle}</p>
        </div>
      </div>

      {/* Iframe */}
      {url ? (
        <iframe
          src={url}
          className="flex-1 w-full border-0 bg-background"
          title={meta.title}
          allow="clipboard-write"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-background">
          <p className="text-muted-foreground text-sm">התוכן עדיין לא זמין</p>
        </div>
      )}
    </div>
  );
};

export default ExternalWrapperPage;
