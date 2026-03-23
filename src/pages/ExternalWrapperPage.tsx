import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Brain,
  BookOpen,
  Loader2,
  ExternalLink,
  Sparkles,
  Network,
  Route,
} from "lucide-react";
import { useEffect, useState } from "react";
import WingateBadge from "@/components/WingateBadge";

type WrapperMeta = {
  title: string;
  subtitle: string;
  icon: typeof CalendarDays;
  helper: string;
  chips: { label: string; icon: typeof Sparkles }[];
  panelTitle: string;
};

const titles: Record<string, WrapperMeta> = {
  schedule: {
    title: "מערכת שעות",
    subtitle: "תצוגה שבועית בתוך מרחב הלמידה",
    icon: CalendarDays,
    helper: "מערכת השעות מוצגת בתוך מעטפת וינגייט אחידה ונקייה.",
    chips: [
      { label: "תצוגה שבועית", icon: CalendarDays },
      { label: "התמצאות מהירה", icon: Route },
    ],
    panelTitle: "מערכת שעות משולבת",
  },
  smartbase: {
    title: "וינגייט חכם",
    subtitle: "ליווי למידה ותכנון שבועי",
    icon: Brain,
    helper: "כלי התמיכה מוצגים כחלק טבעי מהמערכת, באותה שפה חזותית.",
    chips: [
      { label: "מיקוד שבועי", icon: Sparkles },
      { label: "כלים חכמים", icon: Network },
    ],
    panelTitle: "וינגייט חכם — תצוגה משולבת",
  },
  learning: {
    title: "תוכן למידה",
    subtitle: "גישה למשאבים וקורסים",
    icon: BookOpen,
    helper: "התוכן מוצג במעטפת לימודית עקבית עם שאר וינגייט.",
    chips: [
      { label: "למידה מודרכת", icon: BookOpen },
      { label: "התקדמות אישית", icon: Sparkles },
    ],
    panelTitle: "תוכן למידה משולב",
  },
};

const ExternalWrapperPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const url = params.get("url") || "";
  const type = params.get("type") || "schedule";
  const meta = titles[type] || titles.schedule;
  const Icon = meta.icon;

  useEffect(() => {
    setLoading(true);
  }, [url]);

  return (
    <div className="h-[calc(100vh-56px)] overflow-y-auto bg-background" dir="rtl">
      <div className="max-w-[980px] mx-auto p-4 md:p-6 lg:p-8">
        {/* Native Wingate header shell */}
        <div className="bg-card border border-border rounded-2xl shadow-[var(--shadow-card)] p-4 md:p-5 mb-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors duration-150 shrink-0"
            >
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>

            <WingateBadge size="sm" className="shadow-[var(--shadow-card)] shrink-0" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h1 className="text-[14px] md:text-[15px] font-semibold text-foreground leading-tight tracking-tight">
                    {meta.title}
                  </h1>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 font-normal">{meta.subtitle}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/80 mt-3">{meta.helper}</p>
            </div>

            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-150 text-[10.5px] font-medium shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                פתיחה בחלון חדש
              </a>
            )}
          </div>
        </div>

        {/* Context chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {meta.chips.map((chip, i) => (
            <div
              key={chip.label}
              className="bg-card border border-border rounded-xl p-3 shadow-[var(--shadow-card)] animate-fade-in-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <chip.icon className="h-3.5 w-3.5 text-foreground/70" strokeWidth={1.5} />
                </div>
                <p className="text-[11px] font-medium text-foreground">{chip.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Embedded panel */}
        <div className="bg-card border border-border rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
          <div className="h-11 px-4 border-b border-border flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-[11.5px] font-medium text-foreground">{meta.panelTitle}</p>
          </div>

          {url ? (
            <div className="relative h-[calc(100vh-290px)] min-h-[360px] bg-background">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" strokeWidth={1.5} />
                    </div>
                    <p className="text-[10.5px] text-muted-foreground/70 font-normal">טוען תוכן...</p>
                  </div>
                </div>
              )}
              <iframe
                src={url}
                className="w-full h-full border-0 bg-background"
                title={meta.title}
                allow="clipboard-write"
                onLoad={() => setLoading(false)}
              />
            </div>
          ) : (
            <div className="h-[360px] flex items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground/60" strokeWidth={1.5} />
                </div>
                <p className="text-[12px] font-medium text-foreground">התוכן יתווסף בקרוב</p>
                <p className="text-[10.5px] text-muted-foreground max-w-[320px]">
                  ברגע שהתוכן יהיה זמין, הוא יוצג כאן בתוך סביבת וינגייט באותה שפה עיצובית אחידה.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExternalWrapperPage;
