import { useEffect, useMemo, useState } from "react";

/**
 * SuccessOverlay — Cheering athletes + confetti burst on correct answer.
 * Fullscreen, pointer-events disabled, ~1.6s. Hebrew RTL.
 */
type Props = {
  visible: boolean;
  onDone?: () => void;
  caption?: string;
};

const CAPTIONS = ["כל הכבוד!", "מעולה!", "אלוף/ה!", "בול!", "מדהים!", "פצצה!"];

const SKIN = ["#f5d0a9", "#e0ac7e", "#c68863", "#8d5524"];
const SHIRTS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ec4899", "#06b6d4"];

type Athlete = {
  x: number;          // % from left
  delay: number;      // ms
  scale: number;
  skin: string;
  shirt: string;
  flip: boolean;
  type: "jump" | "armsup" | "flag";
};

const SuccessOverlay = ({ visible, onDone, caption }: Props) => {
  const [key, setKey] = useState(0);

  const text = useMemo(
    () => caption ?? CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)],
    [key, caption]
  );

  const athletes: Athlete[] = useMemo(() => {
    const positions = [6, 18, 30, 44, 56, 70, 82, 94];
    return positions.map((x, i) => ({
      x,
      delay: 60 + (i % 4) * 70 + Math.random() * 80,
      scale: 0.85 + Math.random() * 0.45,
      skin: SKIN[Math.floor(Math.random() * SKIN.length)],
      shirt: SHIRTS[Math.floor(Math.random() * SHIRTS.length)],
      flip: Math.random() > 0.5,
      type: (["jump", "armsup", "flag", "jump", "armsup"] as const)[i % 5],
    }));
  }, [key]);

  const confettiPieces = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      x: Math.random() * 100,
      delay: Math.random() * 600,
      duration: 1400 + Math.random() * 900,
      size: 6 + Math.random() * 10,
      color: SHIRTS[i % SHIRTS.length],
      rot: Math.random() * 360,
      drift: (Math.random() - 0.5) * 200,
      shape: Math.random() > 0.5 ? "rect" : "circ",
    }));
  }, [key]);

  useEffect(() => {
    if (!visible) return;
    setKey(k => k + 1);
    const t = setTimeout(() => onDone?.(), 1700);
    return () => clearTimeout(t);
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes so-jump {
          0%   { transform: translateY(40px) scale(0.6); opacity: 0; }
          25%  { transform: translateY(-60px) scale(1.1); opacity: 1; }
          45%  { transform: translateY(0) scale(1); }
          60%  { transform: translateY(-40px) scale(1.05); }
          80%  { transform: translateY(0) scale(1); }
          100% { transform: translateY(-30px) scale(0.9); opacity: 0; }
        }
        @keyframes so-arms {
          0%,100% { transform: rotate(0deg); }
          50%     { transform: rotate(-14deg); }
        }
        @keyframes so-arms-r {
          0%,100% { transform: rotate(0deg); }
          50%     { transform: rotate(14deg); }
        }
        @keyframes so-flag {
          0%,100% { transform: rotate(-8deg); }
          50%     { transform: rotate(12deg); }
        }
        @keyframes so-confetti {
          0%   { transform: translate3d(0,-20px,0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translate3d(var(--dx), 110vh, 0) rotate(720deg); opacity: 1; }
        }
        @keyframes so-caption {
          0%   { transform: translate(-50%, 40px) scale(0.4) rotate(-6deg); opacity: 0; }
          25%  { transform: translate(-50%, 0) scale(1.2) rotate(3deg); opacity: 1; }
          70%  { transform: translate(-50%, 0) scale(1.05) rotate(-1deg); opacity: 1; }
          100% { transform: translate(-50%, -30px) scale(0.85); opacity: 0; }
        }
        @keyframes so-ring {
          0%   { transform: translate(-50%,-50%) scale(0.2); opacity: 0.85; }
          100% { transform: translate(-50%,-50%) scale(2.4); opacity: 0; }
        }
        @keyframes so-ground {
          0%   { transform: scaleX(0); opacity: 0; }
          30%  { transform: scaleX(1); opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {/* Soft golden glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(250,204,21,0.18) 0%, transparent 60%)",
          }}
        />

        {/* Impact rings (centered) */}
        {[0, 150].map((d, i) => (
          <div
            key={`r-${key}-${i}`}
            className="absolute top-1/2 left-1/2 rounded-full border-4"
            style={{
              width: 260,
              height: 260,
              borderColor: i === 0 ? "#facc15" : "#34d399",
              animation: `so-ring 0.9s ease-out ${d}ms both`,
              boxShadow: "0 0 30px rgba(250,204,21,0.6)",
            }}
          />
        ))}

        {/* Confetti */}
        {confettiPieces.map((c, i) => (
          <div
            key={`c-${key}-${i}`}
            className="absolute top-0"
            style={
              {
                left: `${c.x}%`,
                width: c.size,
                height: c.shape === "rect" ? c.size * 0.5 : c.size,
                background: c.color,
                borderRadius: c.shape === "circ" ? "50%" : 2,
                transform: `rotate(${c.rot}deg)`,
                ["--dx" as any]: `${c.drift}px`,
                animation: `so-confetti ${c.duration}ms cubic-bezier(.25,.7,.4,1) ${c.delay}ms both`,
                boxShadow: `0 0 6px ${c.color}80`,
              } as React.CSSProperties
            }
          />
        ))}

        {/* Ground line */}
        <div
          className="absolute left-[4%] right-[4%]"
          style={{
            bottom: "16%",
            height: 4,
            background: "linear-gradient(90deg, transparent, #facc15, #f59e0b, #facc15, transparent)",
            borderRadius: 4,
            transformOrigin: "center",
            animation: "so-ground 1.6s ease-out both",
            boxShadow: "0 0 20px rgba(250,204,21,0.7)",
          }}
        />

        {/* Cheering athletes */}
        {athletes.map((a, i) => (
          <div
            key={`a-${key}-${i}`}
            className="absolute"
            style={{
              left: `${a.x}%`,
              bottom: "14%",
              width: `clamp(70px, 11vw, 150px)`,
              transform: `translateX(-50%) scaleX(${a.flip ? -1 : 1})`,
              animation: `so-jump 1.55s cubic-bezier(.34,1.56,.64,1) ${a.delay}ms both`,
            }}
          >
            <div style={{ transform: `scale(${a.scale})`, transformOrigin: "bottom center" }}>
              <Athlete type={a.type} skin={a.skin} shirt={a.shirt} />
            </div>
          </div>
        ))}

        {/* Caption */}
        <div
          key={`cap-${key}`}
          className="absolute left-1/2"
          style={{
            top: "22%",
            animation: "so-caption 1.5s cubic-bezier(.34,1.56,.64,1) 0.1s both",
          }}
        >
          <span
            className="inline-block font-black tracking-tight px-6 py-3 rounded-2xl text-white"
            style={{
              fontSize: "clamp(28px, 5.5vw, 64px)",
              background: "linear-gradient(135deg, #10b981, #facc15)",
              boxShadow: "0 12px 40px rgba(16,185,129,0.5), 0 0 30px rgba(250,204,21,0.5)",
              border: "3px solid #064e3b",
              textShadow: "0 3px 0 #064e3b",
            }}
            dir="rtl"
          >
            {text} 🎉
          </span>
        </div>
      </div>
    </>
  );
};

/* ---------- Athlete SVG (3 variants) ---------- */
const Athlete = ({ type, skin, shirt }: { type: "jump" | "armsup" | "flag"; skin: string; shirt: string }) => {
  const pants = "#1f2937";
  const shoe = "#0f172a";

  return (
    <svg viewBox="0 0 100 160" className="w-full h-auto" style={{ overflow: "visible" }}>
      {/* shadow */}
      <ellipse cx="50" cy="156" rx="22" ry="4" fill="rgba(0,0,0,0.18)" />

      {/* legs */}
      <rect x="38" y="100" width="10" height="40" rx="4" fill={pants} />
      <rect x="52" y="100" width="10" height="40" rx="4" fill={pants} />
      {/* shoes */}
      <ellipse cx="43" cy="146" rx="9" ry="5" fill={shoe} />
      <ellipse cx="57" cy="146" rx="9" ry="5" fill={shoe} />

      {/* body / shirt */}
      <path
        d="M30 65 Q30 55 40 52 L60 52 Q70 55 70 65 L68 105 Q50 110 32 105 Z"
        fill={shirt}
        stroke="#0f172a"
        strokeWidth="2"
      />
      {/* number */}
      <text x="50" y="86" textAnchor="middle" fontSize="18" fontWeight="900" fill="#fff" stroke="#0f172a" strokeWidth="0.5">
        {Math.floor(Math.random() * 9) + 1}
      </text>

      {/* head */}
      <circle cx="50" cy="38" r="14" fill={skin} stroke="#0f172a" strokeWidth="1.5" />
      {/* hair */}
      <path d="M36 34 Q40 22 50 22 Q62 22 64 34 Q60 30 50 30 Q40 30 36 34 Z" fill="#1f2937" />
      {/* smile */}
      <path d="M44 42 Q50 48 56 42" stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* eyes (happy closed) */}
      <path d="M42 36 Q44 33 46 36" stroke="#0f172a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M54 36 Q56 33 58 36" stroke="#0f172a" strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* arms */}
      {type === "armsup" && (
        <>
          <g style={{ transformOrigin: "32px 65px", animation: "so-arms 0.35s ease-in-out infinite" }}>
            <rect x="20" y="20" width="10" height="50" rx="5" fill={shirt} stroke="#0f172a" strokeWidth="1.5" transform="rotate(-20 25 45)" />
            <circle cx="22" cy="18" r="5" fill={skin} stroke="#0f172a" strokeWidth="1.2" />
          </g>
          <g style={{ transformOrigin: "68px 65px", animation: "so-arms-r 0.35s ease-in-out infinite" }}>
            <rect x="70" y="20" width="10" height="50" rx="5" fill={shirt} stroke="#0f172a" strokeWidth="1.5" transform="rotate(20 75 45)" />
            <circle cx="78" cy="18" r="5" fill={skin} stroke="#0f172a" strokeWidth="1.2" />
          </g>
        </>
      )}

      {type === "jump" && (
        <>
          <g style={{ transformOrigin: "32px 65px", animation: "so-arms 0.3s ease-in-out infinite" }}>
            <rect x="14" y="30" width="10" height="40" rx="5" fill={shirt} stroke="#0f172a" strokeWidth="1.5" transform="rotate(-40 19 50)" />
            <circle cx="10" cy="32" r="5" fill={skin} stroke="#0f172a" strokeWidth="1.2" />
          </g>
          <g style={{ transformOrigin: "68px 65px", animation: "so-arms-r 0.3s ease-in-out infinite" }}>
            <rect x="76" y="30" width="10" height="40" rx="5" fill={shirt} stroke="#0f172a" strokeWidth="1.5" transform="rotate(40 81 50)" />
            <circle cx="90" cy="32" r="5" fill={skin} stroke="#0f172a" strokeWidth="1.2" />
          </g>
        </>
      )}

      {type === "flag" && (
        <>
          <rect x="24" y="55" width="9" height="38" rx="4" fill={shirt} stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="28" cy="95" r="5" fill={skin} stroke="#0f172a" strokeWidth="1.2" />
          {/* flag arm raised */}
          <g style={{ transformOrigin: "70px 60px", animation: "so-flag 0.5s ease-in-out infinite" }}>
            <rect x="72" y="10" width="8" height="55" rx="4" fill={shirt} stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="76" cy="8" r="5" fill={skin} stroke="#0f172a" strokeWidth="1.2" />
            {/* flag pole + cloth */}
            <rect x="75" y="-12" width="2" height="22" fill="#0f172a" />
            <path d="M77 -10 L96 -6 L92 2 L96 10 L77 6 Z" fill="#facc15" stroke="#0f172a" strokeWidth="1.2" />
          </g>
        </>
      )}
    </svg>
  );
};

export default SuccessOverlay;
