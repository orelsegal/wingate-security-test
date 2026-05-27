import { useEffect, useMemo, useState } from "react";

/**
 * SuccessOverlay — JUDO IPPON: cinematic seoi-nage throw.
 *
 * Cast:
 *  • TORI (thrower) — blue gi, stays grounded right-center, pivots & pulls
 *  • UKE  (opponent) — white gi, gripped, lifted, flipped 360° over Tori's shoulder, SLAMMED
 *
 * Acts (total ~2.6s):
 *   0.00–0.30  Scene fade in (dojo, spotlights, tatami). Both bow-stance, gripping.
 *   0.30–0.70  KUZUSHI — Tori breaks Uke's balance forward. Uke leans in.
 *   0.70–1.10  TSUKURI — Tori pivots, drops under, lifts Uke off the mat.
 *   1.10–1.35  KAKE — Uke flips through the air (360° rotation).
 *   1.35–1.45  IMPACT — Uke slams on mat. Dust cloud, shockwave, screen shake.
 *   1.45–2.60  Tori stands tall. "איפון!" caption + confetti.
 */
type Props = {
  visible: boolean;
  onDone?: () => void;
  caption?: string;
};

const CAPTIONS = ["איפון!", "ippon!", "ניצחון מוחץ!", "וואו!", "מטורף!"];

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

  // Confetti — explodes from mat impact point at ~1.35s (52% of 2.6s)
  const confetti = useMemo(() => {
    return Array.from({ length: 110 }).map((_, i) => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4; // upward bias
      const dist = 320 + Math.random() * 520;
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        delay: 1380 + Math.random() * 220,
        duration: 1100 + Math.random() * 700,
        size: 6 + Math.random() * 14,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 900 - 450,
        shape: Math.random() > 0.55 ? "rect" : Math.random() > 0.5 ? "circ" : "tri",
      };
    });
  }, [key]);

  // Dust particles from slam
  const dust = useMemo(
    () => Array.from({ length: 24 }).map((_, i) => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const dist = 80 + Math.random() * 200;
      return {
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist * 0.6 - 40,
        delay: 1340 + Math.random() * 80,
        duration: 700 + Math.random() * 400,
        size: 18 + Math.random() * 28,
        opacity: 0.5 + Math.random() * 0.4,
      };
    }),
    [key]
  );

  // Light beams radiating from impact
  const beams = useMemo(
    () => Array.from({ length: 10 }).map((_, i) => ({
      rot: (i / 10) * 360,
      delay: 1370 + (i % 3) * 40,
    })),
    [key]
  );

  // Screen shake at slam
  useEffect(() => {
    if (!visible) return;
    setKey(k => k + 1);
    const shakeStart = setTimeout(() => {
      document.body.classList.add("so-screen-shake");
    }, 1340);
    const shakeEnd = setTimeout(() => {
      document.body.classList.remove("so-screen-shake");
    }, 1740);
    const done = setTimeout(() => onDone?.(), 2600);
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
          10% { transform: translate(-9px, 7px); }
          20% { transform: translate(10px, -5px); }
          32% { transform: translate(-7px, -8px); }
          45% { transform: translate(8px, 7px); }
          60% { transform: translate(-5px, 4px); }
          78% { transform: translate(4px, -3px); }
        }
        .so-screen-shake { animation: so-screen-shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }

        @keyframes so-scene-in {
          0% { opacity: 0; transform: scale(1.06); }
          10% { opacity: 1; transform: scale(1); }
          90% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.02); }
        }
        @keyframes so-vignette {
          0%, 45% { opacity: 0.3; }
          52% { opacity: 0.7; }
          75% { opacity: 0.3; }
          100% { opacity: 0; }
        }
        @keyframes so-flash {
          0%, 50% { opacity: 0; }
          53% { opacity: 1; }
          62% { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes so-spotlight {
          0%,100% { opacity: 0.6; }
          50% { opacity: 0.9; }
        }

        /* ===== TORI (thrower, blue gi) ===== */
        /* Stays mostly stationary, pivots & drops under during throw, then rises triumphant */
        @keyframes so-tori {
          0%    { transform: translate(15vw, 0vh) scale(1); }
          12%   { transform: translate(8vw, 0vh) scale(1); }       /* settles in */
          27%   { transform: translate(4vw, 1vh) scale(1) rotate(-8deg); } /* kuzushi pull */
          40%   { transform: translate(0vw, 4vh) scale(0.94) rotate(-25deg); } /* tsukuri drop */
          50%   { transform: translate(-2vw, 3vh) scale(0.96) rotate(-15deg); } /* lift */
          58%   { transform: translate(-2vw, 0vh) scale(1.02) rotate(10deg); } /* kake follow-through */
          75%   { transform: translate(-1vw, -2vh) scale(1.06) rotate(0deg); } /* stand tall */
          100%  { transform: translate(-1vw, -2vh) scale(1.06) rotate(0deg); }
        }

        /* ===== UKE (opponent, white gi) ===== */
        /* Starts left, gripped → tilted → LIFTED → FLIPS 360° → SLAMS on mat */
        @keyframes so-uke {
          0%   { transform: translate(-20vw, 0vh) scale(1) rotate(0deg); opacity: 1; }
          15%  { transform: translate(-14vw, 0vh) scale(1) rotate(0deg); }       /* approach */
          27%  { transform: translate(-10vw, -2vh) scale(1) rotate(-20deg); }    /* kuzushi tilt fwd */
          38%  { transform: translate(-6vw, -10vh) scale(1) rotate(-60deg); }    /* lifted */
          45%  { transform: translate(-3vw, -22vh) scale(1) rotate(-130deg); }   /* peak airborne */
          50%  { transform: translate(2vw, -28vh) scale(1) rotate(-200deg); }    /* apex of flip */
          54%  { transform: translate(8vw, -16vh) scale(1) rotate(-290deg); }    /* falling */
          58%  { transform: translate(13vw, -2vh) scale(1) rotate(-360deg); }    /* about to land */
          61%  { transform: translate(14vw, 8vh) scale(1, 0.85) rotate(-380deg); } /* SLAM squash */
          66%  { transform: translate(14vw, 9vh) scale(1.05, 0.7) rotate(-360deg); } /* compressed */
          78%  { transform: translate(14vw, 8vh) scale(1, 0.9) rotate(-360deg); }
          100% { transform: translate(14vw, 8vh) scale(1, 0.9) rotate(-360deg); opacity: 1; }
        }
        /* Motion blur on Uke during flip */
        @keyframes so-uke-blur {
          0%, 30% { filter: drop-shadow(0 18px 30px rgba(0,0,0,0.4)); }
          45%, 58% { filter: drop-shadow(0 18px 30px rgba(0,0,0,0.4)) blur(1.5px); }
          62%, 100% { filter: drop-shadow(0 18px 30px rgba(0,0,0,0.4)); }
        }

        /* Speed lines that arc around Uke during the flip */
        @keyframes so-arc-line {
          0%, 35% { opacity: 0; transform: translate(-50%,-50%) rotate(var(--rot)) scaleX(0); }
          40% { opacity: 0.85; transform: translate(-50%,-50%) rotate(var(--rot)) scaleX(1); }
          58% { opacity: 0; transform: translate(-50%,-50%) rotate(var(--rot)) scaleX(1.3) translateX(40px); }
          100% { opacity: 0; }
        }

        /* Impact effects (trigger at slam — 1.35s in 2.6s timeline ≈ 52%) */
        @keyframes so-impact-ring {
          0%, 51% { transform: translate(-50%,-50%) scale(0.1); opacity: 0; }
          53% { opacity: 1; }
          80% { transform: translate(-50%,-50%) scale(3.4); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes so-shockwave {
          0%, 50% { transform: translate(-50%, -50%) scaleX(0.05) scaleY(0.05); opacity: 0; }
          53% { opacity: 0.9; }
          75% { transform: translate(-50%, -50%) scaleX(3.2) scaleY(0.6); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes so-beam {
          0%, 51% { transform: translate(-50%,-50%) rotate(var(--rot)) scaleX(0); opacity: 0; }
          54% { opacity: 0.95; transform: translate(-50%,-50%) rotate(var(--rot)) scaleX(1); }
          70% { opacity: 0; transform: translate(-50%,-50%) rotate(var(--rot)) scaleX(1.5); }
          100% { opacity: 0; }
        }
        @keyframes so-dust {
          0%   { transform: translate(-50%,-50%) translate(0,0) scale(0.2); opacity: 0; }
          15%  { opacity: var(--op); }
          100% { transform: translate(-50%,-50%) translate(var(--tx), var(--ty)) scale(1.4); opacity: 0; }
        }
        @keyframes so-confetti {
          0%   { transform: translate(-50%,-50%) translate(0,0) rotate(0deg) scale(0.2); opacity: 0; }
          5%   { opacity: 1; }
          100% { transform: translate(-50%,-50%) translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(1); opacity: 0; }
        }

        @keyframes so-caption {
          0%, 55% { transform: translate(-50%, 100px) scale(0.15) rotate(-12deg); opacity: 0; }
          62%     { transform: translate(-50%, 0) scale(1.4) rotate(6deg); opacity: 1; }
          72%     { transform: translate(-50%, 0) scale(1.08) rotate(-3deg); opacity: 1; }
          90%     { transform: translate(-50%, 0) scale(1) rotate(0deg); opacity: 1; }
          100%    { transform: translate(-50%, -40px) scale(0.85); opacity: 0; }
        }

        @keyframes so-kanji {
          0%, 60% { opacity: 0; transform: translate(-50%, 0) scale(0.3) rotate(-20deg); }
          68%     { opacity: 0.4; transform: translate(-50%, 0) scale(1.1) rotate(0deg); }
          90%     { opacity: 0.4; transform: translate(-50%, 0) scale(1) rotate(0deg); }
          100%    { opacity: 0; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {/* ── DOJO BACKGROUND ── */}
        <div
          className="absolute inset-0"
          style={{
            animation: "so-scene-in 2.6s ease-in-out both",
            background:
              "linear-gradient(to bottom, #1a1a2e 0%, #2d2438 40%, #3d2f1f 60%, #5c3a1f 100%)",
          }}
        >
          {/* Tatami mat — perspective floor */}
          <div
            className="absolute left-0 right-0 bottom-0"
            style={{
              height: "55%",
              background:
                "linear-gradient(to bottom, #d4a55a 0%, #c79348 40%, #a87d3a 100%)",
              transform: "perspective(900px) rotateX(58deg)",
              transformOrigin: "center top",
              boxShadow: "inset 0 60px 80px rgba(0,0,0,0.5)",
            }}
          >
            {/* Tatami grid lines */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              {Array.from({ length: 8 }).map((_, i) => (
                <line key={`v${i}`} x1={i * 14 + 2} y1="0" x2={i * 14 + 2} y2="100" stroke="#7a5828" strokeWidth="0.3" opacity="0.7" />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 18 + 4} x2="100" y2={i * 18 + 4} stroke="#7a5828" strokeWidth="0.3" opacity="0.7" />
              ))}
              {/* Red competition square */}
              <rect x="20" y="30" width="60" height="50" fill="none" stroke="#dc2626" strokeWidth="0.6" opacity="0.55" />
            </svg>
          </div>

          {/* Back wall — dojo with Japanese banners */}
          <div
            className="absolute left-0 right-0"
            style={{
              top: 0,
              height: "45%",
              background:
                "linear-gradient(to bottom, #0f0a1f 0%, #1e1530 60%, #2a1f3d 100%)",
            }}
          />

          {/* Hanging spotlights */}
          {[20, 50, 80].map((x, i) => (
            <div key={i}>
              {/* Light source */}
              <div
                className="absolute rounded-full"
                style={{
                  top: "4%",
                  left: `${x}%`,
                  width: 24,
                  height: 24,
                  transform: "translateX(-50%)",
                  background: "radial-gradient(circle, #fff8d6 0%, #ffd966 60%, transparent 100%)",
                  boxShadow: "0 0 40px rgba(255,220,120,0.9)",
                  animation: `so-spotlight 2s ease-in-out ${i * 200}ms infinite`,
                }}
              />
              {/* Light cone */}
              <div
                className="absolute"
                style={{
                  top: "4%",
                  left: `${x}%`,
                  width: 280,
                  height: 460,
                  transform: "translateX(-50%)",
                  background:
                    "linear-gradient(to bottom, rgba(255,236,150,0.35) 0%, rgba(255,236,150,0.1) 50%, transparent 100%)",
                  clipPath: "polygon(38% 0, 62% 0, 100% 100%, 0% 100%)",
                  filter: "blur(8px)",
                  opacity: 0.7,
                }}
              />
            </div>
          ))}

          {/* Japanese banner (left) */}
          <div
            className="absolute"
            style={{
              top: "8%",
              left: "4%",
              width: 60,
              height: 180,
              background: "linear-gradient(to bottom, #7c1d1d, #991b1b)",
              border: "2px solid #fef3c7",
              boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ color: "#fef3c7", textAlign: "center", fontSize: 36, lineHeight: 1, marginTop: 16, fontFamily: "serif" }}>柔</div>
            <div style={{ color: "#fef3c7", textAlign: "center", fontSize: 36, lineHeight: 1, marginTop: 8, fontFamily: "serif" }}>道</div>
          </div>
          {/* Japanese banner (right) */}
          <div
            className="absolute"
            style={{
              top: "8%",
              right: "4%",
              width: 60,
              height: 180,
              background: "linear-gradient(to bottom, #7c1d1d, #991b1b)",
              border: "2px solid #fef3c7",
              boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ color: "#fef3c7", textAlign: "center", fontSize: 36, lineHeight: 1, marginTop: 16, fontFamily: "serif" }}>武</div>
            <div style={{ color: "#fef3c7", textAlign: "center", fontSize: 36, lineHeight: 1, marginTop: 8, fontFamily: "serif" }}>士</div>
          </div>

          {/* Crowd silhouette */}
          <svg
            className="absolute left-0 right-0"
            style={{ top: "38%", width: "100%", height: 40, opacity: 0.5 }}
            viewBox="0 0 1000 40"
            preserveAspectRatio="none"
          >
            {Array.from({ length: 50 }).map((_, i) => {
              const x = i * 20;
              const h = 20 + (i % 5) * 3;
              return (
                <g key={i} fill="#0f172a">
                  <circle cx={x + 10} cy={40 - h} r="5" />
                  <rect x={x + 3} y={40 - h + 3} width="14" height={h} rx="3" />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 55%, transparent 30%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.8) 100%)",
            animation: "so-vignette 2.6s ease-out both",
          }}
        />

        {/* Impact flash */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 52% 65%, #fff 0%, rgba(255,255,255,0.4) 25%, transparent 60%)",
            animation: "so-flash 2.6s ease-out both",
          }}
        />

        {/* Background kanji "一本" (IPPON) */}
        <div
          className="absolute left-1/2"
          style={{
            top: "20%",
            fontSize: "clamp(180px, 28vw, 380px)",
            fontWeight: 900,
            color: "#fef3c7",
            fontFamily: "serif",
            animation: "so-kanji 2.6s ease-out both",
            whiteSpace: "nowrap",
            letterSpacing: "0.1em",
            textShadow: "0 0 60px rgba(220,38,38,0.8)",
            zIndex: 1,
          }}
        >
          一本
        </div>

        {/* ── IMPACT EFFECTS — center at 52% / 65% (where uke slams) ── */}
        <div className="absolute" style={{ left: "52%", top: "65%", zIndex: 5 }}>
          {/* Beams */}
          {beams.map((b, i) => (
            <div
              key={`bm-${key}-${i}`}
              className="absolute"
              style={
                {
                  left: 0,
                  top: 0,
                  width: 380,
                  height: 8,
                  borderRadius: 4,
                  background:
                    "linear-gradient(to right, rgba(255,255,255,0.95), rgba(255,236,150,0.85), transparent)",
                  ["--rot" as any]: `${b.rot}deg`,
                  animation: `so-beam 2.6s ease-out ${b.delay}ms both`,
                  boxShadow: "0 0 24px rgba(255,236,150,0.9)",
                  transformOrigin: "left center",
                } as React.CSSProperties
              }
            />
          ))}

          {/* Horizontal shockwave (along the mat) */}
          <div
            className="absolute rounded-full"
            style={{
              width: 240,
              height: 100,
              border: "8px solid #fff",
              boxShadow: "0 0 50px rgba(255,255,255,0.95)",
              animation: "so-shockwave 2.6s ease-out both",
            }}
          />
          {/* Impact rings */}
          {[0, 90, 180].map((d, i) => (
            <div
              key={i}
              className="absolute rounded-full border-4"
              style={{
                width: 220,
                height: 80,
                borderColor: i === 0 ? "#facc15" : i === 1 ? "#f97316" : "#fff",
                animation: `so-impact-ring 2.6s ease-out ${d}ms both`,
                boxShadow: "0 0 30px rgba(250,204,21,0.7)",
              }}
            />
          ))}

          {/* Dust clouds */}
          {dust.map((d, i) => (
            <div
              key={`d-${key}-${i}`}
              className="absolute rounded-full"
              style={
                {
                  left: 0,
                  top: 0,
                  width: d.size,
                  height: d.size,
                  background: "radial-gradient(circle, rgba(212,165,90,0.9), rgba(168,125,58,0.3))",
                  ["--tx" as any]: `${d.tx}px`,
                  ["--ty" as any]: `${d.ty}px`,
                  ["--op" as any]: d.opacity,
                  animation: `so-dust ${d.duration}ms ease-out ${d.delay}ms both`,
                  filter: "blur(2px)",
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

        {/* Arc speed-lines around throw arc */}
        <div className="absolute" style={{ left: "50%", top: "50%", zIndex: 4 }}>
          {[20, 50, 80, 110, 140, 170].map((rot, i) => (
            <div
              key={`arc-${key}-${i}`}
              className="absolute"
              style={
                {
                  left: 0,
                  top: 0,
                  width: 200,
                  height: 6,
                  borderRadius: 3,
                  background: "linear-gradient(to right, rgba(255,255,255,0.9), rgba(250,204,21,0.5), transparent)",
                  ["--rot" as any]: `${rot}deg`,
                  animation: `so-arc-line 2.6s ease-out ${1100 + i * 30}ms both`,
                  transformOrigin: "left center",
                  filter: "blur(0.5px)",
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* ── UKE (white gi, being thrown) ── */}
        <div
          className="absolute"
          style={{
            left: "50%",
            top: "50%",
            width: "clamp(160px, 22vw, 360px)",
            transform: "translate(-50%,-50%)",
            animation: "so-uke 2.6s cubic-bezier(.4,.0,.5,1) both, so-uke-blur 2.6s ease-out both",
            zIndex: 6,
          }}
        >
          <JudokaSVG gi="white" />
        </div>

        {/* ── TORI (blue gi, thrower) ── */}
        <div
          className="absolute"
          style={{
            left: "50%",
            top: "50%",
            width: "clamp(180px, 24vw, 400px)",
            transform: "translate(-50%,-50%)",
            animation: "so-tori 2.6s cubic-bezier(.5,.0,.4,1) both",
            zIndex: 7,
            filter: "drop-shadow(0 22px 36px rgba(0,0,0,0.5))",
          }}
        >
          <JudokaSVG gi="blue" pose="thrower" />
        </div>

        {/* ── CAPTION ── */}
        <div
          key={`cap-${key}`}
          className="absolute left-1/2"
          style={{
            top: "16%",
            animation: "so-caption 2.6s cubic-bezier(.34,1.56,.64,1) both",
            zIndex: 10,
          }}
        >
          <span
            className="inline-block font-black tracking-tight px-10 py-4 rounded-2xl text-white"
            style={{
              fontSize: "clamp(38px, 7vw, 92px)",
              background: "linear-gradient(135deg, #dc2626 0%, #f59e0b 50%, #facc15 100%)",
              boxShadow:
                "0 20px 70px rgba(220,38,38,0.6), 0 0 60px rgba(250,204,21,0.6)",
              border: "5px solid #0f172a",
              textShadow: "0 5px 0 #0f172a, 0 10px 28px rgba(0,0,0,0.5)",
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
   Judoka SVG — gi (uniform), belt, dynamic pose
   gi: "white" | "blue"; pose: default (uke = neutral) | "thrower" (tori = crouched)
   ────────────────────────────────────────────────────────────────────────── */
const JudokaSVG = ({ gi, pose }: { gi: "white" | "blue"; pose?: "thrower" }) => {
  const giColor = gi === "white" ? "#f5f5f0" : "#1e3a8a";
  const giShade = gi === "white" ? "#c7c7bd" : "#1e293b";
  const giLine = gi === "white" ? "#9a9a8e" : "#0f172a";
  const skin = "#e0a878";
  const skinShade = "#b8865a";
  const belt = "#0f172a";
  const beltStripe = "#facc15";
  const hair = "#1e1b4b";

  const isThrower = pose === "thrower";

  return (
    <svg viewBox="0 0 200 280" className="w-full h-auto" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`gi-${gi}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={giColor} />
          <stop offset="100%" stopColor={giShade} />
        </linearGradient>
        <linearGradient id={`skin-${gi}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skin} />
          <stop offset="100%" stopColor={skinShade} />
        </linearGradient>
      </defs>

      {isThrower ? (
        /* ===== TORI — crouched, head down, arms reaching back to grip uke ===== */
        <g>
          {/* Back leg planted */}
          <path d="M88 170 Q70 200 60 246 L78 254 Q92 210 105 180 Z"
            fill={`url(#gi-${gi})`} stroke={giLine} strokeWidth="2.5" />
          <ellipse cx="68" cy="252" rx="14" ry="5" fill="#0f172a" />
          {/* Front leg bent */}
          <path d="M115 170 Q140 188 148 232 L130 240 Q116 200 105 180 Z"
            fill={`url(#gi-${gi})`} stroke={giLine} strokeWidth="2.5" />
          <ellipse cx="140" cy="238" rx="14" ry="5" fill="#0f172a" />

          {/* Pants ties */}
          <path d="M70 248 L72 256 M80 250 L82 258" stroke={giLine} strokeWidth="1.5" />

          {/* Jacket — crouched, broad shoulders pulled forward */}
          <path
            d="M68 90 Q62 78 78 70 L122 70 Q138 78 132 90 L142 160 Q126 172 100 170 Q74 172 58 160 Z"
            fill={`url(#gi-${gi})`}
            stroke={giLine}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Lapels (overlap) */}
          <path d="M78 70 L92 92 L100 168 L108 92 L122 70" stroke={giLine} strokeWidth="2.5" fill="none" />
          <path d="M82 72 L96 96 L100 165" stroke={giColor} strokeWidth="6" fill="none" opacity="0.6" />
          <path d="M118 72 L104 96 L100 165" stroke={giColor} strokeWidth="6" fill="none" opacity="0.6" />

          {/* BELT — black with gold stripe */}
          <rect x="58" y="148" width="84" height="12" fill={belt} stroke="#000" strokeWidth="1.5" />
          <rect x="58" y="153" width="84" height="2" fill={beltStripe} />
          {/* Belt knot */}
          <rect x="92" y="145" width="16" height="18" rx="2" fill={belt} stroke="#000" strokeWidth="1.5" />
          <rect x="86" y="160" width="6" height="20" fill={belt} stroke="#000" strokeWidth="1" />
          <rect x="108" y="160" width="6" height="20" fill={belt} stroke="#000" strokeWidth="1" />

          {/* HEAD — tilted forward */}
          <g transform="translate(0, -2) rotate(-20 100 60)">
            <ellipse cx="100" cy="58" rx="16" ry="18" fill={`url(#skin-${gi})`} stroke="#1e293b" strokeWidth="2.2" />
            {/* Hair */}
            <path d="M84 54 Q86 38 100 36 Q116 38 116 54 Q112 46 104 46 Q96 46 92 50 Q88 50 84 54 Z" fill={hair} />
            {/* Eyes — fierce, slit */}
            <path d="M90 60 L96 60" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M104 60 L110 60" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
            {/* Eyebrows */}
            <path d="M88 56 L96 54" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M104 54 L112 56" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
            {/* Yell mouth */}
            <ellipse cx="100" cy="68" rx="5" ry="4" fill="#0f172a" />
          </g>

          {/* ARMS — both reaching up & back to pull/grip uke */}
          {/* Right arm (pulling) */}
          <g>
            <path d="M132 92 L152 78 L168 50 L150 40 Z" fill={`url(#gi-${gi})`} stroke={giLine} strokeWidth="2.5" />
            <path d="M168 50 L184 30 L172 18 L156 38 Z" fill={`url(#skin-${gi})`} stroke="#1e293b" strokeWidth="2.2" />
            {/* Fist gripping uke's sleeve */}
            <circle cx="178" cy="22" r="10" fill={`url(#skin-${gi})`} stroke="#1e293b" strokeWidth="2.2" />
            <path d="M170 18 L186 18" stroke="#0f172a" strokeWidth="1.5" />
          </g>
          {/* Left arm (pulling lapel) */}
          <g>
            <path d="M68 92 L48 78 L34 56 L52 46 Z" fill={`url(#gi-${gi})`} stroke={giLine} strokeWidth="2.5" />
            <path d="M34 56 L20 38 L32 26 L46 44 Z" fill={`url(#skin-${gi})`} stroke="#1e293b" strokeWidth="2.2" />
            <circle cx="26" cy="32" r="10" fill={`url(#skin-${gi})`} stroke="#1e293b" strokeWidth="2.2" />
            <path d="M18 28 L34 28" stroke="#0f172a" strokeWidth="1.5" />
          </g>
        </g>
      ) : (
        /* ===== UKE — neutral standing pose (will be flipped/rotated by parent transform) ===== */
        <g>
          {/* Legs — straight, slightly apart */}
          <path d="M88 168 L82 250 L98 252 L100 170 Z" fill={`url(#gi-${gi})`} stroke={giLine} strokeWidth="2.5" />
          <path d="M112 168 L118 250 L102 252 L100 170 Z" fill={`url(#gi-${gi})`} stroke={giLine} strokeWidth="2.5" />
          <ellipse cx="88" cy="252" rx="13" ry="5" fill="#0f172a" />
          <ellipse cx="112" cy="252" rx="13" ry="5" fill="#0f172a" />
          {/* Pants stripes */}
          <path d="M90 200 L92 240" stroke={giLine} strokeWidth="1" opacity="0.5" />
          <path d="M110 200 L108 240" stroke={giLine} strokeWidth="1" opacity="0.5" />

          {/* Jacket */}
          <path
            d="M68 90 Q62 78 78 70 L122 70 Q138 78 132 90 L138 160 Q120 168 100 168 Q80 168 62 160 Z"
            fill={`url(#gi-${gi})`}
            stroke={giLine}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Lapels */}
          <path d="M78 70 L92 92 L100 165 L108 92 L122 70" stroke={giLine} strokeWidth="2.5" fill="none" />
          <path d="M82 72 L96 96 L100 162" stroke={giColor === "#f5f5f0" ? "#fff" : "#3b82f6"} strokeWidth="6" fill="none" opacity="0.6" />
          <path d="M118 72 L104 96 L100 162" stroke={giColor === "#f5f5f0" ? "#fff" : "#3b82f6"} strokeWidth="6" fill="none" opacity="0.6" />

          {/* BELT */}
          <rect x="62" y="148" width="76" height="12" fill={belt} stroke="#000" strokeWidth="1.5" />
          <rect x="62" y="153" width="76" height="2" fill={beltStripe} />
          <rect x="92" y="145" width="16" height="18" rx="2" fill={belt} stroke="#000" strokeWidth="1.5" />
          <rect x="86" y="160" width="6" height="22" fill={belt} stroke="#000" strokeWidth="1" />
          <rect x="108" y="160" width="6" height="22" fill={belt} stroke="#000" strokeWidth="1" />

          {/* HEAD */}
          <ellipse cx="100" cy="50" rx="17" ry="20" fill={`url(#skin-${gi})`} stroke="#1e293b" strokeWidth="2.2" />
          {/* Hair */}
          <path d="M83 46 Q85 28 100 26 Q117 28 117 46 Q113 38 105 38 Q96 38 92 42 Q88 42 83 46 Z" fill={hair} />
          {/* Wide-eyed (surprised — being thrown!) */}
          <circle cx="93" cy="52" r="3" fill="#fff" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="107" cy="52" r="3" fill="#fff" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="93" cy="52" r="1.5" fill="#0f172a" />
          <circle cx="107" cy="52" r="1.5" fill="#0f172a" />
          {/* Eyebrows raised */}
          <path d="M86 44 L98 42" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M102 42 L114 44" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
          {/* Open shocked mouth */}
          <ellipse cx="100" cy="64" rx="4" ry="5" fill="#0f172a" />

          {/* ARMS — flailing (one forward, one out) */}
          {/* Left arm — gripped by tori, pulled forward */}
          <g>
            <path d="M68 90 L48 100 L30 130 L48 140 Z" fill={`url(#gi-${gi})`} stroke={giLine} strokeWidth="2.5" />
            <path d="M30 130 L14 150 L22 164 L40 144 Z" fill={`url(#skin-${gi})`} stroke="#1e293b" strokeWidth="2.2" />
            <circle cx="16" cy="158" r="9" fill={`url(#skin-${gi})`} stroke="#1e293b" strokeWidth="2.2" />
            <path d="M10 154 L22 162" stroke="#0f172a" strokeWidth="1.5" />
          </g>
          {/* Right arm — flailing up/back */}
          <g>
            <path d="M132 90 L150 76 L168 56 L152 46 Z" fill={`url(#gi-${gi})`} stroke={giLine} strokeWidth="2.5" />
            <path d="M168 56 L186 40 L176 28 L160 44 Z" fill={`url(#skin-${gi})`} stroke="#1e293b" strokeWidth="2.2" />
            <circle cx="180" cy="32" r="9" fill={`url(#skin-${gi})`} stroke="#1e293b" strokeWidth="2.2" />
            <path d="M174 28 L186 36" stroke="#0f172a" strokeWidth="1.5" />
          </g>
        </g>
      )}
    </svg>
  );
};

export default SuccessOverlay;
