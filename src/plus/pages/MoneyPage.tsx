import { useState } from "react";
import { Link } from "react-router-dom";
import { usePlus, monthSummary, todayIso } from "../data/store";
import type { Transaction, TxKind } from "../data/types";
import {
  formatAgorot,
  formatDateIL,
  splitAmount,
  isValidSplit,
  type Agorot,
  type SplitPercents,
} from "../lib/money";
import {
  PageTitle,
  PlusCard,
  AmountField,
  Button,
  EmptyState,
  InlineNote,
} from "../components/PlusUI";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KIND_LABELS: Record<TxKind, string> = {
  income: "הכנסה",
  expense: "הוצאה",
  saving: "חיסכון",
  gift: "מתנה",
  refund: "החזר כספי",
};

export default function MoneyPage() {
  const { state, addTransaction, applySplitToIncome } = usePlus();
  const ym = todayIso().slice(0, 7);
  const month = monthSummary(state, ym);

  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<TxKind>("income");
  const [amountRaw, setAmountRaw] = useState("");
  const [amountAg, setAmountAg] = useState<Agorot | null>(null);
  const [date, setDate] = useState(todayIso());
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [splitTx, setSplitTx] = useState<Transaction | null>(null);

  const submit = () => {
    if (!amountAg || amountAg <= 0 || !category.trim()) return;
    const tx = addTransaction({
      kind,
      amount: amountAg,
      date,
      category: category.trim(),
      note: note.trim() || undefined,
    });
    setShowForm(false);
    setAmountRaw("");
    setAmountAg(null);
    setCategory("");
    setNote("");
    if (kind === "income" || kind === "gift") setSplitTx(tx);
  };

  return (
    <div className="space-y-4">
      <PageTitle
        title="הכסף שלי"
        subtitle="הכול מוזן ידנית — את שולטת בנתונים, והם נשמרים רק במכשיר שלך."
      />

      <div className="grid grid-cols-3 gap-2">
        <PlusCard>
          <p className="text-xs text-muted-foreground">נכנס החודש</p>
          <p className="mt-1 font-bold" dir="ltr">{formatAgorot(month.incomeAg)}</p>
        </PlusCard>
        <PlusCard>
          <p className="text-xs text-muted-foreground">נשמר החודש</p>
          <p className="mt-1 font-bold" dir="ltr">{formatAgorot(month.savedAg)}</p>
        </PlusCard>
        <PlusCard>
          <p className="text-xs text-muted-foreground">שיעור חיסכון</p>
          <p className="mt-1 font-bold">
            {month.savingRate === null ? "—" : `${month.savingRate}%`}
          </p>
        </PlusCard>
      </div>

      {month.incomeAg === 0 && state.transactions.length > 0 && (
        <InlineNote>
          עוד לא נרשמה הכנסה החודש — וזה בסדר. חודש בלי הכנסה הוא הזדמנות טובה
          לשיעור באקדמיה או לתכנון הפנייה הבאה ללקוחות.
        </InlineNote>
      )}

      {(month.bucketTotals.future > 0 || month.bucketTotals.goals > 0 || month.bucketTotals.fun > 0) && (
        <PlusCard>
          <p className="text-sm font-semibold">חלוקת ההכנסות החודש</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-accent p-2">
              <p className="text-xs text-muted-foreground">עתיד</p>
              <p className="font-bold" dir="ltr">{formatAgorot(month.bucketTotals.future)}</p>
            </div>
            <div className="rounded-xl bg-accent p-2">
              <p className="text-xs text-muted-foreground">מטרות</p>
              <p className="font-bold" dir="ltr">{formatAgorot(month.bucketTotals.goals)}</p>
            </div>
            <div className="rounded-xl bg-secondary p-2">
              <p className="text-xs text-muted-foreground">כיף</p>
              <p className="font-bold" dir="ltr">{formatAgorot(month.bucketTotals.fun)}</p>
            </div>
          </div>
        </PlusCard>
      )}

      {!showForm ? (
        <Button className="w-full" onClick={() => setShowForm(true)}>
          + רישום תנועה חדשה
        </Button>
      ) : (
        <PlusCard>
          <div className="space-y-3">
            <p className="font-semibold">תנועה חדשה</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="סוג התנועה">
              {(Object.keys(KIND_LABELS) as TxKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className={`min-h-[44px] rounded-full border px-4 text-sm ${
                    kind === k
                      ? "border-primary bg-accent font-semibold text-accent-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  {KIND_LABELS[k]}
                </button>
              ))}
            </div>
            <AmountField
              id="tx-amount"
              label="סכום בש״ח"
              value={amountRaw}
              onChange={setAmountRaw}
              onValid={setAmountAg}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tx-date">תאריך</Label>
                <Input
                  id="tx-date"
                  type="date"
                  value={date}
                  max={todayIso()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tx-cat">קטגוריה</Label>
                <Input
                  id="tx-cat"
                  value={category}
                  placeholder="למשל: בייביסיטר"
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tx-note">הערה (לא חובה)</Label>
              <Input
                id="tx-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                ביטול
              </Button>
              <Button
                className="flex-[2]"
                onClick={submit}
                disabled={!amountAg || amountAg <= 0 || !category.trim()}
              >
                שמירה
              </Button>
            </div>
          </div>
        </PlusCard>
      )}

      {splitTx && (
        <SplitCard tx={splitTx} onDone={() => setSplitTx(null)} onApply={applySplitToIncome} />
      )}

      {state.transactions.length === 0 ? (
        <EmptyState
          emoji="🪙"
          title="עוד אין תנועות"
          text="רשמי את הכסף שכבר יש לך או את ההכנסה הראשונה — משם הכול מתחיל."
        />
      ) : (
        <PlusCard>
          <p className="mb-2 font-semibold">תנועות אחרונות</p>
          <ul className="divide-y divide-border">
            {state.transactions.slice(0, 12).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">
                    {KIND_LABELS[t.kind]} · {t.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateIL(t.date)}
                    {t.note ? ` · ${t.note}` : ""}
                  </p>
                </div>
                <p
                  className={`text-sm font-bold ${
                    t.kind === "expense" ? "text-destructive" : "text-primary"
                  }`}
                  dir="ltr"
                >
                  {t.kind === "expense" ? "-" : ""}{formatAgorot(t.amount)}
                </p>
              </li>
            ))}
          </ul>
        </PlusCard>
      )}

      <p className="text-center text-xs text-muted-foreground">
        רוצה לחלק הכנסה קודמת?{" "}
        <Link to="/plus/goals" className="underline">המטרות שלך כאן</Link>.
      </p>
    </div>
  );
}

/** "חלקי את ההכנסה שלי" — הצעה לפי האחוזים, עם אפשרות שינוי. */
function SplitCard({
  tx,
  onDone,
  onApply,
}: {
  tx: Transaction;
  onDone: () => void;
  onApply: (txId: string, percents: SplitPercents, goalId: string | null) => void;
}) {
  const { state, recordActivity } = usePlus();
  const [percents, setPercents] = useState<SplitPercents>(state.split);
  const activeGoals = state.goals.filter((g) => !g.achievedAt);
  const [goalId, setGoalId] = useState<string | null>(activeGoals[0]?.id ?? null);
  const valid = isValidSplit(percents);
  const preview = valid ? splitAmount(tx.amount, percents) : null;
  const total = percents.future + percents.goals + percents.fun;

  if (tx.amount < 3) {
    return (
      <InlineNote>
        הסכום קטן מכדי לחלק אותו ({formatAgorot(tx.amount)}) — נרשם במלואו, וזה
        מצוין. <button className="underline" onClick={onDone}>סגירה</button>
      </InlineNote>
    );
  }

  return (
    <PlusCard className="border-primary">
      <p className="font-semibold">✂️ חלקי את ההכנסה שלי</p>
      <p className="mt-1 text-sm text-muted-foreground">
        נרשמה הכנסה של <bdi>{formatAgorot(tx.amount)}</bdi>. ההצעה לפי החלוקה
        שלך — אפשר לאשר או לשנות.
      </p>
      <div className="mt-3 space-y-2">
        {(
          [
            ["future", "עתיד — חיסכון והשקעה"],
            ["goals", "מטרות קרובות"],
            ["fun", "כיף וחופש אישי"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-center gap-3">
            <Label htmlFor={`split-${key}`} className="w-40 text-sm">{label}</Label>
            <Input
              id={`split-${key}`}
              type="number"
              min={0}
              max={100}
              className="w-20 text-center"
              value={percents[key]}
              onChange={(e) =>
                setPercents((p) => ({ ...p, [key]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))
              }
            />
            <span className="text-sm">%</span>
            {preview && (
              <span className="ms-auto text-sm font-medium" dir="ltr">
                {formatAgorot(preview[key])}
              </span>
            )}
          </div>
        ))}
      </div>
      {!valid && (
        <p className="mt-2 text-sm text-destructive">
          סך האחוזים חייב להיות 100 (עכשיו: {total}).
        </p>
      )}
      {percents.goals > 0 && activeGoals.length > 0 && (
        <div className="mt-3 space-y-1">
          <Label htmlFor="split-goal">לאיזו מטרה יופקד חלק ה"מטרות"?</Label>
          <select
            id="split-goal"
            className="w-full rounded-xl border border-input bg-card p-2 text-sm"
            value={goalId ?? ""}
            onChange={(e) => setGoalId(e.target.value || null)}
          >
            {activeGoals.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}
      {percents.goals > 0 && activeGoals.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          אין עדיין מטרה פעילה — חלק ה"מטרות" יירשם כחיסכון כללי.{" "}
          <Link to="/plus/goals" className="underline">אפשר לקבוע מטרה כאן</Link>.
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onDone}>
          אחר כך
        </Button>
        <Button
          className="flex-[2]"
          disabled={!valid}
          onClick={() => {
            onApply(tx.id, percents, percents.goals > 0 ? goalId : null);
            recordActivity();
            onDone();
          }}
        >
          אישור החלוקה
        </Button>
      </div>
    </PlusCard>
  );
}
