/**
 * עמודות אחוז השלמה — שורה לכל מקצוע, לחיצה מסננת את הרשימה.
 *
 * העמודה לעולם אינה המידע היחיד: לצדה מופיעים האחוז והמכנה
 * ("142 מתוך 260 רכיבים"), כך שהמסך קריא גם בלי לראות את הגרפיקה.
 */

export interface BarRow {
  key: string;
  label: string;
  /** מונה ומכנה — תמיד מוצגים */
  filled: number;
  total: number;
  pct: number;
}

interface Props {
  rows: BarRow[];
  selected?: string | null;
  onSelect?: (key: string) => void;
  /** צבע לפי רמת ההשלמה — רמז בלבד, המספר הוא המידע */
  tone?: (pct: number) => string;
}

const defaultTone = (pct: number) =>
  pct >= 80 ? "hsl(142, 72%, 30%)" : pct >= 40 ? "hsl(35, 92%, 33%)" : "hsl(0, 72%, 42%)";

const CompletionBars = ({ rows, selected, onSelect, tone = defaultTone }: Props) => (
  <ul className="space-y-1.5" dir="rtl">
    {rows.map(r => {
      const on = selected === r.key;
      const body = (
        <>
          <span className="w-28 sm:w-36 shrink-0 text-start truncate" title={r.label}>{r.label}</span>
          <span className="flex-1 h-2.5 rounded-full bg-muted/70 overflow-hidden min-w-[60px]">
            <span className="block h-full rounded-full transition-all"
              style={{ width: `${r.pct}%`, background: tone(r.pct) }} />
          </span>
          <span className="tabular-nums font-semibold text-foreground w-10 text-start">{r.pct}%</span>
          <span className="tabular-nums text-[10.5px] text-muted-foreground w-24 text-start hidden sm:inline">
            {r.filled}/{r.total} רכיבים
          </span>
        </>
      );
      return (
        <li key={r.key}>
          {onSelect ? (
            <button onClick={() => onSelect(r.key)} aria-pressed={on}
              aria-label={`${r.label}: ${r.pct} אחוז השלמה, ${r.filled} מתוך ${r.total} רכיבים. סינון לפי מקצוע זה.`}
              className={`w-full flex items-center gap-2.5 text-[12px] rounded-lg px-2 py-1.5 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                on ? "border-primary/40 bg-primary/5 font-semibold" : "border-transparent hover:bg-muted/40"
              }`}>
              {body}
            </button>
          ) : (
            <div className="w-full flex items-center gap-2.5 text-[12px] px-2 py-1.5">{body}</div>
          )}
        </li>
      );
    })}
  </ul>
);

export default CompletionBars;
