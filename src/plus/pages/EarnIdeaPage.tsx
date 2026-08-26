import { Link, useParams } from "react-router-dom";
import { usePlus } from "../data/store";
import { EARN_IDEAS, EARN_SAFETY_BASE } from "../data/content";
import { PlusCard, Button, EmptyState, InlineNote } from "../components/PlusUI";

export default function EarnIdeaPage() {
  const { ideaId } = useParams();
  const { update } = usePlus();
  const idea = EARN_IDEAS.find((i) => i.id === ideaId);

  if (!idea) {
    return (
      <EmptyState
        emoji="🔎"
        title="הרעיון לא נמצא"
        text="אולי הקישור ישן — כל הרעיונות מחכים באזור 'להרוויח'."
        action={
          <Link to="/plus/earn" className="font-semibold text-primary underline">
            חזרה לרעיונות
          </Link>
        }
      />
    );
  }

  const rows: [string, string][] = [
    ["מה עושים בפועל", idea.whatYouDo],
    ["מה צריך לדעת", idea.whatToKnow],
    ["עלות התחלה", idea.startCost],
    ["זמן משוער", idea.timeEstimate],
    ["טווח מחיר אפשרי", idea.priceExample],
  ];

  return (
    <div className="space-y-4">
      <Link to="/plus/earn" className="text-sm text-muted-foreground">
        → חזרה לרעיונות
      </Link>
      <h1 className="text-2xl font-bold">
        <span aria-hidden className="me-2">{idea.emoji}</span>
        {idea.title}
      </h1>

      <PlusCard>
        <dl className="space-y-3">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
              <dd className="text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">🛟 כללי בטיחות</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {[...EARN_SAFETY_BASE, ...idea.safetyRules].map((rule) => (
            <li key={rule}>• {rule}</li>
          ))}
        </ul>
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">✅ המשימה הראשונה שלי</p>
        <p className="mt-1 text-sm text-muted-foreground">{idea.firstTask}</p>
      </PlusCard>

      <InlineNote>
        טווחי המחירים הם דוגמה בלבד — המחיר האמיתי נקבע בשיחה עם הלקוח ובידיעת
        ההורים.
      </InlineNote>

      <Link to="/plus/earn/first-client" className="block">
        <Button
          className="w-full"
          onClick={() =>
            update((prev) => ({
              ...prev,
              firstClient: {
                ...prev.firstClient,
                ideaId: idea.id,
                steps: { ...prev.firstClient.steps, chooseService: true },
              },
            }))
          }
        >
          לבחור את הרעיון הזה ולהתחיל את המסלול
        </Button>
      </Link>
    </div>
  );
}
