import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useStudent, useStudentProgress } from "@/hooks/useStudents";
import { useMemo, useState } from "react";
import {
  Play, Trophy, Sparkles, Flame, BookOpen, Globe, Scale, Feather,
  Calculator, Activity, Landmark, Languages, Crown, Medal, Target,
  CheckCircle2, Clock, Users, Award, Star, Zap, TrendingUp, ChevronLeft,
} from "lucide-react";

/* ── Subject visual map ─────────────────────────────── */
const subjectMeta: Record<string, { icon: any; bg: string; fg: string; ring: string; accent: string; soft: string }> = {
  "תנ״ך":       { icon: BookOpen,   bg: "bg-amber-50",   fg: "text-amber-600",   ring: "ring-amber-100",   accent: "bg-amber-500",   soft: "from-amber-100 to-amber-50" },
  "היסטוריה":   { icon: Landmark,   bg: "bg-rose-50",    fg: "text-rose-600",    ring: "ring-rose-100",    accent: "bg-rose-500",    soft: "from-rose-100 to-rose-50" },
  "ספרות":      { icon: Feather,    bg: "bg-violet-50",  fg: "text-violet-600",  ring: "ring-violet-100",  accent: "bg-violet-500",  soft: "from-violet-100 to-violet-50" },
  "לשון":       { icon: Languages,  bg: "bg-emerald-50", fg: "text-emerald-600", ring: "ring-emerald-100", accent: "bg-emerald-500", soft: "from-emerald-100 to-emerald-50" },
  "אזרחות":     { icon: Scale,      bg: "bg-teal-50",    fg: "text-teal-600",    ring: "ring-teal-100",    accent: "bg-teal-500",    soft: "from-teal-100 to-teal-50" },
  "אנגלית":     { icon: Globe,      bg: "bg-sky-50",     fg: "text-sky-600",     ring: "ring-sky-100",     accent: "bg-sky-500",     soft: "from-sky-100 to-sky-50" },
  "מתמטיקה":    { icon: Calculator, bg: "bg-green-50",   fg: "text-green-600",   ring: "ring-green-100",   accent: "bg-green-500",   soft: "from-green-100 to-green-50" },
  "חינוך גופני":{ icon: Activity,   bg: "bg-yellow-50",  fg: "text-yellow-600",  ring: "ring-yellow-100",  accent: "bg-yellow-500",  soft: "from-yellow-100 to-yellow-50" },
};
const metaFor = (n: string) => subjectMeta[n] || { icon: BookOpen, bg: "bg-slate-50", fg: "text-slate-600", ring: "ring-slate-100", accent: "bg-slate-500", soft: "from-slate-100 to-slate-50" };

const ALL_SUBJECTS = ["תנ״ך", "לשון", "היסטוריה", "אנגלית", "מתמטיקה", "חינוך גופני", "ספרות", "אזרחות"];

/* ── Mocks ─────────────────────────── */
const MOCK_LEADERBOARD = [
  { name: "ו'1",        xp: 4820, rank: 1 },
  { name: "ו'2",        xp: 4540, rank: 2 },
  { name: "ו'3 (אנחנו)", xp: 4260, rank: 3, isMe: true },
  { name: "ו'4",        xp: 3980, rank: 4 },
  { name: "ו'5",        xp: 3240, rank: 5 },
  { name: "ו'6",        xp: 2890, rank: 6 },
];

const ACHIEVEMENTS = [
  { icon: Flame,  label: "רצף 7 ימים",   color: "from-rose-400 to-orange-400",   ring: "ring-rose-100" },
  { icon: Star,   label: "אלוף הדיוק",   color: "from-violet-400 to-indigo-400", ring: "ring-violet-100" },
  { icon: Trophy, label: "שיפור אישי",   color: "from-amber-400 to-yellow-400",  ring: "ring-amber-100" },
  { icon: Award,  label: "10 ימים רצופים", color: "from-emerald-400 to-teal-400", ring: "ring-emerald-100" },
  { icon: Zap,    label: "סופר מהיר",    color: "from-sky-400 to-blue-400",      ring: "ring-sky-100" },
  { icon: Crown,  label: "מלך הכיתה",    color: "from-pink-400 to-rose-400",     ring: "ring-pink-100" },
];

const DAILY_GOALS = [
  { txt: "ענה נכון על 80% מהשאלות", xp: 100 },
  { txt: "שפר ציון מהפעם הקודמת",   xp: 100 },
  { txt: "סיים תוך 7 דקות",          xp: 50 },
];

type Tab = "home" | "leaderboard" | "daily" | "achievements";

const PlayHubPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: student } = useStudent(studentId);
  const { data: progress = [] } = useStudentProgress(studentId);
  const [tab, setTab] = useState<Tab>("home");

  const perSubject = useMemo(() => {
    const byName = new Map<string, any>();
    progress.forEach((p: any) => {
      const n = p.subjects?.subject_name || "";
      if (n) byName.set(n, p);
    });
    return ALL_SUBJECTS.map((name) => {
      const p = byName.get(name) || (name === "לשון" ? byName.get("לשון והבעה") : undefined);
      const pct = p?.completion_percent || 0;
      const xp = Math.round(pct * 12 + (p?.grade || 0) * 5);
      return { name, pct, xp };
    });
  }, [progress]);

  const totalXp = perSubject.reduce((s, x) => s + x.xp, 0) || 4340;
  const myRank = MOCK_LEADERBOARD.find((p) => p.isMe);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/60 via-white to-emerald-50/40" dir="rtl">
      <div className="relative p-5 md:p-8 lg:p-10 max-w-[1200px] mx-auto">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10.5px] font-semibold text-violet-600 mb-1.5 inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" strokeWidth={2.2} />
              שנעלה על המסלול? גו!
            </p>
            <h1 className="text-[26px] md:text-[32px] font-bold text-foreground tracking-tight leading-tight">
              היי <span className="text-violet-600">{student?.full_name || user?.name}</span>, הכיתה צריכה אותך היום
            </h1>
            <p className="text-[13px] text-muted-foreground mt-2 max-w-xl">
              עוד 280 נקודות ואנחנו עוקפים את ו'2 🌙
            </p>
          </div>

          {/* mini me badge */}
          <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 ring-1 ring-violet-100 shadow-[var(--shadow-card)]">
            <div className="text-end">
              <p className="text-[10px] text-muted-foreground">רמה</p>
              <p className="text-[18px] font-bold text-violet-600 leading-none">12</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-[12px] font-bold shadow-md">
              {(student?.full_name || user?.name || "?").charAt(0)}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-500">
              <Flame className="h-3.5 w-3.5" strokeWidth={2.2} />
              7
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────── */}
        <div className="inline-flex items-center gap-1 bg-white rounded-2xl p-1 ring-1 ring-border shadow-sm mb-6">
          {([
            { id: "home",         label: "בית",          icon: Target },
            { id: "daily",        label: "האתגר היומי",  icon: Zap },
            { id: "leaderboard",  label: "דירוג כיתתי",  icon: Trophy },
            { id: "achievements", label: "הישגים",       icon: Medal },
          ] as { id: Tab; label: string; icon: any }[]).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all ${
                  active ? "bg-violet-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" strokeWidth={2} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ─── HOME tab ───────────────────────────────── */}
        {tab === "home" && (
          <div className="space-y-6">
            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Trophy, label: "מקום בכיתה", value: `${myRank?.rank || "—"}`, sub: "מתוך 28",   fg: "text-amber-600",   bg: "bg-amber-50",   ring: "ring-amber-100" },
                { icon: Sparkles, label: "סה״כ XP",   value: totalXp,                 sub: "השבוע +120", fg: "text-violet-600",  bg: "bg-violet-50",  ring: "ring-violet-100" },
                { icon: Flame,    label: "רצף ימים",  value: 7,                       sub: "המשך כך!",   fg: "text-rose-600",    bg: "bg-rose-50",    ring: "ring-rose-100" },
                { icon: Medal,    label: "מדליות",    value: 12,                      sub: "3 חדשות",    fg: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
              ].map((s, i) => (
                <div key={i} className={`bg-white ring-1 ${s.ring} rounded-2xl p-4 shadow-[var(--shadow-card)] animate-fade-in-up`} style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10.5px] font-semibold text-muted-foreground">{s.label}</p>
                    <div className={`w-8 h-8 rounded-full ${s.bg} flex items-center justify-center`}>
                      <s.icon className={`h-3.5 w-3.5 ${s.fg}`} strokeWidth={2} />
                    </div>
                  </div>
                  <p className="text-[22px] font-bold text-foreground leading-none tabular-nums">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Daily missions + Start playing */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
              <div className="bg-white rounded-3xl ring-1 ring-border p-5 md:p-6 shadow-[var(--shadow-card)]">
                <div className="flex items-baseline justify-between mb-4">
                  <button onClick={() => setTab("daily")} className="text-[10.5px] text-violet-600 inline-flex items-center gap-0.5 hover:underline">
                    ראה הכל <ChevronLeft className="h-3 w-3" />
                  </button>
                  <h2 className="text-[15px] font-semibold text-foreground">המשימות היומיות שלך</h2>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { val: "1", lbl: "צפייה ביחידה",  done: true,  ring: "stroke-emerald-400", fg: "text-emerald-600" },
                    { val: "2", lbl: "מתוך 3 משחקים", done: false, ring: "stroke-violet-500",  fg: "text-violet-600" },
                    { val: "3", lbl: "חיזוק טעויות",  done: false, ring: "stroke-sky-400",     fg: "text-sky-600" },
                  ].map((c, i) => (
                    <div key={i} className="flex flex-col items-center text-center">
                      <div className="relative w-[72px] h-[72px]">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15" fill="none" className="stroke-muted/40" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15" fill="none" className={c.ring} strokeWidth="3" strokeDasharray={`${c.done ? 94 : 50}, 100`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {c.done ? (
                            <CheckCircle2 className={`h-5 w-5 ${c.fg}`} strokeWidth={2.2} />
                          ) : (
                            <span className={`text-[18px] font-bold ${c.fg}`}>{c.val}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground mt-2">{c.lbl}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setTab("daily")}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-l from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white text-[13px] font-semibold px-4 py-3 rounded-2xl shadow-[0_10px_24px_-10px_rgba(120,80,200,0.55)] transition-all"
                >
                  <Zap className="h-4 w-4 fill-white" strokeWidth={0} />
                  התחל לשחק
                </button>
              </div>

              {/* Class race card */}
              <div className="bg-white rounded-3xl ring-1 ring-border p-5 md:p-6 shadow-[var(--shadow-card)] flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[10.5px] text-muted-foreground">נגמר בעוד 05:42:18</p>
                    <h3 className="text-[15px] font-semibold text-foreground mt-0.5">הקרב הכיתתי</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-md">
                    <span className="text-white text-[13px] font-bold">#3</span>
                  </div>
                </div>

                <div className="space-y-1.5 mt-2">
                  {MOCK_LEADERBOARD.slice(0, 4).map((p) => {
                    const max = MOCK_LEADERBOARD[0].xp;
                    const w = Math.round((p.xp / max) * 100);
                    const bar =
                      p.rank === 1 ? "bg-violet-400" :
                      p.rank === 2 ? "bg-sky-400" :
                      p.isMe       ? "bg-emerald-400" :
                                     "bg-muted-foreground/40";
                    return (
                      <div key={p.rank} className="flex items-center gap-2">
                        <span className={`text-[11px] w-14 ${p.isMe ? "font-semibold text-emerald-600" : "text-muted-foreground"}`}>{p.name}</span>
                        <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${bar}`} style={{ width: `${w}%` }} />
                        </div>
                        <span className="text-[10.5px] tabular-nums text-foreground/80 w-12 text-end">{p.xp.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-auto pt-4 text-center text-[11px] text-muted-foreground">
                  עוד 3 תלמידים עונים ואתם עולים מקום 🚀
                </div>
              </div>
            </div>

            {/* Subjects to play */}
            <div>
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
                      className={`bg-white rounded-2xl ring-1 ${m.ring} border border-border/40 p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up`}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${m.fg} ${m.bg} rounded-full px-2 py-0.5`}>
                          <Sparkles className="h-2.5 w-2.5" strokeWidth={2.2} />
                          {s.xp} XP
                        </span>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[14px] font-semibold text-foreground">{s.name}</h3>
                          <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center`}>
                            <Icon className={`h-4 w-4 ${m.fg}`} strokeWidth={2} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[14px] font-bold text-foreground tabular-nums">{s.pct}%</span>
                        <span className="text-[10px] text-muted-foreground">התקדמות במשחק</span>
                      </div>
                      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden mb-4">
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
            </div>
          </div>
        )}

        {/* ─── DAILY tab ───────────────────────────────── */}
        {tab === "daily" && (
          <div className="space-y-5 max-w-[640px] mx-auto">
            {/* Featured challenge */}
            <div className="bg-white rounded-3xl ring-1 ring-border p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10.5px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">לשון</span>
                <span className="text-[11px] text-muted-foreground">האתגר היומי</span>
              </div>
              <h3 className="text-[24px] font-bold text-foreground mb-1">הבנת הנקרא</h3>
              <div className="flex items-center gap-4 text-[11.5px] text-muted-foreground mt-3">
                <span className="inline-flex items-center gap-1"><Target className="h-3.5 w-3.5 text-amber-500" /> בינוני</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-500" /> 7 דקות</span>
                <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5 text-amber-500" /> 12 שאלות</span>
              </div>
            </div>

            {/* Social proof */}
            <div className="bg-white rounded-3xl ring-1 ring-violet-100 p-5 shadow-[var(--shadow-card)] text-center">
              <p className="text-[13px] font-semibold text-violet-600 mb-1">כולם משחקים עכשיו!</p>
              <p className="text-[11px] text-muted-foreground mb-3">78% מהכיתה השתתפו</p>
              <div className="flex items-center justify-center -space-x-2 rtl:space-x-reverse">
                {["נ","מ","י","ת","ע","ד"].map((c, i) => (
                  <div key={i} className={`w-9 h-9 rounded-full ring-2 ring-white flex items-center justify-center text-[11px] font-bold text-white shadow-sm`}
                    style={{ backgroundColor: ["#a78bfa","#f472b6","#34d399","#fbbf24","#60a5fa","#fb7185"][i] }}>
                    {c}
                  </div>
                ))}
              </div>
            </div>

            {/* Goals */}
            <div className="bg-white rounded-3xl ring-1 ring-border p-5 shadow-[var(--shadow-card)]">
              <h4 className="text-[14px] font-semibold text-foreground text-center mb-4">מטרות האתגר</h4>
              <div className="space-y-2.5">
                {DAILY_GOALS.map((g, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2.5">
                    <span className="text-[11.5px] font-semibold text-emerald-600 tabular-nums">{g.xp} נק׳</span>
                    <span className="text-[12px] text-foreground">{g.txt}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate(`/play/${encodeURIComponent("לשון")}`)}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-l from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white text-[14px] font-semibold px-4 py-3.5 rounded-2xl shadow-[0_10px_24px_-10px_rgba(120,80,200,0.55)] transition-all"
            >
              <Play className="h-4 w-4 fill-white" strokeWidth={0} />
              התחל לשחק
            </button>

            <p className="text-[11px] text-center text-muted-foreground inline-flex items-center justify-center gap-1.5 w-full">
              <Sparkles className="h-3 w-3 text-amber-500" />
              טיפ: קרא בעיון, שים לב לפרטים הקטנים
            </p>
          </div>
        )}

        {/* ─── LEADERBOARD tab ───────────────────────────────── */}
        {tab === "leaderboard" && (
          <div className="space-y-5 max-w-[720px] mx-auto">
            <div className="bg-white rounded-3xl ring-1 ring-border p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-[16px] font-semibold text-foreground text-center mb-6">הדירוג הכיתתי</h2>

              {/* Podium */}
              <div className="grid grid-cols-3 items-end gap-3 mb-6">
                {[
                  { ...MOCK_LEADERBOARD[1], h: "h-20", from: "from-slate-300", to: "to-slate-400", chip: "bg-slate-200 text-slate-700" },
                  { ...MOCK_LEADERBOARD[0], h: "h-28", from: "from-amber-300", to: "to-amber-500", chip: "bg-amber-200 text-amber-800" },
                  { ...MOCK_LEADERBOARD[2], h: "h-16", from: "from-orange-300", to: "to-orange-500", chip: "bg-orange-200 text-orange-800" },
                ].map((p, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <p className={`text-[11px] font-semibold ${p.isMe ? "text-emerald-600" : "text-muted-foreground"}`}>{p.name}</p>
                    <p className="text-[13px] font-bold tabular-nums mb-2">{p.xp.toLocaleString()}</p>
                    <div className={`w-full ${p.h} rounded-t-2xl bg-gradient-to-b ${p.from} ${p.to} flex items-start justify-center pt-2 shadow-md`}>
                      <div className={`w-7 h-7 rounded-full ${p.chip} flex items-center justify-center text-[12px] font-bold`}>{p.rank}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rest */}
              <div className="space-y-2">
                {MOCK_LEADERBOARD.slice(3).map((p) => (
                  <div key={p.rank} className="flex items-center gap-3 bg-muted/30 rounded-xl px-3 py-2.5">
                    <span className="text-[12px] font-bold text-muted-foreground w-5">{p.rank}</span>
                    <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[11px] font-bold">{p.name.charAt(0)}</div>
                    <span className="flex-1 text-[12.5px] text-foreground">{p.name}</span>
                    <span className="text-[12px] font-semibold tabular-nums text-foreground/80">{p.xp.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-violet-50 ring-1 ring-violet-100 rounded-2xl px-4 py-3 text-center">
              <p className="text-[12px] text-violet-700">
                🌙 חסרות 280 נקודות ואנחנו עוקפים את ו'2!
              </p>
            </div>
          </div>
        )}

        {/* ─── ACHIEVEMENTS tab ───────────────────────────────── */}
        {tab === "achievements" && (
          <div className="space-y-5 max-w-[720px] mx-auto">
            <div className="bg-white rounded-3xl ring-1 ring-border p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[11px] text-muted-foreground">6 מתוך 24</span>
                <h2 className="text-[16px] font-semibold text-foreground inline-flex items-center gap-2">
                  <Medal className="h-4 w-4 text-amber-500" />
                  ההישגים שלי
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ACHIEVEMENTS.map((a, i) => (
                  <div key={i} className={`bg-white ring-1 ${a.ring} rounded-2xl p-4 flex flex-col items-center text-center hover:-translate-y-0.5 transition-all animate-fade-in-up shadow-[var(--shadow-card)]`} style={{ animationDelay: `${i * 50}ms` }}>
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${a.color} flex items-center justify-center shadow-md mb-2`}>
                      <a.icon className="h-6 w-6 text-white" strokeWidth={2} />
                    </div>
                    <p className="text-[12px] font-semibold text-foreground">{a.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* My stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Flame,    val: "7",   lbl: "רצף ימים",      fg: "text-rose-500",    bg: "bg-rose-50" },
                { icon: Trophy,   val: "24",  lbl: "אתגרים הושלמו", fg: "text-amber-500",   bg: "bg-amber-50" },
                { icon: TrendingUp,val: "87%",lbl: "דיוק כללי",     fg: "text-emerald-500", bg: "bg-emerald-50" },
              ].map((s, i) => (
                <div key={i} className="bg-white ring-1 ring-border rounded-2xl p-4 text-center shadow-[var(--shadow-card)]">
                  <div className={`w-10 h-10 rounded-full ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                    <s.icon className={`h-4 w-4 ${s.fg}`} strokeWidth={2} />
                  </div>
                  <p className="text-[20px] font-bold tabular-nums">{s.val}</p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">{s.lbl}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <span className="text-[8.5px] text-muted-foreground/30 tracking-wider">האקדמיה למצוינות · מכון וינגייט</span>
        </div>
      </div>
    </div>
  );
};

export default PlayHubPage;
