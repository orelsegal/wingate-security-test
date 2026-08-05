import { Link } from "react-router-dom";
import { usePlus, lessonUnlocked } from "../data/store";
import { LESSONS } from "../data/content";
import { PageTitle, PlusCard } from "../components/PlusUI";

const HEB_LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "יא", "יב"];

export default function AcademyPage() {
  const { state } = usePlus();
  const completedCount = LESSONS.filter((l) => state.lessons[l.id]?.completedAt).length;

  return (
    <div className="space-y-4">
      <PageTitle
        title="אקדמיית הכסף"
        subtitle={`שיעורים קצרים של 3–6 דקות. הושלמו ${completedCount} מתוך ${LESSONS.length}.`}
      />

      <ul className="space-y-2">
        {LESSONS.map((lesson) => {
          const done = !!state.lessons[lesson.id]?.completedAt;
          const unlocked = lessonUnlocked(state, lesson.id);
          const letter = HEB_LETTERS[lesson.index - 1];

          if (!unlocked) {
            return (
              <li key={lesson.id}>
                <div
                  className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/50 p-3 opacity-70"
                  aria-disabled="true"
                >
                  <span aria-hidden>🔒</span>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {letter}. {lesson.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lesson.advanced
                        ? "נפתח אחרי השלמת כל יחידות הבסיס"
                        : "נפתח אחרי השיעור הקודם"}
                    </p>
                  </div>
                </div>
              </li>
            );
          }

          return (
            <li key={lesson.id}>
              <Link to={`/plus/academy/${lesson.id}`} className="block">
                <PlusCard className={done ? "opacity-80" : ""}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {done ? "✓ " : ""}{letter}. {lesson.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lesson.minutes} דקות{done ? " · הושלם" : ""}
                      </p>
                    </div>
                    <span aria-hidden className="text-muted-foreground">‹</span>
                  </div>
                </PlusCard>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="text-center text-xs text-muted-foreground">
        הידע כאן הוא חינוך כללי — לא ייעוץ השקעות אישי.
      </p>
    </div>
  );
}
