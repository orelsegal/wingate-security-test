/**
 * FailureFeedback — Three distinct monster personalities for wrong answers.
 *
 * attempt 1 → "Peeker"  — giant shocked face slides from the right (violet)
 * attempt 2 → "Crasher" — full body crashes up from below, winks (hot pink)
 * attempt 3+ → "Chaos"  — arms from both sides + body + screen shake (lime)
 *
 * Pure CSS animations, pointer-events: none.
 */

import { useEffect, useState } from "react";

export type FailureMode = "peeker" | "crasher" | "chaos";
type Phase = "hidden" | "in" | "hold" | "out";

interface Props {
  visible: boolean;
  onDone?: () => void;
  attemptCount?: number;
}

const chooseMode = (n: number): FailureMode =>
  n >= 3 ? "chaos" : n === 2 ? "crasher" : "peeker";

const MSGS: Record<FailureMode, [string, string][]> = {
  peeker:  [["אופס! 😮", "לא זה — נסה שוב!"], ["מה?! 😲", "כמעט — עוד פעם!"], ["היי! 👀", "טעות — נסה שוב!"]],
  crasher: [["שוב?! 😜", "אני כבר פה — נסה!"], ["הופ! 🫠", "תתרכז — אתה יכול!"], ["עוד?! 😏", "קרא שוב ונסה!"]],
  chaos:   [["וואוואוו!! 🤯", "שלוש?! קרא שוב!"], ["TRIPLE!! 🦖", "עיין בהסבר למעלה!"], ["WOW! 😱", "כל כך קרוב — נסה!"]],
};

const DURATIONS: Record<FailureMode, number> = { peeker: 2500, crasher: 2800, chaos: 3200 };

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/* ─── Shared keyframes ──────────────────────────────────────────────── */
const CSS = `
  /* PEEKER — face slides from right */
  @keyframes pk-in {
    0%   { transform: translateX(110%); }
    60%  { transform: translateX(-18px); }
    75%  { transform: translateX(10px); }
    88%  { transform: translateX(-5px); }
    100% { transform: translateX(0); }
  }
  @keyframes pk-out {
    0%   { transform: translateX(0); }
    30%  { transform: translateX(-20px); }
    100% { transform: translateX(115%); }
  }
  @keyframes pk-brow {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-6px); }
  }
  @keyframes pk-pupil {
    0%,100% { transform: translate(0,0); }
    25%     { transform: translate(4px,-4px); }
    75%     { transform: translate(-4px,4px); }
  }

  /* CRASHER — body slams up from bottom */
  @keyframes cr-in {
    0%   { transform: translateY(110%) rotate(-4deg); }
    55%  { transform: translateY(-38px) rotate(3deg); }
    70%  { transform: translateY(16px) rotate(-2deg); }
    83%  { transform: translateY(-8px) rotate(1deg); }
    92%  { transform: translateY(4px); }
    100% { transform: translateY(0) rotate(0deg); }
  }
  @keyframes cr-out {
    0%   { transform: translateY(0) rotate(0deg); }
    25%  { transform: translateY(-28px) rotate(-6deg); }
    100% { transform: translateY(115%) rotate(10deg); }
  }
  @keyframes cr-arm-l {
    0%,100% { transform: rotate(-20deg) translateY(0); }
    50%     { transform: rotate(-65deg) translateY(-12px); }
  }
  @keyframes cr-arm-r {
    0%,100% { transform: rotate(20deg) translateY(0); }
    50%     { transform: rotate(62deg) translateY(-12px); }
  }
  @keyframes cr-tongue {
    0%,100% { transform: scaleY(1) translateY(0); }
    50%     { transform: scaleY(1.4) translateY(6px); }
  }
  @keyframes cr-bob {
    0%,100% { transform: scaleX(1) scaleY(1); }
    50%     { transform: scaleX(1.07) scaleY(0.93); }
  }
  @keyframes cr-wink {
    0%,80%,100% { transform: scaleY(1); }
    88%         { transform: scaleY(0.08); }
  }

  /* CHAOS — shake + arms from sides + body up */
  @keyframes ch-shake {
    0%,100% { transform: translate(0,0) rotate(0deg); }
    8%  { transform: translate(-10px, 6px) rotate(-0.6deg); }
    16% { transform: translate(10px,-7px) rotate(0.6deg); }
    24% { transform: translate(-9px, 8px) rotate(-0.5deg); }
    32% { transform: translate(9px,-6px) rotate(0.5deg); }
    40% { transform: translate(-6px, 6px) rotate(-0.3deg); }
    48% { transform: translate(6px,-5px) rotate(0.3deg); }
    56% { transform: translate(-3px, 3px); }
    64% { transform: translate(3px,-3px); }
    72% { transform: translate(-2px, 2px); }
    80% { transform: translate(2px,-2px); }
    90% { transform: translate(-1px, 1px); }
  }
  @keyframes ch-body-in {
    0%   { transform: translateY(105%); }
    52%  { transform: translateY(-32px); }
    68%  { transform: translateY(14px); }
    82%  { transform: translateY(-8px); }
    92%  { transform: translateY(3px); }
    100% { transform: translateY(0); }
  }
  @keyframes ch-body-out {
    0%   { transform: translateY(0) rotate(0deg); }
    22%  { transform: translateY(-24px) rotate(-4deg); }
    100% { transform: translateY(115%) rotate(7deg); }
  }
  @keyframes ch-arm-l {
    0%   { transform: translateX(-110vw) rotate(20deg); }
    60%  { transform: translateX(0) rotate(-12deg); }
    75%  { transform: translateX(8px) rotate(-8deg); }
    100% { transform: translateX(0) rotate(-10deg); }
  }
  @keyframes ch-arm-r {
    0%   { transform: translateX(110vw) rotate(-20deg); }
    60%  { transform: translateX(0) rotate(12deg); }
    75%  { transform: translateX(-8px) rotate(8deg); }
    100% { transform: translateX(0) rotate(10deg); }
  }
  @keyframes ch-arm-wave-l {
    0%,100% { transform: translateX(0) rotate(-10deg) translateY(0); }
    50%     { transform: translateX(0) rotate(-35deg) translateY(-14px); }
  }
  @keyframes ch-arm-wave-r {
    0%,100% { transform: translateX(0) rotate(10deg) translateY(0); }
    50%     { transform: translateX(0) rotate(33deg) translateY(-14px); }
  }
  @keyframes ch-eye-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes ch-bob {
    0%,100% { transform: scaleX(1) scaleY(1); }
    50%     { transform: scaleX(1.08) scaleY(0.93); }
  }

  /* shared bubble pop */
  @keyframes ff-bubble {
    0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
    55%  { transform: scale(1.1) rotate(2deg);  opacity: 1; }
    100% { transform: scale(1) rotate(0deg);    opacity: 1; }
  }
`;

/* ─── Speech bubble ─────────────────────────────────────────────────── */
const Bubble = ({ msg, bg, leaving }: { msg: [string, string]; bg: string; leaving: boolean }) => (
  <div style={{
    animationName: "ff-bubble",
    animationDuration: "0.38s",
    animationTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
    animationFillMode: "both",
    animationDelay: "0.1s",
    opacity: leaving ? 0 : 1,
    transition: leaving ? "opacity 0.2s ease" : undefined,
    background: "white",
    borderRadius: 20,
    padding: "10px 22px",
    boxShadow: "0 6px 28px rgba(0,0,0,0.22)",
    border: `2.5px solid ${bg}`,
    textAlign: "center",
    position: "relative",
    whiteSpace: "nowrap",
    marginBottom: 6,
  }} dir="rtl">
    <p style={{ fontSize: "clamp(15px,4vw,21px)", fontWeight: 900, margin: 0, color: bg, lineHeight: 1.2 }}>{msg[0]}</p>
    <p style={{ fontSize: "clamp(11px,3vw,13px)", margin: "3px 0 0", color: "#555", fontWeight: 600 }}>{msg[1]}</p>
    <div style={{
      position: "absolute", bottom: -12, left: "50%", transform: "translateX(-50%)",
      width: 0, height: 0,
      borderLeft: "10px solid transparent", borderRight: "10px solid transparent",
      borderTop: `13px solid white`,
    }} />
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   MONSTER 1 — PEEKER
   Giant surprised face slides in from the right
   ══════════════════════════════════════════════════════════════════════ */
const PeekerMonster = ({ phase, msg }: { phase: Phase; msg: [string, string] }) => {
  const leaving = phase === "out";
  const showBubble = phase === "hold" || phase === "out";

  return (
    <div className="fixed inset-0 z-[9000] pointer-events-none overflow-hidden"
      style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>

      {/* face + bubble wrapper */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        paddingRight: "clamp(8px, 3vw, 24px)",
        animationName: leaving ? "pk-out" : "pk-in",
        animationDuration: leaving ? "0.4s" : "0.55s",
        animationTimingFunction: leaving ? "cubic-bezier(0.4,0,1,1)" : "cubic-bezier(0.2,0.8,0.3,1.3)",
        animationFillMode: "both",
      }}>
        {showBubble && <Bubble msg={msg} bg="#7C3AED" leaving={leaving} />}

        {/* Giant face — SVG */}
        <svg viewBox="0 0 200 200"
          style={{ width: "min(52vw, 300px)", display: "block", filter: "drop-shadow(-8px 8px 24px rgba(124,58,237,0.45))" }}>

          {/* face circle */}
          <circle cx="100" cy="100" r="96" fill="#7C3AED" stroke="#5B21B6" strokeWidth="4" />
          <circle cx="100" cy="100" r="96" fill="url(#pk-grad)" />

          {/* horns */}
          <path d="M55,12 L42,−18 L68,8"  fill="#7C3AED" stroke="#5B21B6" strokeWidth="3" />
          <path d="M145,12 L158,−18 L132,8" fill="#7C3AED" stroke="#5B21B6" strokeWidth="3" />

          {/* raised eyebrows — shocked */}
          <path d="M52,62 Q72,48 88,58" stroke="#5B21B6" strokeWidth="5" strokeLinecap="round" fill="none"
            style={{ animationName: "pk-brow", animationDuration: "0.6s", animationIterationCount: "infinite", transformOrigin: "70px 55px" }} />
          <path d="M112,58 Q128,48 148,62" stroke="#5B21B6" strokeWidth="5" strokeLinecap="round" fill="none"
            style={{ animationName: "pk-brow", animationDuration: "0.6s", animationIterationCount: "infinite", animationDelay: "0.15s", transformOrigin: "130px 55px" }} />

          {/* left eye */}
          <circle cx="72" cy="90" r="26" fill="white" stroke="#1a1a1a" strokeWidth="2.5" />
          <circle cx="82" cy="84" r="13" fill="#1a1a1a"
            style={{ animationName: "pk-pupil", animationDuration: "1.4s", animationIterationCount: "infinite", transformOrigin: "72px 90px" }} />
          <circle cx="84" cy="79" r="5" fill="white" />

          {/* right eye */}
          <circle cx="128" cy="90" r="26" fill="white" stroke="#1a1a1a" strokeWidth="2.5" />
          <circle cx="138" cy="84" r="13" fill="#1a1a1a"
            style={{ animationName: "pk-pupil", animationDuration: "1.4s", animationIterationCount: "infinite", animationDelay: "0.2s", transformOrigin: "128px 90px" }} />
          <circle cx="140" cy="79" r="5" fill="white" />

          {/* shocked "O" mouth */}
          <ellipse cx="100" cy="148" rx="22" ry="26" fill="#1a1a1a" />
          <ellipse cx="100" cy="148" rx="15" ry="18" fill="#FF3D6B" />

          {/* blush */}
          <ellipse cx="52" cy="115" rx="18" ry="11" fill="#FF69B4" opacity="0.4" />
          <ellipse cx="148" cy="115" rx="18" ry="11" fill="#FF69B4" opacity="0.4" />

          {/* gloss */}
          <ellipse cx="76" cy="68" rx="22" ry="12" fill="rgba(255,255,255,0.2)" transform="rotate(-20 76 68)" />

          <defs>
            <radialGradient id="pk-grad" cx="38%" cy="32%" r="70%">
              <stop offset="0%" stopColor="#9F67FF" stopOpacity="0" />
              <stop offset="100%" stopColor="#4C0FCC" stopOpacity="0.5" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   MONSTER 2 — CRASHER
   Full body slams up, winks, tongue out, hot pink
   ══════════════════════════════════════════════════════════════════════ */
const CrasherMonster = ({ phase, msg }: { phase: Phase; msg: [string, string] }) => {
  const leaving = phase === "out";
  const showBubble = phase === "hold" || phase === "out";

  return (
    <div className="fixed inset-0 z-[9000] pointer-events-none overflow-hidden flex items-end justify-center">
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        animationName: leaving ? "cr-out" : "cr-in",
        animationDuration: leaving ? "0.5s" : "0.65s",
        animationTimingFunction: leaving ? "cubic-bezier(0.4,0,1,1)" : "cubic-bezier(0.15,0.7,0.3,1.4)",
        animationFillMode: "both",
      }}>
        {showBubble && <Bubble msg={msg} bg="#FF006E" leaving={leaving} />}

        <svg viewBox="0 0 220 310"
          style={{ width: "min(66vw, 360px)", display: "block", filter: "drop-shadow(0 -12px 32px rgba(255,0,110,0.5))", overflow: "visible" }}>

          {/* arms */}
          <rect x="-8" y="150" width="34" height="80" rx="17" fill="#FF006E" stroke="#C0005A" strokeWidth="3.5"
            style={{ transformOrigin: "9px 150px", animationName: "cr-arm-l", animationDuration: "0.5s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }} />
          <rect x="194" y="150" width="34" height="80" rx="17" fill="#FF006E" stroke="#C0005A" strokeWidth="3.5"
            style={{ transformOrigin: "211px 150px", animationName: "cr-arm-r", animationDuration: "0.5s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", animationDelay: "0.25s" }} />

          {/* body */}
          <ellipse cx="110" cy="210" rx="96" ry="108" fill="#FF006E" stroke="#C0005A" strokeWidth="4"
            style={{ animationName: "cr-bob", animationDuration: "0.5s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }} />

          {/* spikes */}
          {["M52,100 L36,42 L63,96", "M82,86 L74,22 L100,82", "M118,82 L122,18 L142,80", "M150,96 L164,40 L172,94"].map((d,i) => (
            <path key={i} d={d} fill="#FF006E" stroke="#C0005A" strokeWidth="2.5" />
          ))}

          {/* left eye — normal */}
          <circle cx="70" cy="170" r="30" fill="white" stroke="#1a1a1a" strokeWidth="2.5" />
          <circle cx="78" cy="163" r="14" fill="#1a1a1a" />
          <circle cx="82" cy="157" r="6" fill="white" />

          {/* right eye — winking */}
          <circle cx="150" cy="170" r="30" fill="white" stroke="#1a1a1a" strokeWidth="2.5"
            style={{ animationName: "cr-wink", animationDuration: "2.2s", animationIterationCount: "infinite", transformOrigin: "150px 170px" }} />
          <circle cx="158" cy="163" r="14" fill="#1a1a1a"
            style={{ animationName: "cr-wink", animationDuration: "2.2s", animationIterationCount: "infinite", transformOrigin: "150px 170px" }} />
          <circle cx="162" cy="157" r="6" fill="white"
            style={{ animationName: "cr-wink", animationDuration: "2.2s", animationIterationCount: "infinite", transformOrigin: "150px 170px" }} />

          {/* mischievous smirk */}
          <path d="M55 220 Q90 258 140 242 Q160 236 168 220" fill="#1a1a1a" stroke="#1a1a1a" strokeWidth="2" />
          {/* tongue out */}
          <ellipse cx="108" cy="258" rx="20" ry="28" fill="#FF2D78"
            style={{ animationName: "cr-tongue", animationDuration: "0.55s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", transformOrigin: "108px 242px" }} />
          <ellipse cx="108" cy="268" rx="12" ry="8" fill="#E0005A" />

          {/* blush */}
          <ellipse cx="50"  cy="208" rx="20" ry="12" fill="#FFB3D1" opacity="0.5" />
          <ellipse cx="170" cy="208" rx="20" ry="12" fill="#FFB3D1" opacity="0.5" />

          {/* belly shine */}
          <ellipse cx="110" cy="210" rx="42" ry="36" fill="rgba(255,180,220,0.25)" />

          {/* fuzzy bumps */}
          {[[16,192],[12,232],[20,268],[50,302],[90,312],[130,310],[170,302],[200,268],[208,232],[204,192]].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r={9} fill="#FF3D8A" stroke="#C0005A" strokeWidth="2" />
          ))}
        </svg>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   MONSTER 3 — CHAOS
   Hands from both sides + body rising + screen shake, lime green
   ══════════════════════════════════════════════════════════════════════ */
const ChaosMonster = ({ phase, msg }: { phase: Phase; msg: [string, string] }) => {
  const entering = phase === "in";
  const leaving  = phase === "out";
  const showBody = phase === "hold" || phase === "out";
  const showBubble = showBody;

  return (
    <div
      className="fixed inset-0 z-[9000] pointer-events-none overflow-hidden"
      style={{
        animationName: entering ? "ch-shake" : undefined,
        animationDuration: "0.6s",
        animationIterationCount: "2",
        animationTimingFunction: "ease-in-out",
      }}
    >
      {/* dark vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,0.6) 100%)",
        opacity: leaving ? 0 : 1, transition: "opacity 0.5s",
      }} />

      {/* left arm crashing in from left */}
      <div style={{
        position: "absolute", left: 0, bottom: "18%",
        animationName: leaving ? undefined : (entering ? "ch-arm-l" : "ch-arm-wave-l"),
        animationDuration: entering ? "0.55s" : "0.5s",
        animationTimingFunction: entering ? "cubic-bezier(0.2,0.8,0.3,1.3)" : "ease-in-out",
        animationFillMode: "both",
        animationIterationCount: entering ? 1 : "infinite",
        opacity: leaving ? 0 : 1, transition: leaving ? "opacity 0.3s" : undefined,
      }}>
        <svg viewBox="0 0 120 80" style={{ width: "min(36vw,200px)", display: "block" }}>
          <rect x="0" y="10" width="110" height="60" rx="30" fill="#A8FF3E" stroke="#4A9000" strokeWidth="4" />
          <circle cx="102" cy="40" r="28" fill="#A8FF3E" stroke="#4A9000" strokeWidth="4" />
          {/* knuckles */}
          {[78,90,102].map((x,i) => <circle key={i} cx={x} cy={24} r={7} fill="#B8FF50" stroke="#4A9000" strokeWidth="2" />)}
        </svg>
      </div>

      {/* right arm crashing in from right */}
      <div style={{
        position: "absolute", right: 0, bottom: "18%",
        animationName: leaving ? undefined : (entering ? "ch-arm-r" : "ch-arm-wave-r"),
        animationDuration: entering ? "0.55s" : "0.5s",
        animationTimingFunction: entering ? "cubic-bezier(0.2,0.8,0.3,1.3)" : "ease-in-out",
        animationFillMode: "both",
        animationIterationCount: entering ? 1 : "infinite",
        opacity: leaving ? 0 : 1, transition: leaving ? "opacity 0.3s" : undefined,
      }}>
        <svg viewBox="0 0 120 80" style={{ width: "min(36vw,200px)", transform: "scaleX(-1)", display: "block" }}>
          <rect x="0" y="10" width="110" height="60" rx="30" fill="#A8FF3E" stroke="#4A9000" strokeWidth="4" />
          <circle cx="102" cy="40" r="28" fill="#A8FF3E" stroke="#4A9000" strokeWidth="4" />
          {[78,90,102].map((x,i) => <circle key={i} cx={x} cy={24} r={7} fill="#B8FF50" stroke="#4A9000" strokeWidth="2" />)}
        </svg>
      </div>

      {/* body + bubble centered at bottom */}
      <div style={{
        position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        opacity: leaving ? 0 : 1, transition: leaving ? "opacity 0.4s" : undefined,
      }}>
        {showBubble && <Bubble msg={msg} bg="#4A9000" leaving={leaving} />}

        <svg viewBox="0 0 220 260"
          style={{
            width: "min(80vw,440px)", display: "block", overflow: "visible",
            filter: "drop-shadow(0 -16px 40px rgba(100,200,0,0.55))",
            animationName: leaving ? "ch-body-out" : "ch-body-in",
            animationDuration: leaving ? "0.55s" : "0.7s",
            animationTimingFunction: leaving ? "cubic-bezier(0.4,0,1,1)" : "cubic-bezier(0.2,0.8,0.3,1.2)",
            animationFillMode: "both",
          }}>

          {/* body */}
          <ellipse cx="110" cy="178" rx="96" ry="96" fill="#A8FF3E" stroke="#4A9000" strokeWidth="4"
            style={{ animationName: "ch-bob", animationDuration: "0.45s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" }} />

          {/* spikes */}
          {["M52,88 L36,30 L64,84","M82,72 L76,8 L102,68","M118,68 L122,4 L142,66","M152,82 L166,26 L174,80"].map((d,i) => (
            <path key={i} d={d} fill="#A8FF3E" stroke="#4A9000" strokeWidth="2.5" />
          ))}

          {/* spinning spiral eyes */}
          {[70, 150].map((cx, ei) => (
            <g key={ei}>
              <circle cx={cx} cy={130} r="30" fill="white" stroke="#1a1a1a" strokeWidth="2.5" />
              {/* spiral rings */}
              {[22, 15, 8].map((r, ri) => (
                <circle key={ri} cx={cx} cy={130} r={r} fill="none"
                  stroke={ri === 0 ? "#FF006E" : ri === 1 ? "#7C3AED" : "#FF9500"}
                  strokeWidth="4" strokeDasharray={`${r * 2} ${r * 1.5}`}
                  style={{
                    animationName: "ch-eye-spin",
                    animationDuration: `${0.7 + ri * 0.15}s`,
                    animationTimingFunction: "linear",
                    animationIterationCount: "infinite",
                    animationDirection: ei === 0 ? "normal" : "reverse",
                    transformOrigin: `${cx}px 130px`,
                  }} />
              ))}
              <circle cx={cx} cy={130} r={4} fill="#1a1a1a" />
            </g>
          ))}

          {/* huge screaming mouth */}
          <ellipse cx="110" cy="200" rx="52" ry="40" fill="#1a1a1a" />
          <ellipse cx="110" cy="200" rx="42" ry="30" fill="#FF006E" />
          <ellipse cx="110" cy="210" rx="28" ry="16" fill="#CC0055" />
          {/* teeth top row */}
          {[72,90,108,126,144].map((x,i) => (
            <rect key={i} x={x} y="182" width="14" height="18" rx="4" fill="white" />
          ))}

          {/* blush */}
          <ellipse cx="48"  cy="168" rx="20" ry="13" fill="#FF69B4" opacity="0.5" />
          <ellipse cx="172" cy="168" rx="20" ry="13" fill="#FF69B4" opacity="0.5" />

          {/* bumps */}
          {[[14,164],[10,200],[18,234],[46,256],[86,264],[134,262],[174,256],[202,234],[210,200],[206,164]].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r={9} fill="#B8FF50" stroke="#4A9000" strokeWidth="2" />
          ))}
        </svg>
      </div>
    </div>
  );
};

/* ─── Main component ─────────────────────────────────────────────────── */
const FailureFeedback = ({ visible, onDone, attemptCount = 1 }: Props) => {
  const [phase, setPhase]  = useState<Phase>("hidden");
  const [mode]             = useState<FailureMode>(() => chooseMode(attemptCount));
  const [msg]              = useState<[string, string]>(() => pick(MSGS[chooseMode(attemptCount)]));

  useEffect(() => {
    if (!visible) { setPhase("hidden"); return; }
    const dur = DURATIONS[mode];
    setPhase("in");
    const t1 = setTimeout(() => setPhase("hold"), mode === "chaos" ? 700 : 550);
    const t2 = setTimeout(() => setPhase("out"),  dur - 450);
    const t3 = setTimeout(() => { setPhase("hidden"); onDone?.(); }, dur);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [visible, mode]);

  if (phase === "hidden") return null;

  return (
    <>
      <style>{CSS}</style>
      {mode === "peeker"  && <PeekerMonster  phase={phase} msg={msg} />}
      {mode === "crasher" && <CrasherMonster phase={phase} msg={msg} />}
      {mode === "chaos"   && <ChaosMonster   phase={phase} msg={msg} />}
    </>
  );
};

export default FailureFeedback;
