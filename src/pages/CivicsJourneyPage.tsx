/**
 * CivicsJourneyPage — "המסלול שלי" באזרחות
 * Mirrors the Larutz Dashboard structure for the civics performance task.
 * Each station maps to a civics module (part) from courseContent.
 */
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, Lock, ChevronLeft,
  Compass, BookOpen, Target, Search, Microscope, BarChart3, Send,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudentProgress } from "@/hooks/useStudents";
import { courseContent } from "@/lib/courseContent";

const STATION_META: Record<string, { emoji: string; icon: any; skills: string[]; accent: string; bar: string; tint: string }> = {
  "civ-1": { emoji: "🎯", icon: Target,     skills: ["בחירת נושא", "ניסוח בעיה"],          accent: "border-r-4 border-teal-400",    bar: "bg-teal-500",    tint: "bg-teal-50" },
  "civ-2": { emoji: "🧭", icon: Compass,    skills: ["מושגים", "שאלת חקר"],                 accent: "border-r-4 border-cyan-400",    bar: "bg-cyan-500",    tint: "bg-cyan-50" },
  "civ-3": { emoji: "📚", icon: BookOpen,   skills: ["סקירת ספרות", "מקורות"],              accent: "border-r-4 border-indigo-400",  bar: "bg-indigo-500",  tint: "bg-indigo-50" },
  "civ-4": { emoji: "🔬", icon: Microscope, skills: ["שאלון/ראיון", "איסוף נתונים"],        accent: "border-r-4 border-violet-400",  bar: "bg-violet-500",  tint: "bg-violet-50" },
  "civ-5": { emoji: "📊", icon: BarChart3,  skills: ["ניתוח", "מסקנות"],                    accent: "border-r-4 border-amber-400",   bar: "bg-amber-500",   tint: "bg-amber-50" },
  "civ-6": { emoji: "📨", icon: Send,       skills: ["תוצר", "רפלקציה והגשה"],              accent: "border-r-4 border-emerald-400", bar: "bg-emerald-500", tint: "bg-emerald-50" },
};

const QUICK = [
  { key: "guide",     icon: "🧾", label: "מדריך החקר",      desc: "שלבים וטיפים",     bg: "bg-teal-50 text-teal-700 border-teal-200" },
  { key: "rubric",    icon: "🏆", label: "מחוון הערכה",      desc: "קריטריונים",       bg: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "sources",   icon: "📂", label: "בנק מקורות",       desc: "חוקים ונתונים",   bg: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "portfolio", icon: "📓", label: "מחברת המסע",       desc: "כל התשובות",       bg: "bg-violet-50 text-violet-700 border-violet-200" },
];

const CivicsJourneyPage = () => {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const decoded = decodeURIComponent(subjectName || "אזרחות");
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: progress = [] } = useStudentProgress(studentId);

  const subjectData = courseContent["אזרחות"];
  const parts = subjectData?.parts ?? [];

  const coveredTopics: string[] = useMemo(() => {
    const sp = progress.find((p: any) => p.subjects?.subject_name === "אזרחות");
    return sp?.covered_topics ?? [];
  }, [progress]);

  const isPartDone = (partId: string) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return false;
    const titles = part.units.flatMap(u => u.items.map(i => i.title));
    return titles.length > 0 && titles.every(t => coveredTopics.includes(t));
  };

  const stationsDone = parts.filter(p => isPartDone(p.id)).length;
  const pct = parts.length > 0 ? Math.round((stationsDone / parts.length) * 100) : 0;

  const goToPart = (partId: string) =>
    navigate(`/subjects/${encodeURIComponent(decoded)}/${partId}`);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 pb-24 lg:pb-10" dir="rtl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-5 flex-wrap">
        <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors">בית</button>
        <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
        <button onClick={() => navigate("/subjects")} className="hover:text-foreground transition-colors">מקצועות</button>
        <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
        <button onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}`)} className="hover:text-foreground transition-colors">{decoded}</button>
        <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
        <button onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}/civics-30`)} className="hover:text-foreground transition-colors">מטלת ביצוע</button>
        <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
        <span className="text-foreground font-medium">מסע חקר אזרחי</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🗺️</span>
          <div>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight leading-tight">המסלול שלי</h1>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">מסע חקר אזרחי · מטלת ביצוע 30%</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}/civics-30`)}
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          חזרה
        </button>
      </div>

      {/* Progress card */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-7 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-foreground text-[15px]">התקדמות במסלול</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">{stationsDone}/{parts.length} שלבים הושלמו</p>
          </div>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(hsl(180,55%,42%) ${pct * 3.6}deg, hsl(180,30%,92%) 0deg)`,
              boxShadow: "0 2px 12px hsl(180,40%,40% / 0.25)",
            }}
          >
            <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center">
              <span className="text-[11px] font-bold text-teal-700 tabular-nums">{pct}%</span>
            </div>
          </div>
        </div>
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-l from-teal-500 to-cyan-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        {pct === 100 && <p className="mt-3 text-emerald-600 font-bold text-[12.5px] text-center">🎉 כל הכבוד! השלמתם את המסע כולו</p>}
      </div>

      {/* Stations grid */}
      <h2 className="font-bold text-foreground text-[14px] mb-3 flex items-center gap-2">
        <span>⚖️</span> שלבי החקר האזרחי
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {parts.map((part, i) => {
          const meta = STATION_META[part.id] ?? { emoji: "📌", icon: Target, skills: [], accent: "border-r-4 border-border", bar: "bg-primary", tint: "bg-muted" };
          const done = isPartDone(part.id);
          const prevDone = i === 0 || isPartDone(parts[i - 1].id);
          const canGo = done || prevDone;
          const Icon = meta.icon;

          return (
            <button
              key={part.id}
              onClick={() => canGo && goToPart(part.id)}
              disabled={!canGo}
              className={`relative overflow-hidden bg-card text-right p-4 rounded-2xl border border-border ${meta.accent} group transition-all
                ${done ? "bg-emerald-50/40" : ""}
                ${!canGo ? "opacity-40 cursor-not-allowed" : "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"}`}
            >
              <span className="absolute -left-1 -bottom-1 text-5xl opacity-[0.06] group-hover:opacity-10 transition-opacity select-none pointer-events-none">
                {meta.emoji}
              </span>

              <div className="flex items-start justify-between mb-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${done ? "bg-emerald-500" : meta.bar}`}
                >
                  {done ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                {!canGo && <Lock size={13} className="text-muted-foreground/40" />}
                {done && (
                  <span className="text-[9.5px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                    הושלם ✓
                  </span>
                )}
              </div>

              <p className="text-[9.5px] font-bold text-teal-700 uppercase tracking-wide mb-0.5">{part.weight ?? `שלב ${i + 1}`}</p>
              <p className="font-bold text-foreground text-[13px] leading-tight mb-1 flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.6} />
                {part.title}
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug mb-2 line-clamp-2">{part.description}</p>

              <div className="flex flex-wrap gap-1">
                {meta.skills.slice(0, 2).map((sk) => (
                  <span key={sk} className="text-[9px] bg-muted/70 text-foreground/70 px-1.5 py-0.5 rounded-full font-medium">
                    {sk}
                  </span>
                ))}
              </div>

              {canGo && !done && (
                <ArrowRight
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity rotate-180"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick links */}
      <h2 className="font-bold text-foreground text-[14px] mb-3 flex items-center gap-2">
        <span>🔗</span> כלים ומשאבים
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK.map(({ key, icon, label, desc, bg }) => (
          <button
            key={key}
            onClick={() => {
              // First module hosts the materials & rubric for now
              goToPart("civ-1");
            }}
            className={`rounded-2xl p-4 border text-right transition-all hover:shadow-md hover:-translate-y-0.5 ${bg}`}
          >
            <p className="text-xl mb-1">{icon}</p>
            <p className="font-bold text-[12.5px] leading-tight">{label}</p>
            <p className="text-[11px] opacity-70 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* Helper search hook usage */}
      <Search className="hidden" />
    </div>
  );
};

export default CivicsJourneyPage;
