import { useMemo } from "react";
import { Map as MapIcon, Star, Lock, ArrowRight } from "lucide-react";

export type ScenicNode = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string; // e.g. "5 נושאים"
  status: "done" | "current" | "locked" | "available";
};

type Props = {
  nodes: ScenicNode[];
  onSelect: (index: number) => void;
  onContinue?: () => void;
  continueLabel?: string;
  heightClass?: string; // override min/max height
};

const ScenicRoadmap = ({
  nodes,
  onSelect,
  onContinue,
  continueLabel = "המשך למסלול",
  heightClass = "h-[calc(100vh-220px)] min-h-[640px] max-h-[920px]",
}: Props) => {
  // Geometry: serpentine path top→bottom (#1 at top, #N at bottom)
  const points = useMemo(() => {
    const total = nodes.length;
    return nodes.map((n, i) => {
      const t = total > 1 ? i / (total - 1) : 0.5;
      const y = 6 + t * 88;
      const x = 50 + Math.sin(i * 1.35) * 22;
      return { ...n, idx: i, x, y };
    });
  }, [nodes]);

  const pathD = useMemo(() => {
    return points
      .map((p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = points[i - 1];
        const cy = (prev.y + p.y) / 2;
        return `C ${prev.x} ${cy}, ${p.x} ${cy}, ${p.x} ${p.y}`;
      })
      .join(" ");
  }, [points]);

  return (
    <div
      className={`relative rounded-3xl border border-border bg-gradient-to-b from-violet-50/70 via-sky-50/40 to-white shadow-[var(--shadow-card)] overflow-hidden ${heightClass}`}
      dir="rtl"
    >
      {/* Top badge */}
      <div className="absolute top-4 right-4 z-30">
        <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-[11px] text-violet-700 font-semibold border border-violet-100 shadow-sm">
          <MapIcon className="h-3.5 w-3.5" strokeWidth={2} />
          המסלול שלך
        </span>
      </div>

      {/* Scenery */}
      <svg
        viewBox="0 0 400 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <defs>
          <filter id="scenicRoadShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" />
            <feOffset dy="3" result="o" />
            <feComponentTransfer in="o">
              <feFuncA type="linear" slope="0.18" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="scenicCloud" cx="50%" cy="50%" r="50%">
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
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#scenicCloud)" opacity="0.9" />
        ))}

        {/* Mountains */}
        <path d="M 240 200 L 290 110 L 340 200 Z" fill="hsl(220 22% 86%)" />
        <path d="M 285 220 L 335 130 L 390 220 Z" fill="hsl(220 20% 80%)" />
        <path d="M 250 215 L 280 165 L 310 215 Z" fill="hsl(220 25% 92%)" />
        <path d="M 0 820 Q 100 760 200 800 T 400 780 L 400 900 L 0 900 Z" fill="hsl(160 25% 92%)" opacity="0.55" />

        {/* Road */}
        <g filter="url(#scenicRoadShadow)" transform="scale(4 9)">
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
        <path
          d={pathD}
          stroke="hsl(270 55% 90%)"
          strokeWidth="0.5"
          fill="none"
          strokeDasharray="1.2 1.8"
          transform="scale(4 9)"
          vectorEffect="non-scaling-stroke"
        />

        {/* Trees & rocks */}
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
        {points.map((p, i) => {
          const isDone = p.status === "done";
          const isCurrent = p.status === "current";
          const isLocked = p.status === "locked";
          const labelLeft = p.x > 50;
          return (
            <div
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
              style={{ top: `${p.y}%`, left: `${p.x}%` }}
            >
              <div className={`flex items-center gap-3 ${labelLeft ? "flex-row" : "flex-row-reverse"}`}>
                <div className={labelLeft ? "text-end" : "text-start"}>
                  <p className="text-[13px] font-bold text-foreground leading-tight whitespace-nowrap">{p.title}</p>
                  {(p.meta || p.subtitle) && (
                    <p className="text-[10.5px] text-muted-foreground mt-0.5 whitespace-nowrap">{p.meta || p.subtitle}</p>
                  )}
                </div>

                <div className="relative">
                  {isDone && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={0} />
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => !isLocked && onSelect(i)}
                    disabled={isLocked}
                    aria-current={isCurrent ? "step" : undefined}
                    className={[
                      "w-[52px] h-[52px] rounded-full flex items-center justify-center text-[18px] font-bold shadow-[0_6px_16px_-4px_rgba(120,80,200,0.35)] transition-all duration-300",
                      isLocked ? "opacity-70 cursor-not-allowed" : "hover:scale-110 cursor-pointer",
                      isDone
                        ? "bg-emerald-400 text-white"
                        : isCurrent
                        ? "bg-violet-500 text-white ring-4 ring-violet-200"
                        : p.status === "available"
                        ? "bg-violet-400/90 text-white"
                        : "bg-[hsl(220,15%,82%)] text-white",
                    ].join(" ")}
                  >
                    {isLocked && i === points.length - 1 ? <Lock className="h-4 w-4" strokeWidth={2.2} /> : i + 1}
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

      {/* Start chip */}
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
      {onContinue && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white text-[13px] font-semibold px-7 py-3 rounded-full shadow-[0_10px_24px_-6px_rgba(120,80,200,0.55)] transition-colors"
          >
            {continueLabel}
            <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ScenicRoadmap;
