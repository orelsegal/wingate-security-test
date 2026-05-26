import { useEffect, useState } from "react";

/**
 * MonsterBurst — small playful monsters that fly across the screen on
 * a wrong answer. Self-clears after ~1.4s.
 *
 * Usage:
 *   {showMonsters && <MonsterBurst onDone={() => setShowMonsters(false)} />}
 */
type Props = { onDone?: () => void; count?: number };

const PALETTES = [
  { body: "#a78bfa", eye: "#1f2937", horn: "#7c3aed" }, // violet
  { body: "#f472b6", eye: "#1f2937", horn: "#db2777" }, // pink
  { body: "#fbbf24", eye: "#1f2937", horn: "#d97706" }, // amber
  { body: "#34d399", eye: "#1f2937", horn: "#059669" }, // emerald
  { body: "#60a5fa", eye: "#1f2937", horn: "#2563eb" }, // blue
  { body: "#fb7185", eye: "#1f2937", horn: "#e11d48" }, // rose
];

const Monster = ({ color, delay, x, y, rot }: {
  color: typeof PALETTES[number]; delay: number; x: number; y: number; rot: number;
}) => (
  <div
    className="absolute"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      animation: `monster-pop 1.4s cubic-bezier(.2,.7,.3,1.2) ${delay}ms forwards`,
      transform: `rotate(${rot}deg) scale(0)`,
      opacity: 0,
    }}
  >
    <svg viewBox="0 0 64 64" className="w-14 h-14 md:w-16 md:h-16 drop-shadow-lg">
      <path d={`M16 22 L20 10 L24 22 Z`} fill={color.horn} />
      <path d={`M40 22 L44 10 L48 22 Z`} fill={color.horn} />
      <ellipse cx="32" cy="38" rx="22" ry="20" fill={color.body} />
      <circle cx="24" cy="34" r="6" fill="#fff" />
      <circle cx="40" cy="34" r="6" fill="#fff" />
      <circle cx="24" cy="36" r="3" fill={color.eye} />
      <circle cx="40" cy="36" r="3" fill={color.eye} />
      <path d="M22 47 Q27 44 32 47 Q37 50 42 47" stroke={color.eye} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M26 48 L26 52 M30 49 L30 53 M34 49 L34 53 M38 48 L38 52" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  </div>
);

const MonsterBurst = ({ onDone, count = 7 }: Props) => {
  const [items] = useState(() =>
    Array.from({ length: count }).map((_, i) => ({
      color: PALETTES[i % PALETTES.length],
      x: 10 + Math.random() * 80,
      y: 20 + Math.random() * 60,
      rot: -20 + Math.random() * 40,
      delay: i * 70,
    }))
  );

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <>
      <style>{`
        @keyframes monster-pop {
          0%   { transform: translateY(40px) scale(0) rotate(0deg); opacity: 0; }
          25%  { transform: translateY(-10px) scale(1.15) rotate(-8deg); opacity: 1; }
          55%  { transform: translateY(0) scale(1) rotate(6deg); opacity: 1; }
          100% { transform: translateY(-30px) scale(0.6) rotate(-4deg); opacity: 0; }
        }
        @keyframes monster-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
      <div className="fixed inset-0 z-[9998] pointer-events-none overflow-hidden">
        {items.map((it, i) => <Monster key={i} {...it} />)}
      </div>
    </>
  );
};

export default MonsterBurst;
