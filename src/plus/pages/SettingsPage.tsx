import { useState } from "react";
import { usePlus } from "../data/store";
import { isValidSplit } from "../lib/money";
import type { SplitPercents } from "../lib/money";
import { PageTitle, PlusCard, Button, ConfirmDialog, InlineNote } from "../components/PlusUI";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const { state, update, isDemo, setDemoMode, exportData, deleteAllData } = usePlus();
  const [split, setSplit] = useState<SplitPercents>(state.split);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const valid = isValidSplit(split);
  const total = split.future + split.goals + split.fun;

  const download = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plus-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <PageTitle title="הגדרות ונתונים" />

      <PlusCard>
        <p className="font-semibold">✂️ חלוקת ברירת המחדל של הכנסה</p>
        <p className="mt-1 text-xs text-muted-foreground">
          כך תחולק כל הכנסה חדשה כברירת מחדל. הסכום הכולל חייב להיות 100%.
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
              <Label htmlFor={`set-split-${key}`} className="flex-1 text-sm">{label}</Label>
              <Input
                id={`set-split-${key}`}
                type="number"
                dir="ltr"
                min={0}
                max={100}
                className="w-20 text-center"
                value={split[key]}
                onChange={(e) =>
                  setSplit((p) => ({
                    ...p,
                    [key]: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                  }))
                }
              />
              <span className="text-sm">%</span>
            </div>
          ))}
        </div>
        {!valid && (
          <p className="mt-2 text-sm text-destructive">סך האחוזים חייב להיות 100 (עכשיו: {total}).</p>
        )}
        <Button
          className="mt-3"
          disabled={!valid}
          onClick={() => {
            update((p) => ({ ...p, split }));
            setSavedMsg(true);
            setTimeout(() => setSavedMsg(false), 2000);
          }}
        >
          {savedMsg ? "נשמר ✓" : "שמירת החלוקה"}
        </Button>
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">🔒 פרטיות ושיתוף</p>
        <label className="mt-2 flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
          <span className="text-sm">להציג להורה סיכום כספי במצב הורה</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[hsl(var(--primary))]"
            checked={state.parent.shareSummary}
            onChange={(e) =>
              update((p) => ({
                ...p,
                parent: { ...p.parent, shareSummary: e.target.checked },
              }))
            }
          />
        </label>
        <label className="mt-1 flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
          <span className="text-sm">הפחתת אנימציות ותנועה</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-[hsl(var(--primary))]"
            checked={state.reduceMotion}
            onChange={(e) => update((p) => ({ ...p, reduceMotion: e.target.checked }))}
          />
        </label>
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">🗂️ הנתונים שלך</p>
        <p className="mt-1 text-xs text-muted-foreground">
          הכול נשמר במכשיר הזה בלבד. אין שרת, אין מעקב, אין חשבון.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={download}>ייצוא הנתונים (JSON)</Button>
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            מחיקת כל הנתונים
          </Button>
        </div>
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">🧪 מצב הדגמה</p>
        <p className="mt-1 text-xs text-muted-foreground">
          פרופיל "אגם" לדוגמה — נפרד לגמרי מהנתונים שלך ולא נשמר בחשבון אמיתי.
        </p>
        <Button variant="outline" className="mt-2" onClick={() => setDemoMode(!isDemo)}>
          {isDemo ? "חזרה לנתונים שלי" : "כניסה למצב הדגמה"}
        </Button>
      </PlusCard>

      <InlineNote>
        פלוס היא כלי לימוד. היא לא מחוברת לבנק, לא מבצעת השקעות ולא נותנת ייעוץ
        אישי.
      </InlineNote>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="למחוק את כל הנתונים?"
        description="כל התנועות, המטרות וההתקדמות יימחקו מהמכשיר לצמיתות. אי אפשר לבטל את הפעולה. אפשר לייצא קודם גיבוי."
        confirmText="מחיקה לצמיתות"
        destructive
        onConfirm={deleteAllData}
      />
    </div>
  );
}
