import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePlus, lessonUnlocked, todayIso } from "../data/store";
import { LESSONS } from "../data/content";
import { PlusCard, Button, EmptyState, InlineNote } from "../components/PlusUI";

export default function LessonPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { state, completeLesson } = usePlus();
  const lesson = LESSONS.find((l) => l.id === lessonId);

  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [taskDone, setTaskDone] = useState(false);

  if (!lesson) {
    return (
      <EmptyState
        emoji="🔎"
        title="השיעור לא נמצא"
        text="אולי הקישור ישן — כל השיעורים מחכים באקדמיה."
        action={<Link to="/plus/academy" className="font-semibold text-primary underline">לאקדמיה</Link>}
      />
    );
  }

  if (!lessonUnlocked(state, lesson.id)) {
    return (
      <EmptyState
        emoji="🔒"
        title="השיעור עוד נעול"
        text={
          lesson.advanced
            ? "יחידת ההשקעות המתקדמת נפתחת אחרי שמסיימים את כל יחידות הבסיס — צעד אחר צעד."
            : "קודם מסיימים את השיעור הקודם — הידע נבנה בשכבות."
        }
        action={<Link to="/plus/academy" className="font-semibold text-primary underline">לאקדמיה</Link>}
      />
    );
  }

  const progress = state.lessons[lesson.id];
  const alreadyDone = !!progress?.completedAt;
  const correct = selected === lesson.quiz.correctIndex;

  const finish = () => {
    completeLesson(lesson.id, {
      completedAt: todayIso(),
      quizCorrect: correct,
      taskDone,
    });
    navigate("/plus/academy");
  };

  return (
    <div className="space-y-4">
      <Link to="/plus/academy" className="text-sm text-muted-foreground">→ לאקדמיה</Link>
      <h1 className="text-xl font-bold">{lesson.title}</h1>
      <p className="text-xs text-muted-foreground">{lesson.minutes} דקות · שיעור {lesson.index} מתוך {LESSONS.length}</p>

      {lesson.advanced && (
        <InlineNote>
          השיעור הזה נועד ללמידה ולשיחה עם ההורים בלבד — הוא לא הוראה לפעולה ולא
          המלצה על השקעה כלשהי.
        </InlineNote>
      )}

      <PlusCard>
        <div className="space-y-3 text-sm leading-relaxed">
          {lesson.explanation.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </PlusCard>

      <PlusCard>
        <p className="text-xs font-semibold text-muted-foreground">דוגמה מהחיים</p>
        <p className="mt-1 text-sm">{lesson.example}</p>
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">שאלה לבדיקה</p>
        <p className="mt-1 text-sm">{lesson.quiz.question}</p>
        <div className="mt-3 space-y-2">
          {lesson.quiz.options.map((opt, i) => {
            const chosen = selected === i;
            const showState = answered && chosen;
            return (
              <button
                key={i}
                type="button"
                disabled={answered}
                aria-pressed={chosen}
                onClick={() => setSelected(i)}
                className={`block min-h-[44px] w-full rounded-xl border px-3 py-2 text-right text-sm ${
                  showState
                    ? correct
                      ? "border-success bg-accent font-semibold"
                      : "border-destructive bg-secondary font-semibold"
                    : chosen
                      ? "border-primary bg-accent"
                      : "border-border bg-card"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {!answered ? (
          <Button className="mt-3 w-full" disabled={selected === null} onClick={() => setAnswered(true)}>
            בדיקה
          </Button>
        ) : (
          <p className={`mt-3 text-sm ${correct ? "text-success" : "text-destructive"}`}>
            {correct ? "בדיוק! " : "לא בדיוק. "}
            {lesson.quiz.why}
          </p>
        )}
      </PlusCard>

      <PlusCard>
        <p className="font-semibold">משימה אמיתית</p>
        <p className="mt-1 text-sm">{lesson.task}</p>
        <label className="mt-3 flex min-h-[44px] cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[hsl(var(--primary))]"
            checked={taskDone}
            onChange={(e) => setTaskDone(e.target.checked)}
          />
          <span className="text-sm">עשיתי (או אעשה השבוע)</span>
        </label>
      </PlusCard>

      <PlusCard className="border-primary">
        <p className="text-xs font-semibold text-muted-foreground">במשפט אחד</p>
        <p className="mt-1 text-sm font-medium">{lesson.summary}</p>
      </PlusCard>

      {alreadyDone ? (
        <p className="text-center text-sm text-muted-foreground">השיעור הזה כבר הושלם ✓</p>
      ) : (
        <Button className="w-full" disabled={!answered} onClick={finish}>
          סיום השיעור
        </Button>
      )}
    </div>
  );
}
