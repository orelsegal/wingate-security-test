/**
 * FailureFeedback — Screen-dominating gamified wrong-answer overlay.
 *
 * Escalation system:
 *   attempt 1  → Tomato missile from the right — big SPLAT, drips
 *   attempt 2  → MEGA tomato from the left — full-screen splatter
 *   attempt 3+ → CHAOS MONSTER bursts from the bottom + screen shake
 *
 * All animations are pure CSS @keyframes (no external deps).
 * pointer-events: none — never blocks the quiz below.
 */

import { useEffect, useState } from "react";

/* ─── Types ─────────────────────────────────────────────────────────── */
export type FailureMode = "tomato-sm" | "tomato-lg" | "monster";
type Phase = "hidden" | "fly" | "impact" | "hold" | "out";

interface Props {
  visible: boolean;
  onDone?: () => void;
  attemptCount?: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const chooseMode = (n: number): FailureMode =>
  n >= 3 ? "monster" : n === 2 ? "tomato-lg" : "tomato-sm";

/* ─── Message pools ──────────────────────────────────────────────────── */
const MSGS: Record<FailureMode, [string, string][]> = {
  "tomato-sm": [
    ["אופס! 🍅", "לא זה — נסה שוב!"],
    ["לא בדיוק! 😄", "קרוב — עוד ניסיון!"],
    ["שגוי! 🎯", "אתה יכול — נסה!"],
  ],
  "tomato-lg": [
    ["שוב לא זה?! 🍅🍅", "קרא שוב ונסה!"],
    ["הפעם גדולה יותר 🫠", "עיין בהסבר!"],
    ["כפול SPLAT! 😂", "אתה בטח יכול!"],
  ],
  monster: [
    ["שָׁלוֹם! 👾", "יצאתי במיוחד בשבילך..."],
    ["TRIPLE MISS! 🦖", "שלוש?! קרא שוב!"],
    ["וואו! 🤯", "מרשים. עכשיו נסה שוב!"],
  ],
};

/* ─── Durations (ms) ─────────────────────────────────────────────────── */
const DURATIONS: Record<FailureMode, number> = {
  "tomato-sm": 2700,
  "tomato-lg": 3100,
  monster:     3500,
};

/* ─── CSS keyframes (injected once) ─────────────────────────────────── */
const ANIM_CSS = `
  @keyframes ff-fly-right {
    0%   { transform: translateX(115vw) scale(0.3) rotate(25deg); }
    65%  { transform: translateX(0)     scale(1.15) rotate(-4deg); }
    78%  { transform: translateX(0)     scale(0.93) rotate(2deg); }
    100% { transform: translateX(0)     scale(1)    rotate(0deg); }
  }
  @keyframes ff-fly-left {
    0%   { transform: translateX(-115vw) scale(0.3) rotate(-25deg); }
    65%  { transform: translateX(0)      scale(1.2)  rotate(4deg); }
    78%  { transform: translateX(0)      scale(0.91) rotate(-2deg); }
    100% { transform: translateX(0)      scale(1)    rotate(0deg); }
  }
  @keyframes ff-flash {
    0%   { opacity: 0.85; }
    100% { opacity: 0; }
  }
  @keyframes ff-splat {
    0%   { transform: scale(0) rotate(-12deg); opacity: 0; }
    55%  { transform: scale(1.18) rotate(4deg); opacity: 1; }
    80%  { transform: scale(0.97) rotate(-1deg); opacity: 1; }
    100% { transform: scale(1)    rotate(0deg); opacity: 1; }
  }
  @keyframes ff-drop {
    0%   { height: 0;   opacity: 1; }
    85%  { opacity: 0.8; }
    100% { height: var(--ff-drip-h, 100px); opacity: 0.55; }
  }
  @keyframes ff-msg {
    0%   { transform: translate(-50%, 50px) scale(0.55); opacity: 0; }
    55%  { transform: translate(-50%, -10px) scale(1.08); opacity: 1; }
    100% { transform: translate(-50%, 0)     scale(1);    opacity: 1; }
  }
  @keyframes ff-shake {
    0%,100% { transform: translate(0,0)     rotate(0deg); }
    8%      { transform: translate(-9px,5px) rotate(-0.5deg); }
    16%     { transform: translate(9px,-6px) rotate(0.5deg); }
    24%     { transform: translate(-8px,7px) rotate(-0.4deg); }
    32%     { transform: translate(8px,-5px) rotate(0.4deg); }
    40%     { transform: translate(-5px,6px) rotate(-0.3deg); }
    48%     { transform: translate(5px,-4px) rotate(0.3deg); }
    56%     { transform: translate(-3px,3px); }
    64%     { transform: translate(3px,-3px); }
    72%     { transform: translate(-2px,2px); }
    80%     { transform: translate(2px,-2px); }
    90%     { transform: translate(-1px,1px); }
  }
  @keyframes ff-rise {
    0%   { transform: translateY(105%); }
    52%  { transform: translateY(-32px); }
    68%  { transform: translateY(14px); }
    82%  { transform: translateY(-8px); }
    92%  { transform: translateY(3px); }
    100% { transform: translateY(0); }
  }
  @keyframes ff-sink {
    0%   { transform: translateY(0) rotate(0deg); }
    22%  { transform: translateY(-24px) rotate(-4deg); }
    100% { transform: translateY(115%) rotate(6deg); }
  }
  @keyframes ff-bob {
    0%,100% { transform: scaleX(1)    scaleY(1); }
    50%     { transform: scaleX(1.07) scaleY(0.93); }
  }
  @keyframes ff-arm-l {
    0%,100% { transform: rotate(-12deg) translateY(0); }
    50%     { transform: rotate(-48deg) translateY(-10px); }
  }
  @keyframes ff-arm-r {
    0%,100% { transform: rotate(12deg)  translateY(0); }
    50%     { transform: rotate(46deg)  translateY(-10px); }
  }
  @keyframes ff-bubble {
    0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
    55%  { transform: scale(1.1) rotate(3deg);  opacity: 1; }
    100% { transform: scale(1) rotate(0deg);    opacity: 1; }
  }
  @keyframes ff-eye {
    0%,85%,100% { transform: translate(0,0); }
    90%  { transform: translate(4px, -4px); }
    95%  { transform: translate(-4px, 4px); }
  }
  @keyframes ff-tongue {
    0%,100% { transform: scaleY(1) translateY(0); }
    50%     { transform: scaleY(1.35) translateY(5px); }
  }
`;

/* ─── Tomato SVG ─────────────────────────────────────────────────────── */
const TomatoSvg = ({ big }: { big: boolean }) => (
  <svg viewBox="0 0 110 120" style={{ width: big ? "62vw" : "44vw", maxWidth: big ? "390px" : "270px", display: "block" }}>
    {/* shadow under tomato */}
    <ellipse cx="55" cy="116" rx="38" ry="6" fill="rgba(0,0,0,0.22)" />
    {/* main body */}
    <circle cx="55" cy="64" r="50" fill="#E60A08" />
    <circle cx="55" cy="64" r="50" fill="url(#tom-grad)" />
    {/* highlight gloss */}
    <ellipse cx="36" cy="42" rx="16" ry="9" fill="rgba(255,255,255,0.38)" transform="rotate(-25 36 42)" />
    <ellipse cx="31" cy="37" rx="7" ry="4" fill="rgba(255,255,255,0.22)" transform="rotate(-25 31 37)" />
    {/* stem */}
    <rect x="51" y="12" width="8" height="16" rx="4" fill="#2A7A00" />
    {/* leaves */}
    <path d="M52 20 Q34 4 36 20 Q44 12 52 20" fill="#3DAD00" />
    <path d="M58 20 Q76 4 74 20 Q66 12 58 20" fill="#3DAD00" />
    <path d="M55 18 Q55 2 58 14" stroke="#3DAD00" strokeWidth="3" fill="none" />
    {/* seeds */}
    <ellipse cx="40" cy="60" rx="6" ry="3.5" fill="rgba(255,230,140,0.75)" transform="rotate(-18 40 60)" />
    <ellipse cx="62" cy="54" rx="6" ry="3.5" fill="rgba(255,230,140,0.75)" transform="rotate(14 62 54)" />
    <ellipse cx="52" cy="75" rx="6" ry="3.5" fill="rgba(255,230,140,0.75)" />
    <ellipse cx="72" cy="68" rx="5" ry="3" fill="rgba(255,230,140,0.65)" transform="rotate(-10 72 68)" />
    <defs>
      <radialGradient id="tom-grad" cx="38%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#FF3320" stopOpacity="0" />
        <stop offset="100%" stopColor="#8B0000" stopOpacity="0.55" />
      </radialGradient>
    </defs>
  </svg>
);

/* ─── Splat SVG ──────────────────────────────────────────────────────── */
const SplatSvg = ({ big }: { big: boolean }) => {
  const s = big ? 1.35 : 1;
  return (
    <svg viewBox="-10 -10 220 195"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {/* big central blob */}
      <path
        d="M100,10 C145,5 190,35 195,80 C200,125 175,170 130,178 C85,186 25,175 10,130 C-5,85 15,30 55,12 C70,6 85,11 100,10Z"
        fill="#E60A08" opacity="0.88"
        transform={`translate(0 0) scale(${s})`}
        style={{ transformOrigin: "100px 95px" }}
      />
      {/* splatter rays */}
      {[
        { d: "M100,8 C95,0 90,-12 88,-22 C92,-14 97,-4 100,8Z", o: 0.8 },
        { d: "M180,55 C188,48 200,40 210,35 C202,44 192,52 180,55Z", o: 0.75 },
        { d: "M195,115 C205,118 220,120 228,115 C218,122 206,124 195,115Z", o: 0.7 },
        { d: "M145,185 C148,196 144,208 138,215 C140,204 141,193 145,185Z", o: 0.72 },
        { d: "M50,185 C46,198 48,210 44,218 C40,206 42,194 50,185Z", o: 0.7 },
        { d: "M8,120 C-4,124 -16,118 -22,110 C-12,118 2,120 8,120Z", o: 0.75 },
        { d: "M12,55 C2,46 -8,34 -14,22 C-4,36 6,48 12,55Z", o: 0.73 },
        { d: "M55,10 C50,0 46,-14 50,-24 C52,-12 54,-2 55,10Z", o: 0.7 },
      ].map((r, i) => (
        <path key={i} d={r.d} fill="#FF2211" opacity={r.o} />
      ))}
      {/* small splatter drops */}
      {[
        [22, 22, 8, 6], [182, 18, 7, 5], [210, 90, 9, 6], [195, 155, 8, 5],
        [15, 158, 7, 6], [-5, 88, 8, 5], [105, -18, 6, 4], [165, 195, 7, 5],
      ].map(([cx, cy, rx, ry], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry}
          fill="#FF1A08" opacity={0.65 - i * 0.03}
          transform={`rotate(${i * 22} ${cx} ${cy})`} />
      ))}
    </svg>
  );
};

/* ─── Drip lines ─────────────────────────────────────────────────────── */
const Drips = ({ big }: { big: boolean }) => {
  const drips = big
    ? [{ l: "30%", w: 14, h: 140, d: 0 }, { l: "47%", w: 20, h: 180, d: 80 }, { l: "60%", w: 16, h: 150, d: 40 }, { l: "72%", w: 12, h: 110, d: 120 }]
    : [{ l: "35%", w: 12, h: 110, d: 0 }, { l: "50%", w: 16, h: 140, d: 60 }, { l: "63%", w: 10, h: 90, d: 100 }];

  return (
    <>
      {drips.map((dr, i) => (
        <div key={i} style={{
          position: "absolute",
          bottom: 0,
          left: dr.l,
          width: dr.w,
          background: "linear-gradient(to bottom, #CC0000, #8B0000)",
          borderRadius: "0 0 50% 50%",
          animationName: "ff-drop",
          animationDuration: "1.2s",
          animationTimingFunction: "ease-in",
          animationDelay: `${dr.d}ms`,
          animationFillMode: "both",
          ["--ff-drip-h" as string]: `${dr.h}px`,
          opacity: 0.75,
        }} />
      ))}
    </>
  );
};

/* ─── Monster SVG ────────────────────────────────────────────────────── */
const MonsterSvg = ({ dropping }: { dropping: boolean }) => (
  <div style={{
    position: "relative",
    width: "min(75vw, 400px)",
    animationName: dropping ? "ff-sink" : "ff-rise",
    animationDuration: dropping ? "0.6s" : "0.75s",
    animationTimingFunction: dropping ? "cubic-bezier(0.4,0,1,1)" : "cubic-bezier(0.2,0.8,0.3,1.2)",
    animationFillMode: "both",
  }}>
    <svg viewBox="0 0 220 310" style={{ width: "100%", display: "block", overflow: "visible" }}>
      {/* left arm */}
      <rect x="-10" y="165" width="38" height="85" rx="19"
        fill="#A8FF3E" stroke="#4A9000" strokeWidth="4"
        style={{ transformOrigin: "14px 165px", animationName: "ff-arm-l", animationDuration: "0.55s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }} />
      {/* right arm */}
      <rect x="192" y="165" width="38" height="85" rx="19"
        fill="#A8FF3E" stroke="#4A9000" strokeWidth="4"
        style={{ transformOrigin: "211px 165px", animationName: "ff-arm-r", animationDuration: "0.55s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", animationDelay: "0.27s" }} />

      {/* body — big blob */}
      <ellipse cx="110" cy="210" rx="98" ry="112"
        fill="#A8FF3E" stroke="#4A9000" strokeWidth="4"
        style={{ animationName: "ff-bob", animationDuration: "0.5s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }} />

      {/* spikes on top */}
      {[
        "M55,110 L40,55 L68,105",
        "M85,95 L78,35 L102,90",
        "M115,90 L118,28 L140,88",
        "M148,100 L160,48 L170,98",
      ].map((d, i) => (
        <path key={i} d={d} fill="#A8FF3E" stroke="#4A9000" strokeWidth="3" />
      ))}

      {/* left eye white */}
      <circle cx="72" cy="168" r="35" fill="white" stroke="#1a1a1a" strokeWidth="3" />
      {/* right eye white */}
      <circle cx="148" cy="168" r="35" fill="white" stroke="#1a1a1a" strokeWidth="3" />
      {/* left pupil */}
      <circle cx="78" cy="162" r="17" fill="#111"
        style={{ animationName: "ff-eye", animationDuration: "1.8s", animationIterationCount: "infinite" }} />
      {/* right pupil — offset for crazy look */}
      <circle cx="142" cy="174" r="17" fill="#111"
        style={{ animationName: "ff-eye", animationDuration: "1.8s", animationIterationCount: "infinite", animationDelay: "0.4s" }} />
      {/* eye highlights */}
      <circle cx="83" cy="154" r="6" fill="white" />
      <circle cx="147" cy="166" r="6" fill="white" />

      {/* mouth background */}
      <path d="M 44 228 Q 110 290 176 228" fill="#FF006E" stroke="#1a1a1a" strokeWidth="3" />
      {/* teeth */}
      {[54, 76, 98, 122, 144].map((x, i) => (
        <rect key={i} x={x} y="228" width="18" height={i % 2 === 0 ? 24 : 28} rx="4" fill="white" stroke="#ddd" strokeWidth="1" />
      ))}

      {/* tongue */}
      <ellipse cx="110" cy="268" rx="22" ry="16" fill="#FF2D78"
        style={{ animationName: "ff-tongue", animationDuration: "0.6s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", transformOrigin: "110px 255px" }} />

      {/* fuzzy bumps on body edge */}
      {[
        [15, 200], [12, 240], [20, 275], [50, 308], [90, 318],
        [130, 316], [170, 308], [200, 278], [208, 240], [204, 200],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="9" fill="#B8FF50" stroke="#4A9000" strokeWidth="2" />
      ))}

      {/* hot pink blush on cheeks */}
      <ellipse cx="52" cy="205" rx="22" ry="12" fill="#FF69B4" opacity="0.45" />
      <ellipse cx="168" cy="205" rx="22" ry="12" fill="#FF69B4" opacity="0.45" />
    </svg>
  </div>
);

/* ─── Tomato overlay (attempts 1–2) ──────────────────────────────────── */
const TomatoOverlay = ({
  big, phase, msg, fromLeft,
}: {
  big: boolean; phase: Phase; msg: [string, string]; fromLeft: boolean;
}) => {
  const leaving = phase === "out";
  const inFlight = phase === "fly";
  const showSplat = phase === "impact" || phase === "hold" || phase === "out";

  return (
    <div className="fixed inset-0 z-[9000] pointer-events-none overflow-hidden">
      {/* red screen flash on impact */}
      {phase === "impact" && (
        <div style={{
          position: "absolute", inset: 0,
          background: "#E60A08",
          animationName: "ff-flash",
          animationDuration: "0.18s",
          animationFillMode: "forwards",
        }} />
      )}

      {/* splat (appears on impact, stays) */}
      {showSplat && (
        <div style={{
          position: "absolute", inset: 0,
          opacity: leaving ? 0 : 1,
          transition: "opacity 0.45s ease",
        }}>
          <div style={{
            position: "absolute",
            top: big ? "10%" : "18%",
            left: "50%",
            transform: "translateX(-50%)",
            width: big ? "90vw" : "72vw",
            maxWidth: big ? "520px" : "380px",
            aspectRatio: "1.15",
            animationName: "ff-splat",
            animationDuration: "0.35s",
            animationFillMode: "both",
          }}>
            <SplatSvg big={big} />
          </div>
          {/* drip lines from bottom of splat */}
          <div style={{ position: "absolute", top: big ? "62%" : "64%", left: 0, right: 0, height: "38%" }}>
            <Drips big={big} />
          </div>
        </div>
      )}

      {/* tomato missile */}
      <div style={{
        position: "absolute",
        top: big ? "16%" : "22%",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        justifyContent: "center",
        animationName: fromLeft ? "ff-fly-left" : "ff-fly-right",
        animationDuration: "0.42s",
        animationTimingFunction: "cubic-bezier(0.2, 0.8, 0.3, 1.3)",
        animationFillMode: "both",
        opacity: leaving ? 0 : 1,
        transition: leaving ? "opacity 0.4s ease" : undefined,
      }}>
        <TomatoSvg big={big} />
      </div>

      {/* message bubble */}
      {showSplat && (
        <div style={{
          position: "absolute",
          bottom: "10%",
          left: "50%",
          transform: "translate(-50%, 0)",
          animationName: "ff-msg",
          animationDuration: "0.45s",
          animationTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
          animationDelay: "0.15s",
          animationFillMode: "both",
          opacity: leaving ? 0 : 1,
          transition: leaving ? "opacity 0.35s ease" : undefined,
          textAlign: "center",
          whiteSpace: "nowrap",
        }} dir="rtl">
          <div style={{
            background: "#CC0000",
            color: "white",
            borderRadius: 24,
            padding: "12px 28px",
            boxShadow: "0 8px 32px rgba(200,0,0,0.5)",
            border: "3px solid #FF4422",
          }}>
            <p style={{ fontSize: "clamp(17px,4vw,22px)", fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{msg[0]}</p>
            <p style={{ fontSize: "clamp(11px,3vw,14px)", margin: "4px 0 0", opacity: 0.9, fontWeight: 600 }}>{msg[1]}</p>
          </div>
          {/* bubble tail */}
          <div style={{
            width: 0, height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "14px solid #CC0000",
            margin: "0 auto",
          }} />
        </div>
      )}
    </div>
  );
};

/* ─── Monster overlay (attempt 3+) ───────────────────────────────────── */
const MonsterOverlay = ({
  phase, msg,
}: {
  phase: Phase; msg: [string, string];
}) => {
  const leaving = phase === "out";
  const shaking = phase === "fly" || phase === "impact";
  const showBubble = phase === "hold" || phase === "out";

  return (
    <div
      className="fixed inset-0 z-[9000] pointer-events-none overflow-hidden"
      style={{
        animationName: shaking ? "ff-shake" : undefined,
        animationDuration: "0.55s",
        animationIterationCount: "2",
        animationTimingFunction: "ease-in-out",
      }}
    >
      {/* dark vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 100%)",
        opacity: leaving ? 0 : 1,
        transition: "opacity 0.5s ease",
      }} />

      {/* monster — rises from bottom center */}
      <div style={{
        position: "absolute",
        bottom: "-10px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        opacity: leaving ? 0 : 1,
        transition: leaving ? "opacity 0.4s ease" : undefined,
      }}>
        {/* speech bubble (appears after rise) */}
        {showBubble && (
          <div style={{
            animationName: "ff-bubble",
            animationDuration: "0.4s",
            animationTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
            animationFillMode: "both",
            background: "white",
            borderRadius: 20,
            padding: "10px 22px",
            boxShadow: "0 6px 28px rgba(0,0,0,0.25)",
            border: "2px solid #e5e5e5",
            position: "relative",
            textAlign: "center",
            marginBottom: 4,
          }} dir="rtl">
            <p style={{ fontSize: "clamp(15px,4vw,20px)", fontWeight: 800, margin: 0, color: "#111", lineHeight: 1.2 }}>{msg[0]}</p>
            <p style={{ fontSize: "clamp(11px,3vw,13px)", margin: "3px 0 0", color: "#555", fontWeight: 600 }}>{msg[1]}</p>
            {/* tail pointing down */}
            <div style={{
              position: "absolute", bottom: -12, left: "50%", transform: "translateX(-50%)",
              width: 0, height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "13px solid white",
            }} />
          </div>
        )}

        <MonsterSvg dropping={leaving} />
      </div>
    </div>
  );
};

/* ─── Main component ─────────────────────────────────────────────────── */
const FailureFeedback = ({ visible, onDone, attemptCount = 1 }: Props) => {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [mode]     = useState<FailureMode>(() => chooseMode(attemptCount));
  const [msg]      = useState<[string, string]>(() => pick(MSGS[chooseMode(attemptCount)]));
  const [fromLeft] = useState(() => attemptCount % 2 === 0);

  useEffect(() => {
    if (!visible) { setPhase("hidden"); return; }
    const dur = DURATIONS[mode];
    setPhase("fly");
    const t1 = setTimeout(() => setPhase("impact"), 380);
    const t2 = setTimeout(() => setPhase("hold"),   620);
    const t3 = setTimeout(() => setPhase("out"),    dur - 420);
    const t4 = setTimeout(() => { setPhase("hidden"); onDone?.(); }, dur);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [visible, mode]);

  if (phase === "hidden") return null;

  return (
    <>
      <style>{ANIM_CSS}</style>
      {mode !== "monster" ? (
        <TomatoOverlay big={mode === "tomato-lg"} phase={phase} msg={msg} fromLeft={fromLeft} />
      ) : (
        <MonsterOverlay phase={phase} msg={msg} />
      )}
    </>
  );
};

export default FailureFeedback;
