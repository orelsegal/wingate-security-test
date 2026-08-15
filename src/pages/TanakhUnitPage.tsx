import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, ChevronLeft, CloudOff, PenLine, Target } from "lucide-react";
import { MOVES, TANAKH_UNITS, UNIT1, TANAKH_DRAFT_KEY } from "@/tanakh/tanakhData";

/**
 * תנ״ך · יחידה 1 — פרוסה אנכית של אב־טיפוס.
 * מה אמיתי כאן: תוכן היחידה (מחומרי ההוראה) והמשימה עצמה.
 * מה מסומן במפורש: שמירה מקומית במכשיר בלבד (אין שרת), ומשוב מורה
 * כרכיב עתידי. שום דבר אינו מוצג כ"נשמר במערכת" כשהוא לא.
 */

interface DraftShape {
  glossary: Record<string, string>;
  answers: string[];
  savedAt?: string;
}

const emptyDraft = (): DraftShape => ({ glossary: {}, answers: ["", ""] });

const loadDraft = (): DraftShape => {
  try {
    const raw = localStorage.getItem(TANAKH_DRAFT_KEY);
    if (raw) return { ...emptyDraft(), ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return emptyDraft();
};

const TanakhUnitPage = () => {
  const navigate = useNavigate();
  const { unitId } = useParams<{ unitId: string }>();
  const uid = Number(unitId || 0);
  const unit = TANAKH_UNITS.find(u => u.id === uid);
  const base = `/subjects/${encodeURIComponent("תנ״ך")}/tanakh-30`;

  const [activeMove, setActiveMove] = useState<string>("a");
  const [draft, setDraft] = useState<DraftShape>(loadDraft);
  const [savedTick, setSavedTick] = useState<string | null>(loadDraft().savedAt || null);

  // device-only draft, saved a moment after typing stops — honestly labeled below
  useEffect(() => {
    const t = setTimeout(() => {
      const hasContent = Object.values(draft.glossary).some(v => v?.trim()) || draft.answers.some(a => a?.trim());
      if (!hasContent) return;
      const savedAt = new Date().toISOString();
      try {
        localStorage.setItem(TANAKH_DRAFT_KEY, JSON.stringify({ ...draft, savedAt }));
        setSavedTick(savedAt);
      } catch { /* storage unavailable */ }
    }, 600);
    return () => clearTimeout(t);
  }, [draft]);

  const savedLabel = useMemo(() => {
    if (!savedTick) return null;
    const d = new Date(savedTick);
    return `${d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`;
  }, [savedTick]);

  if (!unit) {
    return (
      <div className="p-10 text-center" dir="rtl">
        <p className="text-[13px] text-muted-foreground">היחידה לא נמצאה.</p>
        <button onClick={() => navigate(base)} className="mt-3 text-[12px] text-primary hover:underline">חזרה למפת השנה</button>
      </div>
    );
  }

  /* units 2-9: honest stub, no fake content */
  if (unit.id !== 1) {
    return (
      <div className="min-h-full bg-[hsl(42,45%,96%)]" dir="rtl">
        <div className="p-6 md:p-10 max-w-[760px] mx-auto text-center">
          <p className="text-[11px] text-[hsl(230,25%,45%)]">{unit.chapters}</p>
          <h1 className="text-[22px] font-black text-[hsl(232,35%,20%)] mt-1">יחידה {unit.id} · {unit.title}</h1>
          <p className="text-[13px] text-[hsl(230,15%,40%)] mt-3">{unit.question}</p>
          <div className="mt-6 rounded-2xl border border-[hsl(40,25%,85%)] bg-[hsl(42,35%,98%)] p-6">
            <p className="text-[13px] text-[hsl(230,15%,40%)]">
              תוכן היחידה קיים בחומרי ההוראה וייבנה באפליקציה בהמשך.
              בפרוסה הנוכחית יחידה 1 בלבד נבנתה במלואה.
            </p>
          </div>
          <button onClick={() => navigate(base)}
            className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[hsl(232,45%,32%)] hover:underline">
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
            חזרה למפת השנה
          </button>
        </div>
      </div>
    );
  }

  const move = MOVES.find(m => m.id === activeMove)!;

  return (
    <div className="min-h-full bg-[hsl(42,45%,96%)]" dir="rtl">
      <div className="p-5 md:p-8 max-w-[860px] mx-auto">

        {/* header */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <button onClick={() => navigate(base)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[hsl(40,25%,82%)] bg-white/60 text-[11.5px] text-[hsl(230,15%,35%)] hover:bg-white transition-colors">
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.7} />
            מפת השנה
          </button>
          <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full border bg-indigo-50 text-indigo-900 border-indigo-200">
            אב־טיפוס · {UNIT1.track}
          </span>
        </div>

        <header className="mb-6">
          <p className="text-[11px] text-[hsl(230,25%,45%)] font-medium">{unit.chapters}</p>
          <h1 className="text-[24px] md:text-[28px] font-black text-[hsl(232,40%,18%)] leading-tight mt-0.5">
            יחידה 1 · {unit.title}
          </h1>
          <p className="text-[14px] text-[hsl(232,30%,30%)] font-semibold mt-2 leading-relaxed">
            {unit.question}
          </p>
        </header>

        {/* five-move stepper */}
        <nav className="flex gap-1.5 overflow-x-auto pb-2 mb-5 -mx-1 px-1" aria-label="מהלכי היחידה">
          {MOVES.map(m => {
            const isActive = m.id === activeMove;
            return (
              <button key={m.id}
                onClick={() => setActiveMove(m.id)}
                aria-current={isActive ? "step" : undefined}
                className={[
                  "shrink-0 px-3.5 py-2 rounded-xl border text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(232,45%,45%)]",
                  isActive
                    ? "bg-[hsl(232,45%,32%)] text-white border-[hsl(232,45%,32%)]"
                    : "bg-white/70 text-[hsl(232,25%,32%)] border-[hsl(40,25%,84%)] hover:bg-white",
                ].join(" ")}
              >
                {m.num}׳ · {m.title}
              </button>
            );
          })}
        </nav>

        {/* move body */}
        <div className="rounded-3xl border border-[hsl(40,30%,84%)] bg-[hsl(42,40%,98%)] shadow-sm p-5 md:p-7 mb-5">
          <p className="text-[11px] text-[hsl(38,50%,38%)] font-semibold mb-1">"{move.tag}"</p>

          {activeMove === "a" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-[16px] font-bold text-[hsl(232,35%,20%)] mb-2">על היחידה</h2>
                <p className="text-[13px] text-[hsl(230,15%,32%)] leading-relaxed">{UNIT1.about}</p>
                <p className="text-[13px] text-[hsl(230,15%,32%)] leading-relaxed mt-2"><span className="font-semibold">בשפה שלנו:</span> {UNIT1.inOurWords}</p>
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-[hsl(232,35%,22%)] mb-1.5 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" strokeWidth={1.8} /> מטרות היחידה
                </h3>
                <ul className="space-y-1">
                  {UNIT1.goals.map(g => (
                    <li key={g} className="text-[12.5px] text-[hsl(230,15%,32%)] flex items-start gap-1.5">
                      <span className="text-[hsl(38,55%,45%)] mt-0.5">·</span>{g}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-[hsl(232,35%,22%)] mb-1.5">מילון מונחים</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {UNIT1.glossary.map(g => (
                    <div key={g.term} className="rounded-xl bg-white/70 border border-[hsl(40,25%,88%)] p-3">
                      <dt className="text-[12.5px] font-bold text-[hsl(232,35%,25%)]">{g.term}</dt>
                      <dd className="text-[11.5px] text-[hsl(230,12%,38%)] mt-0.5 leading-relaxed">{g.def}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-[hsl(232,35%,22%)] mb-1.5">משימה מקדימה · לפני שמתחילים</h3>
                <ol className="space-y-1">
                  {UNIT1.preTask.map((s, i) => (
                    <li key={s} className="text-[12.5px] text-[hsl(230,15%,32%)] flex items-start gap-2">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-[hsl(42,45%,90%)] border border-[hsl(40,30%,80%)] text-[10px] font-bold text-[hsl(232,30%,30%)] flex items-center justify-center">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
              <button onClick={() => setActiveMove("b")}
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white bg-[hsl(232,45%,32%)] hover:bg-[hsl(232,45%,26%)] px-5 py-2.5 rounded-full transition-colors">
                למהלך ב׳ · הטקסט המקראי
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          )}

          {activeMove === "b" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-[16px] font-bold text-[hsl(232,35%,20%)] mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" strokeWidth={1.8} /> המקור המקראי · פתיחת בראשית
                </h2>
                <blockquote className="rounded-2xl bg-white border border-[hsl(40,30%,85%)] p-4 md:p-5 text-[15px] md:text-[16px] leading-loose text-[hsl(232,35%,20%)]" style={{ fontFamily: "'Frank Ruhl Libre', 'Noto Serif Hebrew', serif" }}>
                  {UNIT1.textOpening}
                </blockquote>
                <p className="text-[10px] text-[hsl(230,10%,52%)] mt-1.5">{UNIT1.textCredit} · מוצגים פסוקי הפתיחה; הפרקים המלאים בדפי היחידה</p>
              </div>

              {/* ── the real task of this slice: leg 1, language ── */}
              <div className="rounded-2xl border-2 border-[hsl(38,55%,70%)] bg-[hsl(45,70%,96%)] p-4 md:p-5">
                <p className="text-[10.5px] font-bold text-[hsl(38,55%,35%)]">{UNIT1.langTask.leg}</p>
                <h3 className="text-[15px] font-bold text-[hsl(232,35%,20%)] mt-0.5">{UNIT1.langTask.title}</h3>
                <p className="text-[12px] text-[hsl(230,15%,38%)] mt-1 mb-3">{UNIT1.langTask.instruction}</p>

                <div className="space-y-2 mb-4">
                  {UNIT1.langTask.entries.map(term => (
                    <div key={term} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1.5 sm:gap-3 items-center">
                      <span className="text-[12.5px] font-bold text-[hsl(232,35%,25%)]">{term}</span>
                      <input
                        type="text"
                        dir="rtl"
                        value={draft.glossary[term] || ""}
                        onChange={e => setDraft(d => ({ ...d, glossary: { ...d.glossary, [term]: e.target.value } }))}
                        placeholder="המשמעות במילים שלכם..."
                        aria-label={`משמעות הביטוי ${term}`}
                        className="w-full rounded-lg border border-[hsl(40,25%,80%)] bg-white px-3 py-2 text-[13px] text-[hsl(232,35%,20%)] placeholder:text-[hsl(230,10%,62%)] focus:outline-none focus:ring-2 focus:ring-[hsl(232,45%,55%)]"
                      />
                    </div>
                  ))}
                </div>

                <p className="text-[12px] font-bold text-[hsl(232,35%,25%)] mb-2">שאלות הבנה · לשון היחידה</p>
                {UNIT1.langTask.questions.map((q, i) => (
                  <div key={i} className="mb-3">
                    <p className="text-[12px] text-[hsl(230,15%,32%)] leading-relaxed mb-1.5">{i + 1}. {q}</p>
                    <textarea
                      dir="rtl"
                      rows={3}
                      value={draft.answers[i] || ""}
                      onChange={e => setDraft(d => { const a = [...d.answers]; a[i] = e.target.value; return { ...d, answers: a }; })}
                      placeholder="מקום לתשובה..."
                      aria-label={`תשובה לשאלה ${i + 1}`}
                      className="w-full rounded-lg border border-[hsl(40,25%,80%)] bg-white px-3 py-2 text-[13px] text-[hsl(232,35%,20%)] placeholder:text-[hsl(230,10%,62%)] resize-y focus:outline-none focus:ring-2 focus:ring-[hsl(232,45%,55%)]"
                    />
                  </div>
                ))}

                {/* honest save + feedback boundary */}
                <div className="rounded-xl bg-white/80 border border-[hsl(40,25%,85%)] p-3 mt-2 space-y-1.5">
                  <p className="text-[11px] text-[hsl(230,15%,35%)] flex items-center gap-1.5">
                    <CloudOff className="h-3.5 w-3.5 text-[hsl(38,55%,40%)]" strokeWidth={1.8} />
                    {savedLabel
                      ? `טיוטה נשמרה במכשיר זה בלבד (${savedLabel}). אין עדיין שמירה בשרת.`
                      : "הכתיבה נשמרת כטיוטה במכשיר זה בלבד. אין עדיין שמירה בשרת."}
                  </p>
                  <p className="text-[11px] text-[hsl(230,15%,35%)] flex items-center gap-1.5">
                    <PenLine className="h-3.5 w-3.5 text-indigo-500" strokeWidth={1.8} />
                    <span><span className="font-semibold">רכיב עתידי:</span> הגשה למורה ומשוב לימודי יופיעו כאן כשהיחידה תחובר למנוע הלמידה. הדגמת מחזור המשוב המלא קיימת בפיילוט אזרחות 70.</span>
                  </p>
                </div>
              </div>

              <button onClick={() => setActiveMove("c")}
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white bg-[hsl(232,45%,32%)] hover:bg-[hsl(232,45%,26%)] px-5 py-2.5 rounded-full transition-colors">
                למהלך ג׳ · עיון ופרשנות
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          )}

          {(activeMove === "c" || activeMove === "d") && (
            <div className="space-y-4">
              <h2 className="text-[16px] font-bold text-[hsl(232,35%,20%)]">{move.num}׳ · {move.title}</h2>
              <p className="text-[13px] text-[hsl(230,15%,32%)] leading-relaxed">
                {activeMove === "c" ? UNIT1.moveHighlights.c : UNIT1.moveHighlights.d}
              </p>
              <p className="text-[11px] text-[hsl(230,10%,50%)]">
                תקציר מתוך דפי היחידה. המהלך המלא, כולל לשון רש״י והמדרש במלואם, נמצא בחומרי ההוראה וייבנה בשלב הבא.
              </p>
              <button onClick={() => setActiveMove(activeMove === "c" ? "d" : "e")}
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white bg-[hsl(232,45%,32%)] hover:bg-[hsl(232,45%,26%)] px-5 py-2.5 rounded-full transition-colors">
                {activeMove === "c" ? "למהלך ד׳ · ערכים ומעורבות" : "למהלך ה׳ · משימות וכתיבה"}
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          )}

          {activeMove === "e" && (
            <div className="space-y-4">
              <h2 className="text-[16px] font-bold text-[hsl(232,35%,20%)]">ה׳ · משימות וכתיבה</h2>
              <p className="text-[12.5px] text-[hsl(230,15%,32%)] leading-relaxed">{UNIT1.moveHighlights.e}</p>
              <div className="rounded-2xl bg-white border border-[hsl(40,30%,85%)] p-4">
                <p className="text-[11px] font-bold text-[hsl(38,55%,35%)] mb-1">✍️ רגל 4 · כתיבה מנומקת — התוצר להגשה</p>
                <p className="text-[13px] text-[hsl(232,30%,25%)] leading-relaxed">{UNIT1.finalTask}</p>
              </div>
              <div>
                <p className="text-[12px] font-bold text-[hsl(232,35%,25%)] mb-1.5">מחוון ההגשה</p>
                <ul className="space-y-1">
                  {UNIT1.rubric.map(r => (
                    <li key={r} className="text-[12px] text-[hsl(230,15%,32%)] flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(150,35%,42%)] mt-0.5 shrink-0" strokeWidth={1.8} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-[11px] text-[hsl(230,10%,50%)]">
                כתיבת התוצר והגשתו יחוברו למנוע הלמידה בשלב הבא; בפרוסה זו התוצר מוצג לקריאה בלבד.
              </p>
            </div>
          )}
        </div>

        {/* clear next action */}
        <div className="rounded-2xl border border-[hsl(232,25%,82%)] bg-indigo-50/60 p-4 flex items-center justify-between gap-3 mb-8">
          <div>
            <p className="text-[12.5px] font-bold text-[hsl(232,35%,22%)]">הפעולה הבאה</p>
            <p className="text-[11.5px] text-[hsl(230,15%,40%)] mt-0.5">
              {activeMove === "a" ? "לקרוא את פתיחת הפרק ולמלא את מילון העבודה במהלך ב׳"
                : activeMove === "b" ? "להשלים את מילון העבודה ושתי שאלות ההבנה"
                : "להמשיך במהלכי היחידה עד התוצר להגשה"}
            </p>
          </div>
          {activeMove !== "b" && (
            <button onClick={() => setActiveMove("b")}
              className="shrink-0 text-[12px] font-bold text-[hsl(232,45%,32%)] border border-[hsl(232,35%,70%)] bg-white px-4 py-2 rounded-full hover:bg-indigo-50 transition-colors">
              למשימה
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TanakhUnitPage;
