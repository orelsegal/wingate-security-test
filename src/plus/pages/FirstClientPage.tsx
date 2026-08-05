import { useState } from "react";
import { Link } from "react-router-dom";
import { usePlus, newId } from "../data/store";
import { EARN_IDEAS } from "../data/content";
import type { FirstClientStepId } from "../data/types";
import { PageTitle, PlusCard, Button, InlineNote } from "../components/PlusUI";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STEP_ORDER: { id: FirstClientStepId; title: string }[] = [
  { id: "chooseService", title: "בחרתי שירות" },
  { id: "writeOffer", title: "ניסחתי הצעה" },
  { id: "pickContacts", title: "בחרתי חמישה אנשים מוכרים" },
  { id: "trackAsks", title: "פניתי ועדכנתי מי ענה" },
  { id: "firstJob", title: "השלמתי עבודה ראשונה" },
  { id: "gotPaid", title: "קיבלתי תשלום" },
  { id: "askedReview", title: "ביקשתי המלצה" },
  { id: "reflection", title: "סיכמתי מה למדתי" },
];

export default function FirstClientPage() {
  const { state, update, setFirstClientStep, recordActivity } = usePlus();
  const fc = state.firstClient;
  const idea = EARN_IDEAS.find((i) => i.id === fc.ideaId) ?? null;
  const [newContact, setNewContact] = useState("");
  const [copied, setCopied] = useState(false);

  const offerText = buildOffer(state.name, fc.serviceText || idea?.title || "", fc.priceText, fc.availabilityText);
  const doneCount = STEP_ORDER.filter((s) => fc.steps[s.id]).length;

  return (
    <div className="space-y-4">
      <Link to="/plus/earn" className="text-sm text-muted-foreground">→ חזרה לרעיונות</Link>
      <PageTitle
        title="הלקוחה הראשונה שלי"
        subtitle={`מסלול של שמונה צעדים — הושלמו ${doneCount} מתוך ${STEP_ORDER.length}.`}
      />

      {!idea && (
        <InlineNote>
          עוד לא נבחר רעיון.{" "}
          <Link to="/plus/earn" className="font-semibold underline">בחרי רעיון אחד</Link>{" "}
          וחזרי לכאן — או פשוט כתבי למטה איזה שירות תציעי.
        </InlineNote>
      )}

      <PlusCard>
        <p className="font-semibold">1–2 · השירות וההצעה</p>
        <div className="mt-3 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="fc-service">איזה שירות אני מציעה?</Label>
            <Input
              id="fc-service"
              value={fc.serviceText}
              placeholder={idea ? idea.title : "למשל: עריכת סרטון לאירוע"}
              onChange={(e) =>
                update((p) => ({ ...p, firstClient: { ...p.firstClient, serviceText: e.target.value } }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="fc-price">מחיר מוצע</Label>
              <Input
                id="fc-price"
                value={fc.priceText}
                placeholder="למשל: 30 ₪ לשעה"
                onChange={(e) =>
                  update((p) => ({ ...p, firstClient: { ...p.firstClient, priceText: e.target.value } }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fc-avail">מתי אני פנויה</Label>
              <Input
                id="fc-avail"
                value={fc.availabilityText}
                placeholder="למשל: אחר הצהריים"
                onChange={(e) =>
                  update((p) => ({ ...p, firstClient: { ...p.firstClient, availabilityText: e.target.value } }))
                }
              />
            </div>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs font-semibold text-muted-foreground">ההצעה שלך (טיוטה להעתקה — פלוס לא שולחת הודעות):</p>
            <p className="mt-1 whitespace-pre-line text-sm">{offerText}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(offerText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "הועתק ✓" : "העתקת ההצעה"}
            </Button>
          </div>
        </div>
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">3–4 · חמישה אנשים מוכרים ומעקב פניות</p>
        <p className="mt-1 text-xs text-muted-foreground">
          שם פרטי או כינוי בלבד — בלי טלפונים ובלי פרטים אישיים. פונים רק לאנשים
          שאת והמשפחה מכירים.
        </p>
        <ul className="mt-3 space-y-2">
          {fc.contacts.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-2">
              <span className="text-sm font-medium">{c.label}</span>
              <div className="flex gap-1" role="group" aria-label={`סטטוס פנייה אל ${c.label}`}>
                {(
                  [
                    ["todo", "טרם"],
                    ["asked", "פניתי"],
                    ["yes", "כן!"],
                    ["no", "לא"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={c.status === val}
                    className={`min-h-[36px] rounded-lg border px-2 text-xs ${
                      c.status === val
                        ? "border-primary bg-accent font-semibold text-accent-foreground"
                        : "border-border"
                    }`}
                    onClick={() =>
                      update((p) => ({
                        ...p,
                        firstClient: {
                          ...p.firstClient,
                          contacts: p.firstClient.contacts.map((x) =>
                            x.id === c.id ? { ...x, status: val } : x
                          ),
                        },
                      }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {fc.contacts.length < 5 && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const label = newContact.trim();
              if (!label) return;
              update((p) => ({
                ...p,
                firstClient: {
                  ...p.firstClient,
                  contacts: [
                    ...p.firstClient.contacts,
                    { id: newId(), label, status: "todo" as const },
                  ],
                },
              }));
              setNewContact("");
            }}
          >
            <Input
              value={newContact}
              maxLength={20}
              onChange={(e) => setNewContact(e.target.value)}
              placeholder="למשל: דודה מיכל"
              aria-label="הוספת איש קשר מוכר"
            />
            <Button type="submit" variant="outline">הוספה</Button>
          </form>
        )}
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">8 · מה למדתי</p>
        <Textarea
          className="mt-2"
          value={fc.lessonsLearned}
          placeholder="מה עבד? מה הייתי עושה אחרת בפעם הבאה?"
          onChange={(e) =>
            update((p) => ({ ...p, firstClient: { ...p.firstClient, lessonsLearned: e.target.value } }))
          }
        />
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">התקדמות במסלול</p>
        <ul className="mt-2 space-y-2">
          {STEP_ORDER.map((s) => (
            <li key={s.id}>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[hsl(var(--primary))]"
                  checked={fc.steps[s.id]}
                  onChange={(e) => {
                    setFirstClientStep(s.id, e.target.checked);
                    if (e.target.checked) recordActivity();
                  }}
                />
                <span className="text-sm">{s.title}</span>
              </label>
            </li>
          ))}
        </ul>
        {fc.steps.gotPaid && (
          <InlineNote>
            קיבלת תשלום? כל הכבוד! אל תשכחי לרשום את ההכנסה ב
            <Link to="/plus/money" className="font-semibold underline">'הכסף שלי'</Link>{" "}
            ולחלק אותה.
          </InlineNote>
        )}
      </PlusCard>
    </div>
  );
}

function buildOffer(name: string, service: string, price: string, availability: string): string {
  const lines = [
    `היי! זו ${name || "אני"} 🙂`,
    service ? `אני מציעה ${service}.` : "אני מציעה שירות חדש שאני מתחילה בו.",
    price ? `המחיר: ${price}.` : "",
    availability ? `אני פנויה ${availability}.` : "",
    "אשמח אם תרצו לנסות או להמליץ למישהו שאתם מכירים. תודה!",
  ];
  return lines.filter(Boolean).join("\n");
}
