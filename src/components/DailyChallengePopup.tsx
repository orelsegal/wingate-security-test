import { useNavigate } from "react-router-dom";
import { X, Flame, Clock, Zap, Trophy, Sparkles, ChevronLeft } from "lucide-react";
import { DailyChallenge } from "@/lib/dailyChallenge";

type Props = {
  challenge: DailyChallenge;
  onClose: () => void;
  variant?: "popup" | "card";
};

export default function DailyChallengePopup({ challenge, onClose, variant = "popup" }: Props) {
  const navigate = useNavigate();
  const start = () => { onClose(); navigate("/play/daily"); };

  const inner = (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50 via-white to-emerald-50 ring-1 ring-violet-100 shadow-[0_20px_60px_-20px_rgba(139,92,246,0.35)]">
      {/* deco blobs */}
      <div className="pointer-events-none absolute -top-16 -end-16 w-56 h-56 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -start-10 w-64 h-64 rounded-full bg-emerald-200/40 blur-3xl" />

      {variant === "popup" && (
        <button onClick={onClose} className="absolute top-3 start-3 z-10 rounded-full bg-white/80 hover:bg-white p-1.5 ring-1 ring-border" aria-label="סגור">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}

      <div className="relative p-6 md:p-8">
        <div className="inline-flex items-center gap-1.5 bg-white/80 backdrop-blur rounded-full px-3 py-1 ring-1 ring-violet-100 mb-4">
          <Flame className="h-3.5 w-3.5 text-rose-500" strokeWidth={2.4} />
          <span className="text-[11px] font-semibold text-violet-700">קרב יומי נפתח</span>
          <Sparkles className="h-3 w-3 text-amber-400" />
        </div>

        <h2 className="text-[22px] md:text-[28px] font-bold text-foreground leading-tight">
          האתגר היומי
        </h2>
        <p className="text-[13px] text-muted-foreground mt-1.5">
          {challenge.hook}
        </p>

        <div className="mt-4 inline-flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2 ring-1 ring-border">
          <span className="text-[11px] text-muted-foreground">היום משחקים על:</span>
          <span className="text-[12.5px] font-bold text-violet-700">
            {challenge.subject} — {challenge.topic}
          </span>
        </div>

        {/* details grid */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <Pill icon={<Zap className="h-3.5 w-3.5 text-violet-500" />} label="משימות" value="5" />
          <Pill icon={<Clock className="h-3.5 w-3.5 text-emerald-500" />} label="דקות" value="5" />
          <Pill icon={<Trophy className="h-3.5 w-3.5 text-amber-500" />} label="XP אישי" value={`${challenge.personalXp}`} />
          <Pill icon={<Sparkles className="h-3.5 w-3.5 text-rose-500" />} label="XP לכיתה" value={`${challenge.classXp}`} />
        </div>

        {/* class rank line */}
        <div className="mt-4 rounded-2xl bg-white/80 backdrop-blur ring-1 ring-border p-3.5">
          <p className="text-[12px] text-foreground">
            הכיתה שלך במקום <span className="font-bold text-violet-700">{challenge.classRank}</span>.
            <span className="text-muted-foreground"> חסרות </span>
            <span className="font-bold text-emerald-600">{challenge.pointsToOvertake} נקודות</span>
            <span className="text-muted-foreground"> כדי לעקוף את </span>
            <span className="font-bold">{challenge.rivalClass}</span>.
          </p>
        </div>

        <button
          onClick={start}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-2xl py-3 font-semibold shadow-lg shadow-violet-300/40 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          התחל לשחק
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-center text-[10.5px] text-muted-foreground mt-2">
          5 דקות. 5 משימות. קרב אחד.
        </p>
      </div>
    </div>
  );

  if (variant === "card") return inner;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[460px] animate-in zoom-in-95 duration-300">{inner}</div>
    </div>
  );
}

const Pill = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-white rounded-xl ring-1 ring-border px-3 py-2.5 text-center">
    <div className="flex items-center justify-center mb-1">{icon}</div>
    <p className="text-[15px] font-bold text-foreground tabular-nums leading-none">{value}</p>
    <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
  </div>
);
