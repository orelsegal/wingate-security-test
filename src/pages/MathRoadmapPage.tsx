import { useState, useMemo } from "react";
import { ChevronDown, PlayCircle, Sigma, Dumbbell, BookOpen, ExternalLink } from "lucide-react";
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

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[1180px] mx-auto" dir="rtl">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold text-foreground tracking-tight leading-tight font-heading">
          מתמטיקה — יחידות לימוד
        </h1>
        <p className="text-[12.5px] text-muted-foreground mt-1.5">
          חלוקה לפי 9 יחידות — סרטוני הסבר, נוסחאות מפתח ותרגול
        </p>
      </header>

      {/* Unit tabs */}
      <nav className="flex flex-wrap gap-2 mb-7">
        {UNITS.map((u, i) => {
          const active = i === activeUnit;
          return (
            <button
              key={u.title}
              onClick={() => setActiveUnit(i)}
              className={[
                "px-3.5 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-150 border",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-foreground border-border/60 hover:border-border hover:bg-muted/40",
              ].join(" ")}
            >
              יחידה {i + 1}
            </button>
          );
        })}
      </nav>

      {/* Unit header */}
      <div className="mb-5">
        <h2 className="text-[17px] font-semibold text-foreground tracking-tight">{unit.title}</h2>
        <p className="text-[12px] text-muted-foreground mt-1">
          {unit.topics.length} תתי-יחידות ·{" "}
          {unit.topics.reduce((n, t) => n + t.videos.length, 0)} סרטוני הסבר
        </p>
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
