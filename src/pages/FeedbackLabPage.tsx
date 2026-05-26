import { useState } from "react";
import SportFeedbackOverlay from "@/components/SportFeedbackOverlay";
import { SPORT_LABELS, type FeedbackEventType, type SportType } from "@/lib/sportFeedback";

const SPORTS: SportType[] = [
  "volleyball",
  "beach_volleyball",
  "table_tennis",
  "climbing",
  "swimming",
  "artistic_swimming",
  "gymnastics",
  "generic",
];

/**
 * /feedback-lab — dev/test panel to preview every sport × event combo.
 * Pure UI, no auth dependency on data.
 */
const FeedbackLabPage = () => {
  const [active, setActive] = useState<{ sport: SportType; event: FeedbackEventType } | null>(null);

  const trigger = (sport: SportType, event: FeedbackEventType) => {
    setActive(null);
    // tick to allow remount
    setTimeout(() => setActive({ sport, event }), 30);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">מעבדת Feedback</h1>
        <p className="text-sm text-muted-foreground mb-6">
          לחצי על כל ענף כדי לראות אנימציית הצלחה או טעות.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SPORTS.map(s => (
            <div key={s} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="text-sm font-semibold text-foreground mb-3">{SPORT_LABELS[s]}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => trigger(s, "success")}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition"
                >
                  הצלחה
                </button>
                <button
                  onClick={() => trigger(s, "failure")}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 transition"
                >
                  טעות
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {active && (
        <SportFeedbackOverlay
          visible
          sport={active.sport}
          event={active.event}
          onDone={() => setActive(null)}
        />
      )}
    </div>
  );
};

export default FeedbackLabPage;
