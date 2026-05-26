/**
 * FailureFeedback — fun animated overlay for wrong quiz answers.
 *
 * Research-backed: funny/surprising failure feedback boosts motivation and
 * "try again" rates more than plain error text (see "fun failure" GBL literature).
 *
 * Three visual modes (chosen randomly):
 *   monster  — cartoon monster slides in from the right
 *   tomato   — tomatoes splat across the screen
 *   jelly    — bouncing blob character
 */

import { useEffect, useState } from "react";

/* ─── Types ─── */
export type FailureMode = "monster" | "tomato" | "jelly";

interface Props {
  visible: boolean;
  onDone?: () => void;       // called after auto-dismiss
  attemptCount?: number;     // 1 = gentle, 2 = medium, 3+ = dramatic
}

/* ─── Content pools ─── */
const MONSTER_SETS = [
  { emoji: "👾", color: "#7c3aed", shadow: "rgba(124,58,237,0.4)", name: "סגול" },
  { emoji: "👹", color: "#16a34a", shadow: "rgba(22,163,74,0.4)",  name: "ירוק" },
  { emoji: "🤖", color: "#d97706", shadow: "rgba(217,119,6,0.4)",  name: "כתום" },
  { emoji: "👺", color: "#dc2626", shadow: "rgba(220,38,38,0.4)",  name: "אדום" },
  { emoji: "🫠", color: "#0891b2", shadow: "rgba(8,145,178,0.4)",  name: "כחול" },
];

const MONSTER_MESSAGES = [
  ["אופס! זו לא התשובה הנכונה...", "נסה שוב — קרוב!"],
  ["לא זה לא! 😄", "ממש כיף לנסות שוב!"],
  ["טעות! פגיעה מדויקת!", "נסה שוב — אתה יכול!"],
  ["לא כה מהר...", "זה לא המספר הנכון!"],
  ["היי! שמחתי לראות אותך 😄", "תנסה פעם נוספת!"],
];

const TOMATO_MESSAGES = [
  ["🍅 נמרחתי!", "נסה שוב!"],
  ["🍅 סלח לי...", "התשובה לא נכונה, נסה!"],
  ["🍅💦 טפטוף!", "לא בדיוק — נסה שוב!"],
];

const JELLY_MESSAGES = [
  ["וויי! לא בדיוק...", "נסה עוד פעם!"],
  ["היי! אני רוקד בשבילך 💃", "תנסה שוב, בטוח תצליח!"],
  ["עוד פעם? עם כיף!", "כל טעות = לימוד!"],
];

/* ─── Helpers ─── */
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const chooseMode = (attempt: number): FailureMode => {
  if (attempt >= 3) return "tomato";   // escalate to tomatoes on 3rd+ attempt
  const modes: FailureMode[] = ["monster", "monster", "jelly", "tomato"];
  return pick(modes);
};

/* ─── SVG Tomato Splat ─── */
const TomatoSplat = ({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) => (
  <g transform={`translate(${x},${y})`} style={{ animationDelay: `${delay}ms` }}>
    {/* Main blob */}
    <ellipse cx="0" cy="0" rx={size} ry={size * 0.85} fill="#ef4444" opacity="0.92" />
    {/* Splatter rays */}
    {[0, 40, 80, 130, 180, 220, 270, 310].map((angle, i) => {
      const rad = (angle * Math.PI) / 180;
      const len = size * (0.8 + Math.random() * 0.8);
      const ex = Math.cos(rad) * len;
      const ey = Math.sin(rad) * len;
      return (
        <ellipse
          key={i}
          cx={ex * 0.6} cy={ey * 0.6}
          rx={size * (0.15 + (i % 3) * 0.07)}
          ry={size * (0.12 + (i % 2) * 0.06)}
          transform={`rotate(${angle})`}
          fill="#f87171"
          opacity={0.75 - i * 0.05}
        />
      );
    })}
    {/* Seeds */}
    {[-size * 0.25, size * 0.1, -size * 0.05, size * 0.2].map((ox, i) => (
      <ellipse key={i} cx={ox} cy={i % 2 === 0 ? -size * 0.1 : size * 0.15}
        rx={size * 0.08} ry={size * 0.04} fill="#fca5a5" opacity="0.9"
        transform={`rotate(${i * 45})`} />
    ))}
  </g>
);

/* ─── Main component ─── */
const FailureFeedback = ({ visible, onDone, attemptCount = 1 }: Props) => {
  const [phase, setPhase] = useState<"in" | "hold" | "out" | "hidden">("hidden");
  const [mode]    = useState<FailureMode>(() => chooseMode(attemptCount));
  const [monster] = useState(() => pick(MONSTER_SETS));
  const [monsterMsg] = useState(() => pick(MONSTER_MESSAGES));
  const [tomatoMsg]  = useState(() => pick(TOMATO_MESSAGES));
  const [jellyMsg]   = useState(() => pick(JELLY_MESSAGES));

  /* Splash positions — stable per instance */
  const [splats] = useState(() =>
    Array.from({ length: 6 }, () => ({
      x: 5 + Math.random() * 90,   // % of screen width
      y: 5 + Math.random() * 85,   // % of screen height
      size: 22 + Math.random() * 28,
      delay: Math.random() * 300,
    }))
  );

  useEffect(() => {
    if (!visible) { setPhase("hidden"); return; }
    setPhase("in");
    const hold  = setTimeout(() => setPhase("hold"), 400);
    const leave = setTimeout(() => setPhase("out"),  2400);
    const done  = setTimeout(() => { setPhase("hidden"); onDone?.(); }, 2900);
    return () => { clearTimeout(hold); clearTimeout(leave); clearTimeout(done); };
  }, [visible]);

  if (phase === "hidden") return null;

  const entering = phase === "in";
  const leaving  = phase === "out";

  /* ── Tomato mode ── */
  if (mode === "tomato") {
    return (
      <div
        className="fixed inset-0 z-[9000] pointer-events-none overflow-hidden"
        style={{ opacity: leaving ? 0 : 1, transition: "opacity 0.45s ease" }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full"
          style={{
            transform: entering ? "scale(0.1)" : "scale(1)",
            transformOrigin: "center",
            transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {splats.map((s, i) => (
            <TomatoSplat key={i} x={s.x} y={s.y} size={s.size / 10} delay={s.delay} />
          ))}
        </svg>

        {/* Message bubble */}
        <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{
            transform: `translateX(-50%) ${entering ? "translateY(60px)" : "translateY(0)"}`,
            transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.1s",
          }}
        >
          <div className="bg-red-600 text-white rounded-3xl px-6 py-3.5 shadow-2xl text-center max-w-xs"
            dir="rtl"
          >
            <p className="text-[17px] font-bold leading-tight">{tomatoMsg[0]}</p>
            <p className="text-[12px] opacity-85 mt-1">{tomatoMsg[1]}</p>
          </div>
          <div className="text-[36px] drop-shadow-lg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" }}>🍅</div>
        </div>
      </div>
    );
  }

  /* ── Jelly mode ── */
  if (mode === "jelly") {
    return (
      <div
        className="fixed inset-0 z-[9000] pointer-events-none flex items-end justify-center pb-16"
        style={{ opacity: leaving ? 0 : 1, transition: "opacity 0.4s ease" }}
      >
        <div className="flex flex-col items-center gap-3"
          style={{
            transform: entering ? "translateY(120px) scale(0.4)" : "translateY(0) scale(1)",
            transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {/* Speech bubble */}
          <div className="bg-white rounded-3xl px-5 py-3 shadow-2xl border border-border relative text-center max-w-[240px]" dir="rtl">
            <p className="text-[15px] font-bold text-foreground">{jellyMsg[0]}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{jellyMsg[1]}</p>
            {/* bubble tail */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-border rotate-45" />
          </div>

          {/* Jelly blob */}
          <div className="relative" style={{ animation: "jellyBounce 0.6s ease infinite alternate" }}>
            <div className="w-24 h-20 rounded-[50%] bg-gradient-to-b from-sky-400 to-blue-600 shadow-[0_8px_32px_rgba(59,130,246,0.5)] flex items-center justify-center relative overflow-hidden">
              {/* eyes */}
              <div className="flex gap-3 mb-1">
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                </div>
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                </div>
              </div>
              {/* mouth */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-3 border-b-2 border-x-2 border-slate-800 rounded-b-full" />
              {/* shine */}
              <div className="absolute top-2 right-3 w-3 h-2 rounded-full bg-white/40" />
            </div>
            {/* shadow */}
            <div className="w-20 h-3 bg-black/10 rounded-full mx-auto mt-1 blur-sm" />
          </div>
        </div>

        <style>{`
          @keyframes jellyBounce {
            0%   { transform: scaleX(1) scaleY(1); }
            50%  { transform: scaleX(1.12) scaleY(0.88); }
            100% { transform: scaleX(0.92) scaleY(1.08); }
          }
        `}</style>
      </div>
    );
  }

  /* ── Monster mode (default) ── */
  return (
    <div
      className="fixed inset-0 z-[9000] pointer-events-none flex items-center justify-end pe-6 md:pe-12"
      style={{ opacity: leaving ? 0 : 1, transition: "opacity 0.4s ease" }}
    >
      <div className="flex flex-col items-end gap-3 max-w-[280px]"
        style={{
          transform: entering ? "translateX(180px) scale(0.6)" : "translateX(0) scale(1)",
          transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        dir="rtl"
      >
        {/* Speech bubble */}
        <div className="bg-white rounded-3xl px-5 py-3.5 shadow-2xl border border-border text-center relative">
          <p className="text-[16px] font-bold text-foreground leading-tight">{monsterMsg[0]}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{monsterMsg[1]}</p>
          {/* tail pointing down-right */}
          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-b border-r border-border rotate-45" />
        </div>

        {/* Monster */}
        <div className="relative ms-auto me-4">
          <div
            className="w-28 h-28 rounded-[40%] flex flex-col items-center justify-center shadow-2xl relative overflow-hidden"
            style={{
              background: `radial-gradient(circle at 35% 35%, ${monster.color}cc, ${monster.color})`,
              boxShadow: `0 16px 40px ${monster.shadow}`,
              animation: "monsterBob 0.7s ease-in-out infinite alternate",
            }}
          >
            {/* Main emoji */}
            <span className="text-[52px] leading-none drop-shadow-sm select-none" style={{ marginTop: -4 }}>
              {monster.emoji}
            </span>
            {/* Shine */}
            <div className="absolute top-3 left-4 w-5 h-3 rounded-full bg-white/30" />
          </div>
          {/* shadow */}
          <div className="w-20 h-3 bg-black/10 rounded-full mx-auto mt-1 blur-sm" />
        </div>
      </div>

      <style>{`
        @keyframes monsterBob {
          0%   { transform: translateY(0) rotate(-2deg); }
          100% { transform: translateY(-8px) rotate(2deg); }
        }
      `}</style>
    </div>
  );
};

export default FailureFeedback;
