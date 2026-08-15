import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronLeft, ScrollText, Landmark } from "lucide-react";
import { ARCS, TANAKH_UNITS, MOVES, LEGS, type TanakhUnit, type UnitState } from "@/tanakh/tanakhData";

/**
 * תנ״ך · מפת שנה — אב־טיפוס.
 * שפה חזותית: דף, טקסט וקולות סביבו. קלף חם, דיו אינדיגו, נגיעת ענבר אחת.
 * אין איורים מומצאים ואין נתוני התקדמות מומצאים: מצבי היחידות מסומנים
 * במפורש כמצבי תצוגה של אב־טיפוס.
 */

const stateMeta: Record<UnitState, { label: string; chip: string }> = {
  completed:    { label: "הושלם",         chip: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  current:      { label: "עכשיו",          chip: "bg-amber-100 text-amber-900 border-amber-300" },
  next:         { label: "הבא",            chip: "bg-indigo-100 text-indigo-900 border-indigo-200" },
  not_yet_open: { label: "עדיין לא פתוח", chip: "bg-stone-100 text-stone-500 border-stone-200" },
};

const UnitCard = ({ u, onEnter }: { u: TanakhUnit; onEnter: () => void }) => {
  const st = stateMeta[u.demoState];
  const enterable = u.demoState === "current"; // רק יחידה 1 נושאת תוכן מלא בפרוסה זו
  return (
    <div
      className={[
        "relative rounded-2xl border p-4 md:p-5 transition-all",
        u.demoState === "current"
          ? "bg-[hsl(40,55%,97%)] border-amber-300 shadow-md"
          : "bg-[hsl(42,35%,98%)] border-[hsl(40,25%,88%)]",
        u.demoState === "not_yet_open" ? "opacity-75" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] text-[hsl(230,25%,45%)] font-medium">{u.chapters}</p>
          <h3 className="text-[15px] md:text-[16px] font-bold text-[hsl(232,35%,22%)] leading-snug mt-0.5">
            יחידה {u.id} · {u.title}
          </h3>
          <p className="text-[12px] text-[hsl(230,15%,40%)] mt-1.5 leading-relaxed">{u.question}</p>
        </div>
        <span className={`shrink-0 text-[10.5px] font-semibold px-2.5 py-1 rounded-full border ${st.chip}`}>
          {st.label}
        </span>
      </div>
      {enterable ? (
        <button
          onClick={onEnter}
          className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white bg-[hsl(232,45%,32%)] hover:bg-[hsl(232,45%,26%)] px-4 py-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(232,45%,45%)]"
        >
          לכניסה ליחידה
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : (
        <p className="mt-3 text-[10.5px] text-[hsl(230,10%,55%)]">
          {u.demoState === "next"
            ? "היחידה הבאה במסלול · התוכן ייפתח בהמשך"
            : "תוכן היחידה יתווסף בהמשך המסלול"}
        </p>
      )}
    </div>
  );
};

const TanakhRoadmapPage = () => {
  const navigate = useNavigate();
  const base = `/subjects/${encodeURIComponent("תנ״ך")}/tanakh-30`;
  const arcA = TANAKH_UNITS.filter(u => u.arc === "bereshit");
  const arcB = TANAKH_UNITS.filter(u => u.arc === "shaul-david");

  return (
    <div className="min-h-full bg-[hsl(42,45%,96%)]" dir="rtl">
      <div className="p-5 md:p-8 lg:p-10 max-w-[980px] mx-auto">

        {/* ── prototype banner: honest scope ── */}
        <div className="mb-5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-2.5">
          <p className="text-[11px] text-indigo-900 leading-relaxed">
            <span className="font-bold">אב־טיפוס להדגמה.</span>{" "}
            מצבי ההתקדמות (עכשיו/הבא/עדיין לא פתוח) הם מצבי תצוגה בלבד ואינם נשמרים בשרת.
            התוכן לקוח מחומרי ההוראה של צוות תנ״ך; יחידה 1 מלאה, שאר היחידות בכותרתן בלבד.
          </p>
        </div>

        {/* ── opening ── */}
        <header className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[hsl(232,45%,32%)] mb-3 shadow-sm">
            <BookOpen className="h-6 w-6 text-[hsl(42,80%,85%)]" strokeWidth={1.7} />
          </div>
          <h1 className="text-[26px] md:text-[32px] font-black text-[hsl(232,40%,18%)] tracking-tight leading-tight">
            תנ״ך · מסלול הלמידה השנתי
          </h1>
          <p className="text-[13px] text-[hsl(230,15%,40%)] mt-2">
            שתי קשתות · 9 יחידות · שכבת 30%, הערכה חלופית בית־ספרית
          </p>

          {/* the constant skeleton: five moves, four legs */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
            {MOVES.map(m => (
              <span key={m.id} className="text-[10.5px] px-2.5 py-1 rounded-full bg-[hsl(42,40%,92%)] border border-[hsl(40,30%,85%)] text-[hsl(232,25%,30%)]">
                {m.num}׳ {m.title}
              </span>
            ))}
          </div>
          <p className="text-[10.5px] text-[hsl(230,10%,52%)] mt-2">
            עמוד השדרה: {LEGS.map(l => `${l.icon} ${l.title}`).join("  ·  ")}
          </p>

          <button
            onClick={() => navigate(`${base}/unit/1`)}
            className="mt-5 inline-flex items-center gap-2 text-[14px] font-bold text-white bg-[hsl(232,45%,32%)] hover:bg-[hsl(232,45%,26%)] px-6 py-3 rounded-full shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(232,45%,45%)]"
          >
            להתחלת המסע · יחידה 1
            <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </header>

        {/* ── arc A: creation, light out of chaos ── */}
        <section className="mb-8">
          <div className="rounded-3xl border border-[hsl(45,45%,82%)] bg-gradient-to-b from-[hsl(48,70%,95%)] to-[hsl(42,45%,96%)] p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[hsl(45,80%,88%)] border border-[hsl(45,55%,75%)] flex items-center justify-center">
                <ScrollText className="h-4.5 w-4.5 text-[hsl(38,60%,35%)]" strokeWidth={1.7} />
              </div>
              <div>
                <h2 className="text-[17px] font-black text-[hsl(232,35%,20%)]">{ARCS.bereshit.name}</h2>
                <p className="text-[11px] text-[hsl(230,15%,45%)]">{ARCS.bereshit.theme} · {ARCS.bereshit.range}</p>
              </div>
            </div>
            <div className="space-y-3">
              {arcA.map(u => <UnitCard key={u.id} u={u} onEnter={() => navigate(`${base}/unit/${u.id}`)} />)}
            </div>
          </div>
        </section>

        {/* ── arc B: kingship, power and dilemma ── */}
        <section className="mb-8">
          <div className="rounded-3xl border border-[hsl(232,25%,80%)] bg-gradient-to-b from-[hsl(232,30%,94%)] to-[hsl(42,45%,96%)] p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[hsl(232,35%,88%)] border border-[hsl(232,25%,75%)] flex items-center justify-center">
                <Landmark className="h-4.5 w-4.5 text-[hsl(232,40%,32%)]" strokeWidth={1.7} />
              </div>
              <div>
                <h2 className="text-[17px] font-black text-[hsl(232,35%,20%)]">{ARCS["shaul-david"].name}</h2>
                <p className="text-[11px] text-[hsl(230,15%,45%)]">{ARCS["shaul-david"].theme} · {ARCS["shaul-david"].range}</p>
              </div>
            </div>
            <div className="space-y-3">
              {arcB.map(u => <UnitCard key={u.id} u={u} onEnter={() => navigate(`${base}/unit/${u.id}`)} />)}
            </div>
          </div>
        </section>

        <p className="text-center text-[10px] text-[hsl(230,10%,55%)] pb-6">
          התוכן מבוסס על חומרי ההוראה של צוות תנ״ך · פרויקט הסיום: "דף הגמרא שלנו"
        </p>
      </div>
    </div>
  );
};

export default TanakhRoadmapPage;
