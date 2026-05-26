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
  /* Tomato zooms straight toward the viewer (perspective effect) */
  @keyframes ff-tomato-at-you {
    0%   { transform: scale(0.04) translateY(10px); opacity: 1; filter: blur(3px); }
    30%  { filter: blur(0); }
    68%  { transform: scale(1.45) translateY(-4px); opacity: 1; }
    78%  { transform: scale(1.22) scaleY(0.72) translateY(4px); }  /* squish on glass */
    88%  { transform: scale(1.08) scaleY(0.88); }
    100% { transform: scale(1.05) scaleY(0.9); opacity: 0; }
  }
  /* Smear blob expands from the impact point */
  @keyframes ff-smear {
    0%   { transform: scale(0); opacity: 0; }
    40%  { transform: scale(1.14) rotate(2deg); opacity: 0.92; }
    70%  { transform: scale(0.97) rotate(-0.5deg); opacity: 0.9; }
    100% { transform: scale(1) rotate(0deg); opacity: 0.88; }
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

/* ─── Smear SVG — tomato pressed & dragged on glass ─────────────────── */
const SmearSvg = ({ big }: { big: boolean }) => (
  <svg viewBox="0 0 300 260" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
    <defs>
      <radialGradient id="smear-core" cx="50%" cy="45%" r="55%">
        <stop offset="0%"   stopColor="#FF1A08" stopOpacity="0.97" />
        <stop offset="60%"  stopColor="#CC0600" stopOpacity="0.88" />
        <stop offset="100%" stopColor="#8B0000" stopOpacity="0.5" />
      </radialGradient>
      <radialGradient id="smear-juice" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stopColor="#FF3318" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#FF1A08" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* outer juice spray — thin, wide, translucent */}
    <ellipse cx="150" cy="125" rx={big ? 148 : 128} ry={big ? 118 : 100} fill="url(#smear-juice)" />

    {/* main smear body — irregular, wider than tall, like pressed on glass */}
    <path
      d="M150,18 C188,12 238,28 252,72 C266,116 258,155 230,178
         C210,194 182,204 150,206 C118,208 82,200 58,182
         C28,160 24,124 32,84 C40,48 72,20 110,16 C124,14 138,18 150,18Z"
      fill="url(#smear-core)"
    />

    {/* smear streaks — the "dragged" part, going outward radially */}
    {[
      { d: "M150,16 C146,6 144,-6 148,-18 C152,-6 154,6 150,16Z",       o: 0.7 },
      { d: "M248,74 C258,62 272,54 282,46 C272,58 260,68 248,74Z",       o: 0.65 },
      { d: "M254,148 C266,152 280,148 290,140 C278,150 264,156 254,148Z", o: 0.62 },
      { d: "M186,206 C190,218 186,230 180,240 C178,228 180,216 186,206Z", o: 0.65 },
      { d: "M106,208 C102,220 106,234 112,244 C110,230 108,218 106,208Z", o: 0.63 },
      { d: "M40,172 C28,178 14,174 4,166 C16,174 30,178 40,172Z",         o: 0.65 },
      { d: "M30,86 C18,76 8,62 2,48 C12,64 22,78 30,86Z",                o: 0.62 },
      { d: "M102,16 C96,4 98,-10 104,-22 C102,-8 100,4 102,16Z",         o: 0.6 },
    ].map((r, i) => (
      <path key={i} d={r.d} fill="#FF2010" opacity={r.o} />
    ))}

    {/* juice drops — irregular, scattered */}
    {[
      [28, 36, 11, 7, -20], [272, 42, 10, 6, 15],  [288, 118, 12, 7, 8],
      [268, 188, 10, 6, -12], [108, 246, 11, 6, 5], [192, 248, 9, 6, -8],
      [14, 150, 10, 6, 10],  [62, 30, 8, 5, 25],
    ].map(([cx, cy, rx, ry, rot], i) => (
      <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry}
        fill="#FF2010" opacity={0.68 - i * 0.04}
        transform={`rotate(${rot} ${cx} ${cy})`} />
    ))}

    {/* seeds scattered in the smear */}
    {[
      [126, 88, -25], [162, 72, 18], [188, 110, -10],
      [112, 140, 30], [170, 152, -15], [140, 120, 5],
    ].map(([cx, cy, rot], i) => (
      <ellipse key={i} cx={cx} cy={cy} rx="9" ry="5"
        fill="#FFDC8A" opacity="0.75"
        transform={`rotate(${rot} ${cx} ${cy})`} />
    ))}

    {/* highlight smear — the "juice gloss" */}
    <ellipse cx="128" cy="80" rx="32" ry="16" fill="rgba(255,255,255,0.22)" transform="rotate(-18 128 80)" />
    <ellipse cx="118" cy="72" rx="14" ry="7"  fill="rgba(255,255,255,0.15)" transform="rotate(-18 118 72)" />
  </svg>
);

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
// The tomato flies TOWARD the viewer — scales from tiny dot to full screen,
// squishes on impact (like pressed on glass), fades revealing the smear.
const TomatoOverlay = ({
  big, phase, msg,
}: {
  big: boolean; phase: Phase; msg: [string, string];
}) => {
  const leaving    = phase === "out";
  const showSmear  = phase === "impact" || phase === "hold" || phase === "out";
  const tomatoGone = phase === "hold" || phase === "out"; // tomato faded, smear stays

  // Smear covers most of the screen — bigger on attempt 2
  const smearW = big ? "100vw" : "84vw";
  const smearMax = big ? "620px" : "480px";

  return (
    <div className="fixed inset-0 z-[9000] pointer-events-none overflow-hidden">

      {/* ── Smear on glass (appears at impact, stays) ── */}
      {showSmear && (
        <div style={{
          position: "absolute", inset: 0,
          opacity: leaving ? 0 : 1,
          transition: "opacity 0.5s ease",
        }}>
          {/* smear blob — centered, fills most of screen */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -52%)",
            width: smearW,
            maxWidth: smearMax,
            aspectRatio: "1.18",
            animationName: "ff-smear",
            animationDuration: "0.38s",
            animationTimingFunction: "cubic-bezier(0.2, 0.8, 0.3, 1)",
            animationFillMode: "both",
          }}>
            <SmearSvg big={big} />
          </div>

          {/* drip lines fall from the bottom of the smear */}
          <div style={{ position: "absolute", top: "56%", left: 0, right: 0, height: "44%" }}>
            <Drips big={big} />
          </div>
        </div>
      )}

      {/* ── Tomato zooming toward you ── */}
      {!tomatoGone && (
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -52%)",
          display: "flex",
          justifyContent: "center",
          /* tiny → fills screen → squishes → fades */
          animationName: "ff-tomato-at-you",
          animationDuration: "0.52s",
          animationTimingFunction: "cubic-bezier(0.15, 0.5, 0.35, 1.1)",
          animationFillMode: "both",
        }}>
          <TomatoSvg big={big} />
        </div>
      )}

      {/* ── Message bubble ── */}
      {showSmear && (
        <div style={{
          position: "absolute",
          bottom: "8%",
          left: "50%",
          animationName: "ff-msg",
          animationDuration: "0.45s",
          animationTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
          animationDelay: "0.12s",
          animationFillMode: "both",
          opacity: leaving ? 0 : 1,
          transition: leaving ? "opacity 0.35s ease" : undefined,
          textAlign: "center",
          whiteSpace: "nowrap",
        }} dir="rtl">
          <div style={{
            background: "linear-gradient(135deg, #CC0000 0%, #9B0000 100%)",
            color: "white",
            borderRadius: 24,
            padding: "12px 28px",
            boxShadow: "0 8px 32px rgba(160,0,0,0.55), inset 0 1px 0 rgba(255,80,60,0.3)",
            border: "2px solid rgba(255,80,60,0.35)",
          }}>
            <p style={{ fontSize: "clamp(17px,4vw,22px)", fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{msg[0]}</p>
            <p style={{ fontSize: "clamp(11px,3vw,14px)", margin: "4px 0 0", opacity: 0.88, fontWeight: 600 }}>{msg[1]}</p>
          </div>
          <div style={{
            width: 0, height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "13px solid #9B0000",
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
        <TomatoOverlay big={mode === "tomato-lg"} phase={phase} msg={msg} />
      ) : (
        <MonsterOverlay phase={phase} msg={msg} />
      )}
    </>
  );
};

export default FailureFeedback;
