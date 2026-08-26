import { useState } from "react";
import { usePlus, todayIso } from "../data/store";
import type { Goal } from "../data/types";
import {
  formatAgorot,
  formatDateIL,
  goalMath,
  weeksUntil,
  type Agorot,
} from "../lib/money";
import {
  PageTitle,
  PlusCard,
  ProgressBar,
  AmountField,
  Button,
  EmptyState,
  InlineNote,
  ConfirmDialog,
} from "../components/PlusUI";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function GoalsPage() {
  const { state, addGoal, depositToGoal, deleteGoal } = usePlus();
  const [showForm, setShowForm] = useState(false);
  const active = state.goals.filter((g) => !g.achievedAt);
  const achieved = state.goals.filter((g) => g.achievedAt);

  return (
    <div className="space-y-4">
      <PageTitle
        title="מטרות וחיסכון"
        subtitle="עד שלוש מטרות פעילות — כדי שכל אחת תקבל תשומת לב אמיתית."
      />

      {state.goals.length === 0 && (
        <EmptyState
          emoji="🎯"
          title="עוד אין מטרות"
          text="מטרה עם סכום ותאריך הופכת חיסכון ממשאלה לתוכנית. כרית ביטחון של 500–1,000 ₪ היא התחלה מצוינת."
          action={
            <Button onClick={() => setShowForm(true)}>+ מטרה ראשונה</Button>
          }
        />
      )}

      {active.map((g) => (
        <GoalCard key={g.id} goal={g} onDeposit={depositToGoal} onDelete={deleteGoal} />
      ))}

      {achieved.length > 0 && (
        <PlusCard>
          <p className="font-semibold">🏁 מטרות שהושגו</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {achieved.map((g) => (
              <li key={g.id}>
                ✓ {g.name} — <bdi>{formatAgorot(g.targetAmount)}</bdi>
                {g.achievedAt ? ` (${formatDateIL(g.achievedAt)})` : ""}
              </li>
            ))}
          </ul>
        </PlusCard>
      )}

      {state.goals.length > 0 && !showForm && active.length < 3 && (
        <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
          + מטרה חדשה ({active.length}/3)
        </Button>
      )}
      {active.length >= 3 && (
        <InlineNote>
          יש כבר שלוש מטרות פעילות. כשאחת תושג — יתפנה מקום לחדשה. פחות זה
          יותר.
        </InlineNote>
      )}

      {showForm && <NewGoalForm onClose={() => setShowForm(false)} onAdd={addGoal} />}
    </div>
  );
}

function GoalCard({
  goal,
  onDeposit,
  onDelete,
}: {
  goal: Goal;
  onDeposit: (goalId: string, amount: Agorot, date: string) => void;
  onDelete: (goalId: string) => void;
}) {
  const [depositRaw, setDepositRaw] = useState("");
  const [depositAg, setDepositAg] = useState<Agorot | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [justDeposited, setJustDeposited] = useState(false);

  const periods = goal.targetDate
    ? goal.plannedCadence === "weekly"
      ? weeksUntil(todayIso(), goal.targetDate)
      : Math.max(0, Math.ceil(weeksUntil(todayIso(), goal.targetDate) / 4.345))
    : null;
  const math = goalMath(goal.targetAmount, goal.saved, goal.plannedDeposit, periods);
  const cadenceWord = goal.plannedCadence === "weekly" ? "שבוע" : "חודש";

  return (
    <PlusCard className={justDeposited ? "plus-animate-complete" : ""}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">🎯 {goal.name}</p>
          {goal.reason && (
            <p className="text-xs text-muted-foreground">למה זה חשוב: {goal.reason}</p>
          )}
        </div>
        <button
          type="button"
          aria-label={`מחיקת המטרה ${goal.name}`}
          className="min-h-[44px] min-w-[44px] text-muted-foreground"
          onClick={() => setConfirmDelete(true)}
        >
          🗑
        </button>
      </div>

      <div className="mt-3">
        <ProgressBar value={goal.saved} max={goal.targetAmount} label={`התקדמות ליעד ${goal.name}`} />
        <p className="mt-1 text-sm" dir="ltr">
          {formatAgorot(goal.saved)} / {formatAgorot(goal.targetAmount)}
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-muted p-2">
          <dt className="text-xs text-muted-foreground">נשאר לחסוך</dt>
          <dd className="font-bold" dir="ltr">{formatAgorot(math.remaining)}</dd>
        </div>
        <div className="rounded-xl bg-muted p-2">
          <dt className="text-xs text-muted-foreground">
            {goal.targetDate ? `כדי להספיק עד ${formatDateIL(goal.targetDate)}` : "הפקדה מתוכננת"}
          </dt>
          <dd className="font-bold" dir="ltr">
            {math.perPeriod !== null
              ? `${formatAgorot(math.perPeriod)}`
              : formatAgorot(goal.plannedDeposit)}
          </dd>
        </div>
      </dl>
      {math.etaPeriods !== null && math.remaining > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          בקצב של <bdi>{formatAgorot(goal.plannedDeposit)}</bdi> ל{cadenceWord} —
          עוד בערך {math.etaPeriods} {goal.plannedCadence === "weekly" ? "שבועות" : "חודשים"}.
          כל הכנסה נוספת מקצרת את הדרך.
        </p>
      )}
      {math.remaining === 0 && (
        <p className="mt-2 text-sm font-medium text-success">המטרה הושגה! 🎉</p>
      )}

      {math.remaining > 0 && (
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <AmountField
              id={`dep-${goal.id}`}
              label="הפקדה למטרה (בש״ח)"
              value={depositRaw}
              onChange={setDepositRaw}
              onValid={setDepositAg}
            />
          </div>
          <Button
            disabled={!depositAg || depositAg <= 0}
            onClick={() => {
              if (!depositAg) return;
              onDeposit(goal.id, depositAg, todayIso());
              setDepositRaw("");
              setDepositAg(null);
              setJustDeposited(true);
              setTimeout(() => setJustDeposited(false), 400);
            }}
          >
            הפקדה
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`למחוק את המטרה "${goal.name}"?`}
        description="המחיקה מסירה את המטרה בלבד. תנועות שכבר נרשמו נשארות בהיסטוריה."
        confirmText="מחיקה"
        destructive
        onConfirm={() => onDelete(goal.id)}
      />
    </PlusCard>
  );
}

function NewGoalForm({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (g: Omit<Goal, "id" | "createdAt" | "achievedAt">) => boolean;
}) {
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [targetRaw, setTargetRaw] = useState("");
  const [targetAg, setTargetAg] = useState<Agorot | null>(null);
  const [savedRaw, setSavedRaw] = useState("");
  const [savedAg, setSavedAg] = useState<Agorot | null>(null);
  const [depositRaw, setDepositRaw] = useState("");
  const [depositAg, setDepositAg] = useState<Agorot | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [cadence, setCadence] = useState<"weekly" | "monthly">("weekly");

  const fillCushion = () => {
    setName("כרית ביטחון ראשונה");
    setReason("שיהיה לי כסף זמין לכל הפתעה");
    setTargetRaw("750");
    setTargetAg(75000);
  };

  const valid = name.trim() && targetAg && targetAg > 0;

  return (
    <PlusCard>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold">מטרה חדשה</p>
          <button type="button" className="text-sm text-primary underline" onClick={fillCushion}>
            💡 כרית ביטחון (מומלץ: 500–1,000 ₪)
          </button>
        </div>
        <div className="space-y-1">
          <Label htmlFor="goal-name">שם המטרה</Label>
          <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: מחשב נייד" />
        </div>
        <AmountField id="goal-target" label="סכום היעד (בש״ח)" value={targetRaw} onChange={setTargetRaw} onValid={setTargetAg} />
        <div className="space-y-1">
          <Label htmlFor="goal-reason">למה המטרה הזו חשובה לך?</Label>
          <Input id="goal-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="goal-date">תאריך רצוי (לא חובה)</Label>
            <Input id="goal-date" type="date" min={todayIso()} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <AmountField id="goal-saved" label="כבר נחסך (בש״ח)" value={savedRaw} onChange={setSavedRaw} onValid={setSavedAg} />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <AmountField id="goal-deposit" label="הפקדה מתוכננת (בש״ח)" value={depositRaw} onChange={setDepositRaw} onValid={setDepositAg} />
          </div>
          <div className="flex gap-1 pb-0.5" role="group" aria-label="תדירות ההפקדה">
            {(
              [
                ["weekly", "שבועית"],
                ["monthly", "חודשית"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                aria-pressed={cadence === val}
                onClick={() => setCadence(val)}
                className={`min-h-[44px] rounded-xl border px-3 text-sm ${
                  cadence === val
                    ? "border-primary bg-accent font-semibold text-accent-foreground"
                    : "border-border bg-card"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>ביטול</Button>
          <Button
            className="flex-[2]"
            disabled={!valid}
            onClick={() => {
              if (!valid || !targetAg) return;
              onAdd({
                name: name.trim(),
                targetAmount: targetAg,
                targetDate: targetDate || null,
                reason: reason.trim(),
                saved: savedAg ?? 0,
                plannedDeposit: depositAg ?? 0,
                plannedCadence: cadence,
              });
              onClose();
            }}
          >
            שמירת המטרה
          </Button>
        </div>
      </div>
    </PlusCard>
  );
}
