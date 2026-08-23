import { useCallback, useRef, useState } from "react";
import { CheckCircle2, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── פעולות הבדיקה: ציון + אישור, או החזרה לתיקון ─────────────────────────
//
// הכללים שהרכיב הזה שומר, כפי שאושרו:
//   · במצב "graded" אישור עובר דרך grade_and_approve, וציון מתחת לסף
//     (סף המשימה, ואם אין — 85) אינו יכול לאשר: השרת מסרב, והרכיב מכוון
//     מראש להחזרה לתיקון. המסלול הזה לא נגע.
//   · במצב "decision" אין ציון כלל. אישור הוא החלטה פדגוגית ועובר דרך
//     approve_submission עם משוב חובה. זה המסלול של היסטוריה כיתה ט,
//     שבה הרמזור מייצג מצב ולא ציון.
//   · החזרה לתיקון זהה בשני המצבים: return_for_revision, משוב בלבד.
//   · לכל פעולה מפתח אידמפוטנטי יציב שנשמר עד הצלחה: לחיצה כפולה או retry
//     אינם יוצרים ציון או סקירה כפולים (השרת ממילא בודק, זו שכבה שנייה).
//   · "בוצע" מוצג רק אחרי תשובת שרת אמיתית.

type Db = { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string; code?: string } | null }> };
const db = supabase as unknown as Db;

const KEY_NS = "wst.review.idem.";
const stableKey = (slot: string) => {
  try {
    const at = KEY_NS + slot;
    const cur = localStorage.getItem(at);
    if (cur && cur.length >= 8) return cur;
    const k = `${slot}-${crypto.randomUUID().replace(/-/g, "")}`.slice(0, 128);
    localStorage.setItem(at, k);
    return k;
  } catch {
    return `${slot}-${Date.now()}-${Math.random().toString(36).slice(2)}`.slice(0, 128);
  }
};
const clearKey = (slot: string) => { try { localStorage.removeItem(KEY_NS + slot); } catch { /* ignore */ } };

export type ReviewOutcome =
  | { kind: "approved"; score: number | null }
  | { kind: "returned" };

/** graded = ציון ושער. decision = ראיתי, אפשר להמשיך. */
export type ReviewMode = "graded" | "decision";

export default function ReviewActions({
  submissionId, revision, threshold = 85, mode = "graded", onDone,
}: {
  submissionId: string;
  revision: number;
  /** הסף שנפתר למשימה: pass_threshold אם קיים, אחרת 85. graded בלבד. */
  threshold?: number;
  mode?: ReviewMode;
  onDone: (o: ReviewOutcome) => void;
}) {
  const graded = mode === "graded";
  const [score, setScore] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<null | "approve" | "return">(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const n = Number(score);
  const scoreValid = score.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= 100;
  const feedbackValid = feedback.trim().length > 0;
  const belowThreshold = graded && scoreValid && n < threshold;

  const run = useCallback(async (action: "approve" | "return") => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(action); setError(null);

    const slot = `${submissionId}-r${revision}-${action}`;
    const idem = stableKey(slot);
    try {
      const { error: err } = action === "return"
        ? await db.rpc("return_for_revision", {
            p_submission: submissionId, p_feedback: feedback.trim(), p_idem_key: idem,
          })
        : graded
        ? await db.rpc("grade_and_approve", {
            p_submission: submissionId, p_score: n, p_feedback: feedback.trim(), p_idem_key: idem,
          })
        /* אין ציון, ולכן גם אין שער ציון: החלטת המורה היא הפעולה כולה. */
        : await db.rpc("approve_submission", {
            p_submission: submissionId, p_feedback: feedback.trim(), p_idem_key: idem,
          });
      if (err) {
        // פרטי המסד לקונסול בלבד; למסך הודעה כללית וברורה
        console.error("[review]", action, { code: err.code, message: err.message });
        setError(err.message.includes("score_below_threshold")
          ? `הציון מתחת לסף (${threshold}) — עבודה כזו מוחזרת לתיקון, לא מאושרת.`
          : err.message.includes("not_awaiting_review")
          ? "ההגשה כבר טופלה. רעננו את הרשימה."
          : "הפעולה לא הושלמה. אפשר לנסות שוב.");
        return;
      }
      clearKey(slot);
      onDone(action === "approve"
        ? { kind: "approved", score: graded ? n : null }
        : { kind: "returned" });
    } catch (e) {
      console.error("[review] unexpected", e);
      setError("הפעולה לא הושלמה. אפשר לנסות שוב.");
    } finally {
      setBusy(null);
      inFlight.current = false;
    }
  }, [submissionId, revision, n, feedback, threshold, graded, onDone]);

  return (
    <div className="trd-actions-panel" dir="rtl">
      {graded && (
        <div className="trd-grade-row">
          <label htmlFor="trd-score">
            ציון
            <span className="trd-threshold-hint">סף פתיחת השער: {threshold}</span>
          </label>
          <input
            id="trd-score" type="number" inputMode="numeric" min={0} max={100}
            value={score} onChange={e => setScore(e.target.value)}
            placeholder="0–100"
          />
        </div>
      )}

      <div className="trd-grade-row">
        <label htmlFor="trd-feedback">הערה לתלמידה</label>
        <textarea
          id="trd-feedback" rows={3} value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="מה עבד, ומה להשלים אם מחזירים לתיקון…"
        />
      </div>

      {belowThreshold && (
        <p className="trd-below-note">
          ציון {n} נמוך מהסף ({threshold}) — האפשרות היחידה היא החזרה לתיקון עם הסבר.
        </p>
      )}

      {error && (
        <p className="trd-action-error" role="alert">
          <AlertTriangle size={15} aria-hidden="true" /> {error}
        </p>
      )}

      <div className="trd-action-btns">
        <button
          type="button" className="trd-btn approve"
          disabled={busy !== null || !feedbackValid || (graded && (!scoreValid || belowThreshold))}
          onClick={() => run("approve")}
        >
          {busy === "approve" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
          {graded ? `אישור וציון ${scoreValid ? n : ""}` : "אישור"}
        </button>
        <button
          type="button" className="trd-btn return"
          disabled={busy !== null || !feedbackValid}
          onClick={() => run("return")}
        >
          {busy === "return" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={15} aria-hidden="true" />}
          החזרה לתיקון
        </button>
      </div>
    </div>
  );
}
