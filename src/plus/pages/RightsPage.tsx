import { RIGHTS_FACTS, RIGHTS_DISCLAIMER, RIGHTS_STALE_DAYS } from "../data/content";
import { formatDateIL } from "../lib/money";
import { PageTitle, PlusCard, InlineNote } from "../components/PlusUI";

function daysSince(isoDate: string): number {
  return Math.floor(
    (Date.now() - new Date(isoDate + "T00:00:00").getTime()) / 86400000
  );
}

export default function RightsPage() {
  return (
    <div className="space-y-4">
      <PageTitle
        title="מרכז זכויות ובטיחות"
        subtitle="מה מגיע לך לפי החוק בישראל — בגובה העיניים."
      />

      <InlineNote>{RIGHTS_DISCLAIMER}</InlineNote>

      <ul className="space-y-3">
        {RIGHTS_FACTS.map((fact) => {
          const stale = daysSince(fact.lastUpdated) > RIGHTS_STALE_DAYS;
          return (
            <li key={fact.id}>
              <PlusCard className={stale ? "border-warning" : ""}>
                <p className="text-sm">{fact.text}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    עודכן לאחרונה: {formatDateIL(fact.lastUpdated)}
                    {stale && (
                      <span className="ms-2 rounded-full bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">
                        ייתכן שהשתנה — לבדוק לפני פעולה
                      </span>
                    )}
                  </p>
                  <a
                    href={fact.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="min-h-[44px] content-center text-sm font-medium text-primary underline"
                  >
                    לבדיקה במקור הרשמי ({fact.sourceName}) ↗
                  </a>
                </div>
              </PlusCard>
            </li>
          );
        })}
      </ul>

      <PlusCard>
        <p className="font-semibold">🛟 ותזכורת בטיחות</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>• עובדים דרך אנשים מוכרים, בידיעת הורה.</li>
          <li>• לא נפגשים לבד עם זרים ולא מוסרים פרטים אישיים.</li>
          <li>• מי שמבטיח רווח מהיר ובטוח — מסוכן. סוגרים את השיחה.</li>
          <li>• השקעה אמיתית — רק עם הורה ודרך גוף פיננסי מפוקח.</li>
        </ul>
      </PlusCard>
    </div>
  );
}
