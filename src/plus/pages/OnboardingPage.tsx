import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlus } from "../data/store";
import { SKILL_OPTIONS } from "../data/content";
import { AmountField, PlusCard, Button, InlineNote } from "../components/PlusUI";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Agorot } from "../lib/money";

const TOTAL_STEPS = 6;

export default function OnboardingPage() {
  const { finishOnboarding, setDemoMode } = usePlus();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [dream, setDream] = useState("");
  const [earnedBefore, setEarnedBefore] = useState<"yes" | "no" | "">("");
  const [amountRaw, setAmountRaw] = useState("");
  const [amountAg, setAmountAg] = useState<Agorot | null>(null);
  const [weeklyHours, setWeeklyHours] = useState<number | null>(null);
  const [skills, setSkills] = useState<string[]>([]);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = () => {
    finishOnboarding(name.trim() || "חברה", {
      dream: dream.trim(),
      earnedBefore,
      startingAmount: amountAg,
      weeklyHours,
      skills,
    });
    navigate("/plus", { replace: true });
  };

  return (
    <div className="mx-auto max-w-md space-y-5 py-6">
      <header className="text-center">
        <p className="text-3xl font-bold text-primary">פלוס</p>
        <p className="mt-1 text-sm text-muted-foreground">
          הכסף שלך. הדרך שלך. העתיד שלך.
        </p>
      </header>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={0}
        aria-valuemax={TOTAL_STEPS}
        aria-label="התקדמות בשאלון הפתיחה"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {step === 0 && (
        <PlusCard>
          <div className="space-y-4">
            <h1 className="text-xl font-bold">נעים להכיר 👋</h1>
            <p className="text-sm text-muted-foreground">
              פלוס תעזור לך ללמוד להרוויח, לנהל ולחסוך — בקצב שלך. חמש שאלות
              קצרות ומתחילות. בלי פרטים מזהים: רק שם פרטי או כינוי.
            </p>
            <div className="space-y-1">
              <Label htmlFor="ob-name">איך לקרוא לך?</Label>
              <Input
                id="ob-name"
                value={name}
                maxLength={20}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם פרטי או כינוי"
              />
            </div>
            <Button className="w-full" onClick={next} disabled={!name.trim()}>
              מתחילות
            </Button>
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground underline"
              onClick={() => {
                setDemoMode(true);
                navigate("/plus", { replace: true });
              }}
            >
              רק להציץ? כניסה במצב הדגמה
            </button>
          </div>
        </PlusCard>
      )}

      {step === 1 && (
        <StepCard
          title="מה היית רוצה שהכסף יאפשר לך?"
          onNext={next}
          onBack={back}
          nextDisabled={!dream.trim()}
        >
          <Input
            value={dream}
            onChange={(e) => setDream(e.target.value)}
            placeholder="למשל: מחשב, טיול, עצמאות…"
            aria-label="מה היית רוצה שהכסף יאפשר לך"
          />
        </StepCard>
      )}

      {step === 2 && (
        <StepCard
          title="כבר הרווחת כסף בעצמך?"
          onNext={next}
          onBack={back}
          nextDisabled={earnedBefore === ""}
        >
          <div className="flex gap-2">
            {(
              [
                ["yes", "כן, כבר הרווחתי"],
                ["no", "עוד לא"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                aria-pressed={earnedBefore === val}
                onClick={() => setEarnedBefore(val)}
                className={`min-h-[44px] flex-1 rounded-xl border px-3 py-2 text-sm ${
                  earnedBefore === val
                    ? "border-primary bg-accent font-semibold text-accent-foreground"
                    : "border-border bg-card"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </StepCard>
      )}

      {step === 3 && (
        <StepCard title="יש לך סכום התחלתי?" onNext={next} onBack={back}>
          <AmountField
            id="ob-amount"
            label="כמה כסף יש לך היום? (לא חובה)"
            value={amountRaw}
            onChange={setAmountRaw}
            onValid={setAmountAg}
          />
        </StepCard>
      )}

      {step === 4 && (
        <StepCard
          title="כמה זמן בשבוע תרצי להשקיע?"
          onNext={next}
          onBack={back}
          nextDisabled={weeklyHours === null}
        >
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 4, 6].map((h) => (
              <button
                key={h}
                type="button"
                aria-pressed={weeklyHours === h}
                onClick={() => setWeeklyHours(h)}
                className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm ${
                  weeklyHours === h
                    ? "border-primary bg-accent font-semibold text-accent-foreground"
                    : "border-border bg-card"
                }`}
              >
                עד {h} שעות
              </button>
            ))}
          </div>
        </StepCard>
      )}

      {step === 5 && (
        <StepCard
          title="איזו יכולת כבר יש לך או מסקרנת אותך?"
          onNext={next}
          onBack={back}
          nextDisabled={skills.length === 0}
        >
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((s) => {
              const on = skills.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setSkills((prev) =>
                      on ? prev.filter((x) => x !== s) : [...prev, s]
                    )
                  }
                  className={`min-h-[44px] rounded-full border px-4 py-2 text-sm ${
                    on
                      ? "border-primary bg-accent font-semibold text-accent-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </StepCard>
      )}

      {step === 6 && (
        <PlusCard>
          <div className="space-y-4">
            <h2 className="text-xl font-bold">תוכנית ההתחלה שלך</h2>
            <p className="text-sm text-muted-foreground">
              שלוש משימות. בלי לחץ — צעד אחר צעד.
            </p>
            <ol className="space-y-2">
              {[
                "לבחור יעד ראשון במסך המטרות",
                "לבחור רעיון הכנסה אחד באזור 'להרוויח'",
                amountAg && amountAg > 0
                  ? "הכסף שכבר יש לך יירשם אוטומטית — כדאי להציץ ב'הכסף שלי'"
                  : "לרשום את הכסף שכבר יש לך ב'הכסף שלי'",
              ].map((t, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-xl bg-muted px-3 py-2 text-sm"
                >
                  <span className="font-bold text-primary">{i + 1}.</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            <InlineNote>
              פלוס לא מבטיחה התעשרות — היא מלמדת אותך לבנות ביטחון כלכלי אמיתי,
              צעד אחרי צעד.
            </InlineNote>
            <Button className="w-full" onClick={finish}>
              יאללה, מתחילות
            </Button>
          </div>
        </PlusCard>
      )}
    </div>
  );
}

function StepCard({
  title,
  children,
  onNext,
  onBack,
  nextDisabled = false,
}: {
  title: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <PlusCard>
      <div className="space-y-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {children}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            חזרה
          </Button>
          <Button className="flex-[2]" onClick={onNext} disabled={nextDisabled}>
            המשך
          </Button>
        </div>
      </div>
    </PlusCard>
  );
}
