import { useId } from "react";
import { metaFor, type Ramzor } from "@/lib/learningTraffic";
import { RamzorDot } from "@/components/RamzorBadge";

/**
 * טבעת התפלגות — תרשים שהוא כלי עבודה, לא קישוט.
 *
 * כל פלח הוא כפתור: לחיצה מסננת את הרשימה שמתחת. הזיהוי אינו נשען על
 * צבע בלבד — לכל פלח יש תבנית מילוי משלו (מלא / אלכסונים / נקודות /
 * ריק) וגם שורת מקרא עם סימן, מילים, מספר ואחוז.
 */

export interface DonutSlice {
  key: string;
  /** מצב הרמזור שממנו נגזרים הצבע, הסימן והניסוח */
  status: Ramzor | null;
  value: number;
  /** ניסוח חלופי, כשהפלח אינו מצב תלמיד (למשל "הושלמו") */
  label?: string;
}

interface Props {
  slices: DonutSlice[];
  /** המספר הגדול במרכז */
  centerValue: string;
  centerLabel: string;
  /** הפלח הפעיל כרגע (סינון) */
  selected?: string | null;
  onSelect?: (key: string) => void;
  size?: number;
}

const PATTERNS = ["solid", "diag", "dots", "hollow"] as const;

const StatusDonut = ({ slices, centerValue, centerLabel, selected, onSelect, size = 168 }: Props) => {
  const uid = useId().replace(/:/g, "");
  const total = slices.reduce((n, s) => n + s.value, 0);
  const r = size / 2 - 16;
  const C = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4" dir="rtl">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`${centerLabel}: ${centerValue}. הפירוט המלא מופיע ברשימה שלצד התרשים.`}
        className="shrink-0">
        <defs>
          {slices.map((s, i) => {
            const m = metaFor(s.status);
            const p = PATTERNS[i % PATTERNS.length];
            if (p === "solid") return null;
            return (
              <pattern key={s.key} id={`${uid}-${i}`} patternUnits="userSpaceOnUse" width="6" height="6"
                patternTransform={p === "diag" ? "rotate(45)" : undefined}>
                <rect width="6" height="6" fill={p === "hollow" ? "transparent" : m.solid} />
                {p === "diag" && <rect width="3" height="6" fill="#FFFFFF" opacity="0.55" />}
                {p === "dots" && <circle cx="3" cy="3" r="1.6" fill="#FFFFFF" opacity="0.6" />}
                {p === "hollow" && <rect width="6" height="6" fill={m.solid} opacity="0.35" />}
              </pattern>
            );
          })}
        </defs>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {slices.map((s, i) => {
            if (total === 0 || s.value === 0) return null;
            const m = metaFor(s.status);
            const len = (s.value / total) * C;
            const dash = `${len} ${C - len}`;
            const off = -offset;
            offset += len;
            const dim = selected && selected !== s.key;
            const p = PATTERNS[i % PATTERNS.length];
            return (
              <circle
                key={s.key}
                cx={size / 2} cy={size / 2} r={r}
                fill="none"
                stroke={p === "solid" ? m.solid : `url(#${uid}-${i})`}
                strokeWidth={selected === s.key ? 26 : 20}
                strokeDasharray={dash}
                strokeDashoffset={off}
                opacity={dim ? 0.28 : 1}
                style={{ transition: "stroke-width 150ms, opacity 150ms" }}
              />
            );
          })}
        </g>
        <text x="50%" y="47%" textAnchor="middle" className="fill-foreground"
          style={{ fontSize: size * 0.19, fontWeight: 700 }}>{centerValue}</text>
        <text x="50%" y="61%" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>{centerLabel}</text>
      </svg>

      <ul className="w-full space-y-1">
        {slices.map(s => {
          const m = metaFor(s.status);
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          const on = selected === s.key;
          const text = s.label ?? m.label;
          const row = (
            <>
              <RamzorDot status={s.status} context={text} />
              <span className="flex-1 text-start">{text}</span>
              <span className="tabular-nums font-semibold text-foreground">{s.value}</span>
              <span className="tabular-nums text-muted-foreground w-10 text-start">{pct}%</span>
            </>
          );
          return (
            <li key={s.key}>
              {onSelect ? (
                <button
                  onClick={() => onSelect(s.key)}
                  aria-pressed={on}
                  className={`w-full flex items-center gap-2 text-[12px] rounded-lg px-2 py-1.5 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    on ? "border-primary/40 bg-primary/5 font-semibold" : "border-transparent hover:bg-muted/50"
                  }`}
                  title={`סינון לפי ${text}`}
                >
                  {row}
                </button>
              ) : (
                <div className="w-full flex items-center gap-2 text-[12px] px-2 py-1.5">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default StatusDonut;
