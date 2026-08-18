import { useState } from "react";
import { Loader2, Inbox, AlertTriangle, FileText, RefreshCw } from "lucide-react";
import { useSubmissionInbox, type InboxRow } from "@/hooks/useSubmissionInbox";
import "@/styles/teacher-review-demo.css";

/**
 * /teacher-review — תיבת ההגשות האמיתית.
 *
 * קוראת מ-submissions דרך RLS בלבד. אין נתוני דמה, אין AI, ואין עדיין
 * אישור או החזרה לתיקון: המסך הזה קורא, ולא כותב.
 *
 * /teacher-review-demo נשאר כפי שהוא, במסך נפרד, להצגה.
 */

const STATUS_LABEL: Record<string, string> = {
  awaiting_review: "ממתינה לבדיקה",
  resubmitted_awaiting: "הוגשה מחדש",
};

/** תשובת התלמידה היא jsonb. מציגים את מה שיש, בלי להמציא מבנה. */
function AnswerBody({ content }: { content: unknown }) {
  if (content == null) return <p className="trd-empty">לא נמצאה גרסה שניתן להציג.</p>;
  if (typeof content === "string") return <div className="trd-answer">{content}</div>;
  if (typeof content === "object") {
    const entries = Object.entries(content as Record<string, unknown>)
      .filter(([, v]) => typeof v === "string" && v.trim().length > 0);
    if (entries.length === 0) {
      return <p className="trd-empty">הגרסה שנמסרה אינה מכילה טקסט.</p>;
    }
    return (
      <div className="trd-answer">
        {entries.map(([k, v]) => (
          <div key={k} style={{ marginBottom: "0.9rem" }}>
            <b style={{ display: "block", fontSize: ".78rem", opacity: .7 }}>{k}</b>
            {String(v)}
          </div>
        ))}
      </div>
    );
  }
  return <div className="trd-answer">{String(content)}</div>;
}

export default function TeacherReviewInboxPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useSubmissionInbox();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows: InboxRow[] = data ?? [];
  const selected = rows.find(r => r.id === selectedId) ?? null;

  return (
    <div className="trd">
      <div className="trd-wrap">
        <header className="trd-head">
          <p className="trd-eyebrow">אקדמיית וינגייט</p>
          <h1>הגשות לבדיקה</h1>
          <p>
            ההגשות שהתלמידות שלך מסרו וממתינות לבדיקה. המסך קורא בלבד:
            אישור והחזרה לתיקון עדיין לא מחוברים.
          </p>
        </header>

        {/* ── טעינה ── */}
        {isLoading && (
          <p className="trd-empty" role="status" aria-live="polite">
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            <br />טוען הגשות…
          </p>
        )}

        {/* ── שגיאה ── */}
        {isError && (
          <div className="trd-result returned" role="alert">
            <AlertTriangle size={17} aria-hidden="true" />
            <span>
              <b>לא הצלחנו לטעון את ההגשות</b>
              {(error as Error)?.message || "שגיאה לא ידועה"}
              <span className="demo">
                לא בוצע שינוי. אפשר לנסות שוב, ואם זה חוזר כדאי לדווח.
              </span>
            </span>
          </div>
        )}

        {/* ── ריק, באמת ── */}
        {!isLoading && !isError && rows.length === 0 && (
          <p className="trd-empty">
            <Inbox size={22} aria-hidden="true" />
            <br />
            אין כרגע הגשות שממתינות לבדיקה.
            <br />
            <span style={{ fontSize: ".85rem", opacity: .75 }}>
              כשתלמידה תמסור תחנה, היא תופיע כאן.
            </span>
          </p>
        )}

        {/* ── הרשימה ── */}
        {!isLoading && !isError && rows.length > 0 && (
          <>
            <div className="trd-tabs">
              <span className="trd-tab" aria-selected="true" role="tab">
                ממתינות לבדיקה <span className="n">{rows.length}</span>
              </span>
              <button
                type="button"
                className="trd-tab"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw size={14} aria-hidden="true" />
                {isFetching ? "מרענן…" : "רענון"}
              </button>
            </div>

            <ul className="trd-list">
              {rows.map(r => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="trd-row"
                    aria-current={selectedId === r.id}
                    onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                  >
                    <span className="trd-avatar" aria-hidden="true">
                      {(r.student?.full_name ?? "?").trim()[0]}
                    </span>
                    <span className="trd-row-body">
                      <span className="trd-name">
                        {r.student?.full_name ?? "תלמידה שאינה זמינה לצפייה"}
                      </span>
                      <span className="trd-sub">
                        {r.student?.class_name && (
                          <>
                            <span>{r.student.class_name}</span>
                            <span className="dot" aria-hidden="true">·</span>
                          </>
                        )}
                        <span>{r.task?.title ?? "משימה לא ידועה"}</span>
                        <span className="dot" aria-hidden="true">·</span>
                        <span>{new Date(r.submitted_at).toLocaleString("he-IL")}</span>
                        {r.revision > 1 && (
                          <>
                            <span className="dot" aria-hidden="true">·</span>
                            <span>הגשה {r.revision}</span>
                          </>
                        )}
                      </span>
                    </span>
                    <span className="trd-state pending">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ── ההגשה שנבחרה ── */}
        {selected && (
          <section className="trd-review" aria-label={`הגשה של ${selected.student?.full_name ?? "תלמידה"}`}>
            <div className="trd-review-head">
              <h2>{selected.student?.full_name ?? "תלמידה שאינה זמינה לצפייה"}</h2>
              <p className="trd-meta">
                <span>{selected.task?.title ?? "משימה לא ידועה"}</span>
                <span className="dot" aria-hidden="true">·</span>
                <span>{STATUS_LABEL[selected.status] ?? selected.status}</span>
                <span className="dot" aria-hidden="true">·</span>
                <span>הוגש {new Date(selected.submitted_at).toLocaleString("he-IL")}</span>
              </p>
            </div>

            <div className="trd-cols">
              <div>
                <h3 className="trd-panel-h">
                  <FileText size={15} aria-hidden="true" />
                  התשובה שנמסרה
                  {selected.latest && <span style={{ fontWeight: 400, opacity: .7 }}>
                    {" "}· גרסה {selected.latest.revision}
                  </span>}
                </h3>
                <AnswerBody content={selected.latest?.content ?? null} />
              </div>
            </div>

            <p className="trd-empty" style={{ textAlign: "start", paddingInline: 0 }}>
              אישור והחזרה לתיקון עדיין אינם מחוברים במסך הזה.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
