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
      <div className="flex items-center gap-2">
        {rings.map((r, i) => (
          <span
            key={i}
            className="block rounded-full border-[3px] animate-olympic-wave"
            style={{
              width: 28,
              height: 28,
              borderColor: r.color,
              animationDelay: `${i * 0.14}s`,
            }}
          />
        ))}
      </div>
      <p className="mt-6 text-[12px] md:text-[13px] text-foreground/60 font-medium tracking-tight">
        {message}
      </p>
      <style>{`
        @keyframes olympic-wave {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.85; }
          25%      { transform: translateY(-10px) scale(1.12); opacity: 1; }
          50%      { transform: translateY(0) scale(1); opacity: 0.9; }
        }
        .animate-olympic-wave {
          animation: olympic-wave 1.4s ease-in-out infinite;
          will-change: transform, opacity;
        }
      `}</style>
    </div>
  );
};

export default OlympicLoader;
