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

  // Geometry for the scenic winding path — bottom (#1) → top (#N)
  const nodes = useMemo(() => {
    const total = UNITS.length;
    return UNITS.map((u, i) => {
      const t = total > 1 ? i / (total - 1) : 0.5;
      const y = 6 + t * 88; // 6% top → 94% bottom (#1 at top)
      const x = 50 + Math.sin(i * 1.35) * 22; // serpentine sway
      return { ...u, idx: i, x, y };
    });
  }, []);

  const pathD = useMemo(() => {
    return nodes
      .map((n, i) => {
        if (i === 0) return `M ${n.x} ${n.y}`;
        const prev = nodes[i - 1];
        const cy = (prev.y + n.y) / 2;
        return `C ${prev.x} ${cy}, ${n.x} ${cy}, ${n.x} ${n.y}`;
      })
      .join(" ");
  }, [nodes]);

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-[1400px] mx-auto" dir="rtl">
      <header className="mb-5 flex items-end justify-between gap-4 flex-wrap">
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

      {/* Roadmap (full width) */}
      <div className="mb-7">
        {/* Scenic winding roadmap */}
        <div className="relative rounded-3xl border border-border bg-gradient-to-b from-violet-50/70 via-sky-50/40 to-white shadow-[var(--shadow-card)] overflow-hidden h-[calc(100vh-220px)] min-h-[640px] max-h-[920px]">
          {/* Top-left badge */}
          <div className="absolute top-4 right-4 z-30">
            <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-[11px] text-violet-700 font-semibold border border-violet-100 shadow-sm">
              <MapIcon className="h-3.5 w-3.5" strokeWidth={2} />
              המסלול שלך
            </span>
          </div>

          {/* Scenery layer */}
          <svg viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <filter id="roadShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="3" />
                <feOffset dy="3" result="o" />
                <feComponentTransfer in="o"><feFuncA type="linear" slope="0.18" /></feComponentTransfer>
                <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <radialGradient id="cloud" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(220 30% 99%)" />
                <stop offset="100%" stopColor="hsl(220 25% 94%)" />
              </radialGradient>
            </defs>
            {/* Clouds */}
            {[
              [70, 60, 38, 11], [310, 110, 44, 12], [150, 180, 30, 9],
              [340, 320, 36, 10], [50, 410, 32, 9], [360, 520, 30, 9],
              [70, 640, 34, 10], [330, 720, 28, 8], [110, 820, 32, 9],
            ].map(([cx, cy, rx, ry], i) => (
              <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#cloud)" opacity="0.9" />
            ))}
            {/* Mountains right side */}
            <path d="M 240 200 L 290 110 L 340 200 Z" fill="hsl(220 22% 86%)" />
            <path d="M 285 220 L 335 130 L 390 220 Z" fill="hsl(220 20% 80%)" />
            <path d="M 250 215 L 280 165 L 310 215 Z" fill="hsl(220 25% 92%)" />
            {/* Distant hill mass at bottom */}
            <path d="M 0 820 Q 100 760 200 800 T 400 780 L 400 900 L 0 900 Z" fill="hsl(160 25% 92%)" opacity="0.55" />

            {/* The road — soft white with shadow */}
            <g filter="url(#roadShadow)" transform="scale(4 9)">
              <path
                d={pathD}
                stroke="hsl(0 0% 100%)"
                strokeWidth="11"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
            {/* Dashed center line */}
            <path
              d={pathD}
              stroke="hsl(270 55% 90%)"
              strokeWidth="0.5"
              fill="none"
              strokeDasharray="1.2 1.8"
              transform="scale(4 9)"
              vectorEffect="non-scaling-stroke"
            />

            {/* Trees & rocks scattered */}
            {[
              [35, 720], [375, 690], [25, 820], [385, 830], [40, 560],
              [365, 580], [30, 440], [375, 460], [40, 310], [370, 330],
            ].map(([x, y], i) => (
              <g key={`tree-${i}`} transform={`translate(${x} ${y})`}>
                <path d="M 0 0 L 9 -20 L 18 0 Z" fill="hsl(150 32% 60%)" opacity="0.85" />
                <rect x="7" y="0" width="4" height="7" fill="hsl(25 35% 38%)" />
              </g>
            ))}
            {[
              [70, 760], [330, 770], [80, 600], [320, 620], [90, 480],
            ].map(([x, y], i) => (
              <ellipse key={`rock-${i}`} cx={x} cy={y} rx="14" ry="5" fill="hsl(220 12% 85%)" opacity="0.7" />
            ))}
          </svg>

          {/* Nodes overlay */}
          <div className="absolute inset-0">
            {nodes.map((n, i) => {
              const isDone = i < activeUnit;
              const isCurrent = i === activeUnit;
              const isLocked = i > activeUnit + 1;
              const labelLeft = n.x > 50; // label sits opposite side of sway
              return (
                <div
                  key={n.idx}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                  style={{ top: `${n.y}%`, left: `${n.x}%` }}
                >
                  <div className={`flex items-center gap-3 ${labelLeft ? "flex-row" : "flex-row-reverse"}`}>
                    {/* Label */}
                    <div className={labelLeft ? "text-end" : "text-start"}>
                      <p className="text-[13px] font-bold text-foreground leading-tight whitespace-nowrap">{n.title}</p>
                      <p className="text-[10.5px] text-muted-foreground mt-0.5">{n.topics.length} נושאים</p>
                    </div>

                    {/* Number circle stack */}
                    <div className="relative">
                      {isDone && (
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {[1, 2, 3].map((s) => (
                            <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={0} />
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => !isLocked && handleSelect(i)}
                        disabled={isLocked}
                        aria-current={isCurrent ? "step" : undefined}
                        className={[
                          "w-[52px] h-[52px] rounded-full flex items-center justify-center text-[18px] font-bold shadow-[0_6px_16px_-4px_rgba(120,80,200,0.35)] transition-all duration-300",
                          isLocked ? "opacity-70 cursor-not-allowed" : "hover:scale-110 cursor-pointer",
                          isDone
                            ? "bg-emerald-400 text-white"
                            : isCurrent
                            ? "bg-violet-500 text-white ring-4 ring-violet-200"
                            : i === activeUnit + 1
                            ? "bg-violet-400/90 text-white"
                            : "bg-[hsl(220,15%,82%)] text-white",
                        ].join(" ")}
                      >
                        {isLocked && i === nodes.length - 1 ? <Lock className="h-4 w-4" strokeWidth={2.2} /> : i + 1}
                      </button>
                      {isDone && (
                        <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow">
                          <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom-left start chip */}
          <div className="absolute top-16 right-5 z-20 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center shadow">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
            </div>
            <div className="text-start">
              <p className="text-[11px] font-bold text-violet-700 leading-none">התחלה</p>
              <p className="text-[9.5px] text-muted-foreground mt-1">כאן מתחילים</p>
            </div>
          </div>

          {/* CTA */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={() => handleSelect(Math.min(activeUnit + 1, UNITS.length - 1))}
              disabled={activeUnit >= UNITS.length - 1}
              className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-[13px] font-semibold px-7 py-3 rounded-full shadow-[0_10px_24px_-6px_rgba(120,80,200,0.55)] transition-colors"
            >
              המשך למסלול
              <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={2} />
            </button>
          </div>
        </div>

      </div>

      {/* Unit detail */}
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
