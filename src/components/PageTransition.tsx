import { useState, useEffect, useRef, ReactNode } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

const rings = [
  { color: "hsl(210, 75%, 50%)", delay: 0 },
  { color: "hsl(0, 0%, 15%)", delay: 0.08 },
  { color: "hsl(0, 70%, 55%)", delay: 0.16 },
  { color: "hsl(40, 90%, 55%)", delay: 0.24 },
  { color: "hsl(150, 60%, 42%)", delay: 0.32 },
];

const OlympicTransitionOverlay = () => (
  <div
    className="fixed inset-0 z-[90] flex items-center justify-center bg-background/70 backdrop-blur-sm pointer-events-none"
    dir="rtl"
    aria-hidden
  >
    <div className="flex items-center gap-2 md:gap-3">
      {rings.map((r, i) => (
        <span
          key={i}
          className="block rounded-full border-[4px] md:border-[5px] animate-olympic-bounce"
          style={{
            width: 38,
            height: 38,
            borderColor: r.color,
            animationDelay: `${r.delay}s`,
          }}
        />
      ))}
    </div>
    <style>{`
      @keyframes olympic-bounce {
        0%   { transform: scale(0.3) translateY(8px); opacity: 0; }
        45%  { transform: scale(1.15) translateY(-4px); opacity: 1; }
        75%  { transform: scale(0.95) translateY(0); opacity: 1; }
        100% { transform: scale(1) translateY(0); opacity: 1; }
      }
      .animate-olympic-bounce {
        animation: olympic-bounce 0.7s cubic-bezier(.2,.7,.3,1) both infinite;
      }
    `}</style>
  </div>
);

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [showOverlay, setShowOverlay] = useState(false);
  const prevKey = useRef(location.key);

  useEffect(() => {
    if (location.key !== prevKey.current) {
      setPhase("out");
      setShowOverlay(true);
      const swap = setTimeout(() => {
        prevKey.current = location.key;
        setDisplayChildren(children);
        setPhase("in");
      }, 280);
      const hide = setTimeout(() => {
        setShowOverlay(false);
      }, 550);
      return () => {
        clearTimeout(swap);
        clearTimeout(hide);
      };
    } else {
      setDisplayChildren(children);
    }
  }, [children, location.key]);

  return (
    <>
      {showOverlay && <OlympicTransitionOverlay />}
      <div
        className={`transition-all duration-300 ease-out ${
          phase === "out"
            ? "opacity-0 translate-y-2"
            : "opacity-100 translate-y-0"
        }`}
      >
        {displayChildren}
      </div>
    </>
  );
};

export default PageTransition;
