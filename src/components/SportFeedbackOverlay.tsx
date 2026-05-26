import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import {
  CAPTIONS,
  resolveSport,
  type FeedbackEventType,
  type SportType,
} from "@/lib/sportFeedback";

/**
 * SportFeedbackOverlay — fullscreen sport-specific gamified feedback.
 * Renders a giant, exaggerated, cartoonish reaction for ~1.4–1.8s.
 *
 * Props:
 *   visible    — toggle to true to trigger a single playback
 *   event      — "success" | "failure"
 *   sport      — raw sport name (Hebrew or English). Resolved to a SportType.
 *   onDone     — fires after the animation completes
 *   caption    — optional override; otherwise random per-event caption
 */
type Props = {
  visible: boolean;
  event: FeedbackEventType;
  sport?: string | null;
  onDone?: () => void;
  caption?: string;
};

/* ───────────────────── Palettes per sport ───────────────────── */
const PALETTES: Record<
  SportType,
  { primary: string; secondary: string; accent: string; glow: string; ink: string }
> = {
  volleyball:        { primary: "#3b82f6", secondary: "#1d4ed8", accent: "#fbbf24", glow: "#93c5fd", ink: "#0b1d4d" },
  beach_volleyball:  { primary: "#f59e0b", secondary: "#f97316", accent: "#06b6d4", glow: "#fde68a", ink: "#3a1a00" },
  table_tennis:      { primary: "#ef4444", secondary: "#dc2626", accent: "#22d3ee", glow: "#fecaca", ink: "#3a0a0a" },
  climbing:          { primary: "#84cc16", secondary: "#65a30d", accent: "#a855f7", glow: "#d9f99d", ink: "#1a2e05" },
  swimming:          { primary: "#06b6d4", secondary: "#0891b2", accent: "#facc15", glow: "#a5f3fc", ink: "#082f3a" },
  artistic_swimming: { primary: "#ec4899", secondary: "#a855f7", accent: "#22d3ee", glow: "#fbcfe8", ink: "#3a0a2e" },
  gymnastics:        { primary: "#a855f7", secondary: "#7c3aed", accent: "#fbbf24", glow: "#e9d5ff", ink: "#2a0a4a" },
  generic:           { primary: "#6366f1", secondary: "#4f46e5", accent: "#f59e0b", glow: "#c7d2fe", ink: "#1e1b4b" },
};

/* ───────────────────── Scene actors (SVG) ───────────────────── */
/** Stickfigure utility shared between sports — head + body strokes. */
const Athlete = ({
  c,
  pose,
}: {
  c: { primary: string; secondary: string; ink: string };
  /** pose tweaks the body posture for failure/success */
  pose: "fall" | "jump" | "stand" | "swim" | "spin" | "climb" | "tuck";
}) => {
  const ink = c.ink;
  const body = c.primary;

  // base coords
  if (pose === "fall") {
    return (
      <g>
        {/* head */}
        <circle cx="80" cy="120" r="14" fill={body} stroke={ink} strokeWidth="3" />
        {/* twisted body */}
        <path d="M80 134 Q110 150 140 150" stroke={body} strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M140 150 L168 138" stroke={body} strokeWidth="10" strokeLinecap="round" />
        {/* arms flailing */}
        <path d="M95 138 L70 100" stroke={body} strokeWidth="8" strokeLinecap="round" />
        <path d="M120 145 L150 110" stroke={body} strokeWidth="8" strokeLinecap="round" />
        {/* legs */}
        <path d="M168 150 L185 175" stroke={body} strokeWidth="9" strokeLinecap="round" />
        <path d="M155 152 L180 140" stroke={body} strokeWidth="9" strokeLinecap="round" />
        {/* dizzy stars on head */}
        <text x="60" y="100" fontSize="18" fill={c.secondary}>✦</text>
        <text x="92" y="92" fontSize="14" fill={c.secondary}>✶</text>
      </g>
    );
  }
  if (pose === "jump") {
    return (
      <g>
        <circle cx="100" cy="60" r="14" fill={body} stroke={ink} strokeWidth="3" />
        <path d="M100 74 L100 120" stroke={body} strokeWidth="14" strokeLinecap="round" />
        <path d="M100 90 L60 60" stroke={body} strokeWidth="9" strokeLinecap="round" />
        <path d="M100 90 L150 50" stroke={body} strokeWidth="9" strokeLinecap="round" />
        <path d="M100 120 L80 165" stroke={body} strokeWidth="9" strokeLinecap="round" />
        <path d="M100 120 L125 158" stroke={body} strokeWidth="9" strokeLinecap="round" />
      </g>
    );
  }
  if (pose === "swim") {
    return (
      <g>
        <ellipse cx="100" cy="120" rx="60" ry="14" fill={body} stroke={ink} strokeWidth="3" />
        <circle cx="160" cy="118" r="12" fill={body} stroke={ink} strokeWidth="3" />
        <path d="M40 118 L20 100" stroke={body} strokeWidth="9" strokeLinecap="round" />
        <path d="M40 122 L20 140" stroke={body} strokeWidth="9" strokeLinecap="round" />
      </g>
    );
  }
  if (pose === "spin") {
    return (
      <g>
        <circle cx="100" cy="50" r="12" fill={body} stroke={ink} strokeWidth="3" />
        <path d="M100 62 L100 110" stroke={body} strokeWidth="13" strokeLinecap="round" />
        <path d="M100 80 L65 100" stroke={body} strokeWidth="8" strokeLinecap="round" />
        <path d="M100 80 L135 60" stroke={body} strokeWidth="8" strokeLinecap="round" />
        <path d="M100 110 L75 150" stroke={body} strokeWidth="9" strokeLinecap="round" />
        <path d="M100 110 L130 145" stroke={body} strokeWidth="9" strokeLinecap="round" />
      </g>
    );
  }
  if (pose === "climb") {
    return (
      <g>
        <circle cx="100" cy="55" r="12" fill={body} stroke={ink} strokeWidth="3" />
        <path d="M100 66 L100 115" stroke={body} strokeWidth="12" strokeLinecap="round" />
        <path d="M100 78 L70 50" stroke={body} strokeWidth="8" strokeLinecap="round" />
        <path d="M100 78 L130 55" stroke={body} strokeWidth="8" strokeLinecap="round" />
        <path d="M100 115 L80 158" stroke={body} strokeWidth="9" strokeLinecap="round" />
        <path d="M100 115 L125 152" stroke={body} strokeWidth="9" strokeLinecap="round" />
      </g>
    );
  }
  if (pose === "tuck") {
    return (
      <g>
        <circle cx="100" cy="90" r="14" fill={body} stroke={ink} strokeWidth="3" />
        <path d="M88 102 Q100 130 88 150 Q70 155 75 130" stroke={body} strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M112 102 Q125 130 130 150 Q150 152 140 130" stroke={body} strokeWidth="12" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  // stand
  return (
    <g>
      <circle cx="100" cy="60" r="14" fill={body} stroke={ink} strokeWidth="3" />
      <path d="M100 74 L100 130" stroke={body} strokeWidth="14" strokeLinecap="round" />
      <path d="M100 90 L70 110" stroke={body} strokeWidth="9" strokeLinecap="round" />
      <path d="M100 90 L130 110" stroke={body} strokeWidth="9" strokeLinecap="round" />
      <path d="M100 130 L80 170" stroke={body} strokeWidth="9" strokeLinecap="round" />
      <path d="M100 130 L120 170" stroke={body} strokeWidth="9" strokeLinecap="round" />
    </g>
  );
};

/** Sport-specific scene. Animations come from CSS keyframes defined in the overlay. */
const Scene = ({
  sport,
  event,
  c,
}: {
  sport: SportType;
  event: FeedbackEventType;
  c: (typeof PALETTES)[SportType];
}) => {
  const isFail = event === "failure";

  // Each scene renders inside a 400x300 viewBox. The overlay scales it to ~70vh.
  switch (sport) {
    case "volleyball":
      return (
        <svg viewBox="0 0 400 300" className="w-full h-full">
          {/* floor lines */}
          <path d="M0 250 H400" stroke={c.ink} strokeWidth="3" strokeDasharray="8 6" opacity="0.4" />
          {/* athlete */}
          <g style={{ transformOrigin: "200px 200px", animation: isFail ? "sfo-fall-roll 1.3s ease-out forwards" : "sfo-jump-spike 1.2s ease-out forwards" }}>
            <g transform="translate(120,50)">
              <Athlete c={c} pose={isFail ? "fall" : "jump"} />
            </g>
          </g>
          {/* ball */}
          <g style={{ animation: isFail ? "sfo-ball-miss 1.2s ease-out forwards" : "sfo-ball-spike 1.0s ease-out forwards" }}>
            <circle cx="320" cy="80" r="26" fill="#fff" stroke={c.ink} strokeWidth="3" />
            <path d="M294 80 Q320 60 346 80" stroke={c.ink} strokeWidth="2.5" fill="none" />
            <path d="M294 80 Q320 100 346 80" stroke={c.ink} strokeWidth="2.5" fill="none" />
            <path d="M320 54 V106" stroke={c.ink} strokeWidth="2.5" />
          </g>
          {!isFail && (
            <g>
              <text x="280" y="40" fontSize="36" fontWeight="900" fill={c.accent} style={{ animation: "sfo-pop 0.6s 0.3s both" }}>★</text>
              <text x="60"  y="60" fontSize="32" fontWeight="900" fill={c.accent} style={{ animation: "sfo-pop 0.6s 0.5s both" }}>★</text>
            </g>
          )}
        </svg>
      );

    case "beach_volleyball":
      return (
        <svg viewBox="0 0 400 300" className="w-full h-full">
          {/* sun */}
          <circle cx="60" cy="50" r="28" fill={c.accent} opacity="0.85" />
          {/* sand line */}
          <path d="M0 240 Q200 220 400 240 L400 300 L0 300 Z" fill={c.glow} stroke={c.ink} strokeWidth="2" />
          {/* sand splash on fail */}
          {isFail && (
            <g style={{ animation: "sfo-burst 0.9s 0.3s both", transformOrigin: "200px 240px" }}>
              {Array.from({ length: 14 }).map((_, i) => {
                const a = (i / 14) * Math.PI * 2;
                return <circle key={i} cx={200 + Math.cos(a) * 80} cy={240 + Math.sin(a) * 40} r={6 + (i % 3)} fill={c.glow} stroke={c.ink} strokeWidth="1.5" />;
              })}
            </g>
          )}
          <g style={{ transformOrigin: "200px 200px", animation: isFail ? "sfo-fall-roll 1.3s ease-out forwards" : "sfo-jump-spike 1.2s ease-out forwards" }}>
            <g transform="translate(120,50)">
              <Athlete c={c} pose={isFail ? "fall" : "jump"} />
            </g>
          </g>
          <g style={{ animation: isFail ? "sfo-ball-miss 1.2s ease-out forwards" : "sfo-ball-spike 1.0s ease-out forwards" }}>
            <circle cx="320" cy="80" r="24" fill="#fff" stroke={c.ink} strokeWidth="3" />
            <path d="M298 75 Q320 95 342 75" stroke={c.secondary} strokeWidth="3" fill="none" />
          </g>
        </svg>
      );

    case "table_tennis":
      return (
        <svg viewBox="0 0 400 300" className="w-full h-full">
          {/* table */}
          <rect x="40" y="200" width="320" height="14" fill={c.primary} stroke={c.ink} strokeWidth="3" rx="2" />
          <path d="M200 200 V160" stroke={c.ink} strokeWidth="2.5" />
          <rect x="195" y="160" width="10" height="4" fill={c.ink} />
          {/* paddle */}
          <g style={{ transformOrigin: "120px 140px", animation: isFail ? "sfo-paddle-whiff 1.2s ease-out forwards" : "sfo-paddle-smash 1.0s ease-out forwards" }}>
            <ellipse cx="120" cy="140" rx="34" ry="40" fill={c.secondary} stroke={c.ink} strokeWidth="3" />
            <rect x="115" y="172" width="10" height="34" fill={c.ink} rx="2" />
          </g>
          {/* ball trail */}
          <g style={{ animation: isFail ? "sfo-pingpong-bounce 1.3s ease-out forwards" : "sfo-pingpong-rocket 1.0s ease-out forwards" }}>
            <circle cx="260" cy="120" r="10" fill="#fff" stroke={c.ink} strokeWidth="2.5" />
          </g>
          {!isFail &&
            [0, 1, 2, 3, 4].map(i => (
              <circle key={i} cx={260 - i * 30} cy={120 + i * 4} r={9 - i * 1.4} fill={c.accent} opacity={0.7 - i * 0.12} style={{ animation: `sfo-fade 0.6s ${i * 0.05}s both` }} />
            ))}
        </svg>
      );

    case "climbing":
      return (
        <svg viewBox="0 0 400 300" className="w-full h-full">
          {/* wall */}
          <rect x="200" y="0" width="200" height="300" fill={c.secondary} opacity="0.15" stroke={c.ink} strokeWidth="3" />
          {/* holds */}
          {[
            [240, 60], [310, 100], [260, 150], [340, 180], [270, 220], [330, 250],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="12" fill={c.primary} stroke={c.ink} strokeWidth="2.5" />
          ))}
          {/* rope */}
          <path d="M260 0 Q260 80 230 130" stroke={c.accent} strokeWidth="4" fill="none" />
          {/* climber */}
          <g style={{ transformOrigin: "260px 180px", animation: isFail ? "sfo-climb-slip 1.4s ease-out forwards" : "sfo-climb-top 1.2s ease-out forwards" }}>
            <g transform="translate(180,100)">
              <Athlete c={c} pose="climb" />
            </g>
          </g>
          {/* chalk puff */}
          {isFail && (
            <g style={{ transformOrigin: "260px 200px", animation: "sfo-burst 0.9s 0.4s both" }}>
              {[0, 1, 2, 3, 4, 5].map(i => {
                const a = (i / 6) * Math.PI * 2;
                return <circle key={i} cx={260 + Math.cos(a) * 50} cy={200 + Math.sin(a) * 30} r={12} fill="#fff" opacity="0.85" />;
              })}
            </g>
          )}
          {!isFail && (
            <g style={{ animation: "sfo-pop 0.6s 0.6s both" }}>
              <circle cx="360" cy="40" r="20" fill={c.accent} stroke={c.ink} strokeWidth="3" />
              <text x="360" y="48" textAnchor="middle" fontSize="22" fontWeight="900" fill={c.ink}>★</text>
            </g>
          )}
        </svg>
      );

    case "swimming":
      return (
        <svg viewBox="0 0 400 300" className="w-full h-full">
          {/* water */}
          <path d="M0 200 Q100 180 200 200 T400 200 L400 300 L0 300 Z" fill={c.primary} opacity="0.4" stroke={c.ink} strokeWidth="2" />
          <path d="M0 220 Q100 200 200 220 T400 220" stroke={c.secondary} strokeWidth="2.5" fill="none" opacity="0.6" />
          {/* swimmer */}
          <g style={{ transformOrigin: "200px 200px", animation: isFail ? "sfo-bellyflop 1.3s ease-out forwards" : "sfo-dive-clean 1.1s ease-out forwards" }}>
            <g transform="translate(110,100)">
              <Athlete c={c} pose={isFail ? "fall" : "swim"} />
            </g>
          </g>
          {/* splash */}
          <g style={{ transformOrigin: "200px 210px", animation: "sfo-burst 1s 0.45s both" }}>
            {Array.from({ length: isFail ? 18 : 10 }).map((_, i) => {
              const a = (i / (isFail ? 18 : 10)) * Math.PI - Math.PI;
              const r = isFail ? 90 : 50;
              return <circle key={i} cx={200 + Math.cos(a) * r} cy={210 + Math.sin(a) * 40} r={isFail ? 8 : 5} fill={c.glow} stroke={c.ink} strokeWidth="1.5" />;
            })}
          </g>
        </svg>
      );

    case "artistic_swimming":
      return (
        <svg viewBox="0 0 400 300" className="w-full h-full">
          <path d="M0 220 Q200 200 400 220 L400 300 L0 300 Z" fill={c.secondary} opacity="0.35" stroke={c.ink} strokeWidth="2" />
          {/* twin synchronised swimmers */}
          {[140, 240].map((x, i) => (
            <g
              key={i}
              style={{
                transformOrigin: `${x}px 180px`,
                animation: isFail
                  ? `sfo-synchro-oops 1.3s ease-out ${i * 0.05}s forwards`
                  : `sfo-synchro-perfect 1.2s ease-out ${i * 0.0}s forwards`,
              }}
            >
              <g transform={`translate(${x - 100}, 80)`}>
                <Athlete c={c} pose={isFail ? "fall" : "tuck"} />
              </g>
            </g>
          ))}
          {/* sparkles */}
          {!isFail &&
            [60, 120, 200, 280, 340].map((x, i) => (
              <text key={i} x={x} y={50 + (i % 2) * 30} fontSize="28" fontWeight="900" fill={c.accent} style={{ animation: `sfo-pop 0.6s ${0.2 + i * 0.08}s both` }}>✦</text>
            ))}
        </svg>
      );

    case "gymnastics":
      return (
        <svg viewBox="0 0 400 300" className="w-full h-full">
          {/* mat */}
          <rect x="40" y="230" width="320" height="20" fill={c.primary} opacity="0.5" stroke={c.ink} strokeWidth="3" rx="4" />
          {/* gymnast */}
          <g style={{ transformOrigin: "200px 180px", animation: isFail ? "sfo-gym-tumble 1.4s ease-out forwards" : "sfo-gym-stick 1.2s ease-out forwards" }}>
            <g transform="translate(120,60)">
              <Athlete c={c} pose={isFail ? "spin" : "stand"} />
            </g>
          </g>
          {/* stars around head on fail */}
          {isFail && (
            <g style={{ animation: "sfo-spin-stars 1s 0.6s linear infinite", transformOrigin: "200px 130px" }}>
              {[0, 1, 2, 3].map(i => {
                const a = (i / 4) * Math.PI * 2;
                return <text key={i} x={200 + Math.cos(a) * 40} y={130 + Math.sin(a) * 40} fontSize="22" fontWeight="900" fill={c.accent}>✦</text>;
              })}
            </g>
          )}
          {!isFail && (
            <g style={{ animation: "sfo-pop 0.6s 0.7s both" }}>
              <text x="200" y="40" textAnchor="middle" fontSize="42" fontWeight="900" fill={c.accent}>10.0</text>
            </g>
          )}
        </svg>
      );

    case "generic":
    default:
      return (
        <svg viewBox="0 0 400 300" className="w-full h-full">
          <g style={{ transformOrigin: "200px 180px", animation: isFail ? "sfo-fall-roll 1.3s ease-out forwards" : "sfo-jump-spike 1.2s ease-out forwards" }}>
            <g transform="translate(120,60)">
              <Athlete c={c} pose={isFail ? "fall" : "jump"} />
            </g>
          </g>
        </svg>
      );
  }
};

/* ───────────────────── Confetti / particles ───────────────────── */
const fireConfetti = (palette: string[]) => {
  confetti({ particleCount: 90, angle: 60,  spread: 65, origin: { x: 0, y: 0.7 }, colors: palette, startVelocity: 55, ticks: 110, scalar: 1.1, zIndex: 9999 });
  confetti({ particleCount: 90, angle: 120, spread: 65, origin: { x: 1, y: 0.7 }, colors: palette, startVelocity: 55, ticks: 110, scalar: 1.1, zIndex: 9999 });
  setTimeout(() => confetti({ particleCount: 60, spread: 90, origin: { x: 0.5, y: 0 }, colors: ["#fbbf24", "#fff", "#f59e0b"], shapes: ["star"], scalar: 1.4, startVelocity: 25, ticks: 140, gravity: 0.6, zIndex: 9999 }), 200);
};

/* ───────────────────── Component ───────────────────── */
const SportFeedbackOverlay = ({ visible, event, sport, onDone, caption }: Props) => {
  const [key, setKey] = useState(0);
  const sportKey = useMemo(() => resolveSport(sport), [sport]);
  const palette = PALETTES[sportKey];
  const text = useMemo(
    () => caption ?? CAPTIONS[event][Math.floor(Math.random() * CAPTIONS[event].length)],
    [key, caption, event]
  );

  useEffect(() => {
    if (!visible) return;
    setKey(k => k + 1);

    if (event === "failure") {
      document.body.classList.add("sfo-screen-shake");
      const t = setTimeout(() => document.body.classList.remove("sfo-screen-shake"), 500);
      const tDone = setTimeout(() => onDone?.(), 1600);
      return () => { clearTimeout(t); clearTimeout(tDone); document.body.classList.remove("sfo-screen-shake"); };
    } else {
      fireConfetti([palette.primary, palette.secondary, palette.accent, palette.glow, "#fff"]);
      const tDone = setTimeout(() => onDone?.(), 1700);
      return () => clearTimeout(tDone);
    }
  }, [visible, event, onDone, palette.accent, palette.glow, palette.primary, palette.secondary]);

  if (!visible) return null;

  const isFail = event === "failure";

  // Impact rings & speedlines
  const rings = [0, 130, 260];
  const speedLines = Array.from({ length: 12 }).map((_, i) => ({ rot: (i / 12) * 360, delay: i * 18 }));

  return (
    <>
      <style>{`
        /* Screen shake — applied on body for failures */
        @keyframes sfo-screen-shake {
          0%,100% { transform: translate(0,0); }
          20% { transform: translate(-6px, 4px); }
          40% { transform: translate(7px, -3px); }
          60% { transform: translate(-5px, -4px); }
          80% { transform: translate(5px, 4px); }
        }
        .sfo-screen-shake { animation: sfo-screen-shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }

        /* Container entrance */
        @keyframes sfo-stage-in-fail {
          0%   { transform: translate(-50%,-50%) scale(0) rotate(-10deg); opacity: 0; }
          25%  { transform: translate(-50%,-50%) scale(1.15) rotate(6deg); opacity: 1; }
          50%  { transform: translate(-50%,-50%) scale(0.95) rotate(-3deg); opacity: 1; }
          75%  { transform: translate(-50%,-50%) scale(1.05) rotate(2deg); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(0.8) rotate(0); opacity: 0; }
        }
        @keyframes sfo-stage-in-win {
          0%   { transform: translate(-50%,-50%) scale(0) rotate(8deg); opacity: 0; }
          25%  { transform: translate(-50%,-50%) scale(1.25) rotate(-4deg); opacity: 1; }
          55%  { transform: translate(-50%,-50%) scale(1.05) rotate(3deg); opacity: 1; }
          80%  { transform: translate(-50%,-50%) scale(1.12) rotate(-1deg); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(0.9) rotate(0); opacity: 0; }
        }
        @keyframes sfo-ring {
          0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 0.9; }
          100% { transform: translate(-50%,-50%) scale(2.6); opacity: 0; }
        }
        @keyframes sfo-speedline {
          0%   { transform: translate(-50%,-50%) rotate(var(--rot)) translateX(80px) scaleX(0); opacity: 0; }
          30%  { opacity: 1; transform: translate(-50%,-50%) rotate(var(--rot)) translateX(160px) scaleX(1); }
          100% { opacity: 0; transform: translate(-50%,-50%) rotate(var(--rot)) translateX(280px) scaleX(0.3); }
        }
        @keyframes sfo-caption {
          0%   { transform: translate(-50%, 50px) scale(0.4) rotate(-8deg); opacity: 0; }
          25%  { transform: translate(-50%, 0) scale(1.3) rotate(4deg); opacity: 1; }
          70%  { transform: translate(-50%, 0) scale(1.1) rotate(-2deg); opacity: 1; }
          100% { transform: translate(-50%, -40px) scale(0.8) rotate(0); opacity: 0; }
        }

        /* Inner shake during failure */
        @keyframes sfo-inner-shake {
          0%,100% { transform: translate(0,0) rotate(0); }
          25% { transform: translate(-5px,3px) rotate(-2deg); }
          50% { transform: translate(5px,-2px) rotate(2deg); }
          75% { transform: translate(-3px,4px) rotate(-1deg); }
        }

        @keyframes sfo-pop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sfo-fade { 0%{opacity:0} 50%{opacity:1} 100%{opacity:0} }
        @keyframes sfo-burst {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes sfo-spin-stars {
          from { transform: rotate(0deg); } to { transform: rotate(360deg); }
        }

        /* Volleyball */
        @keyframes sfo-jump-spike {
          0% { transform: translateY(40px) scale(1); }
          40% { transform: translateY(-30px) scale(1.05); }
          70% { transform: translateY(-15px) scale(1.02) rotate(-5deg); }
          100% { transform: translateY(0) scale(1) rotate(0); }
        }
        @keyframes sfo-fall-roll {
          0% { transform: translateY(-30px) rotate(0deg); }
          40% { transform: translateY(0px) rotate(180deg); }
          70% { transform: translateY(20px) rotate(360deg); }
          100% { transform: translateY(40px) rotate(420deg); }
        }
        @keyframes sfo-ball-spike {
          0% { transform: translate(60px,-40px) scale(1); }
          50% { transform: translate(-80px,30px) scale(1.4); }
          100% { transform: translate(-140px,90px) scale(1.6); opacity:0; }
        }
        @keyframes sfo-ball-miss {
          0% { transform: translate(0,0) rotate(0); }
          60% { transform: translate(-60px,-20px) rotate(280deg); }
          100% { transform: translate(-120px,80px) rotate(540deg); opacity:0.5; }
        }

        /* Table tennis */
        @keyframes sfo-paddle-smash {
          0% { transform: rotate(60deg) scale(0.9); }
          50% { transform: rotate(-30deg) scale(1.2); }
          100% { transform: rotate(-10deg) scale(1); }
        }
        @keyframes sfo-paddle-whiff {
          0% { transform: rotate(60deg); }
          30% { transform: rotate(-50deg) translateX(20px); }
          60% { transform: rotate(40deg) translateX(-10px); }
          100% { transform: rotate(0deg) translateX(0); }
        }
        @keyframes sfo-pingpong-rocket {
          0% { transform: translate(-160px,40px) scale(1); }
          100% { transform: translate(120px,-30px) scale(1.4); }
        }
        @keyframes sfo-pingpong-bounce {
          0%   { transform: translate(-160px,0) scale(1); }
          25%  { transform: translate(-80px,40px) scale(1); }
          50%  { transform: translate(-40px,-20px) scale(1); }
          75%  { transform: translate(20px,30px) scale(1); }
          100% { transform: translate(80px,80px) scale(0.5); opacity:0; }
        }

        /* Climbing */
        @keyframes sfo-climb-top {
          0% { transform: translateY(40px) scale(1); }
          60% { transform: translateY(-30px) scale(1.05); }
          100% { transform: translateY(-50px) scale(1.1); }
        }
        @keyframes sfo-climb-slip {
          0% { transform: translateY(-20px) rotate(0); }
          30% { transform: translateY(10px) rotate(-20deg); }
          60% { transform: translateY(40px) rotate(15deg); }
          100% { transform: translateY(60px) rotate(-10deg); }
        }

        /* Swimming */
        @keyframes sfo-dive-clean {
          0% { transform: translate(-80px,-60px) rotate(-30deg) scale(0.9); }
          70% { transform: translate(0,0) rotate(0deg) scale(1.05); }
          100% { transform: translate(20px,10px) rotate(0deg) scale(1); }
        }
        @keyframes sfo-bellyflop {
          0% { transform: translate(-80px,-80px) rotate(0); }
          50% { transform: translate(-10px,0) rotate(20deg); }
          80% { transform: translate(0,30px) rotate(0); }
          100% { transform: translate(0,40px) rotate(0); }
        }

        /* Artistic synchro */
        @keyframes sfo-synchro-perfect {
          0% { transform: translateY(50px) scale(0.8) rotate(0); }
          50% { transform: translateY(-30px) scale(1.1) rotate(0); }
          100% { transform: translateY(0) scale(1) rotate(0); }
        }
        @keyframes sfo-synchro-oops {
          0% { transform: translateY(0) scale(1) rotate(0); }
          50% { transform: translateY(-20px) scale(0.95) rotate(-25deg); }
          100% { transform: translateY(20px) scale(0.9) rotate(20deg); }
        }

        /* Gymnastics */
        @keyframes sfo-gym-stick {
          0% { transform: translateY(-80px) rotate(720deg) scale(0.7); }
          60% { transform: translateY(10px) rotate(0deg) scale(1.05); }
          80% { transform: translateY(-4px) rotate(0deg) scale(1); }
          100% { transform: translateY(0) rotate(0deg) scale(1); }
        }
        @keyframes sfo-gym-tumble {
          0% { transform: translateY(-40px) rotate(0); }
          40% { transform: translateY(20px) rotate(540deg); }
          70% { transform: translateY(40px) rotate(720deg) scale(0.9); }
          100% { transform: translateY(50px) rotate(740deg) scale(0.85); }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        {/* Impact rings */}
        {rings.map((d, i) => (
          <div
            key={`r-${key}-${i}`}
            className="absolute top-1/2 left-1/2 rounded-full border-4"
            style={{
              width: 320,
              height: 320,
              borderColor: i === 0 ? palette.accent : i === 1 ? palette.primary : palette.glow,
              animation: `sfo-ring 1s ease-out ${d}ms both`,
              boxShadow: `0 0 50px ${palette.glow}`,
            }}
          />
        ))}

        {/* Speed lines (only on failure for chaos, success uses confetti) */}
        {isFail && speedLines.map((s, i) => (
          <div
            key={`sl-${key}-${i}`}
            className="absolute top-1/2 left-1/2 h-1.5 w-24 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${palette.accent}, transparent)`,
              ["--rot" as any]: `${s.rot}deg`,
              animation: `sfo-speedline 0.8s ease-out ${s.delay}ms both`,
            } as React.CSSProperties}
          />
        ))}

        {/* Main stage */}
        <div
          key={`stage-${key}`}
          className="absolute top-1/2 left-1/2"
          style={{
            width: "min(70vh, 92vw)",
            height: "min(70vh, 92vw)",
            maxWidth: 820,
            maxHeight: 820,
            animation: `${isFail ? "sfo-stage-in-fail" : "sfo-stage-in-win"} ${isFail ? "1.6s" : "1.7s"} cubic-bezier(.34,1.56,.64,1) both`,
            filter: `drop-shadow(0 30px 60px ${palette.primary}aa) drop-shadow(0 0 50px ${palette.glow})`,
          }}
        >
          <div
            className="w-full h-full"
            style={isFail ? { animation: "sfo-inner-shake 0.32s ease-in-out 0.25s 3 both" } : undefined}
          >
            <Scene sport={sportKey} event={event} c={palette} />
          </div>
        </div>

        {/* Caption */}
        <div
          key={`c-${key}`}
          className="absolute left-1/2"
          style={{ bottom: "14%", animation: "sfo-caption 1.5s cubic-bezier(.34,1.56,.64,1) 0.2s both" }}
        >
          <span
            className="inline-block font-black tracking-tight px-6 py-2.5 rounded-2xl text-white"
            style={{
              fontSize: "clamp(28px, 5.5vw, 64px)",
              background: `linear-gradient(135deg, ${palette.primary}, ${isFail ? palette.secondary : palette.accent})`,
              boxShadow: `0 14px 44px ${palette.primary}aa, 0 0 36px ${palette.glow}`,
              border: `3px solid ${palette.ink}`,
              textShadow: `0 3px 0 ${palette.ink}`,
            }}
          >
            {text}
          </span>
        </div>
      </div>
    </>
  );
};

export default SportFeedbackOverlay;
