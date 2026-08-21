import { useNavigate } from "react-router-dom";
import { useApp } from "../data/appContext";
import { useAsync } from "../core/logic/useAsync";
import {
  buildUnitViews,
  resumeStepIndex,
  summarize,
  type UnitView,
} from "../core/logic/progress";
import { StatusPill } from "../core/ui/StatusPill";
import { ProgressBar } from "../core/ui/ProgressBar";
import { Banner } from "../core/ui/Banner";
import { ErrorBlock, LoadingBlock } from "../core/ui/states";
import { Shell } from "../app/Shell";

function ctaLabel(view: UnitView): string {
  switch (view.status) {
    case "not_started":
      return "התחילי";
    case "returned":
      return "תיקון והגשה מחדש";
    case "submitted":
      return "צפייה בתשובות";
    default:
      return "המשך";
  }
}

export function StudentHome() {
  const { course, theme, data, session } = useApp();
  const navigate = useNavigate();
  const studentId = session?.studentId ?? "";
  const state = useAsync(() => data.getProgress(studentId), [studentId]);

  return (
    <Shell>
      {state.loading && <LoadingBlock rows={4} />}
      {state.error && <ErrorBlock message={state.error} onRetry={state.reload} />}

      {state.data && (() => {
        const progress = state.data;
        const views = buildUnitViews(course, progress);
        const summary = summarize(course, progress);
        const current = summary.current;

        return (
          <div className="stack stack--lg">
            <div className="stack stack--sm">
              <h1 className="page-title">שלום, {session?.name}</h1>
              <p className="page-sub">{course.intro}</p>
            </div>

            <section className="continue" aria-labelledby="continue-title">
              <div className="continue__head">
                <span className="card__eyebrow" id="continue-title">
                  {current ? "ממשיכים מהמקום שבו עצרת" : "סיימת את המסלול"}
                </span>
                {current ? (
                  <>
                    <span className="continue__unit">{current.unit.title}</span>
                    <span className="continue__where">
                      {theme.words.step} {resumeStepIndex(current) + 1} מתוך {current.totalSteps}
                      {current.unit.subtitle ? ` · ${current.unit.subtitle}` : ""}
                    </span>
                  </>
                ) : (
                  <span className="continue__unit">כל היחידות אושרו</span>
                )}
              </div>

              {current?.status === "returned" && (
                <Banner tone="fix" title="היחידה חזרה לתיקון">
                  {current.progress.feedback}
                </Banner>
              )}
              {current?.status === "submitted" && (
                <Banner tone="wait" title="ההגשה ממתינה לבדיקה">
                  אפשר לצפות בתשובות, אבל אי אפשר לערוך עד שהמורה תחזיר תשובה.
                </Banner>
              )}

              <ProgressBar
                value={summary.approved}
                max={summary.total}
                label={`${summary.approved} מתוך ${summary.total} ${theme.words.units} אושרו`}
              />

              {current && (
                <button
                  type="button"
                  className="btn btn--accent btn--block"
                  onClick={() => navigate(`/student/unit/${current.unit.id}`)}
                >
                  {ctaLabel(current)}
                </button>
              )}
            </section>

            <section aria-labelledby="map-title">
              <div className="stack stack--sm" style={{ marginBlockEnd: "var(--sp-4)" }}>
                <h2 className="section-title" id="map-title" style={{ margin: 0 }}>
                  {theme.words.mapTitle}
                </h2>
                <p className="card__text">{theme.words.mapSubtitle}</p>
              </div>

              <ul className="map">
                {views.map((view) => {
                  const locked = view.status === "locked";
                  const isCurrent = current?.unit.id === view.unit.id;
                  return (
                    <li className="map__row" key={view.unit.id}>
                      <span className="map__rail" aria-hidden="true">
                        <span
                          className={`map__node${
                            view.status === "approved"
                              ? " map__node--done"
                              : isCurrent
                                ? " map__node--current"
                                : ""
                          }`}
                        />
                      </span>

                      <button
                        type="button"
                        className={`unit-row${locked ? " unit-row--locked" : ""}${
                          isCurrent ? " unit-row--current" : ""
                        }`}
                        aria-disabled={locked}
                        disabled={locked}
                        onClick={() => !locked && navigate(`/student/unit/${view.unit.id}`)}
                      >
                        <span className="unit-row__top">
                          <span className="unit-row__title">
                            <span className="unit-row__index">
                              {theme.words.unit} {view.index + 1}
                            </span>
                            <br />
                            {view.unit.title}
                          </span>
                          <StatusPill status={view.status} />
                        </span>
                        <span className="unit-row__meta">
                          {locked
                            ? "נפתחת אחרי אישור היחידה הקודמת"
                            : `${view.completedSteps} מתוך ${view.totalSteps} ${theme.words.steps} מולאו`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        );
      })()}
    </Shell>
  );
}
