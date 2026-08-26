import { useState } from "react";
import { usePlus, simpleHash, todayIso, monthSummary, netWorth } from "../data/store";
import { PARENT_TASKS, RIGHTS_FACTS, RIGHTS_STALE_DAYS } from "../data/content";
import { formatAgorot, formatDateIL } from "../lib/money";
import { PageTitle, PlusCard, Button, InlineNote } from "../components/PlusUI";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ParentsPage() {
  const { state, update } = usePlus();
  const [parentMode, setParentMode] = useState(false);

  return (
    <div className="space-y-4">
      <PageTitle
        title="עם ההורים"
        subtitle="הדברים הגדולים בכסף נעשים יחד. הנה רשימת שיחות ופעולות משותפות."
      />

      <PlusCard>
        <p className="font-semibold">שיחות ופעולות משותפות</p>
        <ul className="mt-2 space-y-2">
          {PARENT_TASKS.map((task) => {
            const approvedAt = state.parent.approvals[task.id];
            return (
              <li key={task.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {approvedAt ? "✓ " : ""}
                      {task.title}
                      {task.sensitive && (
                        <span className="ms-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          דורש הורה
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{task.detail}</p>
                    {approvedAt && (
                      <p className="mt-1 text-xs text-success">אושר יחד ב-{formatDateIL(approvedAt)}</p>
                    )}
                  </div>
                  {!approvedAt && !task.sensitive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        update((p) => ({
                          ...p,
                          parent: {
                            ...p.parent,
                            approvals: { ...p.parent.approvals, [task.id]: todayIso() },
                          },
                        }))
                      }
                    >
                      עשינו ✓
                    </Button>
                  )}
                  {!approvedAt && task.sensitive && !parentMode && (
                    <span className="text-xs text-muted-foreground">אישור במצב הורה</span>
                  )}
                  {!approvedAt && task.sensitive && parentMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        update((p) => ({
                          ...p,
                          parent: {
                            ...p.parent,
                            approvals: { ...p.parent.approvals, [task.id]: todayIso() },
                          },
                        }))
                      }
                    >
                      אישור הורה ✓
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </PlusCard>

      <ParentModeCard parentMode={parentMode} setParentMode={setParentMode} />

      <PlusCard>
        <p className="font-semibold">🏅 הישג משפחתי</p>
        <p className="mt-1 text-sm text-muted-foreground">
          דיברתן על כסף ברצינות? זה שווה סימון.
        </p>
        {state.manualBadges["parent-talk"] ? (
          <p className="mt-2 text-sm font-medium text-success">
            ✓ שיחה פיננסית עם ההורים הושלמה ({formatDateIL(state.manualBadges["parent-talk"])})
          </p>
        ) : (
          <Button
            variant="outline"
            className="mt-2"
            onClick={() =>
              update((p) => ({
                ...p,
                manualBadges: { ...p.manualBadges, "parent-talk": todayIso() },
              }))
            }
          >
            השלמנו שיחה פיננסית ✓
          </Button>
        )}
      </PlusCard>
    </div>
  );
}

function ParentModeCard({
  parentMode,
  setParentMode,
}: {
  parentMode: boolean;
  setParentMode: (v: boolean) => void;
}) {
  const { state, update } = usePlus();
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState("");
  const hasCode = !!state.parent.codeHash;

  const ym = todayIso().slice(0, 7);
  const month = monthSummary(state, ym);
  const staleContent = RIGHTS_FACTS.some(
    (f) => daysSince(f.lastUpdated) > RIGHTS_STALE_DAYS
  );

  const submit = () => {
    if (!/^\d{4}$/.test(codeInput)) {
      setError("הקוד הוא 4 ספרות.");
      return;
    }
    if (!hasCode) {
      update((p) => ({
        ...p,
        parent: { ...p.parent, codeHash: simpleHash(codeInput) },
      }));
      setParentMode(true);
      setError("");
    } else if (simpleHash(codeInput) === state.parent.codeHash) {
      setParentMode(true);
      setError("");
    } else {
      setError("הקוד לא נכון.");
    }
    setCodeInput("");
  };

  if (!parentMode) {
    return (
      <PlusCard>
        <p className="font-semibold">🔐 מצב הורה</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasCode
            ? "הזנת קוד ההורה פותחת סיכום ואישור משימות רגישות."
            : "בפעם הראשונה: ההורה בוחר כאן קוד בן 4 ספרות. הקוד נשמר במכשיר בלבד."}
        </p>
        <div className="mt-2 flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="parent-code">קוד (4 ספרות)</Label>
            <Input
              id="parent-code"
              type="password"
              inputMode="numeric"
              dir="ltr"
              maxLength={4}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button onClick={submit}>{hasCode ? "כניסה" : "קביעת קוד"}</Button>
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </PlusCard>
    );
  }

  return (
    <PlusCard className="border-primary">
      <div className="flex items-center justify-between">
        <p className="font-semibold">🔓 מצב הורה פעיל</p>
        <Button variant="outline" size="sm" onClick={() => setParentMode(false)}>
          יציאה
        </Button>
      </div>

      {state.parent.shareSummary ? (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-muted p-2">
            <dt className="text-xs text-muted-foreground">שווי כולל</dt>
            <dd className="font-bold" dir="ltr">{formatAgorot(netWorth(state))}</dd>
          </div>
          <div className="rounded-xl bg-muted p-2">
            <dt className="text-xs text-muted-foreground">נכנס החודש</dt>
            <dd className="font-bold" dir="ltr">{formatAgorot(month.incomeAg)}</dd>
          </div>
          <div className="rounded-xl bg-muted p-2">
            <dt className="text-xs text-muted-foreground">נשמר החודש</dt>
            <dd className="font-bold" dir="ltr">{formatAgorot(month.savedAg)}</dd>
          </div>
        </dl>
      ) : (
        <InlineNote>
          הסיכום הכספי מוצג רק אם {state.name || "הילדה"} בוחרת לשתף אותו
          (בהגדרות). הפרטיות שלה נשמרת — אין גישה ליומן או להערות אישיות.
        </InlineNote>
      )}

      <div className="mt-3">
        <p className="text-sm font-semibold">תוכן מתעדכן (חוק וסכומים)</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {staleContent
            ? "⚠️ חלק מהמידע במרכז הזכויות ישן ודורש בדיקה מול המקורות הרשמיים."
            : "המידע במרכז הזכויות בתוקף לפי תאריכי העדכון."}
          {state.parent.contentReviewedAt &&
            ` נבדק לאחרונה על ידי הורה ב-${formatDateIL(state.parent.contentReviewedAt)}.`}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() =>
            update((p) => ({
              ...p,
              parent: { ...p.parent, contentReviewedAt: todayIso() },
            }))
          }
        >
          בדקתי את התוכן היום ✓
        </Button>
      </div>
    </PlusCard>
  );
}

function daysSince(isoDate: string): number {
  return Math.floor(
    (Date.now() - new Date(isoDate + "T00:00:00").getTime()) / 86400000
  );
}
