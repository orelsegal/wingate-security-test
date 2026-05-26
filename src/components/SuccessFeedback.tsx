/**
 * SuccessFeedback — Happy monster that jumps up from the bottom on correct answer.
 * Gets BIGGER with every correct answer in the session.
 *
 * correctCount 1 → small-ish (45vw)
 * correctCount 2 → medium   (62vw)
 * correctCount 3 → large    (78vw)
 * correctCount 4+ → MASSIVE (96vw — basically full screen)
 */

import { useEffect, useState } from "react";

interface Props {
  visible: boolean;
  onDone?: () => void;
  correctCount?: number;
}

type Phase = "hidden" | "rise" | "hold" | "drop";

const MSGS: [string, string][] = [
  ["נכון! 🌟",         "כל הכבוד — המשך כך!"],
  ["מעולה!! ⭐⭐",      "אתה על זה — קדימה!"],
  ["מושלם!!! 🏆",      "שלוש מתוך שלוש — מדהים!"],
  ["אלוף!!!! 👑",      "מי עוצר אותך?!"],
  ["אגדי!!!!! 🔥🔥🔥", "אי אפשר לעצור אותך!"],
];

const pick = (arr: [string, string][], i: number): [string, string] =>
  arr[Math.min(i, arr.length - 1)];

const ANIM = `
  @keyframes sf-rise {
    0%   { transform: translateY(105%); }
    50%  { transform: translateY(-40px); }
    65%  { transform: translateY(16px); }
    78%  { transform: translateY(-10px); }
    88%  { transform: translateY(4px); }
    100% { transform: translateY(0); }
  }
  @keyframes sf-drop {
    0%   { transform: translateY(0) rotate(0deg); }
    20%  { transform: translateY(-30px) rotate(-5deg); }
    100% { transform: translateY(115%) rotate(8deg); }
  }
  @keyframes sf-bob {
    0%,100% { transform: scaleX(1) scaleY(1); }
    50%     { transform: scaleX(1.08) scaleY(0.93); }
  }
  @keyframes sf-arm-l {
    0%,100% { transform: rotate(-15deg) translateY(0); }
    50%     { transform: rotate(-60deg) translateY(-14px); }
  }
  @keyframes sf-arm-r {
    0%,100% { transform: rotate(15deg)  translateY(0); }
    50%     { transform: rotate(58deg)  translateY(-14px); }
  }
  @keyframes sf-star-spin {
    0%   { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.2); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes sf-bubble {
    0%   { transform: scale(0) rotate(-8deg); opacity: 0; }
    55%  { transform: scale(1.1) rotate(2deg);  opacity: 1; }
    100% { transform: scale(1) rotate(0deg);    opacity: 1; }
  }
  @keyframes sf-sparkle {
    0%,100% { transform: scale(0.6) rotate(0deg);   opacity: 0.7; }
    50%     { transform: scale(1.2) rotate(180deg);  opacity: 1; }
  }
`;

/* ── Star eye SVG ── */
const StarEye = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
  <g>
    <circle cx={cx} cy={cy} r={r + 4} fill="white" stroke="#1a1a1a" strokeWidth="2.5" />
    {/* star shape for the pupil */}
    <path
      d={`M${cx},${cy - r * 0.85} L${cx + r * 0.28},${cy - r * 0.22} L${cx + r * 0.85},${cy - r * 0.22} L${cx + r * 0.35},${cy + r * 0.18} L${cx + r * 0.52},${cy + r * 0.82} L${cx},${cy + r * 0.42} L${cx - r * 0.52},${cy + r * 0.82} L${cx - r * 0.35},${cy + r * 0.18} L${cx - r * 0.85},${cy - r * 0.22} L${cx - r * 0.28},${cy - r * 0.22}Z`}
      fill="#FFB800"
      style={{
        animationName: "sf-star-spin",
        animationDuration: "1.2s",
        animationTimingFunction: "linear",
        animationIterationCount: "infinite",
        transformOrigin: `${cx}px ${cy}px`,
      }}
    />
    {/* eye highlight */}
    <circle cx={cx + r * 0.3} cy={cy - r * 0.35} r={r * 0.28} fill="rgba(255,255,255,0.7)" />
  </g>
);

/* ── Sparkle decoration ── */
const Sparkle = ({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) => (
  <div style={{
    position: "absolute", left: x, top: y,
    width: size, height: size,
    animationName: "sf-sparkle",
    animationDuration: "0.9s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationDelay: `${delay}ms`,
    fontSize: size,
    lineHeight: 1,
    userSelect: "none",
  }}>⭐</div>
);

/* ── Monster SVG — golden/orange, happy ── */
const SuccessMonster = ({ dropping, size }: { dropping: boolean; size: number }) => (
  <div style={{
    position: "relative",
    width: `min(${size}vw, ${size * 5}px)`,
    animationName: dropping ? "sf-drop" : "sf-rise",
    animationDuration: dropping ? "0.55s" : "0.7s",
    animationTimingFunction: dropping
      ? "cubic-bezier(0.4,0,1,1)"
      : "cubic-bezier(0.2,0.8,0.3,1.2)",
    animationFillMode: "both",
  }}>
    {/* sparkles around the monster */}
    {!dropping && [
      { x: "8%",  y: "12%", s: 22, d: 0 },
      { x: "82%", y: "8%",  s: 18, d: 200 },
      { x: "-4%", y: "45%", s: 16, d: 100 },
      { x: "88%", y: "42%", s: 20, d: 350 },
      { x: "45%", y: "2%",  s: 14, d: 150 },
    ].map((s, i) => (
      <Sparkle key={i} x={s.x as any} y={s.y as any} size={s.s} delay={s.d} />
    ))}

    <svg viewBox="0 0 220 310" style={{ width: "100%", display: "block", overflow: "visible" }}>
      {/* left arm — raised in celebration */}
      <rect x="-8" y="145" width="36" height="82" rx="18"
        fill="#FF9500" stroke="#CC6A00" strokeWidth="3.5"
        style={{
          transformOrigin: "10px 145px",
          animationName: "sf-arm-l",
          animationDuration: "0.45s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }}
      />
      {/* right arm */}
      <rect x="192" y="145" width="36" height="82" rx="18"
        fill="#FF9500" stroke="#CC6A00" strokeWidth="3.5"
        style={{
          transformOrigin: "210px 145px",
          animationName: "sf-arm-r",
          animationDuration: "0.45s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDelay: "0.22s",
        }}
      />

      {/* body blob */}
      <ellipse cx="110" cy="205" rx="96" ry="108"
        fill="#FF9500" stroke="#CC6A00" strokeWidth="4"
        style={{
          animationName: "sf-bob",
          animationDuration: "0.45s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
        }}
      />

      {/* spiky hair — jagged and fun */}
      {[
        "M55,105 L38,48 L66,100",
        "M83,90  L76,28  L102,85",
        "M118,87 L122,22 L144,84",
        "M152,98 L166,44 L174,96",
      ].map((d, i) => (
        <path key={i} d={d} fill="#FF9500" stroke="#CC6A00" strokeWidth="2.5" />
      ))}

      {/* star eyes */}
      <StarEye cx={70}  cy={168} r={17} />
      <StarEye cx={150} cy={168} r={17} />

      {/* huge happy smile */}
      <path d="M 42 222 Q 110 290 178 222"
        fill="#FF006E" stroke="#1a1a1a" strokeWidth="3" />

      {/* teeth — rounded, friendly */}
      {[54, 76, 98, 122, 144].map((x, i) => (
        <rect key={i} x={x} y="222" width="18" height={i % 2 === 0 ? 22 : 26}
          rx="5" fill="white" stroke="#eee" strokeWidth="1" />
      ))}

      {/* rosy cheeks */}
      <ellipse cx="52"  cy="200" rx="22" ry="13" fill="#FF69B4" opacity="0.5" />
      <ellipse cx="168" cy="200" rx="22" ry="13" fill="#FF69B4" opacity="0.5" />

      {/* fuzzy bumps on body edge */}
      {[
        [15,195],[12,235],[18,272],[48,305],[88,315],
        [132,314],[172,305],[202,272],[208,235],[204,195],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={9}
          fill="#FFB84D" stroke="#CC6A00" strokeWidth="2" />
      ))}

      {/* belly highlight */}
      <ellipse cx="110" cy="205" rx="45" ry="38" fill="rgba(255,220,140,0.3)" />
    </svg>
  </div>
);

/* ── Main component ─────────────────────────────────────────────────── */
const SuccessFeedback = ({ visible, onDone, correctCount = 1 }: Props) => {
  const [phase, setPhase] = useState<Phase>("hidden");

  // Size grows with each correct answer: 45 → 62 → 78 → 96 vw
  const size = Math.min(45 + (correctCount - 1) * 17, 96);
  const msg = pick(MSGS, correctCount - 1);

  useEffect(() => {
    if (!visible) { setPhase("hidden"); return; }

    // Duration stretches slightly with size (bigger = more drama)
    const hold = 1800 + correctCount * 150;
    setPhase("rise");
    const t1 = setTimeout(() => setPhase("hold"), 680);
    const t2 = setTimeout(() => setPhase("drop"), hold);
    const t3 = setTimeout(() => { setPhase("hidden"); onDone?.(); }, hold + 580);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [visible, correctCount]);

  if (phase === "hidden") return null;

  const dropping = phase === "drop";
  const showBubble = phase === "hold" || phase === "drop";

  return (
    <>
      <style>{ANIM}</style>
      <div className="fixed inset-0 z-[9000] pointer-events-none overflow-hidden flex items-end justify-center">
        {/* subtle dark backdrop so monster pops */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center bottom, rgba(0,0,0,0.18) 0%, transparent 70%)",
          opacity: dropping ? 0 : 1,
          transition: "opacity 0.4s ease",
        }} />

        <div style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingBottom: 0,
          gap: 6,
        }}>
          {/* speech bubble */}
          {showBubble && (
            <div style={{
              animationName: "sf-bubble",
              animationDuration: "0.38s",
              animationTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
              animationFillMode: "both",
              opacity: dropping ? 0 : 1,
              transition: dropping ? "opacity 0.2s ease" : undefined,
              background: "white",
              borderRadius: 20,
              padding: "10px 22px",
              boxShadow: "0 6px 28px rgba(0,0,0,0.18)",
              border: "2.5px solid #FFD580",
              textAlign: "center",
              position: "relative",
              marginBottom: 4,
              whiteSpace: "nowrap",
            }} dir="rtl">
              <p style={{ fontSize: "clamp(16px,4.5vw,22px)", fontWeight: 900, margin: 0, color: "#CC6A00", lineHeight: 1.2 }}>
                {msg[0]}
              </p>
              <p style={{ fontSize: "clamp(11px,3vw,14px)", margin: "3px 0 0", color: "#555", fontWeight: 600 }}>
                {msg[1]}
              </p>
              {/* bubble tail pointing down */}
              <div style={{
                position: "absolute", bottom: -12, left: "50%",
                transform: "translateX(-50%)",
                width: 0, height: 0,
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderTop: "13px solid white",
              }} />
            </div>
          )}

          <SuccessMonster dropping={dropping} size={size} />
        </div>
      </div>
    </>
  );
};

export default SuccessFeedback;
