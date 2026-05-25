import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardVariantA from "@/components/DashboardVariantA";
import DashboardVariantB from "@/components/DashboardVariantB";
import DashboardVariantC from "@/components/DashboardVariantC";

type StyleId = "A" | "B" | "C";

const styles: { id: StyleId; label: string; subtitle: string; emoji: string }[] = [
  {
    id: "A",
    label: "מינימל",
    subtitle: "עדין ושקט — כמו מגזין עיצוב",
    emoji: "🪶",
  },
  {
    id: "B",
    label: "אתלטי",
    subtitle: "נועז ואנרגטי — מספרים גדולים, צבעים חיים",
    emoji: "⚡",
  },
  {
    id: "C",
    label: "מקצועי",
    subtitle: "נקי ומובנה — מערכת ניהול איכותית",
    emoji: "📊",
  },
];

const StylePickerPage = () => {
  const [active, setActive] = useState<StyleId>("A");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* ── Sticky picker bar ── */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-[1400px] mx-auto px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Title */}
          <div className="shrink-0">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">בחר עיצוב דשבורד</p>
          </div>

          {/* Style tabs */}
          <div className="flex gap-2 flex-1">
            {styles.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 border
                  ${active === s.id
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                  }
                `}
              >
                <span>{s.emoji}</span>
                <span className="font-semibold">{s.label}</span>
                <span className="hidden sm:inline text-[10px] opacity-70">— {s.subtitle}</span>
              </button>
            ))}
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate("/")}
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors shrink-0 underline underline-offset-2"
          >
            חזרה
          </button>
        </div>
      </div>

      {/* ── Active variant preview ── */}
      <div className="max-w-[1400px] mx-auto">
        {active === "A" && (
          <div className="p-5 md:p-8 lg:p-10">
            <DashboardVariantA embedded />
          </div>
        )}
        {active === "B" && (
          <div className="p-5 md:p-8 lg:p-10">
            <DashboardVariantB embedded />
          </div>
        )}
        {active === "C" && (
          <div className="p-5 md:p-8 lg:p-10">
            <DashboardVariantC embedded />
          </div>
        )}
      </div>

      {/* ── Bottom CTA ── */}
      <div className="sticky bottom-0 bg-background/90 backdrop-blur border-t border-border px-5 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <p className="text-[12px] text-muted-foreground">
            מוצג כרגע: <span className="font-semibold text-foreground">
              {styles.find(s => s.id === active)?.emoji}{" "}
              {styles.find(s => s.id === active)?.label} —{" "}
              {styles.find(s => s.id === active)?.subtitle}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground/60">אמור לי איזה מהעיצובים אתה מעדיף ואיישם אותו</p>
        </div>
      </div>
    </div>
  );
};

export default StylePickerPage;
