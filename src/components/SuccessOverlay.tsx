import { useEffect, useMemo, useState } from "react";

/**
 * SuccessOverlay v2 — Cinematic beach-volleyball spike.
 *
 * Improvements over v1:
 *  • 3-act cinematic timing with slow-mo freeze on impact
 *  • Camera shake on body at impact
 *  • Ball motion trail (ghost balls) on the rocket-out trajectory
 *  • Anticipation pose (player loads, ball drifts in) before the SLAM
 *  • Spike line (motion streak from hand through ball)
 *  • Light beam burst from impact + radial vignette focusing eye on hit
 *  • Crowd silhouette + palm tree for cinematic depth
 *  • Higher-quality player SVG: dynamic pose, flowing hair, muscle shading
 *  • Caption pops AFTER impact, not during
 *
 * Total runtime: ~2.4s. Pointer-events disabled. RTL.
 */
type Props = {
  visible: boolean;
  onDone?: () => void;
  caption?: string;
};

const CAPTIONS = ["בול!", "הנחתה!", "אלוף/ה!", "פצצה!", "וואו!", "מטורף!"];

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

  // Confetti — erupts from impact point at impact frame (~38% into anim)
  const confetti = useMemo(() => {
    return Array.from({ length: 110 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 320 + Math.random() * 520;
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 140,
        delay: 920 + Math.random() * 220,
        duration: 1200 + Math.random() * 800,
        size: 6 + Math.random() * 14,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 900 - 450,
        shape: Math.random() > 0.55 ? "rect" : Math.random() > 0.5 ? "circ" : "tri",
      };
    });
  }, [key]);

  const streamers = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => {
      const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 420 + Math.random() * 240;
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 80,
        delay: 940 + Math.random() * 160,
        duration: 1600 + Math.random() * 500,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 360,
      };
    });
  }, [key]);

  // Light beams radiating from impact
  const beams = useMemo(
    () => Array.from({ length: 12 }).map((_, i) => ({
      rot: (i / 12) * 360,
      delay: 900 + (i % 3) * 40,
    })),
    [key]
  );

  // Ball motion trail — ghosts that follow main ball with delay (only during rocket-out)
  const trail = useMemo(
    () => Array.from({ length: 6 }).map((_, i) => ({
      delay: i * 35,
      opacity: 0.55 - i * 0.08,
      scale: 1 - i * 0.05,
    })),
    [key]
  );

  // Screen shake on impact
  useEffect(() => {
    if (!visible) return;
    setKey(k => k + 1);
    const shakeStart = setTimeout(() => {
      document.body.classList.add("so-screen-shake");
    }, 880);
    const shakeEnd = setTimeout(() => {
      document.body.classList.remove("so-screen-shake");
    }, 1280);
    const done = setTimeout(() => onDone?.(), 2400);
    return () => {
      clearTimeout(shakeStart);
      clearTimeout(shakeEnd);
      clearTimeout(done);
      document.body.classList.remove("so-screen-shake");
    };
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes so-screen-shake {
          0%,100% { transform: translate(0,0); }
          12% { transform: translate(-7px, 5px); }
          24% { transform: translate(8px, -4px); }
          36% { transform: translate(-5px, -6px); }
          50% { transform: translate(6px, 6px); }
          64% { transform: translate(-4px, 3px); }
          78% { transform: translate(3px, -2px); }
        }
        .so-screen-shake { animation: so-screen-shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }

        @keyframes so-scene-in {
          0% { opacity: 0; transform: scale(1.04); }
          12% { opacity: 1; transform: scale(1); }
          88% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.02); }
        }
        @keyframes so-vignette {
          0%, 30% { opacity: 0; }
          38% { opacity: 0.55; }
          70% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes so-flash {
          0%, 35% { opacity: 0; }
          38% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes so-sun-pulse {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes so-sunrays {
          0% { transform: translate(-50%,-50%) rotate(0deg); }
          100% { transform: translate(-50%,-50%) rotate(360deg); }
        }
        @keyframes so-cloud {
          0% { transform: translateX(0); }
          100% { transform: translateX(-20px); }
        }

        /* BALL — anticipation arc (slow), then frozen at impact, then SLAMS down-left */
        @keyframes so-ball {
          0%   { transform: translate(-65vw, 25vh) rotate(0deg) scale(0.65); opacity: 0; }
          8%   { opacity: 1; }
          25%  { transform: translate(-25vw, -5vh) rotate(160deg) scale(0.95); }
          34%  { transform: translate(-5vw, -2vh) rotate(220deg) scale(1.05); }   /* approach impact */
          37%  { transform: translate(0, 0) rotate(240deg) scale(1.35); }          /* IMPACT — squash */
          39%  { transform: translate(0, 0) rotate(245deg) scale(1.45) scaleY(0.75); } /* squash hit */
          42%  { transform: translate(-3vw, 2vh) rotate(280deg) scale(1.15); }     /* release */
          70%  { transform: translate(-45vw, 42vh) rotate(900deg) scale(0.9); opacity: 1; }
          92%  { transform: translate(-70vw, 65vh) rotate(1300deg) scale(0.55); opacity: 0.7; }
          100% { transform: translate(-78vw, 72vh) rotate(1500deg) scale(0.4); opacity: 0; }
        }
        @keyframes so-ball-trail {
          0%, 42% { opacity: 0; }
          50% { opacity: var(--op); }
          90% { opacity: var(--op); }
          100% { opacity: 0; }
        }

        /* PLAYER — enters mid-right, loads, peaks at impact, lands */
        @keyframes so-player {
          0%   { transform: translate(45vw, 55vh) scale(0.55); opacity: 0; }
          10%  { opacity: 1; }
          22%  { transform: translate(12vw, -12vh) scale(0.95); }   /* rising */
          32%  { transform: translate(2vw, -22vh) scale(1.05); }    /* peak / load */
          37%  { transform: translate(0vw, -20vh) scale(1.08); }    /* IMPACT freeze */
          40%  { transform: translate(0vw, -19vh) scale(1.08); }
          55%  { transform: translate(-3vw, -6vh) scale(1); }       /* falling */
          80%  { transform: translate(-4vw, 6vh) scale(0.95); opacity: 1; }
          100% { transform: translate(-4vw, 14vh) scale(0.88); opacity: 0; }
        }
        /* Arm: wound back during ascent, EXPLODES forward at impact frame */
        @keyframes so-arm-swing {
          0%   { transform: rotate(-150deg); }
          22%  { transform: rotate(-165deg); }   /* wind up further */
          32%  { transform: rotate(-170deg); }   /* peak load */
          36%  { transform: rotate(-60deg); }    /* SNAP forward */
          39%  { transform: rotate(35deg); }     /* THROUGH ball */
          45%  { transform: rotate(55deg); }     /* follow through */
          100% { transform: rotate(60deg); }
        }
        /* Hair flow */
        @keyframes so-hair {
          0%,100% { transform: rotate(0deg); }
          37% { transform: rotate(-8deg) translateY(-2px); }
          45% { transform: rotate(5deg); }
        }

        @keyframes so-impact-ring {
          0%, 36% { transform: translate(-50%,-50%) scale(0.15); opacity: 0; }
          38% { opacity: 1; }
          75% { transform: translate(-50%,-50%) scale(3.4); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes so-shockwave {
          0%, 35% { transform: translate(-50%,-50%) scale(0.08); opacity: 0; }
          38% { opacity: 0.85; }
          60% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes so-beam {
          0%, 36% { transform: translate(-50%,-50%) rotate(var(--rot)) scaleX(0); opacity: 0; }
          39% { opacity: 0.9; transform: translate(-50%,-50%) rotate(var(--rot)) scaleX(1); }
          55% { opacity: 0; transform: translate(-50%,-50%) rotate(var(--rot)) scaleX(1.4); }
          100% { opacity: 0; }
        }
        @keyframes so-spike-streak {
          0%, 36% { transform: translate(-50%,-50%) rotate(220deg) scaleX(0); opacity: 0; }
          39% { opacity: 1; transform: translate(-50%,-50%) rotate(220deg) scaleX(1); }
          55% { opacity: 0.6; }
          72% { opacity: 0; transform: translate(-50%,-50%) rotate(220deg) scaleX(1.6) translateX(80px); }
          100% { opacity: 0; }
        }

        @keyframes so-confetti {
          0%   { transform: translate(-50%,-50%) translate(0,0) rotate(0deg) scale(0.2); opacity: 0; }
          5%   { opacity: 1; }
          100% { transform: translate(-50%,-50%) translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(1); opacity: 0; }
        }
        @keyframes so-streamer {
          0%   { transform: translate(-50%,-50%) translate(0,0) rotate(0deg) scaleY(0.2); opacity: 0; }
          8%   { opacity: 1; }
          100% { transform: translate(-50%,-50%) translate(var(--tx), var(--ty)) rotate(var(--rot)) scaleY(1); opacity: 0; }
        }

        @keyframes so-caption {
          0%, 45% { transform: translate(-50%, 90px) scale(0.2) rotate(-10deg); opacity: 0; }
          52%     { transform: translate(-50%, 0) scale(1.3) rotate(5deg); opacity: 1; }
          65%     { transform: translate(-50%, 0) scale(1.05) rotate(-2deg); opacity: 1; }
          88%     { transform: translate(-50%, 0) scale(1) rotate(0deg); opacity: 1; }
          100%    { transform: translate(-50%, -40px) scale(0.85); opacity: 0; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {/* ── Beach scene background ── */}
        <div
          className="absolute inset-0"
          style={{
            animation: "so-scene-in 2.4s ease-in-out both",
            background:
              "linear-gradient(to bottom, #5cb8e6 0%, #8ed4ee 30%, #c8e8f5 48%, #ffe0a3 56%, #f5cd75 75%, #d99b4a 100%)",
          }}
        >
          {/* Sun rays (rotating) */}
          <div
            className="absolute"
            style={{
              top: "12%",
              left: "20%",
              width: 420,
              height: 420,
              transform: "translate(-50%,-50%)",
              animation: "so-sunrays 12s linear infinite",
              background:
                "conic-gradient(from 0deg, rgba(255,235,150,0) 0deg, rgba(255,235,150,0.55) 6deg, rgba(255,235,150,0) 14deg, rgba(255,235,150,0) 28deg, rgba(255,235,150,0.55) 36deg, rgba(255,235,150,0) 44deg, rgba(255,235,150,0) 60deg, rgba(255,235,150,0.55) 68deg, rgba(255,235,150,0) 76deg, rgba(255,235,150,0) 92deg, rgba(255,235,150,0.55) 100deg, rgba(255,235,150,0) 108deg, rgba(255,235,150,0) 360deg)",
              filter: "blur(10px)",
            }}
          />
          {/* Sun */}
          <div
            className="absolute rounded-full"
            style={{
              top: "12%",
              left: "20%",
              width: 140,
              height: 140,
              transform: "translate(-50%,-50%)",
              background: "radial-gradient(circle, #fff8d6 0%, #ffd966 55%, #f59e0b 100%)",
              boxShadow: "0 0 100px rgba(255, 220, 120, 1)",
              animation: "so-sun-pulse 2.4s ease-in-out infinite",
            }}
          />

          {/* Clouds */}
          <svg className="absolute" style={{ top: "8%", left: "55%", width: 180, opacity: 0.85, animation: "so-cloud 2.4s ease-in-out infinite alternate" }} viewBox="0 0 180 60">
            <ellipse cx="40" cy="35" rx="32" ry="18" fill="#fff" />
            <ellipse cx="80" cy="28" rx="40" ry="22" fill="#fff" />
            <ellipse cx="130" cy="36" rx="36" ry="20" fill="#fff" />
          </svg>
          <svg className="absolute" style={{ top: "18%", left: "75%", width: 130, opacity: 0.75 }} viewBox="0 0 130 50">
            <ellipse cx="30" cy="28" rx="24" ry="14" fill="#fff" />
            <ellipse cx="65" cy="22" rx="30" ry="18" fill="#fff" />
            <ellipse cx="100" cy="28" rx="26" ry="15" fill="#fff" />
          </svg>

          {/* Sea horizon strip */}
          <div
            className="absolute left-0 right-0"
            style={{
              top: "48%",
              height: 16,
              background: "linear-gradient(to bottom, rgba(38,150,190,0.6), rgba(56,178,210,0))",
            }}
          />
          {/* Sea sparkles */}
          <svg className="absolute left-0 right-0" style={{ top: "49%", width: "100%", height: 20, opacity: 0.6 }} viewBox="0 0 1000 20" preserveAspectRatio="none">
            {Array.from({ length: 30 }).map((_, i) => (
              <circle key={i} cx={i * 35 + (i % 3) * 7} cy={6 + (i % 4) * 3} r="1.2" fill="#fff" />
            ))}
          </svg>

          {/* Distant net */}
          <svg
            className="absolute"
            style={{ left: "6%", top: "42%", width: "20%", opacity: 0.4 }}
            viewBox="0 0 200 130"
            preserveAspectRatio="none"
          >
            <line x1="10" y1="0" x2="10" y2="130" stroke="#475569" strokeWidth="3" />
            <line x1="190" y1="0" x2="190" y2="130" stroke="#475569" strokeWidth="3" />
            <rect x="10" y="22" width="180" height="36" fill="none" stroke="#475569" strokeWidth="2" />
            {Array.from({ length: 14 }).map((_, i) => (
              <line key={`v${i}`} x1={10 + i * 13} y1="22" x2={10 + i * 13} y2="58" stroke="#475569" strokeWidth="1" />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <line key={`h${i}`} x1="10" y1={22 + i * 9} x2="190" y2={22 + i * 9} stroke="#475569" strokeWidth="1" />
            ))}
          </svg>

          {/* Palm tree (right edge) */}
          <svg className="absolute" style={{ right: "2%", bottom: "20%", width: 180, opacity: 0.92 }} viewBox="0 0 200 280">
            <path d="M100 280 Q95 200 105 120 Q98 80 110 40" stroke="#7c3a18" strokeWidth="10" fill="none" strokeLinecap="round" />
            <g fill="#15803d" stroke="#14532d" strokeWidth="1.5">
              <path d="M105 50 Q60 30 20 50 Q55 35 105 55 Z" />
              <path d="M105 50 Q150 25 195 45 Q160 35 105 55 Z" />
              <path d="M105 50 Q80 10 65 0 Q90 20 105 55 Z" />
              <path d="M105 50 Q130 15 145 5 Q120 25 105 55 Z" />
              <path d="M105 50 Q50 80 10 90 Q60 70 105 55 Z" />
              <path d="M105 50 Q160 80 195 95 Q150 70 105 55 Z" />
            </g>
            <circle cx="100" cy="58" r="6" fill="#84cc16" />
            <circle cx="112" cy="60" r="5" fill="#84cc16" />
            <circle cx="94" cy="62" r="4" fill="#84cc16" />
          </svg>

          {/* Crowd silhouette */}
          <svg
            className="absolute left-0 right-0"
            style={{ bottom: "30%", width: "100%", height: 50, opacity: 0.28 }}
            viewBox="0 0 1000 50"
            preserveAspectRatio="none"
          >
            {Array.from({ length: 40 }).map((_, i) => {
              const x = i * 25;
              const h = 26 + (i % 5) * 4;
              return (
                <g key={i} fill="#1e293b">
                  <circle cx={x + 12} cy={50 - h} r="6" />
                  <rect x={x + 4} y={50 - h + 4} width="16" height={h} rx="4" />
                </g>
              );
            })}
          </svg>

          {/* Sand grain texture */}
          <div
            className="absolute left-0 right-0 bottom-0"
            style={{
              height: "30%",
              background:
                "radial-gradient(circle at 20% 30%, rgba(180,140,80,0.3), transparent 40%), radial-gradient(circle at 70% 60%, rgba(180,140,80,0.25), transparent 50%), radial-gradient(circle at 50% 80%, rgba(120,90,50,0.25), transparent 40%)",
            }}
          />
        </div>

        {/* Vignette to focus on impact */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 38%, transparent 25%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.65) 100%)",
            animation: "so-vignette 2.4s ease-out both",
          }}
        />

        {/* Impact white flash */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 50% 38%, #fff 0%, rgba(255,255,255,0.4) 25%, transparent 60%)",
            animation: "so-flash 2.4s ease-out both",
          }}
        />

        {/* ── IMPACT POINT EFFECTS — center at 50% / 38% ── */}
        <div className="absolute" style={{ left: "50%", top: "38%" }}>
          {/* Light beams */}
          {beams.map((b, i) => (
            <div
              key={`bm-${key}-${i}`}
              className="absolute"
              style={
                {
                  left: 0,
                  top: 0,
                  width: 360,
                  height: 8,
                  borderRadius: 4,
                  background:
                    "linear-gradient(to right, rgba(255,255,255,0.95), rgba(255,236,150,0.8), transparent)",
                  ["--rot" as any]: `${b.rot}deg`,
                  animation: `so-beam 2.4s ease-out ${b.delay}ms both`,
                  boxShadow: "0 0 20px rgba(255,236,150,0.8)",
                  transformOrigin: "left center",
                } as React.CSSProperties
              }
            />
          ))}

          {/* Shockwave */}
          <div
            className="absolute rounded-full border-[7px]"
            style={{
              width: 220,
              height: 220,
              borderColor: "#fff",
              boxShadow: "0 0 50px rgba(255,255,255,0.9)",
              animation: "so-shockwave 2.4s ease-out both",
            }}
          />
          {/* Impact rings */}
          {[0, 90, 180].map((d, i) => (
            <div
              key={i}
              className="absolute rounded-full border-4"
              style={{
                width: 200,
                height: 200,
                borderColor: i === 0 ? "#facc15" : i === 1 ? "#f97316" : "#fff",
                animation: `so-impact-ring 2.4s ease-out ${d}ms both`,
                boxShadow: "0 0 28px rgba(250,204,21,0.7)",
              }}
            />
          ))}

          {/* Spike streak — direction of ball */}
          <div
            className="absolute"
            style={{
              left: 0,
              top: 0,
              width: 280,
              height: 14,
              borderRadius: 7,
              background:
                "linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.95), rgba(250,204,21,0.6), transparent)",
              animation: "so-spike-streak 2.4s ease-out both",
              transformOrigin: "left center",
              filter: "blur(1px)",
            }}
          />

          {/* Streamers */}
          {streamers.map((s, i) => (
            <div
              key={`s-${key}-${i}`}
              className="absolute"
              style={
                {
                  left: 0,
                  top: 0,
                  width: 7,
                  height: 100,
                  borderRadius: 4,
                  background: `linear-gradient(to bottom, ${s.color}, ${s.color}00)`,
                  ["--tx" as any]: `${s.tx}px`,
                  ["--ty" as any]: `${s.ty}px`,
                  ["--rot" as any]: `${s.rot}deg`,
                  animation: `so-streamer ${s.duration}ms cubic-bezier(.2,.7,.3,1) ${s.delay}ms both`,
                  boxShadow: `0 0 10px ${s.color}`,
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
                  borderLeft: c.shape === "tri" ? `${c.size / 2}px solid transparent` : undefined,
                  borderRight: c.shape === "tri" ? `${c.size / 2}px solid transparent` : undefined,
                  borderBottom: c.shape === "tri" ? `${c.size}px solid ${c.color}` : undefined,
                  ["--tx" as any]: `${c.tx}px`,
                  ["--ty" as any]: `${c.ty}px`,
                  ["--rot" as any]: `${c.rot}deg`,
                  animation: `so-confetti ${c.duration}ms cubic-bezier(.15,.7,.35,1) ${c.delay}ms both`,
                  boxShadow: c.shape !== "tri" ? `0 0 8px ${c.color}90` : undefined,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* ── BALL TRAIL (ghosts) ── */}
        {trail.map((t, i) => (
          <div
            key={`bt-${key}-${i}`}
            className="absolute"
            style={
              {
                left: "50%",
                top: "38%",
                width: "clamp(70px, 9vw, 130px)",
                height: "clamp(70px, 9vw, 130px)",
                transform: "translate(-50%,-50%)",
                animation: `so-ball 2.4s cubic-bezier(.4,.1,.4,1) ${t.delay}ms both, so-ball-trail 2.4s ease-out ${t.delay}ms both`,
                ["--op" as any]: t.opacity,
                opacity: 0,
                filter: `blur(${i}px)`,
                pointerEvents: "none",
              } as React.CSSProperties
            }
          >
            <div style={{ transform: `scale(${t.scale})`, width: "100%", height: "100%" }}>
              <VolleyballSVG />
            </div>
          </div>
        ))}

        {/* ── BALL (main) ── */}
        <div
          className="absolute"
          style={{
            left: "50%",
            top: "38%",
            width: "clamp(70px, 9vw, 130px)",
            height: "clamp(70px, 9vw, 130px)",
            transform: "translate(-50%,-50%)",
            animation: "so-ball 2.4s cubic-bezier(.4,.1,.4,1) both",
            filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.4))",
          }}
        >
          <VolleyballSVG />
        </div>

        {/* ── PLAYER ── */}
        <div
          className="absolute"
          style={{
            left: "54%",
            top: "42%",
            width: "clamp(180px, 24vw, 400px)",
            transform: "translate(-50%,-50%)",
            animation: "so-player 2.4s cubic-bezier(.34,1.2,.5,1) both",
            filter: "drop-shadow(0 22px 36px rgba(0,0,0,0.45))",
          }}
        >
          <BeachSpikerSVG />
        </div>

        {/* ── CAPTION ── */}
        <div
          key={`cap-${key}`}
          className="absolute left-1/2"
          style={{
            top: "72%",
            animation: "so-caption 2.4s cubic-bezier(.34,1.56,.64,1) both",
          }}
        >
          <span
            className="inline-block font-black tracking-tight px-8 py-3 rounded-2xl text-white"
            style={{
              fontSize: "clamp(34px, 6.5vw, 82px)",
              background: "linear-gradient(135deg, #10b981 0%, #facc15 50%, #f97316 100%)",
              boxShadow:
                "0 18px 60px rgba(16,185,129,0.55), 0 0 50px rgba(250,204,21,0.55)",
              border: "4px solid #0f172a",
              textShadow: "0 4px 0 #0f172a, 0 8px 24px rgba(0,0,0,0.4)",
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
   Volleyball — classic 3-panel beach ball
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
    <circle cx="50" cy="50" r="46" fill="url(#vb-body)" stroke="#1e293b" strokeWidth="2" />
    <path d="M50 4 Q22 30 50 96" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    <path d="M4 50 Q40 38 96 50" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    <path d="M50 4 Q78 30 50 96" stroke="#1e293b" strokeWidth="2.5" fill="none" />
    <path d="M50 4 Q22 30 50 96 L50 50 Z" fill="#fbbf24" opacity="0.2" />
    <path d="M4 50 Q40 38 96 50 L50 50 Z" fill="#06b6d4" opacity="0.18" />
    <ellipse cx="34" cy="30" rx="14" ry="8" fill="rgba(255,255,255,0.75)" transform="rotate(-30 34 30)" />
  </svg>
);

/* ──────────────────────────────────────────────────────────────────────────
   Beach Spiker — dynamic mid-air pose
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

      {/* BACK LEG (kicked back & up — dynamic) */}
      <g stroke="#1e293b" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M118 148 Q146 162 168 196 L160 208 Q138 178 110 160 Z" fill="url(#bs-skin)" />
        {/* calf shading */}
        <path d="M150 188 Q158 196 162 204" stroke={skinShade} strokeWidth="2" fill="none" opacity="0.6" />
        <ellipse cx="166" cy="206" rx="11" ry="5" fill={skinShade} />
      </g>

      {/* FRONT LEG (tucked) */}
      <g stroke="#1e293b" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M95 148 Q76 174 64 212 L80 220 Q98 186 110 158 Z" fill="url(#bs-skin)" />
        <path d="M82 200 Q76 210 72 218" stroke={skinShade} strokeWidth="2" fill="none" opacity="0.6" />
        <ellipse cx="72" cy="218" rx="11" ry="5" fill={skinShade} />
      </g>

      {/* SHORTS */}
      <path
        d="M82 116 Q100 108 122 116 L130 152 Q118 158 108 156 Q98 158 88 156 Q82 154 78 150 Z"
        fill="url(#bs-shorts)"
        stroke="#1e293b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M82 130 L130 130" stroke="#fff" strokeWidth="2" opacity="0.6" />
      <path d="M104 116 L104 156" stroke={shortsShade} strokeWidth="1.5" opacity="0.5" />

      {/* TORSO (twisted for swing) */}
      <path
        d="M76 58 Q82 48 100 46 Q120 48 126 58 L132 122 Q108 130 74 122 Z"
        fill="url(#bs-top)"
        stroke="#1e293b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M86 54 Q100 60 114 54" stroke="#1e293b" strokeWidth="1.8" fill="none" />
      {/* Abs */}
      <path d="M100 68 L102 118" stroke={topShade} strokeWidth="1.5" opacity="0.5" />
      <path d="M92 90 Q100 92 108 90" stroke={topShade} strokeWidth="1.2" fill="none" opacity="0.4" />
      {/* Number on jersey */}
      <text x="100" y="100" textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff" stroke={topShade} strokeWidth="0.8" style={{ fontFamily: "system-ui" }}>
        7
      </text>

      {/* LEFT ARM (forward, balance) */}
      <g stroke="#1e293b" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M74 66 Q48 78 28 94 L36 104 Q58 90 80 78 Z" fill="url(#bs-skin)" />
        <circle cx="28" cy="96" r="9" fill="url(#bs-skin)" />
        {/* Wristband */}
        <rect x="34" y="88" width="10" height="6" rx="2" fill="#fff" stroke="#1e293b" strokeWidth="1" />
      </g>

      {/* HEAD */}
      <g>
        {/* Neck */}
        <rect x="93" y="40" width="14" height="14" fill={skinShade} />
        {/* Face */}
        <ellipse cx="100" cy="30" rx="18" ry="20" fill="url(#bs-skin)" stroke="#1e293b" strokeWidth="2.2" />
        {/* Ear */}
        <ellipse cx="83" cy="30" rx="3" ry="5" fill={skinShade} stroke="#1e293b" strokeWidth="1.4" />
        {/* HAIR — flowing with motion */}
        <g style={{ transformOrigin: "100px 28px", animation: "so-hair 2.4s ease-out both" }}>
          <path
            d="M82 26 Q82 8 100 6 Q120 8 122 28 Q116 18 108 18 Q104 14 100 16 Q94 14 90 20 Q86 22 82 26 Z"
            fill={hair}
            stroke="#0f172a"
            strokeWidth="1.5"
          />
          {/* Flowing strands */}
          <path d="M120 22 Q130 14 138 6" stroke={hair} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M122 28 Q134 22 142 16" stroke={hair} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M82 22 Q72 16 64 8" stroke={hair} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
        {/* Eyebrows — intense */}
        <path d="M88 27 L96 25" stroke="#1e293b" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M104 25 L112 27" stroke="#1e293b" strokeWidth="2.4" strokeLinecap="round" />
        {/* Eyes — focused */}
        <circle cx="92" cy="33" r="1.8" fill="#1e293b" />
        <circle cx="108" cy="33" r="1.8" fill="#1e293b" />
        {/* Determined mouth — slight clench */}
        <path d="M92 43 L108 43" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
        {/* Sweat drop */}
        <path d="M119 32 Q122 38 119 42 Q116 38 119 32 Z" fill="#7dd3fc" opacity="0.9" stroke="#0f172a" strokeWidth="0.6" />
      </g>

      {/* RIGHT ARM (SPIKING ARM) — full SNAP animation */}
      <g style={{ transformOrigin: "120px 56px", animation: "so-arm-swing 2.4s cubic-bezier(.5,.0,.3,1) both" }}>
        {/* Upper arm */}
        <path
          d="M118 50 L140 46 L146 22 L128 22 Z"
          fill="url(#bs-skin)"
          stroke="#1e293b"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Bicep bulge */}
        <ellipse cx="134" cy="34" rx="5" ry="9" fill={skin} opacity="0.7" />
        {/* Forearm */}
        <path
          d="M138 24 L160 18 L166 -4 L146 -2 Z"
          fill="url(#bs-skin)"
          stroke="#1e293b"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Forearm muscle shade */}
        <path d="M150 10 Q156 8 162 4" stroke={skinShade} strokeWidth="1.5" fill="none" opacity="0.6" />
        {/* Wristband */}
        <rect x="148" y="-2" width="14" height="6" rx="2" fill="#fff" stroke="#1e293b" strokeWidth="1.2" />
        {/* HAND — open palm SLAM */}
        <g transform="translate(156, -8)">
          <ellipse cx="0" cy="0" rx="12" ry="14" fill="url(#bs-skin)" stroke="#1e293b" strokeWidth="2.2" />
          {/* Fingers spread */}
          <path d="M-7 -10 L-6 -19" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M-2 -13 L-1 -23" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M4 -13 L5 -22" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M9 -10 L11 -18" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
          {/* Thumb */}
          <path d="M-9 -2 Q-16 -4 -13 5" stroke="#1e293b" strokeWidth="2.2" fill="url(#bs-skin)" strokeLinecap="round" />
          {/* Palm crease */}
          <path d="M-5 0 Q0 4 6 0" stroke={skinShade} strokeWidth="1" fill="none" />
        </g>
      </g>
    </svg>
  );
};

export default SuccessOverlay;
