import { useMemo } from "react";
import { Map as MapIcon, Lock, ArrowRight } from "lucide-react";
import riverBg from "@/assets/cycling-roadmap.png.asset.json";

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

const SIGN_COLORS: Record<ScenicNode["status"], { fill: string; stroke: string; text: string }> = {
  done:      { fill: "hsl(150 60% 42%)", stroke: "hsl(150 55% 26%)", text: "#fff" },
  current:   { fill: "hsl(0 72% 52%)",   stroke: "hsl(0 60% 34%)",   text: "#fff" },
  available: { fill: "hsl(38 92% 52%)",  stroke: "hsl(28 70% 34%)",  text: "#fff" },
  locked:    { fill: "hsl(220 12% 68%)", stroke: "hsl(220 14% 44%)", text: "#fff" },
};

// Anchor points calibrated to the cycling-road reference image.
// Points follow the serpentine road from START (top) to FINISH (bottom).
const ANCHORS: Array<{ x: number; y: number; labelSide: "right" | "left" }> = [
  { x: 40, y: 9,  labelSide: "right" }, // 1 near START
  { x: 56, y: 22, labelSide: "left"  }, // 2 first right curve
  { x: 30, y: 33, labelSide: "right" }, // 3 left curve
  { x: 55, y: 45, labelSide: "left"  }, // 4 right curve mid
  { x: 35, y: 58, labelSide: "right" }, // 5 left curve lower
  { x: 50, y: 72, labelSide: "left"  }, // 6 approach FINISH
];

const ScenicRoadmap = ({
  nodes,
  onSelect,
  onContinue,
  continueLabel = "המשך למסלול",
  heightClass = "h-[calc(100vh-220px)] min-h-[720px] max-h-[1100px]",
}: Props) => {
  // Map nodes to anchor points. If more nodes than anchors, distribute along
  // a serpentine path between top and bottom.
  const points = useMemo(() => {
    return nodes.map((n, i) => {
      if (i < ANCHORS.length) {
        return { ...n, idx: i, x: ANCHORS[i].x, y: ANCHORS[i].y, labelSide: ANCHORS[i].labelSide as "left" | "right" };
      }
      const t = (i - ANCHORS.length + 1) / Math.max(1, nodes.length - ANCHORS.length + 1);
      const y = 85 + t * 10;
      const x = i % 2 === 0 ? 22 : 78;
      const labelSide: "left" | "right" = x < 50 ? "right" : "left";
      return { ...n, idx: i, x, y, labelSide };
    });
  }, [nodes]);

  return (
    <div
      className={`relative rounded-3xl border border-border overflow-hidden shadow-[var(--shadow-card)] ${heightClass}`}
      dir="rtl"
      style={{
        backgroundColor: "hsl(0 0% 96%)",
      }}
    >
      {/* Background artwork */}
      <img
        src={riverBg.url}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
        draggable={false}
      />
      {/* Subtle wash to soften baked-in signs underneath our overlays */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/0 via-white/0 to-white/10" />

      {/* Top badge */}
      <div className="absolute top-4 right-4 z-30">
        <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-[11px] text-emerald-700 font-semibold border border-emerald-100 shadow-sm">
          <MapIcon className="h-3.5 w-3.5" strokeWidth={2} />
          המסלול שלך
        </span>
      </div>

      {/* Station overlays (hex signposts + labels) */}
      {points.map((p, i) => {
        const isDone = p.status === "done";
        const isLocked = p.status === "locked";
        const isCurrent = p.status === "current";
        const col = SIGN_COLORS[p.status];

        return (
          <div key={p.id}>
            {/* Cover patch — sits on top of the baked-in sign in the artwork */}
            <div
              className="absolute z-10 pointer-events-none"
              style={{
                top: `${p.y}%`,
                left: `${p.x}%`,
                transform: "translate(-50%, -50%)",
                width: "170px",
                height: "70px",
                background:
                  "radial-gradient(ellipse at center, rgba(245,245,245,0.96) 0%, rgba(245,245,245,0.85) 55%, rgba(245,245,245,0) 100%)",
                filter: "blur(0.5px)",
              }}
            />

            {/* Hex signpost button */}
            <button
              onClick={() => !isLocked && onSelect(i)}
              disabled={isLocked}
              className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ${
                isLocked ? "cursor-not-allowed opacity-95" : "cursor-pointer hover:scale-110"
              }`}
              style={{ top: `${p.y}%`, left: `${p.x}%` }}
              aria-label={p.title}
            >
              <div className="relative">
                <svg width="62" height="74" viewBox="0 0 62 74" className="drop-shadow-[0_8px_12px_rgba(0,0,0,0.22)]">
                  {/* Hex sign */}
                  <polygon
                    points="31,3 57,17 57,45 31,59 5,45 5,17"
                    fill={col.fill}
                    stroke={col.stroke}
                    strokeWidth="2.5"
                  />
                  <polygon
                    points="31,8 52,19.5 52,42.5 31,54 10,42.5 10,19.5"
                    fill="none"
                    stroke="#fff"
                    strokeOpacity="0.55"
                    strokeWidth="1.2"
                  />
                  {/* Number / icon */}
                  {isLocked ? (
                    <g transform="translate(22 20)" fill={col.text}>
                      <rect x="2" y="9" width="14" height="11" rx="2" />
                      <path d="M 5 9 V 6 a 4 4 0 0 1 8 0 V 9" fill="none" stroke={col.text} strokeWidth="2" />
                    </g>
                  ) : isDone ? (
                    <g transform="translate(16 16)" fill="none" stroke={col.text} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2 16 11 25 27 7" />
                    </g>
                  ) : (
                    <text
                      x="31"
                      y="40"
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
                  <rect x="29" y="59" width="4" height="13" fill="hsl(25 45% 28%)" />
                </svg>
                {isCurrent && (
                  <span className="absolute -inset-1 rounded-2xl ring-4 ring-red-300/70 animate-pulse pointer-events-none" />
                )}
              </div>
            </button>

            {/* Label card next to signpost */}
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                top: `${p.y}%`,
                left: `${p.x}%`,
                transform:
                  p.labelSide === "right"
                    ? "translate(36px, -50%)"
                    : "translate(calc(-100% - 36px), -50%)",
                maxWidth: "190px",
              }}
            >
              <div
                className={`bg-white/95 backdrop-blur rounded-lg px-2.5 py-1.5 border border-border shadow-sm ${
                  p.labelSide === "right" ? "text-start" : "text-end"
                }`}
              >
                <p className="text-[12.5px] font-bold text-foreground leading-tight">{p.title}</p>
                {(p.meta || p.subtitle) && (
                  <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">{p.meta || p.subtitle}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* CTA */}
      {onContinue && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30">
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
