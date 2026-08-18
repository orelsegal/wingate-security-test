import { useMemo, useState } from "react";
import {
  AlertTriangle, Sparkles, FileText, CheckCircle2, RotateCcw, Undo2, Quote,
} from "lucide-react";
import {
  DEMO_SUBMISSIONS, STATE_LABEL, STATION_QUESTION,
  type DemoSubmission, type ReviewState,
} from "@/data/teacherReviewDemo";
import "@/styles/teacher-review-demo.css";

/**
 * תיבת בדיקות מורה + הצעת AI — הדגמה בלבד.
 *
 * מה אינטראקטיבי: מעבר בין הלשוניות, בחירת הגשה, עריכת המשוב,
 * שני כפתורי ההחלטה, ואיפוס. הכול ב-useState.
 *
 * מה אינו אמיתי: התלמידות, התשובות, הצעות ה-AI והציונים. אין קריאה
 * ל-Supabase, אין Edge Function, אין מודל AI ואין שמירה. ההחלטה משנה
 * מצב מקומי בלבד, והמסך אומר זאת במפורש בכל פעולה.
 */

type Decision = { kind: "approved" | "returned"; feedback: string } | null;

const TABS: { key: ReviewState; label: string }[] = [
  { key: "pending",  label: "ממתינות לבדיקה" },
  { key: "returned", label: "הוחזרו לתיקון" },
  { key: "reviewed", label: "נבדקו" },
];

const CONF_LABEL = { low: "ביטחון נמוך", medium: "ביטחון בינוני", high: "ביטחון גבוה" } as const;

export default function TeacherReviewDemoPage() {
  const [tab, setTab] = useState<ReviewState>("pending");
  // מצב מקומי לצורך ההדגמה: הגשה שהוכרעה עוברת לשונית, ותו לא.
  const [states, setStates] = useState<Record<string, ReviewState>>(
    Object.fromEntries(DEMO_SUBMISSIONS.map(s => [s.id, s.state])),
  );
  const [selectedId, setSelectedId] = useState<string | null>(DEMO_SUBMISSIONS[0].id);
  const [feedback, setFeedback] = useState("");
  const [decision, setDecision] = useState<Decision>(null);

  const counts = useMemo(() => {
    const c: Record<ReviewState, number> = { pending: 0, returned: 0, reviewed: 0 };
    Object.values(states).forEach(s => { c[s] += 1; });
    return c;
  }, [states]);

  const rows = DEMO_SUBMISSIONS.filter(s => states[s.id] === tab);
  // מכוון: הבחירה אינה מסוננת לפי הלשונית. אחרי החלטה ההגשה עוברת
  // ללשונית אחרת, והמסך חייב להישאר פתוח כדי שהמורה תראה מה קרה.
  const selected: DemoSubmission | undefined =
    DEMO_SUBMISSIONS.find(s => s.id === selectedId);

  const pick = (id: string) => {
    setSelectedId(id);
    setFeedback("");
    setDecision(null);
  };

  const decide = (kind: "approved" | "returned") => {
    if (!selected || feedback.trim().length === 0) return;
    setDecision({ kind, feedback: feedback.trim() });
    setStates(p => ({ ...p, [selected.id]: kind === "approved" ? "reviewed" : "returned" }));
  };

  const resetDemo = () => {
    setStates(Object.fromEntries(DEMO_SUBMISSIONS.map(s => [s.id, s.state])));
    setTab("pending");
    setSelectedId(DEMO_SUBMISSIONS[0].id);
    setFeedback("");
    setDecision(null);
  };

  return (
    <div className="trd">
      <div className="trd-demo-bar" role="status">
        <AlertTriangle size={15} aria-hidden="true" />
        הדגמה בלבד · לא נשמר ולא נשלח
      </div>

      <div className="trd-wrap">
        <header className="trd-head">
          <p className="trd-eyebrow">ספרות 30% · לרוץ עם מילים</p>
          <h1>בדיקת הגשות</h1>
          <p>
            כל התלמידות, התשובות והצעות ה־AI במסך הזה מומצאות. אין כאן חיבור למסד נתונים,
            אין מודל AI פעיל, ושום החלטה אינה נשמרת או נשלחת לאיש.
          </p>
        </header>

        {/* ── תיבת ההגשות ── */}
        <div className="trd-tabs" role="tablist" aria-label="מצב ההגשות">
          {TABS.map(t => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              className="trd-tab"
              onClick={() => {
                setTab(t.key);
                setDecision(null);
                setFeedback("");
                const first = DEMO_SUBMISSIONS.find(s => states[s.id] === t.key);
                setSelectedId(first ? first.id : null);
              }}
            >
              {t.label}
              <span className="n">{counts[t.key]}</span>
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="trd-empty">אין הגשות בקטגוריה הזאת כרגע.</p>
        ) : (
          <ul className="trd-list">
            {rows.map(s => (
              <li key={s.id}>
                <button
                  type="button"
                  className="trd-row"
                  aria-current={selectedId === s.id}
                  onClick={() => pick(s.id)}
                >
                  <span className="trd-avatar" aria-hidden="true">
                    {s.student.trim()[0]}
                  </span>
                  <span className="trd-row-body">
                    <span className="trd-name">{s.student}</span>
                    <span className="trd-sub">
                      <span>{s.className}</span>
                      <span className="dot" aria-hidden="true">·</span>
                      <span>תחנה {s.stationNo} · {s.station}</span>
                      <span className="dot" aria-hidden="true">·</span>
                      <span>{s.submittedAt}</span>
                      {s.revision > 1 && (
                        <>
                          <span className="dot" aria-hidden="true">·</span>
                          <span>הגשה {s.revision}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <span className={`trd-state ${states[s.id]}`}>{STATE_LABEL[states[s.id]]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* ── מסך הבדיקה ── */}
        {selected && (
          <section className="trd-review" aria-label={`בדיקת ההגשה של ${selected.student}`}>
            <div className="trd-review-head">
              <h2>{selected.student}</h2>
              <p className="trd-meta">
                <span>תחנה {selected.stationNo} · {selected.station}</span>
                <span className="dot" aria-hidden="true">·</span>
                <span>{selected.className}</span>
                <span className="dot" aria-hidden="true">·</span>
                <span>הוגש {selected.submittedAt}</span>
              </p>
            </div>

            <p className="trd-question">
              <b>המשימה שהוצגה לתלמידה</b>
              {STATION_QUESTION}
            </p>

            <div className="trd-cols">
              {/* תשובת התלמידה */}
              <div>
                <h3 className="trd-panel-h">
                  <FileText size={15} aria-hidden="true" />
                  תשובת התלמידה
                </h3>
                <div className="trd-answer">{selected.answer}</div>
              </div>

              {/* הצעת AI */}
              <div>
                <h3 className="trd-panel-h">
                  <Sparkles size={15} aria-hidden="true" />
                  הצעה לבדיקה
                </h3>
                <div className="trd-ai">
                  <span className="trd-ai-tag">
                    <Sparkles size={12} aria-hidden="true" />
                    הצעת AI · טיוטה למורה
                  </span>

                  <h4>נקודות חוזק</h4>
                  <ul>{selected.ai.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>

                  <h4>מה דורש חידוד</h4>
                  <ul>{selected.ai.needsWork.map((s, i) => <li key={i}>{s}</li>)}</ul>

                  <h4>
                    <Quote size={13} aria-hidden="true" style={{ display: "inline", verticalAlign: "-2px" }} />
                    {" "}מתוך תשובת התלמידה
                  </h4>
                  {selected.ai.citations.map((c, i) => (
                    <p className="trd-quote" key={i}>„{c}”</p>
                  ))}

                  <h4>הערכה לפי המחוון</h4>
                  <div className="trd-rubric">
                    {selected.ai.rubric.map(r => (
                      <div className="trd-crit" key={r.criterion}>
                        <span className="trd-crit-name">{r.criterion}</span>
                        <span className="trd-crit-level">{r.level}</span>
                        <span className="trd-crit-score">{r.suggested}/{r.points}</span>
                        <span className="trd-crit-note">{r.note}</span>
                      </div>
                    ))}
                  </div>

                  <p className="trd-total">
                    <span>ציון מוצע</span>
                    <b>{selected.ai.suggestedTotal}</b>
                    <span>מתוך {selected.ai.maxTotal}</span>
                    <span className="hint">
                      המלצה בלבד. הציון אינו נרשם בשום מקום ואינו נראה לתלמידה.
                    </span>
                  </p>

                  <span className={`trd-conf ${selected.ai.confidence}`}>
                    {CONF_LABEL[selected.ai.confidence]}
                  </span>
                  <p className="trd-conf-note">{selected.ai.confidenceNote}</p>

                  <p className="trd-ai-guard">
                    ההצעה לא נשלחת לתלמידה ללא החלטת המורה.
                  </p>
                </div>
              </div>

              {/* החלטת המורה */}
              <div className="trd-decision">
                <label htmlFor="trd-feedback">המשוב שיישלח לתלמידה</label>
                <textarea
                  id="trd-feedback"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="כתבי כאן את המשוב, או התחילי מהטיוטה של ה־AI וערכי אותה."
                />
                <p className="trd-prefill">
                  <button type="button" onClick={() => setFeedback(selected.ai.draftFeedback)}>
                    העתקת טיוטת ה־AI לשדה העריכה
                  </button>
                </p>

                <div className="trd-actions">
                  <button
                    type="button"
                    className="trd-btn approve"
                    disabled={feedback.trim().length === 0}
                    onClick={() => decide("approved")}
                  >
                    <CheckCircle2 size={17} aria-hidden="true" />
                    אישור ומשוב לתלמידה
                  </button>
                  <button
                    type="button"
                    className="trd-btn return"
                    disabled={feedback.trim().length === 0}
                    onClick={() => decide("returned")}
                  >
                    <Undo2 size={17} aria-hidden="true" />
                    החזרה לתיקון
                  </button>
                  <button type="button" className="trd-btn reset" onClick={resetDemo}>
                    <RotateCcw size={16} aria-hidden="true" />
                    איפוס ההדגמה
                  </button>
                </div>

                {decision && (
                  <p className={`trd-result ${decision.kind}`} role="status" aria-live="polite">
                    {decision.kind === "approved"
                      ? <CheckCircle2 size={17} aria-hidden="true" />
                      : <Undo2 size={17} aria-hidden="true" />}
                    <span>
                      <b>
                        {decision.kind === "approved"
                          ? "בהדגמה: ההגשה סומנה כנבדקה"
                          : "בהדגמה: ההגשה סומנה כהוחזרה לתיקון"}
                      </b>
                      ההגשה עברה ללשונית המתאימה במסך הזה בלבד.
                      <span className="demo">
                        לא נשמר ולא נשלח. אין מסד נתונים מאחורי המסך הזה, והתלמידה אינה רואה דבר.
                      </span>
                    </span>
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
