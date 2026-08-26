import { useMemo, useState } from "react";
import { usePlus, todayIso } from "../data/store";
import { project, compareStartAges, feeCost } from "../lib/simulator";
import { PageTitle, PlusCard, Button, InlineNote } from "../components/PlusUI";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const nis = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

function SimpleChart({
  series,
  ariaLabel,
}: {
  series: { label: string; color: string; points: { month: number; value: number }[] }[];
  ariaLabel: string;
}) {
  const maxVal = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.value)));
  const maxMonth = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.month)));
  const toXY = (p: { month: number; value: number }) =>
    `${8 + (p.month / maxMonth) * 284},${64 - (p.value / maxVal) * 56}`;
  return (
    <svg viewBox="0 0 300 72" className="h-24 w-full" role="img" aria-label={ariaLabel}>
      <line x1="8" y1="64" x2="292" y2="64" stroke="hsl(var(--border))" strokeWidth="1" />
      {series.map((s) => (
        <polyline
          key={s.label}
          points={s.points.map(toXY).join(" ")}
          fill="none"
          stroke={s.color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export default function LabPage() {
  const { update, state } = usePlus();
  const [monthly, setMonthly] = useState(60);
  const [initial, setInitial] = useState(350);
  const [rate, setRate] = useState(6);
  const [years, setYears] = useState(10);
  const [fee, setFee] = useState(0.5);
  const [scenario, setScenario] = useState<"none" | "drop" | "rise" | "stop">("none");
  const [continued, setContinued] = useState(false);

  const baseInput = useMemo(
    () => ({
      initialShekels: initial,
      monthlyDepositShekels: monthly,
      annualRatePct: rate,
      years,
    }),
    [initial, monthly, rate, years]
  );

  const basePts = useMemo(() => project(baseInput), [baseInput]);
  const scenarioPts = useMemo(() => {
    if (scenario === "drop")
      return project({ ...baseInput, shock: { month: Math.round((years * 12) / 3), changePct: -30 } });
    if (scenario === "rise")
      return project({ ...baseInput, shock: { month: Math.round((years * 12) / 3), changePct: +20 } });
    if (scenario === "stop")
      return project({ ...baseInput, stopDepositsAtMonth: Math.round((years * 12) / 2) });
    return null;
  }, [scenario, baseInput, years]);

  const baseFinal = basePts[basePts.length - 1];
  const ages = useMemo(() => compareStartAges([14, 18, 25], 30, monthly, rate), [monthly, rate]);
  const fees = useMemo(
    () => feeCost(baseInput, fee),
    [baseInput, fee]
  );

  const markStayedInPlan = () => {
    setContinued(true);
    update((p) => ({
      ...p,
      manualBadges: { ...p.manualBadges, "stayed-in-plan": todayIso() },
    }));
  };

  return (
    <div className="space-y-4">
      <PageTitle
        title="מעבדת השקעות"
        subtitle="סימולטור לימודי בלבד — בלי נתוני שוק אמיתיים ובלי קנייה של שום דבר."
      />

      <InlineNote>
        זו המחשה מתמטית, לא תחזית. השקעות יכולות גם לרדת ולהפסיד כסף. את הנחת
        התשואה קובעת את — והיא דוגמה בלבד.
      </InlineNote>

      <PlusCard>
        <p className="font-semibold">ההנחות שלי</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <NumField id="lab-initial" label="סכום התחלתי (₪)" value={initial} min={0} max={100000} onChange={setInitial} />
          <NumField id="lab-monthly" label="הפקדה חודשית (₪)" value={monthly} min={0} max={10000} onChange={setMonthly} />
          <NumField id="lab-rate" label="הנחת תשואה שנתית (%)" value={rate} min={-20} max={20} step={0.5} onChange={setRate} />
          <NumField id="lab-years" label="שנים" value={years} min={1} max={40} onChange={setYears} />
        </div>
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">🧮 ריבית דריבית — מה ההתמדה בונה</p>
        <SimpleChart
          ariaLabel={`תחזית של ${years} שנים לפי ההנחות שבחרת`}
          series={[
            { label: "תחזית", color: "hsl(var(--primary))", points: basePts },
          ]}
        />
        <p className="mt-1 text-sm">
          אחרי {years} שנים: בערך <bdi>{nis.format(baseFinal.value)}</bdi>, מתוכם
          הפקדת בעצמך <bdi>{nis.format(baseFinal.deposited)}</bdi>. השאר — צמיחה
          מצטברת לפי ההנחה שבחרת.
        </p>
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">⏳ למה גיל 14 הוא יתרון</p>
        <p className="mt-1 text-xs text-muted-foreground">
          אותה הפקדה חודשית ({nis.format(monthly)}) עד גיל 30, אותה הנחת תשואה —
          רק גיל ההתחלה משתנה:
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {ages.map((row) => (
            <li key={row.startAge} className="flex justify-between rounded-lg bg-muted px-3 py-1.5">
              <span>התחלה בגיל {row.startAge}</span>
              <bdi className="font-bold">{nis.format(row.final)}</bdi>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          ההבדל הוא לא קסם — זה זמן שבו הרווח מרוויח בעצמו.
        </p>
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">🧾 כמה עולות עמלות באמת</p>
        <div className="mt-2 flex items-center gap-3">
          <Label htmlFor="lab-fee" className="text-sm">דמי ניהול שנתיים (%)</Label>
          <Input
            id="lab-fee"
            type="number"
            dir="ltr"
            className="w-24 text-center"
            min={0}
            max={5}
            step={0.1}
            value={fee}
            onChange={(e) => setFee(Math.max(0, Math.min(5, Number(e.target.value) || 0)))}
          />
        </div>
        <p className="mt-2 text-sm">
          בלי עמלה: <bdi>{nis.format(fees.withoutFee)}</bdi> · עם עמלה של {fee}%:{" "}
          <bdi>{nis.format(fees.withFee)}</bdi>
        </p>
        <p className="mt-1 text-sm font-medium text-secondary-foreground">
          העמלה "אכלה" בערך <bdi>{nis.format(fees.cost)}</bdi> לאורך {years} שנים.
        </p>
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">🌊 תרחישים — ומה עושים איתם</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="בחירת תרחיש">
          {(
            [
              ["none", "בלי תרחיש"],
              ["drop", "ירידה של 30%"],
              ["rise", "עלייה של 20%"],
              ["stop", "אם אפסיק להפקיד"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              aria-pressed={scenario === val}
              onClick={() => { setScenario(val); setContinued(false); }}
              className={`min-h-[44px] rounded-full border px-4 text-sm ${
                scenario === val
                  ? "border-primary bg-accent font-semibold text-accent-foreground"
                  : "border-border bg-card"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {scenarioPts && (
          <>
            <SimpleChart
              ariaLabel="השוואה בין התוכנית המקורית לתרחיש שנבחר"
              series={[
                { label: "מקור", color: "hsl(var(--border))", points: basePts },
                { label: "תרחיש", color: "hsl(var(--primary))", points: scenarioPts },
              ]}
            />
            <p className="mt-1 text-sm">
              בתרחיש הזה הסוף הוא בערך{" "}
              <bdi className="font-bold">{nis.format(scenarioPts[scenarioPts.length - 1].value)}</bdi>{" "}
              (לעומת <bdi>{nis.format(baseFinal.value)}</bdi> בלי התרחיש).
            </p>
            {scenario === "drop" && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-muted-foreground">
                  ירידות הן חלק מהדרך. מי שממשיכה להפקיד לפי התוכנית קונה גם
                  כשהמחירים נמוכים — ומגיעה רחוק יותר ממי שבורחת.
                </p>
                {!continued && !state.manualBadges["stayed-in-plan"] ? (
                  <Button variant="outline" onClick={markStayedInPlan}>
                    אני נשארת בתוכנית 🧭
                  </Button>
                ) : (
                  <p className="text-sm font-medium text-success">
                    נשארת בתוכנית גם בתרחיש ירידה — זה בדיוק החוסן שמנצח לאורך זמן.
                  </p>
                )}
              </div>
            )}
            {scenario === "stop" && (
              <p className="mt-2 text-sm text-muted-foreground">
                כשמפסיקים להפקיד, הכסף הקיים ממשיך לעבוד — אבל ההר מפסיק לגדול.
                ההתמדה היא המנוע.
              </p>
            )}
          </>
        )}
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">🧺 נכס יחיד מול תיק מפוזר</p>
        <p className="mt-1 text-sm text-muted-foreground">
          נכס יחיד יכול לזנק — ויכול גם לקרוס ולא לחזור. תיק מפוזר על הרבה
          חברות לא תלוי באף סיפור בודד. בתרגיל למעלה: הריצי "ירידה של 30%" ודמייני
          שזה קורה לחברה אחת שכל הכסף שלך בה — לעומת נגיעה חלקית בתיק רחב.
          הפיזור לא מבטל סיכון, הוא מרכך אותו.
        </p>
      </PlusCard>

      <p className="text-center text-xs text-muted-foreground">
        השקעה אמיתית — רק עם הורה או אפוטרופוס ודרך גוף פיננסי מפוקח.
      </p>
    </div>
  );
}

function NumField({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input
        id={id}
        type="number"
        dir="ltr"
        className="text-center"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
      />
    </div>
  );
}
