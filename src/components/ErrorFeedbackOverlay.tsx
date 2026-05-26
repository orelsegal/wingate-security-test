import { useEffect, useMemo, useState } from "react";

/**
 * ErrorFeedbackOverlay — Giant Chaos Monster.
 * Fullscreen fixed overlay that takes over the screen for ~1.4s on a wrong answer.
 * Does NOT live inside any card. Pointer-events disabled — user can click again immediately after.
 */
type Props = {
  visible: boolean;
  onDone?: () => void;
  /** Optional tiny caption like "אופססס!" / "כמעט!" / "נסה שוב!" */
  caption?: string;
};

const CAPTIONS = ["אופססס!", "כמעט!", "נסה שוב!", "אוי ואבוי!", "כמעט תפסת!"];

/** Saturated, electric palette — purple / lime / fuchsia / orange / cyan / neon-yellow */
const PALETTES = [
  { body: "#a855f7", body2: "#7c3aed", horn: "#facc15", tongue: "#f43f5e", glow: "#c084fc" }, // electric purple
  { body: "#84cc16", body2: "#22c55e", horn: "#f97316", tongue: "#ec4899", glow: "#bef264" }, // lime
  { body: "#ec4899", body2: "#db2777", horn: "#22d3ee", tongue: "#fde047", glow: "#f9a8d4" }, // fuchsia
  { body: "#f97316", body2: "#ea580c", horn: "#a855f7", tongue: "#facc15", glow: "#fdba74" }, // orange
  { body: "#06b6d4", body2: "#0891b2", horn: "#facc15", tongue: "#f43f5e", glow: "#67e8f9" }, // cyan
];

const ErrorFeedbackOverlay = ({ visible, onDone, caption }: Props) => {
  const [key, setKey] = useState(0);
  const palette = useMemo(
    () => PALETTES[Math.floor(Math.random() * PALETTES.length)],
    [key]
  );
  const text = useMemo(
    () => caption ?? CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)],
    [key, caption]
  );

  useEffect(() => {
    if (!visible) return;
    setKey(k => k + 1);
    // Screen shake on body
    document.body.classList.add("efo-screen-shake");
    const tShake = setTimeout(() => document.body.classList.remove("efo-screen-shake"), 450);
    const tDone = setTimeout(() => onDone?.(), 1500);
    return () => {
      clearTimeout(tShake);
      clearTimeout(tDone);
      document.body.classList.remove("efo-screen-shake");
    };
  }, [visible, onDone]);

  if (!visible) return null;

  // Particles around monster
  const particles = Array.from({ length: 14 }).map((_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const dist = 220 + Math.random() * 120;
    return {
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      delay: 80 + Math.random() * 120,
      size: 10 + Math.random() * 14,
      color: [palette.horn, palette.tongue, palette.glow, palette.body][i % 4],
    };
  });

  const speedLines = Array.from({ length: 10 }).map((_, i) => ({
    rot: (i / 10) * 360,
    delay: i * 20,
  }));

  return (
    <>
      <style>{`
        @keyframes efo-screen-shake {
          0%,100% { transform: translate(0,0); }
          15% { transform: translate(-6px, 4px); }
          30% { transform: translate(7px, -3px); }
          45% { transform: translate(-5px, -5px); }
          60% { transform: translate(6px, 5px); }
          75% { transform: translate(-3px, 3px); }
        }
        .efo-screen-shake { animation: efo-screen-shake 0.45s cubic-bezier(.36,.07,.19,.97) both; }

        @keyframes efo-monster-in {
          0%   { transform: translate(-50%,-50%) translateY(120px) scale(0) rotate(-12deg); opacity: 0; }
          25%  { transform: translate(-50%,-50%) translateY(-30px) scale(1.55) rotate(10deg); opacity: 1; }
          45%  { transform: translate(-50%,-50%) translateY(10px) scale(1.25) rotate(-6deg); opacity: 1; }
          65%  { transform: translate(-50%,-50%) translateY(0) scale(1.4) rotate(3deg); opacity: 1; }
          80%  { transform: translate(-50%,-50%) translateY(0) scale(1.35) rotate(-2deg); opacity: 1; }
          100% { transform: translate(-50%,-50%) translateY(-160px) scale(0) rotate(18deg); opacity: 0; }
        }
        @keyframes efo-inner-shake {
          0%,100% { transform: translate(0,0) rotate(0); }
          20% { transform: translate(-4px, 2px) rotate(-2deg); }
          40% { transform: translate(5px, -3px) rotate(2deg); }
          60% { transform: translate(-3px, 4px) rotate(-1deg); }
          80% { transform: translate(4px, -2px) rotate(1deg); }
        }
        @keyframes efo-eyes-bulge {
          0%,100% { transform: scale(1); }
          30% { transform: scale(1.4); }
          60% { transform: scale(0.8); }
        }
        @keyframes efo-mouth-open {
          0% { transform: scaleY(0.2); }
          40% { transform: scaleY(1.4); }
          70% { transform: scaleY(1); }
          100% { transform: scaleY(1.2); }
        }
        @keyframes efo-ring {
          0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 0.9; }
          100% { transform: translate(-50%,-50%) scale(2.4); opacity: 0; }
        }
        @keyframes efo-particle {
          0%   { transform: translate(-50%,-50%) translate(0,0) scale(0.4); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translate(-50%,-50%) translate(var(--tx), var(--ty)) scale(1.1); opacity: 0; }
        }
        @keyframes efo-speedline {
          0%   { transform: translate(-50%,-50%) rotate(var(--rot)) translateX(80px) scaleX(0); opacity: 0; }
          25%  { opacity: 1; transform: translate(-50%,-50%) rotate(var(--rot)) translateX(140px) scaleX(1); }
          100% { opacity: 0; transform: translate(-50%,-50%) rotate(var(--rot)) translateX(260px) scaleX(0.4); }
        }
        @keyframes efo-caption {
          0%   { transform: translate(-50%, 40px) scale(0.4) rotate(-8deg); opacity: 0; }
          25%  { transform: translate(-50%, 0) scale(1.25) rotate(4deg); opacity: 1; }
          70%  { transform: translate(-50%, 0) scale(1.1) rotate(-2deg); opacity: 1; }
          100% { transform: translate(-50%, -30px) scale(0.8) rotate(0); opacity: 0; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        {/* Impact rings */}
        {[0, 120, 240].map((d, i) => (
          <div
            key={`r-${key}-${i}`}
            className="absolute top-1/2 left-1/2 rounded-full border-4"
            style={{
              width: 280,
              height: 280,
              borderColor: i === 0 ? palette.horn : i === 1 ? palette.body : palette.glow,
              animation: `efo-ring 0.9s ease-out ${d}ms both`,
              boxShadow: `0 0 40px ${palette.glow}`,
            }}
          />
        ))}

        {/* Speed lines */}
        {speedLines.map((s, i) => (
          <div
            key={`sl-${key}-${i}`}
            className="absolute top-1/2 left-1/2 h-1.5 w-24 rounded-full"
            style={
              {
                background: `linear-gradient(90deg, ${palette.horn}, transparent)`,
                ["--rot" as any]: `${s.rot}deg`,
                animation: `efo-speedline 0.7s ease-out ${s.delay}ms both`,
              } as React.CSSProperties
            }
          />
        ))}

        {/* Particles */}
        {particles.map((p, i) => (
          <div
            key={`p-${key}-${i}`}
            className="absolute top-1/2 left-1/2 rounded-full"
            style={
              {
                width: p.size,
                height: p.size,
                background: p.color,
                boxShadow: `0 0 14px ${p.color}`,
                ["--tx" as any]: `${p.tx}px`,
                ["--ty" as any]: `${p.ty}px`,
                animation: `efo-particle 1.1s cubic-bezier(.2,.7,.3,1) ${p.delay}ms both`,
              } as React.CSSProperties
            }
          />
        ))}

        {/* GIANT MONSTER */}
        <div
          key={`m-${key}`}
          className="absolute top-1/2 left-1/2"
          style={{
            width: "min(72vh, 92vw)",
            height: "min(72vh, 92vw)",
            maxWidth: 760,
            maxHeight: 760,
            animation: "efo-monster-in 1.45s cubic-bezier(.34,1.56,.64,1) both",
            filter: `drop-shadow(0 30px 60px ${palette.body}aa) drop-shadow(0 0 40px ${palette.glow})`,
          }}
        >
          <div
            className="w-full h-full"
            style={{ animation: "efo-inner-shake 0.32s ease-in-out 0.25s 4 both" }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                <radialGradient id={`body-${key}`} cx="50%" cy="40%" r="65%">
                  <stop offset="0%" stopColor={palette.body} />
                  <stop offset="100%" stopColor={palette.body2} />
                </radialGradient>
                <radialGradient id={`glow-${key}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={palette.glow} stopOpacity="0.6" />
                  <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Glow halo */}
              <circle cx="100" cy="105" r="95" fill={`url(#glow-${key})`} />

              {/* Horns */}
              <path d="M55 55 L62 18 L75 58 Z" fill={palette.horn} stroke="#1f1147" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M125 58 L138 18 L145 55 Z" fill={palette.horn} stroke="#1f1147" strokeWidth="2.5" strokeLinejoin="round" />

              {/* Body — blobby */}
              <path
                d="M30 110 Q25 65 70 55 Q100 35 130 55 Q175 65 170 110 Q175 165 130 170 Q100 185 70 170 Q25 165 30 110 Z"
                fill={`url(#body-${key})`}
                stroke="#1f1147"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />

              {/* Spikes on top */}
              <path d="M85 50 L92 35 L99 50 Z" fill={palette.body2} stroke="#1f1147" strokeWidth="2" />
              <path d="M101 48 L108 33 L115 48 Z" fill={palette.body2} stroke="#1f1147" strokeWidth="2" />

              {/* Cheek spots */}
              <circle cx="55" cy="125" r="10" fill={palette.tongue} opacity="0.55" />
              <circle cx="145" cy="125" r="10" fill={palette.tongue} opacity="0.55" />

              {/* Eyes (bulging) */}
              <g style={{ animation: "efo-eyes-bulge 0.5s ease-in-out 0.3s 2 both", transformOrigin: "100px 95px" }}>
                <circle cx="78" cy="95" r="20" fill="#fff" stroke="#1f1147" strokeWidth="3" />
                <circle cx="122" cy="95" r="20" fill="#fff" stroke="#1f1147" strokeWidth="3" />
                <circle cx="82" cy="100" r="10" fill="#1f1147" />
                <circle cx="126" cy="100" r="10" fill="#1f1147" />
                <circle cx="85" cy="97" r="3.5" fill="#fff" />
                <circle cx="129" cy="97" r="3.5" fill="#fff" />
              </g>

              {/* Eyebrows angry+funny */}
              <path d="M62 72 L92 80" stroke="#1f1147" strokeWidth="5" strokeLinecap="round" />
              <path d="M138 72 L108 80" stroke="#1f1147" strokeWidth="5" strokeLinecap="round" />

              {/* MOUTH — big open roar */}
              <g style={{ transformOrigin: "100px 145px", animation: "efo-mouth-open 0.6s ease-out 0.25s both" }}>
                <ellipse cx="100" cy="145" rx="36" ry="22" fill="#1f1147" stroke="#1f1147" strokeWidth="2" />
                <path d="M70 137 L78 150 L86 137 L94 150 L102 137 L110 150 L118 137 L126 150 L130 137"
                  stroke="#fff" strokeWidth="3" fill="none" strokeLinejoin="round" />
                <ellipse cx="100" cy="158" rx="14" ry="6" fill={palette.tongue} />
              </g>

              {/* Tiny arms */}
              <path d="M28 130 Q15 140 22 158 Q30 160 35 150" fill={palette.body2} stroke="#1f1147" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M172 130 Q185 140 178 158 Q170 160 165 150" fill={palette.body2} stroke="#1f1147" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Caption */}
        <div
          key={`c-${key}`}
          className="absolute left-1/2"
          style={{
            bottom: "18%",
            animation: "efo-caption 1.3s cubic-bezier(.34,1.56,.64,1) 0.15s both",
          }}
        >
          <span
            className="inline-block font-black tracking-tight px-5 py-2 rounded-2xl text-white"
            style={{
              fontSize: "clamp(28px, 5.5vw, 64px)",
              background: `linear-gradient(135deg, ${palette.body}, ${palette.tongue})`,
              boxShadow: `0 12px 40px ${palette.body}aa, 0 0 30px ${palette.glow}`,
              border: "3px solid #1f1147",
              textShadow: "0 3px 0 #1f1147",
            }}
          >
            {text}
          </span>
        </div>
      </div>
    </>
  );
};

export default ErrorFeedbackOverlay;
