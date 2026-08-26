import { Link } from "react-router-dom";
import { usePlus, netWorth, monthSummary, todayIso, earnedBadges } from "../data/store";
import { LESSONS } from "../data/content";
import { formatAgorot, weeklyStreak } from "../lib/money";
import { PlusCard, ProgressBar, GrowthPath, InlineNote } from "../components/PlusUI";

export default function HomePage() {
  const { state } = usePlus();
  const today = todayIso();
  const ym = today.slice(0, 7);
  const worth = netWorth(state);
  const month = monthSummary(state, ym);
  const streak = weeklyStreak(state.activityDates, today);
  const badges = earnedBadges(state);
  const badgeCount = Object.values(badges).filter(Boolean).length;

  const activeGoal =
    state.goals.find((g) => !g.achievedAt) ?? state.goals[0] ?? null;

  const nextLesson = LESSONS.find((l) => !state.lessons[l.id]?.completedAt);

  // הפעולה המרכזית הבאה — אחת בלבד, לפי המצב האמיתי
  const nextAction = (() => {
    if (state.goals.length === 0)
      return {
        to: "/plus/goals",
        title: "לבחור יעד ראשון",
        why: "יעד ברור הופך חיסכון ממשאלה לתוכנית.",
      };
    if (!state.firstClient.ideaId && state.transactions.filter((t) => t.kind === "income" && t.category !== "סכום התחלתי").length === 0)
      return {
        to: "/plus/earn",
        title: "לבחור רעיון הכנסה אחד",
        why: "הכנסה משלך היא המנוע הכי חזק שיש לך בגיל 14.",
      };
    if (month.incomeAg === 0)
      return {
        to: "/plus/money",
        title: "לרשום הכנסה או הוצאה מהשבוע",
        why: "מה שנמדד — מנוהל.",
      };
    if (nextLesson)
      return {
        to: `/plus/academy/${nextLesson.id}`,
        title: `שיעור הבא: ${nextLesson.title}`,
        why: "ידע הוא הריבית-דריבית של ההחלטות שלך.",
      };
    return {
      to: "/plus/lab",
      title: "לבדוק את כוח ההתמדה במעבדה",
      why: "לראות איך הפקדות קטנות נבנות לאורך זמן.",
    };
  })();

  const insight = (() => {
    if (month.savingRate !== null && month.savingRate >= 40)
      return `שיעור החיסכון שלך החודש הוא ${month.savingRate}% — התמדה כזו בונה עתיד.`;
    if (month.incomeAg > 0 && month.savedAg === 0)
      return "נכנס כסף החודש ועוד לא הופקד ממנו לחיסכון — אפשר לחלק אותו ב'הכסף שלי'.";
    if (month.incomeAg === 0 && state.transactions.length > 0)
      return "חודש בלי הכנסה זה בסדר גמור — אפשר לנצל אותו לשיעור באקדמיה או לתכנון הלקוחה הראשונה.";
    if (state.transactions.length === 0)
      return "ברגע שתרשמי את התנועה הראשונה, נתחיל לראות תמונה אמיתית.";
    return null;
  })();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">
          היי{state.name ? ` ${state.name}` : ""} 👋
        </h1>
        <p className="text-sm text-muted-foreground">הצעד הבא שלך מחכה למטה.</p>
      </header>

      <PlusCard>
        <p className="text-sm text-muted-foreground">השווי שבנית</p>
        <p className="mt-1 text-3xl font-bold text-primary" dir="ltr">
          {formatAgorot(worth)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          כסף זמין + חסכונות שהזנת. בלי חובות, בלי קסמים.
        </p>
        <div className="mt-3">
          <GrowthPath actions={state.activityDates.length} />
        </div>
      </PlusCard>

      {activeGoal ? (
        <Link to="/plus/goals" className="block">
          <PlusCard>
            <div className="flex items-center justify-between">
              <p className="font-semibold">🎯 {activeGoal.name}</p>
              <p className="text-sm text-muted-foreground" dir="ltr">
                {formatAgorot(activeGoal.saved)} / {formatAgorot(activeGoal.targetAmount)}
              </p>
            </div>
            <div className="mt-2">
              <ProgressBar
                value={activeGoal.saved}
                max={activeGoal.targetAmount}
                label={`התקדמות ליעד ${activeGoal.name}`}
              />
            </div>
            {activeGoal.achievedAt && (
              <p className="mt-2 text-sm font-medium text-success">
                המטרה הושגה! 🎉 אפשר לבחור יעד חדש.
              </p>
            )}
          </PlusCard>
        </Link>
      ) : (
        <PlusCard>
          <p className="text-sm text-muted-foreground">
            עוד אין יעד פעיל. יעד ברור הוא הצעד הראשון —{" "}
            <Link to="/plus/goals" className="font-semibold text-primary underline">
              בואי נקבע אחד
            </Link>
            .
          </p>
        </PlusCard>
      )}

      <Link to={nextAction.to} className="block">
        <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-md transition-transform active:scale-[0.99]">
          <p className="text-xs opacity-80">הפעולה הבאה שלי</p>
          <p className="mt-0.5 text-lg font-bold">{nextAction.title}</p>
          <p className="mt-1 text-sm opacity-90">{nextAction.why}</p>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <PlusCard>
          <p className="text-xs text-muted-foreground">רצף שבועי</p>
          <p className="mt-1 text-xl font-bold">
            {streak === 0 ? "עוד לא התחיל" : streak === 1 ? "שבוע אחד" : `${streak} שבועות`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            נבנה מפעולות אמיתיות, לא מכניסות לאפליקציה.
          </p>
        </PlusCard>
        <Link to="/plus/achievements" className="block">
          <PlusCard className="h-full">
            <p className="text-xs text-muted-foreground">הישגים</p>
            <p className="mt-1 text-xl font-bold">{badgeCount} מתוך 8</p>
            <p className="mt-1 text-xs text-muted-foreground">על פעולות בריאות בלבד.</p>
          </PlusCard>
        </Link>
      </div>

      {insight && <InlineNote>💡 {insight}</InlineNote>}
    </div>
  );
}
