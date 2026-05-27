import { useEffect, useMemo, useState } from "react";

/**
 * SuccessOverlay — Cinematic beach-volleyball spike with confetti.
 * Fullscreen, pointer-events disabled, ~1.9s. Hebrew RTL.
 *
 * Sequence:
 *  0.00s — beach scene fades in (sun, sand, net silhouette)
 *  0.05s — player rises from right, arm cocked back, ball arcs from left
 *  0.55s — IMPACT: player hand meets ball, shock ring, confetti burst, screen flash
 *  0.95s — ball rockets to bottom-left, player lands, caption pops
 *  1.90s — everything fades out
 */
type Props = {
  visible: boolean;
  onDone?: () => void;
  caption?: string;
};

const CAPTIONS = ["בול!", "הנחתה!", "אלוף/ה!", "מעולה!", "כל הכבוד!", "פצצה!"];

const CONFETTI_COLORS = [
  "#ef4444", "#3b82f6", "#10b981", "#f59e0b",
  "#a855f7", "#ec4899", "#06b6d4", "#facc15",
];

const SuccessOverlay = ({ visible, onDone, caption }: Props) => {
  const [key, setKey] = useState(0);

  const text = useMemo(
    () => caption ?? CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)],
    [key, caption]
  );

  // Confetti particles erupt from impact point (about 50% / 38% of screen)
  const confetti = useMemo(() => {
    return Array.from({ length: 90 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 280 + Math.random() * 420;
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 100, // bias upward
        delay: 540 + Math.random() * 180,
        duration: 1100 + Math.random() * 700,
        size: 6 + Math.random() * 12,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 720 - 360,
        shape: Math.random() > 0.55 ? "rect" : Math.random() > 0.5 ? "circ" : "tri",
      };
    });
  }, [key]);

  // Streamers (longer ribbons)
  const streamers = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => {
      const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 380 + Math.random() * 200;
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 60,
        delay: 560 + Math.random() * 120,
        duration: 1500 + Math.random() * 500,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 360,
      };
    });
  }, [key]);

  useEffect(() => {
    if (!visible) return;
    setKey(k => k + 1);
    const t = setTimeout(() => onDone?.(), 1950);
    return () => clearTimeout(t);
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes so-scene-in {
          0% { opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes so-flash {
          0%, 100% { opacity: 0; }
          28% { opacity: 0; }
          30% { opacity: 0.85; }
          38% { opacity: 0; }
        }
        @keyframes so-sun-pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes so-sunrays {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Ball: arcs in from far left, meets impact point, then rockets to bottom-left */
        @keyframes so-ball {
          0%   { transform: translate(-60vw, 20vh) rotate(0deg) scale(0.7); opacity: 0; }
          10%  { opacity: 1; }
          28%  { transform: translate(-12vw, -8vh) rotate(180deg) scale(1); }
          32%  { transform: translate(0, 0) rotate(220deg) scale(1.25); }
          34%  { transform: translate(0, 0) rotate(240deg) scale(1.4); }
          40%  { transform: translate(-15vw, 6vh) rotate(360deg) scale(1.1); }
          70%  { transform: translate(-55vw, 38vh) rotate(900deg) scale(0.9); opacity: 1; }
          100% { transform: translate(-70vw, 55vh) rotate(1200deg) scale(0.6); opacity: 0; }
        }

        /* Player: enters from bottom-right, jumps, arm swings, lands */
        @keyframes so-player {
          0%   { transform: translate(40vw, 60vh) scale(0.6); opacity: 0; }
          10%  { opacity: 1; }
          25%  { transform: translate(8vw, -15vh) scale(1.0); }
          32%  { transform: translate(2vw, -22vh) scale(1.05); }
          40%  { transform: translate(0, -18vh) scale(1.02); }
          60%  { transform: translate(-4vw, 0) scale(1); }
          85%  { transform: translate(-4vw, 8vh) scale(0.95); opacity: 1; }
          100% { transform: translate(-4vw, 14vh) scale(0.9); opacity: 0; }
        }
        @keyframes so-arm-swing {
          0%   { transform: rotate(-120deg); }
          25%  { transform: rotate(-140deg); }
          30%  { transform: rotate(-40deg); }
          34%  { transform: rotate(20deg); }
          50%  { transform: rotate(40deg); }
          100% { transform: rotate(50deg); }
        }
        @keyframes so-impact-ring {
          0%, 30% { transform: translate(-50%,-50%) scale(0.2); opacity: 0; }
          32% { opacity: 0.95; }
          70% { transform: translate(-50%,-50%) scale(3); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes so-shockwave {
          0%, 28% { transform: translate(-50%,-50%) scale(0.1); opacity: 0; }
          30% { opacity: 0.7; }
          55% { transform: translate(-50%,-50%) scale(2.4); opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes so-confetti {
          0%   { transform: translate(-50%,-50%) translate(0,0) rotate(0deg) scale(0.3); opacity: 0; }
          5%   { opacity: 1; }
          100% { transform: translate(-50%,-50%) translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(1); opacity: 0; }
        }
        @keyframes so-streamer {
          0%   { transform: translate(-50%,-50%) translate(0,0) rotate(0deg) scaleY(0.2); opacity: 0; }
          8%   { opacity: 1; }
          100% { transform: translate(-50%,-50%) translate(var(--tx), var(--ty)) rotate(var(--rot)) scaleY(1); opacity: 0; }
        }

        @keyframes so-caption {
          0%, 38% { transform: translate(-50%, 80px) scale(0.3) rotate(-8deg); opacity: 0; }
          45%     { transform: translate(-50%, 0) scale(1.25) rotate(4deg); opacity: 1; }
          60%     { transform: translate(-50%, 0) scale(1.05) rotate(-2deg); opacity: 1; }
          85%     { transform: translate(-50%, 0) scale(1) rotate(0deg); opacity: 1; }
          100%    { transform: translate(-50%, -40px) scale(0.85); opacity: 0; }
        }

        @keyframes so-speedline {
          0%   { transform: translate(0,0) scaleX(0); opacity: 0; }
          5%   { opacity: 1; transform: translate(0,0) scaleX(1); }
          100% { transform: translate(var(--sx), var(--sy)) scaleX(0.3); opacity: 0; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {/* Beach scene background */}
        <div
          className="absolute inset-0"
          style={{
            animation: "so-scene-in 1.9s ease-in-out both",
            background:
              "linear-gradient(to bottom, #87ceeb 0%, #b0e0f5 35%, #ffe4a8 55%, #f9d77e 75%, #e8b95c 100%)",
          }}
        >
          {/* Sun rays */}
          <div
            className="absolute"
            style={{
              top: "10%",
              left: "18%",
              width: 360,
              height: 360,
              transform: "translate(-50%,-50%)",
              animation: "so-sunrays 8s linear infinite",
              background:
                "conic-gradient(from 0deg, rgba(255,235,150,0) 0deg, rgba(255,235,150,0.5) 8deg, rgba(255,235,150,0) 16deg, rgba(255,235,150,0) 30deg, rgba(255,235,150,0.5) 38deg, rgba(255,235,150,0) 46deg, rgba(255,235,150,0) 60deg, rgba(255,235,150,0.5) 68deg, rgba(255,235,150,0) 76deg, rgba(255,235,150,0) 90deg, rgba(255,235,150,0.5) 98deg, rgba(255,235,150,0) 106deg, rgba(255,235,150,0) 360deg)",
              filter: "blur(8px)",
            }}
          />
          {/* Sun */}
          <div
            className="absolute rounded-full"
            style={{
              top: "10%",
              left: "18%",
              width: 130,
              height: 130,
              transform: "translate(-50%,-50%)",
              background:
                "radial-gradient(circle, #fff7d0 0%, #ffd966 55%, #f59e0b 100%)",
              boxShadow: "0 0 80px rgba(255, 220, 120, 0.9)",
              animation: "so-sun-pulse 2s ease-in-out infinite",
            }}
          />

          {/* Sea horizon */}
          <div
            className="absolute left-0 right-0"
            style={{
              top: "48%",
              height: 14,
              background:
                "linear-gradient(to bottom, rgba(56,178,210,0.55), rgba(56,178,210,0))",
            }}
          />

          {/* Net silhouette (left third, far away) */}
          <svg
            className="absolute"
            style={{ left: "8%", top: "44%", width: "22%", opacity: 0.35 }}
            viewBox="0 0 200 120"
            preserveAspectRatio="none"
          >
            <line x1="10" y1="0" x2="10" y2="120" stroke="#475569" strokeWidth="3" />
            <line x1="190" y1="0" x2="190" y2="120" stroke="#475569" strokeWidth="3" />
            <rect x="10" y="20" width="180" height="34" fill="none" stroke="#475569" strokeWidth="2" />
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={`v${i}`} x1={10 + i * 15} y1="20" x2={10 + i * 15} y2="54" stroke="#475569" strokeWidth="1" />
            ))}
            {Array.from({ length: 4 }).map((_, i) => (
              <line key={`h${i}`} x1="10" y1={20 + i * 11} x2="190" y2={20 + i * 11} stroke="#475569" strokeWidth="1" />
            ))}
          </svg>

          {/* Sand grain texture */}
          <div
            className="absolute left-0 right-0 bottom-0"
            style={{
              height: "30%",
              background:
                "radial-gradient(circle at 20% 30%, rgba(180,140,80,0.25), transparent 40%), radial-gradient(circle at 70% 60%, rgba(180,140,80,0.2), transparent 50%), radial-gradient(circle at 50% 80%, rgba(120,90,50,0.2), transparent 40%)",
            }}
          />
        </div>

        {/* Impact white flash */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 50% 38%, #fff 0%, transparent 55%)",
            animation: "so-flash 1.9s ease-out both",
          }}
        />

        {/* IMPACT POINT — center-upper area: 50% / 38% */}
        <div className="absolute" style={{ left: "50%", top: "38%" }}>
          {/* Shockwave ring */}
          <div
            className="absolute rounded-full border-[6px]"
            style={{
              width: 200,
              height: 200,
              borderColor: "#fff",
              boxShadow: "0 0 40px rgba(255,255,255,0.8)",
              animation: "so-shockwave 1.9s ease-out both",
            }}
          />
          {/* Impact rings */}
          {[0, 80, 160].map((d, i) => (
            <div
              key={i}
              className="absolute rounded-full border-4"
              style={{
                width: 180,
                height: 180,
                borderColor: i === 0 ? "#facc15" : i === 1 ? "#f97316" : "#fff",
                animation: `so-impact-ring 1.9s ease-out ${d}ms both`,
                boxShadow: "0 0 20px rgba(250,204,21,0.6)",
              }}
            />
          ))}

          {/* Streamers */}
          {streamers.map((s, i) => (
            <div
              key={`s-${key}-${i}`}
              className="absolute"
              style={
                {
                  left: 0,
                  top: 0,
                  width: 6,
                  height: 90,
                  borderRadius: 3,
                  background: `linear-gradient(to bottom, ${s.color}, ${s.color}00)`,
                  ["--tx" as any]: `${s.tx}px`,
                  ["--ty" as any]: `${s.ty}px`,
                  ["--rot" as any]: `${s.rot}deg`,
                  animation: `so-streamer ${s.duration}ms cubic-bezier(.2,.7,.3,1) ${s.delay}ms both`,
                  boxShadow: `0 0 8px ${s.color}`,
                } as React.CSSProperties
              }
            />
          ))}

          {/* Confetti */}
          {confetti.map((c, i) => (
            <div
              key={`c-${key}-${i}`}
              className="absolute"
              style={
                {
                  left: 0,
                  top: 0,
                  width: c.size,
                  height: c.shape === "rect" ? c.size * 0.45 : c.size,
                  background: c.shape === "tri" ? "transparent" : c.color,
                  borderRadius: c.shape === "circ" ? "50%" : c.shape === "rect" ? 2 : 0,
                  clipPath: c.shape === "tri" ? "polygon(50% 0%, 0% 100%, 100% 100%)" : undefined,
                  borderLeft: c.shape === "tri" ? `${c.size / 2}px solid transparent` : undefined,
                  borderRight: c.shape === "tri" ? `${c.size / 2}px solid transparent` : undefined,
                  borderBottom: c.shape === "tri" ? `${c.size}px solid ${c.color}` : undefined,
                  ["--tx" as any]: `${c.tx}px`,
                  ["--ty" as any]: `${c.ty}px`,
                  ["--rot" as any]: `${c.rot}deg`,
                  animation: `so-confetti ${c.duration}ms cubic-bezier(.15,.7,.35,1) ${c.delay}ms both`,
                  boxShadow: c.shape !== "tri" ? `0 0 6px ${c.color}90` : undefined,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* BALL */}
        <div
          className="absolute"
          style={{
            left: "50%",
            top: "38%",
            width: "clamp(70px, 9vw, 130px)",
            height: "clamp(70px, 9vw, 130px)",
            transform: "translate(-50%,-50%)",
            animation: "so-ball 1.9s cubic-bezier(.4,.1,.4,1) both",
            filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.35))",
          }}
        >
          <VolleyballSVG />
        </div>

        {/* PLAYER — placed so head/hand naturally lands near impact point */}
        <div
          className="absolute"
          style={{
            left: "54%",
            top: "42%",
            width: "clamp(160px, 22vw, 360px)",
            transform: "translate(-50%,-50%)",
            animation: "so-player 1.9s cubic-bezier(.34,1.2,.5,1) both",
            filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.4))",
          }}
        >
          <BeachSpikerSVG />
        </div>

        {/* CAPTION */}
        <div
          key={`cap-${key}`}
          className="absolute left-1/2"
          style={{
            top: "72%",
            animation: "so-caption 1.9s cubic-bezier(.34,1.56,.64,1) both",
          }}
        >
          <span
            className="inline-block font-black tracking-tight px-7 py-3 rounded-2xl text-white"
            style={{
              fontSize: "clamp(32px, 6vw, 76px)",
              background: "linear-gradient(135deg, #10b981 0%, #facc15 50%, #f97316 100%)",
              boxShadow:
                "0 16px 50px rgba(16,185,129,0.5), 0 0 40px rgba(250,204,21,0.5)",
              border: "4px solid #0f172a",
              textShadow: "0 4px 0 #0f172a, 0 6px 20px rgba(0,0,0,0.3)",
            }}
            dir="rtl"
          >
            {text}
          </span>
        </div>
      </div>
    </>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   Volleyball (classic 3-panel beach ball)
   ────────────────────────────────────────────────────────────────────────── */
const VolleyballSVG = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <defs>
      <radialGradient id="vb-body" cx="35%" cy="32%" r="75%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="65%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </radialGradient>
    </defs>
    {/* Ball body */}
    <circle cx="50" cy="50" r="46" fill="url(#vb-body)" stroke="#1e293b" strokeWidth="2" />
    {/* Panel curves — 3 swooping bands */}
    <path d="M50 4 Q22 30 50 96" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    <path d="M4 50 Q40 38 96 50" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    <path d="M50 4 Q78 30 50 96" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    {/* Color accents on panels (beach style) */}
    <path d="M50 4 Q22 30 50 96 L50 50 Z" fill="#fbbf24" opacity="0.18" />
    <path d="M4 50 Q40 38 96 50 L50 50 Z" fill="#06b6d4" opacity="0.15" />
    {/* Highlight */}
    <ellipse cx="34" cy="30" rx="14" ry="8" fill="rgba(255,255,255,0.7)" transform="rotate(-30 34 30)" />
  </svg>
);

/* ──────────────────────────────────────────────────────────────────────────
   Beach Spiker — mid-air, arm cocked back ready to slam
   Composition: body angled left, right arm up & back, left arm forward for balance.
   The right hand is anchored near (x=70, y=18) which aligns to impact point.
   ────────────────────────────────────────────────────────────────────────── */
const BeachSpikerSVG = () => {
  const skin = "#e0a878";
  const skinShade = "#b8865a";
  const shorts = "#0ea5e9";
  const shortsShade = "#0369a1";
  const top = "#fb923c";
  const topShade = "#c2410c";
  const hair = "#1e1b4b";

  return (
    <svg viewBox="0 0 200 240" className="w-full h-auto" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="bs-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skin} />
          <stop offset="100%" stopColor={skinShade} />
        </linearGradient>
        <linearGradient id="bs-shorts" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shorts} />
          <stop offset="100%" stopColor={shortsShade} />
        </linearGradient>
        <linearGradient id="bs-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="100%" stopColor={topShade} />
        </linearGradient>
      </defs>

      {/* ── LEFT LEG (back leg, kicked back) ── */}
      <g stroke="#1e293b" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M118 150 Q140 165 158 200 L150 210 Q132 178 110 162 Z" fill="url(#bs-skin)" />
        <ellipse cx="156" cy="208" rx="11" ry="5" fill={skinShade} />
      </g>

      {/* ── RIGHT LEG (front, tucked) ── */}
      <g stroke="#1e293b" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M95 150 Q78 175 68 210 L82 218 Q98 184 110 158 Z" fill="url(#bs-skin)" />
        <ellipse cx="76" cy="216" rx="11" ry="5" fill={skinShade} />
      </g>

      {/* ── SHORTS ── */}
      <path
        d="M82 118 Q100 110 122 118 L128 152 Q118 158 108 156 Q98 158 88 156 Q82 154 78 150 Z"
        fill="url(#bs-shorts)"
        stroke="#1e293b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Shorts stripe */}
      <path d="M82 130 L128 130" stroke="#fff" strokeWidth="2" opacity="0.6" />

      {/* ── TORSO (tank top) — slightly twisted for swing ── */}
      <path
        d="M78 60 Q82 50 100 48 Q120 50 124 60 L130 122 Q108 130 76 122 Z"
        fill="url(#bs-top)"
        stroke="#1e293b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Tank top neckline */}
      <path d="M88 56 Q100 62 114 56" stroke="#1e293b" strokeWidth="1.8" fill="none" />
      {/* Abs hint */}
      <path d="M100 70 L102 118" stroke={topShade} strokeWidth="1.5" opacity="0.5" />

      {/* ── LEFT ARM (forward, balance) ── */}
      <g stroke="#1e293b" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M76 68 Q50 78 32 92 L40 100 Q60 88 82 78 Z" fill="url(#bs-skin)" />
        {/* Hand */}
        <circle cx="32" cy="94" r="9" fill="url(#bs-skin)" />
        {/* Wristband */}
        <rect x="38" y="86" width="10" height="6" rx="2" fill="#fff" />
      </g>

      {/* ── HEAD ── */}
      <g>
        {/* Neck */}
        <rect x="93" y="42" width="14" height="14" fill={skinShade} />
        {/* Face */}
        <ellipse cx="100" cy="32" rx="18" ry="20" fill="url(#bs-skin)" stroke="#1e293b" strokeWidth="2.2" />
        {/* Hair — short windswept */}
        <path
          d="M82 26 Q84 12 100 10 Q118 10 120 28 Q116 22 108 20 Q104 16 100 18 Q94 16 90 22 Q86 22 82 26 Z"
          fill={hair}
        />
        {/* Eyebrows (focused) */}
        <path d="M88 28 L96 26" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M104 26 L112 28" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
        {/* Eyes (intense) */}
        <circle cx="92" cy="33" r="1.6" fill="#1e293b" />
        <circle cx="108" cy="33" r="1.6" fill="#1e293b" />
        {/* Determined mouth */}
        <path d="M94 42 Q100 46 106 42" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Sweat drop for drama */}
        <path d="M118 32 Q120 36 118 40 Q116 36 118 32 Z" fill="#7dd3fc" opacity="0.85" />
      </g>

      {/* ── RIGHT ARM (THE SPIKING ARM) — fully extended up & back, then swings ── */}
      <g style={{ transformOrigin: "120px 58px", animation: "so-arm-swing 1.9s cubic-bezier(.4,.1,.5,1.2) both" }}>
        {/* Upper arm */}
        <path
          d="M118 52 L138 48 L142 28 L126 24 Z"
          fill="url(#bs-skin)"
          stroke="#1e293b"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Bicep highlight */}
        <ellipse cx="132" cy="36" rx="4" ry="8" fill={skin} opacity="0.6" />
        {/* Forearm */}
        <path
          d="M138 30 L158 24 L162 4 L144 6 Z"
          fill="url(#bs-skin)"
          stroke="#1e293b"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Wristband */}
        <rect x="146" y="6" width="14" height="6" rx="2" fill="#fff" stroke="#1e293b" strokeWidth="1.2" />
        {/* HAND — open palm ready to slam */}
        <g transform="translate(155, 0)">
          <ellipse cx="0" cy="0" rx="11" ry="13" fill="url(#bs-skin)" stroke="#1e293b" strokeWidth="2.2" />
          {/* Fingers */}
          <path d="M-6 -10 L-5 -18" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M-2 -12 L-1 -22" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 -12 L4 -21" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          <path d="M7 -10 L9 -17" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
          {/* Thumb */}
          <path d="M-8 -2 Q-14 -4 -12 4" stroke="#1e293b" strokeWidth="2" fill="url(#bs-skin)" strokeLinecap="round" />
        </g>
      </g>

      {/* Sand particles kicked up below feet */}
      <g opacity="0.65">
        {[0, 1, 2, 3, 4].map(i => (
          <circle
            key={i}
            cx={70 + i * 18}
            cy={224 + (i % 2) * 4}
            r={1.5 + (i % 3) * 0.8}
            fill="#d4a55a"
          />
        ))}
      </g>
    </svg>
  );
};

export default SuccessOverlay;
