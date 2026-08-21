interface Props {
  value: number;
  max: number;
  label: string;
  hint?: string;
}

export function ProgressBar({ value, max, label, hint }: Props) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="progress">
      <div className="progress__meta">
        <span>{label}</span>
        <span>{hint ?? `${percent}%`}</span>
      </div>
      <div
        className="progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      >
        <div className="progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
