/**
 * Olympic-rings welcome splash.
 * Brief animation shown right after login / before main-area transitions.
 */
const OlympicLoader = ({ message = "הגוף מתאמן לניצחון. הראש מתאמן לחיים." }: { message?: string }) => {
  const rings = [
    { color: "hsl(150, 60%, 42%)", delay: 0 },
    { color: "hsl(40, 90%, 55%)", delay: 0.12 },
    { color: "hsl(0, 70%, 55%)", delay: 0.24 },
    { color: "hsl(0, 0%, 15%)", delay: 0.36 },
    { color: "hsl(210, 75%, 50%)", delay: 0.48 },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[hsl(205,60%,97%)]"
      dir="rtl"
      role="status"
      aria-label="טוען"
    >
      <div className="flex items-center gap-3 md:gap-4">
        {rings.map((r, i) => (
          <span
            key={i}
            className="block rounded-full border-[5px] md:border-[6px] animate-olympic-pop"
            style={{
              width: 64,
              height: 64,
              borderColor: r.color,
              animationDelay: `${r.delay}s`,
            }}
          />
        ))}
      </div>
      <p className="mt-8 text-[13px] md:text-[14px] text-foreground/70 font-medium tracking-tight">
        {message}
      </p>
      <style>{`
        @keyframes olympic-pop {
          0%   { transform: scale(0.4); opacity: 0; }
          45%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-olympic-pop {
          animation: olympic-pop 0.9s cubic-bezier(.2,.7,.3,1) both;
        }
      `}</style>
    </div>
  );
};

export default OlympicLoader;
