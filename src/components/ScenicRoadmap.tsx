import { useMemo } from "react";
import { Map as MapIcon, Lock, ArrowRight, Check } from "lucide-react";

export type ScenicNode = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  status: "done" | "current" | "locked" | "available";
};

type Props = {
  nodes: ScenicNode[];
  onSelect: (index: number) => void;
  onContinue?: () => void;
  continueLabel?: string;
  heightClass?: string;
};

// Color palette per status (for the hex signpost)
const SIGN_COLORS: Record<ScenicNode["status"], { fill: string; stroke: string; text: string }> = {
  done:      { fill: "hsl(150 55% 48%)", stroke: "hsl(150 55% 32%)", text: "#fff" },
  current:   { fill: "hsl(0 72% 55%)",   stroke: "hsl(0 60% 38%)",   text: "#fff" },
  available: { fill: "hsl(38 92% 55%)",  stroke: "hsl(28 70% 38%)",  text: "#fff" },
  locked:    { fill: "hsl(220 12% 70%)", stroke: "hsl(220 14% 48%)", text: "#fff" },
};

const ScenicRoadmap = ({
  nodes,
  onSelect,
  onContinue,
  continueLabel = "המשך למסלול",
  heightClass = "h-[calc(100vh-220px)] min-h-[720px] max-h-[1100px]",
}: Props) => {
  const VB_W = 400;
  const VB_H = 1000;

  // Serpentine river points (top → bottom)
  const points = useMemo(() => {
    const total = nodes.length;
    return nodes.map((n, i) => {
      const t = total > 1 ? i / (total - 1) : 0.5;
      const y = 70 + t * (VB_H - 160);
      const x = 200 + Math.sin(i * 1.15 + 0.4) * 95;
      return { ...n, idx: i, x, y };
    });
  }, [nodes]);

  // Smooth river path through points
  const riverD = useMemo(() => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y - 30}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      const midY = (prev.y + cur.y) / 2;
      const c1x = prev.x + (cur.x - prev.x) * 0.1;
      const c2x = cur.x - (cur.x - prev.x) * 0.1;
      d += ` C ${c1x} ${midY - 30}, ${c2x} ${midY + 30}, ${cur.x} ${cur.y}`;
    }
    d += ` L ${points[points.length - 1].x} ${VB_H - 40}`;
    return d;
  }, [points]);

  // Dashed kayak track — slightly offset inside the river
  const trackD = riverD;

  return (
    <div
      className={`relative rounded-3xl border border-border bg-gradient-to-b from-sky-50 via-emerald-50/40 to-amber-50/30 shadow-[var(--shadow-card)] overflow-hidden ${heightClass}`}
      dir="rtl"
    >
      {/* Top badge */}
      <div className="absolute top-4 right-4 z-30">
        <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-[11px] text-emerald-700 font-semibold border border-emerald-100 shadow-sm">
          <MapIcon className="h-3.5 w-3.5" strokeWidth={2} />
          המסלול שלך
        </span>
      </div>

      {/* Scene SVG */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="riverGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(200 85% 70%)" />
            <stop offset="50%" stopColor="hsl(205 80% 58%)" />
            <stop offset="100%" stopColor="hsl(210 75% 50%)" />
          </linearGradient>
          <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(95 50% 65%)" />
            <stop offset="100%" stopColor="hsl(110 45% 48%)" />
          </linearGradient>
          <linearGradient id="bankGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(40 35% 70%)" />
            <stop offset="100%" stopColor="hsl(30 35% 50%)" />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" />
            <feOffset dy="2" result="o" />
            <feComponentTransfer in="o">
              <feFuncA type="linear" slope="0.25" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Sky birds */}
        <g opacity="0.55" stroke="hsl(220 18% 55%)" strokeWidth="1.2" fill="none" strokeLinecap="round">
          <path d="M 50 90 q 4 -4 8 0 q 4 -4 8 0" />
          <path d="M 340 60 q 4 -4 8 0 q 4 -4 8 0" />
          <path d="M 80 250 q 3 -3 6 0 q 3 -3 6 0" />
        </g>

        {/* Grass banks — wide strips behind everything, low-poly feel */}
        <path
          d={`M 0 60 L 60 50 L 130 80 L 90 160 L 30 200 L 0 180 Z`}
          fill="url(#grassGrad)"
        />
        <path
          d={`M ${VB_W} 40 L ${VB_W - 80} 30 L ${VB_W - 140} 90 L ${VB_W - 120} 180 L ${VB_W - 40} 220 L ${VB_W} 200 Z`}
          fill="url(#grassGrad)"
        />

        {/* Generate island clusters along each side of the river points */}
        {points.map((p, i) => {
          const sideRight = p.x < 200;
          const ox = sideRight ? Math.min(p.x + 90, VB_W - 30) : Math.max(p.x - 90, 30);
          const oy = p.y;
          return (
            <g key={`isle-${i}`}>
              {/* Soft sand band */}
              <ellipse cx={ox} cy={oy + 6} rx="78" ry="44" fill="url(#bankGrad)" opacity="0.55" />
              {/* Grass island (polygonal) */}
              <path
                d={`M ${ox - 70} ${oy + 4}
                    L ${ox - 50} ${oy - 38}
                    L ${ox - 10} ${oy - 48}
                    L ${ox + 30} ${oy - 40}
                    L ${ox + 62} ${oy - 18}
                    L ${ox + 70} ${oy + 14}
                    L ${ox + 40} ${oy + 40}
                    L ${ox - 20} ${oy + 44}
                    L ${ox - 58} ${oy + 28} Z`}
                fill="url(#grassGrad)"
                stroke="hsl(110 40% 38%)"
                strokeWidth="0.6"
                opacity="0.95"
              />
              {/* Tiny flowers */}
              {[[-30, -10], [10, -22], [34, 10], [-12, 22]].map(([dx, dy], k) => (
                <circle key={k} cx={ox + dx} cy={oy + dy} r="1.4" fill={k % 2 ? "hsl(340 80% 70%)" : "hsl(48 95% 65%)"} />
              ))}
              {/* Two trees on the island */}
              {[[-40, -20], [22, -28]].map(([dx, dy], k) => (
                <g key={`t${k}`} transform={`translate(${ox + dx} ${oy + dy})`}>
                  <rect x="-1.5" y="0" width="3" height="6" fill="hsl(25 45% 30%)" />
                  <path d="M 0 -22 L 10 4 L -10 4 Z" fill={k % 2 ? "hsl(140 50% 38%)" : "hsl(150 45% 45%)"} />
                  <path d="M 0 -14 L 8 2 L -8 2 Z" fill={k % 2 ? "hsl(140 55% 45%)" : "hsl(150 50% 52%)"} />
                </g>
              ))}
              {/* Rocks at the shoreline */}
              <ellipse cx={ox + (sideRight ? -68 : 68)} cy={oy + 18} rx="6" ry="3" fill="hsl(220 8% 60%)" />
              <ellipse cx={ox + (sideRight ? -60 : 60)} cy={oy + 26} rx="4" ry="2" fill="hsl(220 10% 70%)" />
            </g>
          );
        })}

        {/* The river — wide blue band */}
        <path
          d={riverD}
          stroke="url(#riverGrad)"
          strokeWidth="56"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* River highlight */}
        <path
          d={riverD}
          stroke="hsl(200 100% 92%)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          opacity="0.55"
          transform="translate(-6 -2)"
        />
        {/* River foam segments */}
        {points.slice(0, -1).map((p, i) => {
          const next = points[i + 1];
          const mx = (p.x + next.x) / 2;
          const my = (p.y + next.y) / 2;
          return (
            <g key={`foam-${i}`} opacity="0.7">
              <ellipse cx={mx - 6} cy={my} rx="10" ry="2" fill="#fff" />
              <ellipse cx={mx + 8} cy={my + 6} rx="6" ry="1.5" fill="#fff" />
            </g>
          );
        })}

        {/* Dashed kayak track */}
        <path
          d={trackD}
          stroke="#fff"
          strokeWidth="1.4"
          fill="none"
          strokeDasharray="4 5"
          strokeLinecap="round"
          opacity="0.95"
        />

        {/* A couple of kayakers along the route */}
        {points.length > 1 &&
          [0.25, 0.65].map((tFrac, k) => {
            const i = Math.floor(tFrac * (points.length - 1));
            const a = points[i];
            const b = points[i + 1] || a;
            const mx = a.x * (1 - 0.5) + b.x * 0.5;
            const my = a.y * (1 - 0.5) + b.y * 0.5;
            return (
              <g key={`kayak-${k}`} transform={`translate(${mx} ${my}) rotate(${(b.x - a.x) * 0.4})`}>
                <ellipse cx="0" cy="0" rx="11" ry="3.4" fill="hsl(8 80% 55%)" stroke="hsl(8 60% 35%)" strokeWidth="0.6" />
                <circle cx="0" cy="-1" r="2.2" fill="hsl(38 90% 70%)" />
                <rect x="-9" y="-0.5" width="18" height="1" rx="0.5" fill="hsl(25 40% 30%)" transform="rotate(20)" />
              </g>
            );
          })}

        {/* Buoys */}
        {points.length > 2 && (
          <>
            <g transform={`translate(${(points[0].x + points[1].x) / 2 + 14} ${(points[0].y + points[1].y) / 2 + 8})`}>
              <path d="M 0 -6 L 4 4 L -4 4 Z" fill="hsl(0 80% 55%)" stroke="#fff" strokeWidth="0.6" />
              <ellipse cx="0" cy="5" rx="5" ry="1.4" fill="hsl(210 60% 75%)" opacity="0.6" />
            </g>
          </>
        )}
      </svg>

      {/* Nodes overlay — signposts */}
      <div className="absolute inset-0">
        {points.map((p, i) => {
          const isDone = p.status === "done";
          const isLocked = p.status === "locked";
          const labelLeft = p.x > 200; // place label to the LEFT (i.e. left of node) when node is on right
          const col = SIGN_COLORS[p.status];

          // Convert SVG coords (0..VB_W / 0..VB_H) to %
          const leftPct = (p.x / VB_W) * 100;
          const topPct = (p.y / VB_H) * 100;

          // Signpost offset: opposite side of the river bend, so it sits on the island
          const signSide = p.x < 200 ? 1 : -1; // 1 = right of node, -1 = left
          const SIGN_OFFSET_PCT = 11;

          return (
            <div key={p.id}>
              {/* Signpost (hex with number) */}
              <button
                onClick={() => !isLocked && onSelect(i)}
                disabled={isLocked}
                className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ${
                  isLocked ? "cursor-not-allowed opacity-90" : "cursor-pointer hover:scale-110"
                }`}
                style={{
                  top: `${topPct}%`,
                  left: `${leftPct + signSide * SIGN_OFFSET_PCT}%`,
                }}
                aria-label={p.title}
              >
                <div className="relative flex flex-col items-center">
                  {/* Hex sign */}
                  <svg width="58" height="64" viewBox="0 0 58 64" className="drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)]">
                    <polygon
                      points="29,2 54,16 54,42 29,56 4,42 4,16"
                      fill={col.fill}
                      stroke={col.stroke}
                      strokeWidth="2.5"
                    />
                    <polygon
                      points="29,7 49,18.5 49,39.5 29,51 9,39.5 9,18.5"
                      fill="none"
                      stroke="#fff"
                      strokeOpacity="0.55"
                      strokeWidth="1.2"
                    />
                    {isLocked ? (
                      <g transform="translate(20 18)" fill={col.text}>
                        <rect x="2" y="9" width="14" height="11" rx="2" />
                        <path d="M 5 9 V 6 a 4 4 0 0 1 8 0 V 9" fill="none" stroke={col.text} strokeWidth="2" />
                      </g>
                    ) : isDone ? (
                      <g transform="translate(15 14)" fill="none" stroke={col.text} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 16 11 25 26 6" />
                      </g>
                    ) : (
                      <text
                        x="29"
                        y="37"
                        textAnchor="middle"
                        fontSize="22"
                        fontWeight="800"
                        fill={col.text}
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        {i + 1}
                      </text>
                    )}
                    {/* Post */}
                    <rect x="27" y="56" width="4" height="8" fill="hsl(25 45% 28%)" />
                  </svg>
                  {/* Pulse for current */}
                  {p.status === "current" && (
                    <span className="absolute -inset-1 rounded-2xl ring-4 ring-red-300/60 animate-pulse pointer-events-none" />
                  )}
                </div>
              </button>

              {/* Label card next to signpost */}
              <div
                className="absolute z-20 -translate-y-1/2 pointer-events-none"
                style={{
                  top: `${topPct}%`,
                  left: `${leftPct + signSide * (SIGN_OFFSET_PCT + 5)}%`,
                  transform: `translateY(-50%) translateX(${signSide > 0 ? "0%" : "-100%"})`,
                  maxWidth: "180px",
                }}
              >
                <div className={`bg-white/95 backdrop-blur rounded-lg px-2.5 py-1.5 border border-border shadow-sm ${signSide > 0 ? "text-start" : "text-end"}`}>
                  <p className="text-[12px] font-bold text-foreground leading-tight">{p.title}</p>
                  {(p.meta || p.subtitle) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{p.meta || p.subtitle}</p>
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
          <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} />
        </div>
        <div className="text-start">
          <p className="text-[11px] font-bold text-emerald-700 leading-none">התחלה</p>
          <p className="text-[9.5px] text-muted-foreground mt-1">כאן מתחילים</p>
        </div>
      </div>

      {/* CTA */}
      {onContinue && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold px-7 py-3 rounded-full shadow-[0_10px_24px_-6px_rgba(16,120,80,0.55)] transition-colors"
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
