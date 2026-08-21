import { useState } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../data/appContext";
import { useAsync } from "../core/logic/useAsync";
import { buildUnitViews, summarize, type UnitView } from "../core/logic/progress";
import type { Student, StudentProgress } from "../data/types";
import { StatusPill } from "../core/ui/StatusPill";
import { ProgressBar } from "../core/ui/ProgressBar";
import { Banner } from "../core/ui/Banner";
import { ErrorBlock, LoadingBlock } from "../core/ui/states";
import { Shell } from "../app/Shell";
import { BackLink } from "../app/BackLink";

export function TeacherStudent() {
  const { studentId = "" } = useParams();
  const { data } = useApp();

  const state = useAsync(
    async (): Promise<{ student: Student; progress: StudentProgress }> => {
      const [student, progress] = await Promise.all([
        data.getStudent(studentId),
        data.getProgress(studentId),
      ]);
      return { student, progress };
    },
    [studentId],
  );

  return (
    <Shell wide>
      <BackLink to="/teacher" label="התלמידות שלי" />
      {state.loading && <LoadingBlock rows={3} />}
      {state.error && <ErrorBlock message={state.error} onRetry={state.reload} />}
      {state.data && (
        <StudentBody
          student={state.data.student}
          progress={state.data.progress}
          onProgress={(progress) => state.setData({ student: state.data!.student, progress })}
        />
      )}
    </Shell>
  );
}

function StudentBody({
  student,
  progress,
  onProgress,
}: {
  student: Student;
  progress: StudentProgress;
  onProgress: (p: StudentProgress) => void;
}) {
  const { course, theme } = useApp();
  const views = buildUnitViews(course, progress);
  const summary = summarize(course, progress);

  return (
    <div className="stack stack--lg">
      <div className="stack stack--sm">
        <div className="unit-review__head">
          <h1 className="page-title">{student.name}</h1>
          <StatusPill
            status={summary.finished ? "approved" : (summary.current?.status ?? "not_started")}
            audience="teacher"
          />
        </div>
        {student.group && <p className="page-sub">{student.group}</p>}
      </div>

      <div className="card">
        <ProgressBar
          value={summary.approved}
          max={summary.total}
          label={`${summary.approved} מתוך ${summary.total} ${theme.words.units} אושרו`}
        />
      </div>

      <section className="stack" aria-label="יחידות">
        {views.map((view) => (
          <UnitReview
            key={view.unit.id}
            view={view}
            nextLocked={views[view.index + 1]?.status === "locked"}
            studentId={student.id}
            onProgress={onProgress}
          />
        ))}
      </section>
    </div>
  );
}

function UnitReview({
  view,
  nextLocked,
  studentId,
  onProgress,
}: {
  view: UnitView;
  nextLocked: boolean;
  studentId: string;
  onProgress: (p: StudentProgress) => void;
}) {
  const { data, theme } = useApp();
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<null | "approve" | "return" | "open">(null);
  const [error, setError] = useState<string | null>(null);

  const hasAnswers = Object.keys(view.progress.answers).length > 0;
  const canReview = view.status === "submitted" || view.status === "returned";

  const run = async (kind: "approve" | "return" | "open", fn: () => Promise<StudentProgress>) => {
    setBusy(kind);
    setError(null);
    try {
      onProgress(await fn());
      setFeedback("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="card unit-review">
      <div className="unit-review__head">
        <div>
          <span className="unit-row__index">
            {theme.words.unit} {view.index + 1}
          </span>
          <h2 className="card__title">{view.unit.title}</h2>
        </div>
        <StatusPill status={view.status} audience="teacher" />
      </div>

      <p className="card__text">
        {view.completedSteps} מתוך {view.totalSteps} {theme.words.steps} מולאו
      </p>

      {view.status === "returned" && view.progress.feedback && (
        <Banner tone="fix" title="הוחזר לתיקון">
          {view.progress.feedback}
        </Banner>
      )}
      {view.status === "approved" && view.progress.feedback && (
        <Banner tone="done" title="משוב שנשלח">
          {view.progress.feedback}
        </Banner>
      )}

      {hasAnswers && (
        <details>
          <summary className="disclosure">הצגת התשובות</summary>
          <div className="stack" style={{ marginBlockStart: "var(--sp-3)" }}>
            {view.unit.steps.map((step, i) => (
              <div className="answer-block" key={step.id}>
                <span className="card__eyebrow">
                  {theme.words.step} {i + 1} · {step.title}
                </span>
                {step.fields.map((field) => {
                  const value = view.progress.answers[step.id]?.[field.id] ?? "";
                  return (
                    <div className="answer-item" key={field.id}>
                      <span className="answer-item__label">{field.label}</span>
                      <span
                        className={`answer-item__value${
                          value ? "" : " answer-item__value--empty"
                        }`}
                      >
                        {value || "לא נענה"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </details>
      )}

      {!hasAnswers && view.status !== "locked" && (
        <p className="card__text">עוד לא נשמרו תשובות ביחידה הזו.</p>
      )}

      {canReview && (
        <div className="stack stack--sm">
          <label className="field__label" htmlFor={`fb-${view.unit.id}`}>
            משוב לתלמידה
          </label>
          <textarea
            id={`fb-${view.unit.id}`}
            className="textarea"
            style={{ minHeight: 88 }}
            value={feedback}
            placeholder="מה לשפר, או מילה טובה לפני האישור"
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--accent"
              disabled={busy !== null}
              onClick={() =>
                run("approve", () =>
                  data.approveUnit(studentId, view.unit.id, feedback.trim() || undefined),
                )
              }
            >
              {busy === "approve" ? "מאשר…" : `אישור ופתיחת ה${theme.words.unit} הבאה`}
            </button>
            <button
              type="button"
              className="btn btn--danger"
              disabled={busy !== null || feedback.trim().length === 0}
              onClick={() => run("return", () => data.returnForFix(studentId, view.unit.id, feedback.trim()))}
            >
              {busy === "return" ? "שולח…" : "החזרה לתיקון"}
            </button>
          </div>
          {feedback.trim().length === 0 && (
            <p className="field__help">כדי להחזיר לתיקון צריך לכתוב משוב.</p>
          )}
        </div>
      )}

      {nextLocked && view.status !== "locked" && !canReview && (
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            disabled={busy !== null}
            onClick={() => run("open", () => data.openNextUnit(studentId, view.unit.id))}
          >
            {busy === "open" ? "פותח…" : `פתיחת ה${theme.words.unit} הבאה`}
          </button>
        </div>
      )}

      {error && (
        <Banner tone="fix" title="הפעולה נכשלה">
          {error}
        </Banner>
      )}
    </article>
  );
}
