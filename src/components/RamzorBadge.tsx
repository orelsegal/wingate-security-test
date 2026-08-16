import { metaFor, type Ramzor } from "@/lib/learningTraffic";

/**
 * רמזור חזותי אחיד — הרכיב היחיד שמציג מצב תלמיד/מקצוע בממשק.
 *
 * שם הצבע לעולם אינו מוצג. הזיהוי נשען על שלושה ערוצים בלתי תלויים:
 * צבע, סימן צורני (! – ✓ ?) וניסוח מקצועי — כך שהמצב קריא גם בעיוורון
 * צבעים, גם בהדפסה בשחור־לבן וגם בקורא מסך.
 *
 * dot   — עיגול בלבד (שורות צפופות, מובייל). הטקסט קיים ל-sr-only ול-tooltip.
 * chip  — עיגול + ניסוח, לשבבים ולכרטיסים.
 */

type Status = Ramzor | null | undefined;

const SIZES = {
  sm: { box: 16, font: 10 },
  md: { box: 20, font: 12 },
  lg: { box: 24, font: 14 },
} as const;

interface DotProps {
  status: Status;
  size?: keyof typeof SIZES;
  /** תוספת לתיאור הנגיש, למשל שם המקצוע */
  context?: string;
}

export const RamzorDot = ({ status, size = "sm", context }: DotProps) => {
  const m = metaFor(status);
  const s = SIZES[size];
  const text = context ? `${context}: ${m.aria}` : m.aria;
  return (
    <span
      role="img"
      aria-label={text}
      title={text}
      className="inline-flex items-center justify-center rounded-full font-bold leading-none shrink-0 select-none"
      style={{
        width: s.box, height: s.box, fontSize: s.font,
        background: m.solid, color: "#FFFFFF",
      }}
    >
      <span aria-hidden>{m.symbol}</span>
    </span>
  );
};

interface ChipProps extends DotProps {
  /** טקסט מקדים, למשל מספר או שם מקצוע */
  prefix?: string;
  /** להסתיר את הניסוח ולהשאיר רק את ה-prefix (המצב עדיין נגיש דרך העיגול) */
  labelHidden?: boolean;
  className?: string;
}

export const RamzorChip = ({ status, size = "sm", context, prefix, labelHidden, className = "" }: ChipProps) => {
  const m = metaFor(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${className}`}
      style={{ background: m.soft, borderColor: m.edge, color: m.ink }}
    >
      <RamzorDot status={status} size={size} context={context} />
      {prefix ? <span>{prefix}</span> : null}
      {labelHidden ? <span className="sr-only">{m.aria}</span> : <span>{m.label}</span>}
    </span>
  );
};

export default RamzorDot;
