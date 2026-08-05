import { usePlus, earnedBadges, todayIso } from "../data/store";
import { BADGES } from "../data/content";
import { PageTitle, PlusCard, Button, InlineNote } from "../components/PlusUI";

export default function AchievementsPage() {
  const { state, update } = usePlus();
  const earned = earnedBadges(state);
  const count = Object.values(earned).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <PageTitle
        title="הישגים"
        subtitle={`${count} מתוך ${BADGES.length} — כולם על פעולות בריאות בעולם האמיתי.`}
      />

      <ul className="space-y-2">
        {BADGES.map((badge) => {
          const isEarned = earned[badge.id];
          const canSelfMark = badge.kind === "manual" && !isEarned;
          return (
            <li key={badge.id}>
              <PlusCard className={isEarned ? "border-primary" : "opacity-75"}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className={`text-2xl ${isEarned ? "" : "grayscale opacity-50"}`}>
                      {badge.emoji}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">
                        {isEarned ? "✓ " : ""}{badge.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{badge.detail}</p>
                    </div>
                  </div>
                  {canSelfMark && badge.id === "compared-3" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        update((p) => ({
                          ...p,
                          manualBadges: { ...p.manualBadges, [badge.id]: todayIso() },
                        }))
                      }
                    >
                      עשיתי ✓
                    </Button>
                  )}
                </div>
              </PlusCard>
            </li>
          );
        })}
      </ul>

      <InlineNote>
        בפלוס אין טבלת מובילות ואין השוואות למישהי אחרת. ההתקדמות שלך נמדדת רק
        מול עצמך — כמו כל דבר ששווה לבנות.
      </InlineNote>
    </div>
  );
}
