import { useEffect } from "react";
import { X, ChevronLeft } from "lucide-react";
import { RamzorDot } from "@/components/RamzorBadge";
import { metaFor, type Ramzor } from "@/lib/learningTraffic";
import { numericScore, type AssessmentComponent, type AssessmentScore } from "@/lib/assessments";

/**
 * פאנל צד לתלמיד — נפתח מעל הטבלה ואינו מאבד את הפילטרים או את מקום הגלילה.
 * כל שדה כאן מגיע מהנתונים; מה שאין — נאמר במפורש ולא מומצא.
 */

export interface DrawerData {
  id: string;
  name: string;
  className: string;
  sport: string;
  ramzor: Ramzor | null;
  notes: string | null;
  gradesRaw: string | null;
  haliffa: string[];
  haliffaNotes: string | null;
  bagrutPct: number | null;
  bagrutFilled: number;
  bagrutTotal: number;
  components: AssessmentComponent[];
  scores: Map<string, AssessmentScore | undefined>;
  lastUpdate: string | null;
}

/** הפעולה הבאה נגזרת מהנתונים בלבד — לא המלצה מומצאת */
export const nextAction = (d: DrawerData): string => {
  const active = d.components.filter(c => c.is_active);
  const ungraded = active.filter(c => numericScore(d.scores.get(c.id)?.score) == null).length;
  if (ungraded > 0) return `להזין ציון ל־${ungraded} רכיבי הערכה שטרם הוזנו`;
  if (d.ramzor === "אדום" && d.haliffa.length === 0) return "לבחור מענה לתלמיד שמצבו דורש טיפול";
  if (d.bagrutTotal > 0 && d.bagrutTotal - d.bagrutFilled > 0) return `להשלים ${d.bagrutTotal - d.bagrutFilled} רכיבי בגרות חסרים`;
  return "אין פעולה פתוחה לפי הנתונים הקיימים";
};

const Row = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
    <dt className="text-[11px] text-muted-foreground shrink-0">{label}</dt>
    <dd className={`text-[11.5px] text-start ${value?.trim() ? "text-foreground font-medium" : "text-muted-foreground/50"}`}>
      {value?.trim() || "לא הוזן"}
    </dd>
  </div>
);

const StudentDrawer = ({ data, onClose, onProfile }: {
  data: DrawerData; onClose: () => void; onProfile: () => void;
}) => {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const active = data.components.filter(c => c.is_active);
  const unsubmitted = active.filter(c => data.scores.get(c.id)?.submitted === false);

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl" role="dialog" aria-modal="true" aria-label={`פירוט התלמיד ${data.name}`}>
      <button className="flex-1 bg-foreground/25" onClick={onClose} aria-label="סגירת הפאנל" />
      <aside className="w-full max-w-md h-full overflow-y-auto bg-card border-s border-border shadow-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">{data.name}</h2>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">{data.className || "—"} · {data.sport || "—"}</p>
          </div>
          <button onClick={onClose} aria-label="סגירה" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <RamzorDot status={data.ramzor} size="md" context={data.name} />
          <span className="text-[12.5px] font-semibold" style={{ color: metaFor(data.ramzor).ink }}>
            {metaFor(data.ramzor).label}
          </span>
        </div>

        <section className="mb-4">
          <h3 className="text-[12px] font-semibold text-foreground mb-1.5">מפת הדרך והתקדמות</h3>
          {data.bagrutTotal > 0 ? (
            <>
              <div className="flex items-center gap-2 text-[11.5px]">
                <span className="flex-1 h-2 rounded-full bg-muted/70 overflow-hidden">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${data.bagrutPct ?? 0}%` }} />
                </span>
                <span className="tabular-nums font-semibold text-foreground">{data.bagrutPct}%</span>
              </div>
              <p className="text-[10.5px] text-muted-foreground mt-1">
                {data.bagrutFilled} מתוך {data.bagrutTotal} רכיבי בגרות הוזנו · {data.bagrutTotal - data.bagrutFilled} חסרים
              </p>
            </>
          ) : <p className="text-[11.5px] text-muted-foreground/70">אין גיליון בגרות לתלמיד זה.</p>}
        </section>

        <section className="mb-4">
          <h3 className="text-[12px] font-semibold text-foreground mb-1.5">רכיבי הערכה וציונים</h3>
          {active.length === 0 ? (
            <p className="text-[11.5px] text-muted-foreground/70">אין רכיבי הערכה במקצוע זה.</p>
          ) : (
            <ul className="space-y-1">
              {active.map(c => {
                const sc = data.scores.get(c.id);
                return (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-[11.5px] py-1 border-b border-border/40 last:border-0">
                    <span className="text-muted-foreground truncate">
                      {c.name} <span className="text-[10px]">({c.kind} · {c.weight}%)</span>
                    </span>
                    <span className={sc?.score?.trim() ? "text-foreground font-medium tabular-nums" : "text-muted-foreground/50"}>
                      {sc?.score?.trim() || "לא הוזן"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mb-4">
          <h3 className="text-[12px] font-semibold text-foreground mb-1.5">אי־הגשות</h3>
          {unsubmitted.length === 0
            ? <p className="text-[11.5px] text-muted-foreground/70">לא סומנו אי־הגשות.</p>
            : <ul className="text-[11.5px] text-foreground list-disc pe-4">{unsubmitted.map(c => <li key={c.id}>{c.name}</li>)}</ul>}
        </section>

        <section className="mb-4">
          <h3 className="text-[12px] font-semibold text-foreground mb-1.5">הסיבה למצב וההערות</h3>
          <dl>
            <Row label="ציונים כלשונם" value={data.gradesRaw} />
            <Row label="הערת מורה" value={data.notes} />
            <Row label="מענה שנבחר" value={data.haliffa?.length ? data.haliffa.join(" · ") : null} />
            <Row label="הערת מענה" value={data.haliffaNotes} />
          </dl>
        </section>

        <section className="mb-4">
          <h3 className="text-[12px] font-semibold text-foreground mb-1.5">הפעולה הבאה</h3>
          <p className="text-[12px] text-foreground">{nextAction(data)}</p>
        </section>

        <section className="mb-4">
          <h3 className="text-[12px] font-semibold text-foreground mb-1.5">היסטוריית שינוי</h3>
          <p className="text-[11.5px] text-muted-foreground">
            {data.lastUpdate ? `עדכון אחרון של ציון: ${new Date(data.lastUpdate).toLocaleString("he-IL")}` : "טרם נשמר ציון לתלמיד זה."}
          </p>
          <p className="text-[10.5px] text-muted-foreground/70 mt-1">
            יומן שינויים מלא (מי שינה ומה היה קודם) עדיין אינו נשמר, ולכן אינו מוצג.
          </p>
        </section>

        <button onClick={onProfile} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
          לכרטיס התלמיד המלא
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </aside>
    </div>
  );
};

export default StudentDrawer;
