import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useStudent, useStudentProgress } from "@/hooks/useStudents";
import { useMemo } from "react";
import {
  Play, Trophy, Sparkles, Flame, BookOpen, Globe, Scale, Feather,
  Calculator, Activity, Landmark, Languages, Crown, Medal,
} from "lucide-react";

/* ── Subject visual map ─────────────────────────────── */
const subjectMeta: Record<string, { icon: any; bg: string; fg: string; ring: string; accent: string }> = {
  "תנ״ך":       { icon: BookOpen,   bg: "bg-amber-50",   fg: "text-amber-700",   ring: "ring-amber-100",   accent: "bg-amber-500" },
  "היסטוריה":   { icon: Landmark,   bg: "bg-rose-50",    fg: "text-rose-700",    ring: "ring-rose-100",    accent: "bg-rose-500" },
  "ספרות":      { icon: Feather,    bg: "bg-violet-50",  fg: "text-violet-700",  ring: "ring-violet-100",  accent: "bg-violet-500" },
  "לשון":       { icon: Languages,  bg: "bg-emerald-50", fg: "text-emerald-700", ring: "ring-emerald-100", accent: "bg-emerald-500" },
  "אזרחות":     { icon: Scale,      bg: "bg-teal-50",    fg: "text-teal-700",    ring: "ring-teal-100",    accent: "bg-teal-500" },
  "אנגלית":     { icon: Globe,      bg: "bg-sky-50",     fg: "text-sky-700",     ring: "ring-sky-100",     accent: "bg-sky-500" },
  "מתמטיקה":    { icon: Calculator, bg: "bg-green-50",   fg: "text-green-700",   ring: "ring-green-100",   accent: "bg-green-500" },
  "חינוך גופני":{ icon: Activity,   bg: "bg-yellow-50",  fg: "text-yellow-700",  ring: "ring-yellow-100",  accent: "bg-yellow-500" },
};
const metaFor = (n: string) => subjectMeta[n] || { icon: BookOpen, bg: "bg-slate-50", fg: "text-slate-700", ring: "ring-slate-100", accent: "bg-slate-500" };

const ALL_SUBJECTS = ["תנ״ך", "לשון", "היסטוריה", "אנגלית", "מתמטיקה", "חינוך גופני", "ספרות", "אזרחות"];

/* ── Mock class leaderboard ─────────────────────────── */
const MOCK_LEADERBOARD = [
  { name: "נועם ש.", xp: 4820, rank: 1 },
  { name: "מאיה ל.", xp: 4610, rank: 2 },
  { name: "אתה",     xp: 4340, rank: 3, isMe: true },
  { name: "יואב ק.", xp: 4060, rank: 4 },
  { name: "תמר א.",  xp: 3720, rank: 5 },
];

const PlayHubPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: student } = useStudent(studentId);
  const { data: progress = [] } = useStudentProgress(studentId);

  const perSubject = useMemo(() => {
    const byName = new Map<string, any>();
    progress.forEach((p: any) => {
      const n = p.subjects?.subject_name || "";
      if (n) byName.set(n, p);
    });
    return ALL_SUBJECTS.map((name) => {
      const p = byName.get(name) || (name === "לשון" ? byName.get("לשון והבעה") : undefined);
      const pct = p?.completion_percent || 0;
      // mock XP from completion
      const xp = Math.round(pct * 12 + (p?.grade || 0) * 5);
      return { name, pct, xp };
    });
  }, [progress]);

  const totalXp = perSubject.reduce((s, x) => s + x.xp, 0);
  const myRank = MOCK_LEADERBOARD.find((p) => p.isMe);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/60 via-pink-50/40 to-emerald-50/40" dir="rtl">
      {/* scenic backdrop */}
      <svg viewBox="0 0 1200 220" className="absolute inset-x-0 top-0 w-full h-[220px] opacity-60 pointer-events-none" preserveAspectRatio="xMidYMid slice">
        <ellipse cx="180" cy="60" rx="55" ry="14" fill="white" opacity="0.8" />
        <ellipse cx="980" cy="50" rx="65" ry="16" fill="white" opacity="0.8" />
        <ellipse cx="560" cy="90" rx="40" ry="11" fill="white" opacity="0.6" />
        <path d="M 0 190 Q 300 140 600 175 T 1200 165 L 1200 220 L 0 220 Z" fill="hsl(150 30% 88%)" opacity="0.55" />
        <path d="M 820 180 L 900 110 L 980 180 Z" fill="hsl(270 25% 86%)" opacity="0.6" />
      </svg>

      <div className="relative p-5 md:p-8 lg:p-10 max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <p className="text-[10.5px] font-semibold text-violet-700 mb-1.5 inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" strokeWidth={2.2} />
            תחרות בין תלמידי הכיתה
          </p>
          <h1 className="text-[26px] md:text-[32px] font-bold text-foreground tracking-tight leading-tight">
            אזור המשחקים <span className="text-violet-600">של {student?.full_name || user?.name}</span>
          </h1>
          <p className="text-[13px] text-muted-foreground mt-2 max-w-2xl">
            בחר מקצוע, התחל לשחק, וצבור נקודות XP. כל תשובה נכונה מקדמת אותך בלוח הדירוג הכיתתי.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Trophy, label: "מקום בכיתה", value: `${myRank?.rank || "—"}`, sub: "מתוך 28", bg: "bg-amber-50", fg: "text-amber-600", ring: "ring-amber-100" },
            { icon: Sparkles, label: "סה״כ XP",    value: totalXp || 4340,        sub: "השבוע +120", bg: "bg-violet-50", fg: "text-violet-600", ring: "ring-violet-100" },
            { icon: Flame,    label: "רצף ימים",   value: 7,                       sub: "המשך כך!",   bg: "bg-rose-50",   fg: "text-rose-600",   ring: "ring-rose-100" },
            { icon: Medal,    label: "מדליות",     value: 12,                      sub: "3 חדשות",    bg: "bg-emerald-50",fg: "text-emerald-600",ring: "ring-emerald-100" },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} ring-1 ${s.ring} rounded-2xl p-4 animate-fade-in-up`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-[10.5px] font-semibold ${s.fg}`}>{s.label}</p>
                <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center">
                  <s.icon className={`h-3.5 w-3.5 ${s.fg}`} strokeWidth={2} />
                </div>
              </div>
              <p className="text-[22px] font-bold text-foreground leading-none tabular-nums">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Class leaderboard */}
        <div className="bg-card rounded-3xl border border-border p-5 md:p-6 shadow-[var(--shadow-card)] mb-6">
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-[10.5px] text-muted-foreground">עודכן עכשיו</span>
            <h2 className="text-[15px] font-semibold text-foreground inline-flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" strokeWidth={2} />
              לוח דירוג כיתתי
            </h2>
          </div>
          <div className="space-y-2">
            {MOCK_LEADERBOARD.map((p) => (
              <div
                key={p.rank}
                className={`flex items-center gap-3 p-2.5 rounded-xl ${p.isMe ? "bg-violet-50 ring-1 ring-violet-200" : "bg-muted/30"}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  p.rank === 1 ? "bg-amber-200 text-amber-800" :
                  p.rank === 2 ? "bg-slate-200 text-slate-700" :
                  p.rank === 3 ? "bg-orange-200 text-orange-800" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {p.rank}
                </div>
                <span className={`flex-1 text-[12.5px] ${p.isMe ? "font-semibold text-violet-700" : "text-foreground"}`}>
                  {p.name}{p.isMe && " (אתה)"}
                </span>
                <span className="text-[11.5px] font-semibold text-foreground tabular-nums">{p.xp.toLocaleString()} XP</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-center text-muted-foreground mt-4">
            עוד <span className="font-semibold text-violet-600">270 XP</span> והכיתה שלך עולה למקום השני!
          </p>
        </div>

        {/* Subjects to play */}
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[10.5px] text-muted-foreground">בחר מקצוע ולחץ "שחק"</p>
          <h2 className="text-[15px] font-semibold text-foreground">המשחקים לפי מקצוע</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {perSubject.map((s, i) => {
            const m = metaFor(s.name);
            const Icon = m.icon;
            return (
              <div
                key={s.name}
                className={`${m.bg} rounded-2xl ring-1 ${m.ring} border border-border/40 p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-white/80 rounded-full px-2 py-0.5">
                    <Sparkles className="h-2.5 w-2.5" strokeWidth={2.2} />
                    {s.xp} XP
                  </span>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-semibold text-foreground">{s.name}</h3>
                    <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center">
                      <Icon className={`h-4 w-4 ${m.fg}`} strokeWidth={2} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[14px] font-bold text-foreground tabular-nums">{s.pct}%</span>
                  <span className="text-[10px] text-muted-foreground">התקדמות במשחק</span>
                </div>
                <div className="h-1.5 bg-white/80 rounded-full overflow-hidden mb-4">
                  <div className={`h-full rounded-full ${m.accent} transition-all duration-700`} style={{ width: `${Math.max(s.pct, 3)}%` }} />
                </div>

                <button
                  onClick={() => navigate(`/play/${encodeURIComponent(s.name)}`)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-600 text-white text-[12.5px] font-semibold px-4 py-2.5 rounded-full shadow-[0_6px_16px_-6px_rgba(120,80,200,0.55)] transition-colors"
                >
                  <Play className="h-3.5 w-3.5 fill-white" strokeWidth={0} />
                  שחק
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <span className="text-[8.5px] text-muted-foreground/30 tracking-wider">האקדמיה למצוינות · מכון וינגייט</span>
        </div>
      </div>
    </div>
  );
};

export default PlayHubPage;
