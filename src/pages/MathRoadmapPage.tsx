import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, PlayCircle, Sigma, Dumbbell, BookOpen, ExternalLink, Map as MapIcon, Star, Lock, Flag, Trophy, ArrowRight } from "lucide-react";
import unitsData from "@/lib/mathRoadmap.json";

type VideoLink = { url: string; label: string };
type Topic = {
  sub: string;
  topic: string;
  klasus: string;
  extra_source: string;
  submit: string;
  videos: VideoLink[];
  other_links: VideoLink[];
};
type Unit = { title: string; topics: Topic[] };

const UNITS = unitsData as Unit[];

/** Curated key formulas per unit (highlighted boxes). */
const UNIT_FORMULAS: Record<number, { title: string; expr: string }[]> = {
  1: [
    { title: "מכפלת חזקות", expr: "aᵐ · aⁿ = aᵐ⁺ⁿ" },
    { title: "חלוקת חזקות", expr: "aᵐ ÷ aⁿ = aᵐ⁻ⁿ" },
    { title: "חזקה של חזקה", expr: "(aᵐ)ⁿ = aᵐ·ⁿ" },
    { title: "חזקה שלילית", expr: "a⁻ⁿ = 1 / aⁿ" },
    { title: "הפרש ריבועים", expr: "a² − b² = (a − b)(a + b)" },
    { title: "ריבוע סכום", expr: "(a + b)² = a² + 2ab + b²" },
    { title: "ריבוע הפרש", expr: "(a − b)² = a² − 2ab + b²" },
    { title: "טרינום (a=1)", expr: "x² + (p+q)x + pq = (x+p)(x+q)" },
  ],
  2: [
    { title: "תיכון ליתר", expr: "במשולש ישר-זווית, תיכון ליתר = ½ · יתר" },
    { title: "סכום זוויות במשולש", expr: "α + β + γ = 180°" },
    { title: "משפט פיתגורס", expr: "a² + b² = c²" },
    { title: "אלכסוני דלתון", expr: "האלכסון הראשי חוצה את המשני וניצב לו" },
  ],
  3: [
    { title: "כפל שברים", expr: "(a/b) · (c/d) = (a·c) / (b·d)" },
    { title: "חלוקת שברים", expr: "(a/b) ÷ (c/d) = (a·d) / (b·c)" },
    { title: "מכנה משותף", expr: "a/b ± c/d = (a·d ± c·b) / (b·d)" },
    { title: "תנאי קיום", expr: "המכנה ≠ 0" },
  ],
  4: [
    { title: "ייצוג סטנדרטי", expr: "f(x) = ax² + bx + c" },
    { title: "ייצוג קודקודי", expr: "f(x) = a(x − p)² + k   ,   קודקוד (p, k)" },
    { title: "נוסחת השורשים", expr: "x = ( −b ± √(b² − 4ac) ) / 2a" },
    { title: "x של קודקוד", expr: "xₘ = −b / 2a" },
    { title: "דיסקרימיננטה", expr: "Δ = b² − 4ac" },
    { title: "ציר סימטריה", expr: "x = −b / 2a" },
  ],
  5: [
    { title: "מקבילית — שטח", expr: "S = בסיס × גובה" },
    { title: "מלבן — שטח", expr: "S = אורך × רוחב" },
    { title: "מעוין — שטח", expr: "S = (אלכסון₁ × אלכסון₂) / 2" },
    { title: "טרפז — שטח", expr: "S = ((בסיס₁ + בסיס₂) × גובה) / 2" },
    { title: "ריבוע — אלכסון", expr: "d = a · √2" },
  ],
  6: [
    { title: "משוואה ריבועית", expr: "ax² + bx + c = 0   (a ≠ 0)" },
    { title: "נוסחת השורשים", expr: "x = ( −b ± √(b² − 4ac) ) / 2a" },
    { title: "ויאטה — סכום", expr: "x₁ + x₂ = −b / a" },
    { title: "ויאטה — מכפלה", expr: "x₁ · x₂ = c / a" },
  ],
  7: [
    { title: "יחס דמיון", expr: "k = AB / A'B' = BC / B'C' = AC / A'C'" },
    { title: "יחס שטחים", expr: "S₁ / S₂ = k²" },
  ],
  8: [
    { title: "הסתברות בסיסית", expr: "P(A) = מספר תוצאות נוחות / מספר תוצאות אפשריות" },
    { title: "אירוע משלים", expr: "P(Aᶜ) = 1 − P(A)" },
    { title: "אירועים בלתי תלויים", expr: "P(A ∩ B) = P(A) · P(B)" },
  ],
  9: [
    { title: "בעיות תנועה", expr: "מרחק = מהירות × זמן" },
    { title: "בעיות תערובת", expr: "כמות = ריכוז × נפח" },
    { title: "בעיות עבודה", expr: "תפוקה = קצב × זמן" },
  ],
};

function youtubeId(url: string): string | null {
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/);
  return m ? m[1] : null;
}

const VideoCard = ({ v }: { v: VideoLink }) => {
  const id = youtubeId(v.url);
  if (!id) {
    return (
      <a
        href={v.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-[12.5px] text-primary hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {v.label || v.url}
      </a>
    );
  }
  return (
    <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
      <div className="aspect-video bg-muted">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${id}`}
          title={v.label}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="px-3 py-2.5 flex items-start gap-2">
        <PlayCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={1.6} />
        <p className="text-[12.5px] text-foreground leading-snug">{v.label || "סרטון הסבר"}</p>
      </div>
    </div>
  );
};

const TopicCard = ({ t, unitNum }: { t: Topic; unitNum: number }) => {
  const [open, setOpen] = useState(false);
  const practice = useMemo(() => {
    if (!t.submit) return [];
    return t.submit
      .split(/(?=עמ')/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [t.submit]);

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden transition-all duration-200 hover:border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 text-start"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {t.sub && (
            <span className="shrink-0 inline-flex items-center justify-center min-w-[44px] h-7 px-2 rounded-lg bg-primary/8 text-primary text-[11.5px] font-semibold">
              {t.sub}
            </span>
          )}
          <span className="text-[13.5px] font-semibold text-foreground truncate">{t.topic}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {t.videos.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <PlayCircle className="h-3.5 w-3.5" />
              {t.videos.length}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            strokeWidth={1.6}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-border/60 p-4 space-y-5">
          {(t.klasus || t.extra_source) && (
            <div className="flex items-start gap-2 text-[12px] text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div className="leading-relaxed">
                {t.klasus && <div><span className="text-foreground/70">קלאסוס:</span> {t.klasus}</div>}
                {t.extra_source && <div><span className="text-foreground/70">מקור נוסף:</span> {t.extra_source}</div>}
              </div>
            </div>
          )}

          {t.videos.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground mb-3">
                <PlayCircle className="h-4 w-4 text-primary" strokeWidth={1.6} />
                סרטוני הסבר ({t.videos.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {t.videos.map((v) => (
                  <VideoCard key={v.url} v={v} />
                ))}
              </div>
            </div>
          )}

          {t.other_links.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[12.5px] font-semibold text-foreground">חומרי לימוד נוספים</h4>
              {t.other_links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-[12.5px] text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {l.label || l.url}
                </a>
              ))}
            </div>
          )}

          {practice.length > 0 && (
            <div className="rounded-xl bg-[hsl(45,40%,96%)] border border-[hsl(45,35%,82%)] p-4">
              <h4 className="flex items-center gap-2 text-[12.5px] font-semibold text-[hsl(35,55%,30%)] mb-2.5">
                <Dumbbell className="h-4 w-4" strokeWidth={1.7} />
                תרגול — מה מגישים
              </h4>
              <ul className="space-y-1.5">
                {practice.map((p, i) => (
                  <li
                    key={i}
                    className="text-[12.5px] text-foreground leading-relaxed pr-3 border-r-2 border-[hsl(45,55%,55%)]"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const FormulaBoard = ({ unitNum }: { unitNum: number }) => {
  const items = UNIT_FORMULAS[unitNum] || [];
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-5">
      <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-foreground mb-4">
        <Sigma className="h-4 w-4 text-primary" strokeWidth={1.7} />
        נוסחאות חשובות
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {items.map((f) => (
          <div key={f.title} className="bg-card rounded-xl border border-border/60 p-3">
            <div className="text-[11px] text-muted-foreground mb-1">{f.title}</div>
            <div
              className="text-[14px] font-semibold text-foreground tracking-wide"
              style={{ fontFamily: '"SF Mono","JetBrains Mono",ui-monospace,monospace', direction: "ltr", textAlign: "right" }}
            >
              {f.expr}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MathRoadmapPage = () => {
  const [activeUnit, setActiveUnit] = useState(0);
  const unit = UNITS[activeUnit];
  const unitNum = activeUnit + 1;
  const contentRef = useRef<HTMLDivElement>(null);

  const handleSelect = (i: number) => {
    setActiveUnit(i);
    setTimeout(() => contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const totalTopics = useMemo(() => UNITS.reduce((n, u) => n + u.topics.length, 0), []);
  const totalVideos = useMemo(
    () => UNITS.reduce((n, u) => n + u.topics.reduce((m, t) => m + t.videos.length, 0), 0),
    []
  );
  const progressPct = Math.round(((activeUnit) / UNITS.length) * 100);

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[1180px] mx-auto" dir="rtl">
      <header className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight leading-tight font-heading">
            מתמטיקה — המסלול הלימודי
          </h1>
          <p className="text-[12.5px] text-muted-foreground mt-1.5">
            {UNITS.length} יחידות · {totalTopics} נושאים · {totalVideos} סרטוני הסבר
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-end">
            <p className="text-[10.5px] text-muted-foreground">התקדמות במסלול</p>
            <p className="text-[15px] font-bold text-foreground tabular-nums">יחידה {unitNum}/{UNITS.length}</p>
          </div>
          <div className="w-[120px] h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-l from-violet-500 to-violet-400 transition-all duration-500" style={{ width: `${((activeUnit + 1) / UNITS.length) * 100}%` }} />
          </div>
        </div>
      </header>

      {/* Roadmap visual */}
      <div className="bg-gradient-to-b from-violet-50/60 via-sky-50/30 to-white rounded-3xl border border-border p-6 md:p-8 shadow-[var(--shadow-card)] mb-7 relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1 text-[10.5px] text-violet-700 font-medium border border-violet-100">
            <MapIcon className="h-3 w-3" strokeWidth={2} />
            המסלול שלך
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <Flag className="h-3 w-3" strokeWidth={2} />
            התחלה
            <span className="mx-1.5 text-border">·</span>
            <Trophy className="h-3 w-3 text-amber-500" strokeWidth={2} />
            סיום
          </span>
        </div>

        {/* SVG winding path */}
        <div className="relative">
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M 50 2 C 20 10, 80 18, 50 26 C 20 34, 80 42, 50 50 C 20 58, 80 66, 50 74 C 20 82, 80 90, 50 98"
              stroke="hsl(270 60% 80%)"
              strokeWidth="0.7"
              strokeDasharray="1.4 1.4"
              fill="none"
            />
          </svg>

          <ol className="relative flex flex-col items-center gap-6 py-2">
            {UNITS.map((u, i) => {
              const isDone = i < activeUnit;
              const isCurrent = i === activeUnit;
              const offset = i % 2 === 0 ? "md:translate-x-16" : "md:-translate-x-16";
              return (
                <li key={u.title} className={`relative flex items-center gap-3 z-10 ${offset}`}>
                  <button
                    onClick={() => handleSelect(i)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={[
                      "w-14 h-14 rounded-full flex items-center justify-center text-[15px] font-bold shadow-lg transition-all duration-300 hover:scale-110 cursor-pointer",
                      isDone
                        ? "bg-emerald-400 text-white"
                        : isCurrent
                        ? "bg-violet-500 text-white ring-4 ring-violet-200"
                        : "bg-white text-muted-foreground border border-border",
                    ].join(" ")}
                  >
                    {i + 1}
                  </button>
                  <button
                    onClick={() => handleSelect(i)}
                    className={[
                      "text-start bg-white/80 backdrop-blur rounded-xl px-3.5 py-2 border max-w-[260px] transition-all",
                      isCurrent ? "border-violet-300 shadow-sm" : "border-border/40 hover:border-border",
                    ].join(" ")}
                  >
                    <p className="text-[11.5px] font-semibold text-foreground leading-tight truncate">{u.title}</p>
                    <p className="text-[9.5px] text-muted-foreground mt-0.5">{u.topics.length} נושאים</p>
                  </button>
                  {isDone && (
                    <div className="absolute -bottom-2 right-3 flex gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star key={s} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" strokeWidth={0} />
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex items-center justify-between mt-7 pt-4 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground">
            {activeUnit === 0 ? "כאן מתחילים" : activeUnit === UNITS.length - 1 ? "קו הסיום!" : `יחידה ${unitNum} מתוך ${UNITS.length}`}
          </span>
          <button
            onClick={() => handleSelect(Math.min(activeUnit + 1, UNITS.length - 1))}
            disabled={activeUnit >= UNITS.length - 1}
            className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11.5px] font-semibold px-5 py-2.5 rounded-2xl shadow-lg transition-colors"
          >
            המשך למסלול
            <ArrowRight className="h-3.5 w-3.5 rotate-180" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Unit header */}
      <div ref={contentRef} className="mb-5 scroll-mt-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-violet-500 text-white text-[14px] font-bold shadow-sm">
            {unitNum}
          </span>
          <div>
            <h2 className="text-[17px] font-semibold text-foreground tracking-tight">{unit.title}</h2>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              {unit.topics.length} תתי-יחידות · {unit.topics.reduce((n, t) => n + t.videos.length, 0)} סרטוני הסבר
            </p>
          </div>
        </div>
      </div>

      <section className="mb-7">
        <FormulaBoard unitNum={unitNum} />
      </section>

      <section className="space-y-3">
        {unit.topics.map((t, i) => (
          <TopicCard key={`${t.sub}-${i}`} t={t} unitNum={unitNum} />
        ))}
      </section>
    </div>
  );
};

export default MathRoadmapPage;
