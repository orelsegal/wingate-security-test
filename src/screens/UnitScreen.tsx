import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../data/appContext";
import { useAsync } from "../core/logic/useAsync";
import {
  buildUnitViews,
  isReadOnly,
  isStepComplete,
  missingFields,
  resumeStepIndex,
} from "../core/logic/progress";
import type { StudentProgress, UnitAnswers } from "../data/types";
import { AnswerField } from "../core/ui/AnswerField";
import { Banner } from "../core/ui/Banner";
import { StatusPill } from "../core/ui/StatusPill";
import { ErrorBlock, LoadingBlock } from "../core/ui/states";
import { Shell } from "../app/Shell";
import { BackLink } from "../app/BackLink";

type SaveState = "idle" | "saving" | "saved" | "error";

/** One unit, one station per screen. */
export function UnitScreen() {
  const { unitId = "" } = useParams();
  const { theme, data, session } = useApp();
  const studentId = session?.studentId ?? "";
  const state = useAsync(() => data.getProgress(studentId), [studentId]);

  return (
    <Shell>
      <BackLink to="/student" label={theme.words.mapTitle} />
      {state.loading && <LoadingBlock rows={2} />}
      {state.error && <ErrorBlock message={state.error} onRetry={state.reload} />}
      {state.data && (
        <UnitBody
          key={unitId}
          unitId={unitId}
          progress={state.data}
          onProgress={state.setData}
        />
      )}
    </Shell>
  );
}

function UnitBody({
  unitId,
  progress,
  onProgress,
}: {
  unitId: string;
  progress: StudentProgress;
  onProgress: (p: StudentProgress) => void;
}) {
  const { course, theme, data, session } = useApp();
  const navigate = useNavigate();
  const studentId = session?.studentId ?? "";

  const views = buildUnitViews(course, progress);
  const view = views.find((v) => v.unit.id === unitId);

  const [answers, setAnswers] = useState<UnitAnswers>(() => view?.progress.answers ?? {});
  const [stepIndex, setStepIndex] = useState(() => (view ? resumeStepIndex(view) : 0));
  const [save, setSave] = useState<SaveState>("idle");
  const [saveMsg, setSaveMsg] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [submitNote, setSubmitNote] = useState("");

  const step = view?.unit.steps[stepIndex];
  const values = useMemo(() => (step ? (answers[step.id] ?? {}) : {}), [answers, step]);

  if (!view) {
    return <ErrorBlock message="היחידה לא נמצאה" onRetry={() => navigate("/student")} />;
  }
  if (view.status === "locked") {
    return (
      <Banner tone="info" title="היחידה עדיין נעולה">
        היא תיפתח אחרי שהמורה תאשר את היחידה הקודמת.
      </Banner>
    );
  }
  if (!step) {
    return (
      <Banner tone="info" title="אין תחנות ביחידה הזו">
        בדקי את קובץ התוכן.
      </Banner>
    );
  }

  const readOnly = isReadOnly(view.status);
  const total = view.unit.steps.length;
  const isLast = stepIndex === total - 1;
  const missing = missingFields(step, values);
  const nextView = views[view.index + 1];
  const nextOpen = !!nextView && nextView.status !== "locked";

  const setValue = (fieldId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [step.id]: { ...(prev[step.id] ?? {}), [fieldId]: value },
    }));
    setSave("idle");
    setSaveMsg("");
  };

  const persist = async (): Promise<boolean> => {
    if (readOnly) return true;
    setSave("saving");
    setSaveMsg("שומר…");
    try {
      const next = await data.saveDraft(studentId, view.unit.id, step.id, values);
      onProgress(next);
      setSave("saved");
      setSaveMsg("נשמר");
      return true;
    } catch (e) {
      setSave("error");
      setSaveMsg(e instanceof Error ? e.message : "השמירה נכשלה");
      return false;
    }
  };

  const goTo = async (index: number) => {
    if (!(await persist())) return;
    setShowErrors(false);
    setSubmitNote("");
    setStepIndex(index);
  };

  const handleSubmit = async () => {
    if (!(await persist())) return;

    const firstIncomplete = view.unit.steps.findIndex(
      (s) => missingFields(s, answers[s.id] ?? {}).length > 0,
    );

    if (firstIncomplete >= 0) {
      setStepIndex(firstIncomplete);
      setShowErrors(true);
      setSubmitNote(
        `כדי להגיש צריך למלא את שדות החובה ב${theme.words.step} ${firstIncomplete + 1}.`,
      );
      return;
    }

    try {
      setSave("saving");
      setSaveMsg("שולח…");
      const next = await data.submitUnit(studentId, view.unit.id);
      onProgress(next);
      navigate("/student");
    } catch (e) {
      setSave("error");
      setSaveMsg(e instanceof Error ? e.message : "ההגשה נכשלה");
    }
  };

  return (
    <div className="stack stack--lg">
      <div className="stack stack--sm">
        <span className="card__eyebrow">
          {theme.words.unit} {view.index + 1} מתוך {views.length}
        </span>
        <div className="unit-review__head">
          <h1 className="page-title">{view.unit.title}</h1>
          <StatusPill status={view.status} />
        </div>
        {view.unit.goal && <p className="page-sub">{view.unit.goal}</p>}
      </div>

      {view.status === "returned" && view.progress.feedback && (
        <Banner tone="fix" title="משוב מהמורה — צריך תיקון">
          {view.progress.feedback}
        </Banner>
      )}
      {view.status === "submitted" && (
        <Banner tone="wait" title="ההגשה ממתינה לבדיקה">
          התשובות נעולות עד שהמורה תחזיר תשובה.
        </Banner>
      )}
      {view.status === "approved" && (
        <Banner tone="done" title="היחידה אושרה">
          {view.progress.feedback || "אפשר להמשיך הלאה."}
        </Banner>
      )}

      <div className="stack">
        <div className="steps-dots" role="list" aria-label={`התקדמות ב${theme.words.steps}`}>
          {view.unit.steps.map((s, i) => (
            <span
              key={s.id}
              role="listitem"
              aria-label={`${theme.words.step} ${i + 1}${
                isStepComplete(s, answers) ? " — מולאה" : ""
              }`}
              className={`steps-dots__dot${
                i === stepIndex
                  ? " steps-dots__dot--current"
                  : isStepComplete(s, answers)
                    ? " steps-dots__dot--done"
                    : ""
              }`}
            />
          ))}
        </div>

        <section className="card card--pad-lg station" aria-labelledby="station-title">
          <div className="stack stack--sm">
            <span className="card__eyebrow">
              {theme.words.step} {stepIndex + 1} מתוך {total}
            </span>
            <h2 className="card__title" id="station-title">
              {step.title}
            </h2>
          </div>

          <p className="station__prompt">{step.prompt}</p>
          {step.hint && <p className="station__hint">{step.hint}</p>}

          <div className="stack">
            {step.fields.map((field) => (
              <AnswerField
                key={field.id}
                field={field}
                value={values[field.id] ?? ""}
                readOnly={readOnly}
                error={
                  showErrors && missing.some((m) => m.id === field.id)
                    ? field.type === "choice"
                      ? "צריך לבחור אפשרות"
                      : `צריך למלא לפחות ${field.minChars ?? 1} תווים`
                    : undefined
                }
                onChange={(value) => setValue(field.id, value)}
              />
            ))}
          </div>

          {!readOnly && (
            <div className="btn-row btn-row--end" style={{ alignItems: "center" }}>
              <span
                className={`save-hint${
                  save === "saved" ? " save-hint--ok" : save === "error" ? " save-hint--err" : ""
                }`}
                aria-live="polite"
              >
                {saveMsg}
              </span>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={persist}
                disabled={save === "saving"}
              >
                שמירה
              </button>
            </div>
          )}
        </section>

        {submitNote && (
          <Banner tone="fix" title="חסר משהו">
            {submitNote}
          </Banner>
        )}
      </div>

      <div className="actionbar">
        {!isLast && (
          <button
            type="button"
            className="btn btn--accent btn--block"
            onClick={() => goTo(stepIndex + 1)}
            disabled={save === "saving"}
          >
            {`ל${theme.words.step} הבאה`}
          </button>
        )}

        {isLast && !readOnly && (
          <button
            type="button"
            className="btn btn--accent btn--block"
            onClick={handleSubmit}
            disabled={save === "saving"}
          >
            {view.status === "returned" ? "הגשה מחדש" : "שליחה לבדיקה"}
          </button>
        )}

        {view.status === "approved" && nextOpen && (
          <button
            type="button"
            className="btn btn--accent btn--block"
            onClick={() => navigate(`/student/unit/${nextView.unit.id}`)}
          >
            {`ל${theme.words.unit} הבאה`}
          </button>
        )}

        {stepIndex > 0 && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => goTo(stepIndex - 1)}
            disabled={save === "saving"}
          >
            {`ל${theme.words.step} הקודמת`}
          </button>
        )}
      </div>
    </div>
  );
}
