import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePlus } from "../data/store";
import { EARN_IDEAS, EARN_SAFETY_BASE } from "../data/content";
import { PageTitle, PlusCard, InlineNote } from "../components/PlusUI";

type Where = "any" | "home" | "outside";

export default function EarnPage() {
  const { state } = usePlus();
  const [where, setWhere] = useState<Where>("any");
  const [digitalOnly, setDigitalOnly] = useState(false);

  const skillTagMap: Record<string, string[]> = {
    "עריכת סרטונים": ["video"],
    "עזרה לילדים": ["babysitting", "tutoring", "events"],
    "טיפול בחיות": ["pets"],
    "עיצוב וגרפיקה": ["design"],
    "הסברה ולימוד": ["tutoring", "digital-help"],
    "יצירה בידיים": ["handmade"],
    "סדר וארגון": ["digital-help", "events"],
    "צילום": ["video", "design"],
  };

  const recommendedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of state.answers.skills) {
      for (const id of skillTagMap[s] ?? []) ids.add(id);
    }
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.answers.skills]);

  const filtered = EARN_IDEAS.filter((idea) => {
    if (where === "home" && !idea.tags.includes("home")) return false;
    if (where === "outside" && !idea.tags.includes("outside")) return false;
    if (digitalOnly && !idea.tags.includes("digital")) return false;
    return true;
  }).sort((a, b) => {
    const ra = recommendedIds.has(a.id) ? 0 : 1;
    const rb = recommendedIds.has(b.id) ? 0 : 1;
    return ra - rb;
  });

  return (
    <div className="space-y-4">
      <PageTitle
        title="להרוויח"
        subtitle="רעיונות אמיתיים, בטוחים ומתאימים לגילך. המחירים הם דוגמאות בלבד."
      />

      <Link to="/plus/earn/first-client" className="block">
        <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-md">
          <p className="font-bold">🚀 המסלול: הלקוחה הראשונה שלי</p>
          <p className="mt-1 text-sm opacity-90">
            שמונה צעדים מרעיון ועד תשלום ראשון והמלצה.
          </p>
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="סינון רעיונות">
        {(
          [
            ["any", "הכול"],
            ["home", "מהבית"],
            ["outside", "בחוץ"],
          ] as const
        ).map(([val, label]) => (
          <button
            key={val}
            type="button"
            aria-pressed={where === val}
            onClick={() => setWhere(val)}
            className={`min-h-[44px] rounded-full border px-4 text-sm ${
              where === val
                ? "border-primary bg-accent font-semibold text-accent-foreground"
                : "border-border bg-card"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={digitalOnly}
          onClick={() => setDigitalOnly((v) => !v)}
          className={`min-h-[44px] rounded-full border px-4 text-sm ${
            digitalOnly
              ? "border-primary bg-accent font-semibold text-accent-foreground"
              : "border-border bg-card"
          }`}
        >
          דיגיטלי 💻
        </button>
      </div>

      {filtered.length === 0 ? (
        <InlineNote>אין רעיונות שמתאימים לסינון הזה — נסי להרחיב אותו.</InlineNote>
      ) : (
        <ul className="space-y-3">
          {filtered.map((idea) => (
            <li key={idea.id}>
              <Link to={`/plus/earn/${idea.id}`} className="block">
                <PlusCard>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        <span aria-hidden className="ms-0 me-1">{idea.emoji}</span>
                        {idea.title}
                        {recommendedIds.has(idea.id) && (
                          <span className="ms-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                            מתאים ליכולות שלך
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{idea.whatYouDo}</p>
                    </div>
                    <span aria-hidden className="text-muted-foreground">‹</span>
                  </div>
                </PlusCard>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PlusCard>
        <p className="font-semibold">🛟 כללי הבטיחות של פלוס</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {EARN_SAFETY_BASE.map((rule) => (
            <li key={rule}>• {rule}</li>
          ))}
        </ul>
      </PlusCard>
    </div>
  );
}
