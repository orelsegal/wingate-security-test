import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../data/appContext";
import { useAsync } from "../core/logic/useAsync";
import { ALL_STATUSES, statusLabel, summarize } from "../core/logic/progress";
import type { UnitStatus } from "../data/types";
import { StatusPill } from "../core/ui/StatusPill";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "../core/ui/states";
import { Shell } from "../app/Shell";

/** Priority for the teacher's eye: what needs her first. */
const ORDER: UnitStatus[] = ["submitted", "returned", "in_progress", "not_started", "approved"];

export function TeacherStudents() {
  const { course, theme, data, students } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<UnitStatus | "all">("all");

  const state = useAsync(() => data.getAllProgress(), []);

  const rows = useMemo(() => {
    if (!state.data) return [];
    return students
      .map((student) => {
        const progress = state.data![student.id];
        const summary = summarize(course, progress);
        const status: UnitStatus = summary.finished
          ? "approved"
          : (summary.current?.status ?? "not_started");
        return { student, summary, status };
      })
      .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  }, [state.data, students, course]);

  const counts = useMemo(() => {
    const map = new Map<UnitStatus, number>();
    for (const row of rows) map.set(row.status, (map.get(row.status) ?? 0) + 1);
    return map;
  }, [rows]);

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <Shell wide>
      <div className="stack stack--lg">
        <div className="stack stack--sm">
          <h1 className="page-title">התלמידות שלי</h1>
          <p className="page-sub">
            {theme.subjectName} · {course.units.length} {theme.words.units} במסלול
          </p>
        </div>

        {state.loading && <LoadingBlock rows={4} />}
        {state.error && <ErrorBlock message={state.error} onRetry={state.reload} />}

        {state.data && (
          <>
            <div className="summary-grid">
              {(["submitted", "returned", "in_progress", "approved"] as UnitStatus[]).map((s) => (
                <div className="summary-tile" key={s}>
                  <span className="summary-tile__num">{counts.get(s) ?? 0}</span>
                  <span className="summary-tile__label">{statusLabel(s, "teacher")}</span>
                </div>
              ))}
            </div>

            <div className="filters" role="group" aria-label="סינון לפי סטטוס">
              <button
                type="button"
                className={`chip${filter === "all" ? " chip--on" : ""}`}
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                הכול ({rows.length})
              </button>
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip${filter === s ? " chip--on" : ""}`}
                  aria-pressed={filter === s}
                  onClick={() => setFilter(s)}
                >
                  {statusLabel(s, "teacher")} ({counts.get(s) ?? 0})
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <EmptyBlock
                title="אין תלמידות בסטטוס הזה"
                text="אפשר לבחור סטטוס אחר או לחזור לתצוגת הכול."
                action={
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setFilter("all")}
                  >
                    הצגת הכול
                  </button>
                }
              />
            ) : (
              <ul className="student-list">
                {visible.map(({ student, summary, status }) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      className="student-row"
                      onClick={() => navigate(`/teacher/${student.id}`)}
                    >
                      <span className="student-row__id">
                        <span className="avatar" aria-hidden="true">
                          {student.name.slice(0, 1)}
                        </span>
                        <span>
                          <span className="student-row__name">{student.name}</span>
                          {student.group && (
                            <span className="student-row__meta" style={{ display: "block" }}>
                              {student.group}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="student-row__meta">
                        {summary.approved} מתוך {summary.total} {theme.words.units} אושרו
                        {summary.current && !summary.finished
                          ? ` · כרגע: ${summary.current.unit.title}`
                          : ""}
                      </span>
                      <StatusPill status={status} audience="teacher" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
