import { useAuth } from "@/context/AuthContext";
import { useStudent, useStudentProgress } from "@/hooks/useStudents";
import { Loader2, Target, Hourglass, CheckCircle2, AlertCircle, BookOpen, Globe, Scale, Feather, Calculator, Activity, Landmark, Languages, ChevronLeft, AlertTriangle, Sparkles, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { openSubjectApp } from "@/lib/openSubjectApp";

/* ═══ Subject color/icon map ═══ */
const subjectMeta: Record<string, { icon: any; bg: string; fg: string; pill: string }> = {
  "תנ״ך":      { icon: BookOpen, bg: "bg-amber-50",   fg: "text-amber-700",   pill: "bg-amber-100 text-amber-800" },
  "היסטוריה":  { icon: Landmark, bg: "bg-rose-50",    fg: "text-rose-700",    pill: "bg-rose-100 text-rose-800" },
  "ספרות":     { icon: Feather,  bg: "bg-violet-50",  fg: "text-violet-700",  pill: "bg-violet-100 text-violet-800" },
  "לשון והבעה":{ icon: Languages,bg: "bg-emerald-50", fg: "text-emerald-700", pill: "bg-emerald-100 text-emerald-800" },
  "לשון":      { icon: Languages,bg: "bg-emerald-50", fg: "text-emerald-700", pill: "bg-emerald-100 text-emerald-800" },
  "אזרחות":    { icon: Scale,    bg: "bg-teal-50",    fg: "text-teal-700",    pill: "bg-teal-100 text-teal-800" },
  "אנגלית":    { icon: Globe,    bg: "bg-sky-50",     fg: "text-sky-700",     pill: "bg-sky-100 text-sky-800" },
  "מתמטיקה":   { icon: Calculator,bg:"bg-green-50",   fg: "text-green-700",   pill: "bg-green-100 text-green-800" },
  "חינוך גופני":{ icon: Activity, bg:"bg-yellow-50",  fg: "text-yellow-700",  pill: "bg-yellow-100 text-yellow-800" },
  "מבוא למדעים":{ icon: Lightbulb, bg:"bg-[hsl(45,35%,93%)]", fg: "text-[hsl(45,45%,42%)]", pill: "bg-amber-100 text-amber-800" },
};
const metaFor = (name: string) => subjectMeta[name] || { icon: BookOpen, bg: "bg-slate-50", fg: "text-slate-700", pill: "bg-slate-100 text-slate-800" };

/* ═══ Animated donut ═══ */
const Donut = ({ percent, total, completed }: { percent: number; total: number; completed: number }) => {
  const R = 70;
  const C = 2 * Math.PI * R;
  const off = C - (percent / 100) * C;
  return (
    <div className="relative w-[180px] h-[180px] shrink-0">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx="80" cy="80" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="14" />
        <circle cx="80" cy="80" r={R} fill="none" stroke="hsl(var(--success))" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={off} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[28px] font-bold text-foreground leading-none tabular-nums">{percent}%</p>
        <p className="text-[10px] text-muted-foreground mt-1.5">בדרך לתעודה</p>
        <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">{completed} / {total} יח״ל</p>
      </div>
    </div>
  );
};

const StudentHomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: student, isLoading } = useStudent(studentId);
  const { data: progress = [] } = useStudentProgress(studentId);

  // Derive metrics — show ALL canonical subjects, merging progress where it exists
  const ALL_SUBJECTS = ["תנ״ך", "לשון", "היסטוריה", "אנגלית", "מתמטיקה", "חינוך גופני", "ספרות", "אזרחות"];
  const UNITS_BY_SUBJECT: Record<string, number> = {
    "תנ״ך": 2, "לשון": 2, "היסטוריה": 2, "אנגלית": 5,
    "מתמטיקה": 5, "חינוך גופני": 1, "ספרות": 2, "אזרחות": 2,
  };
  const { totalUnits, completedUnits, remainingUnits, avgGrade, openTasks, perSubject } = useMemo(() => {
    const byName = new Map<string, any>();
    progress.forEach((p: any) => {
      const n = p.subjects?.subject_name || "";
      if (n) byName.set(n, p);
    });
    const subs = ALL_SUBJECTS.map((name) => {
      const p = byName.get(name) || (name === "לשון" ? byName.get("לשון והבעה") : undefined);
      const units = UNITS_BY_SUBJECT[name] ?? 2;
      const pct = p?.completion_percent || 0;
      return {
        name,
        pct,
        grade: p?.grade ?? null,
        status: p?.status as string,
        units,
        completed: +(units * pct / 100).toFixed(1),
        missing: (p?.missing_items || []).length,
      };
    });
    const tot = subs.reduce((s, x) => s + x.units, 0);
    const done = +subs.reduce((s, x) => s + x.completed, 0).toFixed(1);
    const graded = subs.filter(s => s.grade != null && s.grade > 0);
    return {
      totalUnits: tot,
      completedUnits: done,
      remainingUnits: +(tot - done).toFixed(1),
      avgGrade: graded.length ? Math.round(graded.reduce((s, x) => s + (x.grade as number), 0) / graded.length) : 0,
      openTasks: subs.reduce((s, x) => s + x.missing, 0),
      perSubject: subs,
    };
  }, [progress]);

  const overallPct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
  const targetPct = 14;

  // ── Derived status / risk / next-step (from perSubject already computed above) ──
  const redCount = perSubject.filter(s => s.status === "red").length;
  const yellowCount = perSubject.filter(s => s.status === "yellow").length;
  const atRisk = perSubject.filter(s => s.status === "red" || s.status === "yellow");
  const overallStatus: "green" | "yellow" | "red" =
    redCount > 0 ? "red" : yellowCount > 0 ? "yellow" : "green";
  // Most urgent subject first: red → yellow → in-progress → not-started → first.
  const nextSubject =
    perSubject.find(s => s.status === "red") ||
    perSubject.find(s => s.status === "yellow") ||
    perSubject.find(s => s.pct > 0 && s.pct < 100) ||
    perSubject.find(s => s.pct === 0) ||
    perSubject[0];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  if (!studentId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6" dir="rtl">
        <AlertCircle className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
        <p className="text-[14px] font-medium text-foreground">החשבון שלך עדיין לא מקושר לפרופיל תלמיד</p>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-[1200px] mx-auto" dir="rtl">
      {/* Title bar */}
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-[20px] font-semibold text-foreground tracking-tight">
          המסלול של <span className="text-primary">{student?.full_name || user?.name}</span>
          <span className="text-[12px] text-muted-foreground font-normal mr-2">תלמיד/ה</span>
        </h1>
      </div>


      {/* ── Status + next step hero ── */}
      <div className="bg-card rounded-3xl border border-border p-5 md:p-6 shadow-[var(--shadow-card)] mb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* My status */}
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              overallStatus === "green" ? "bg-success/10" : overallStatus === "yellow" ? "bg-warning/10" : "bg-destructive/10"
            }`}>
              {overallStatus === "green"
                ? <Sparkles className="h-5 w-5 text-success" strokeWidth={2} />
                : <AlertTriangle className={`h-5 w-5 ${overallStatus === "yellow" ? "text-warning" : "text-destructive"}`} strokeWidth={2} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-semibold text-foreground">המצב שלי</p>
                <StatusBadge type={overallStatus} />
              </div>
              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                {atRisk.length === 0
                  ? "כל הכבוד! את/ה במסלול בכל המקצועות 🎉"
                  : `${atRisk.length} מקצועות דורשים תשומת לב${redCount > 0 ? ` · ${redCount} בסיכון` : ""}${yellowCount > 0 ? ` · ${yellowCount} עם פערים` : ""}`}
              </p>
            </div>
          </div>
          {/* Next step */}
          {nextSubject && (
            <button
              onClick={() => navigate(`/subjects/${encodeURIComponent(nextSubject.name)}`)}
              className="group shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-white text-[13px] font-semibold bg-primary hover:bg-primary/90 transition-colors shadow-sm"
            >
              <span>הצעד הבא: {nextSubject.name}</span>
              <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Needs-attention chips — only red/yellow subjects */}
        {atRisk.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-[10.5px] font-medium text-muted-foreground mb-2">דורש תשומת לב</p>
            <div className="flex flex-wrap gap-2">
              {atRisk.map((s) => (
                <button
                  key={s.name}
                  onClick={() => navigate(`/subjects/${encodeURIComponent(s.name)}`)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-colors ${
                    s.status === "red"
                      ? "bg-destructive/8 text-destructive hover:bg-destructive/15"
                      : "bg-warning/10 text-warning hover:bg-warning/20"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.status === "red" ? "bg-destructive" : "bg-warning"}`} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Donut + Stat cards */}
      <div className="bg-card rounded-3xl border border-border p-5 md:p-6 shadow-[var(--shadow-card)] mb-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="flex justify-center md:justify-start">
            <Donut percent={overallPct} total={totalUnits} completed={completedUnits} />
          </div>
          {[
            { icon: Target,       label: "סך הכל", value: totalUnits,     unit: "יח״ל", bg: "bg-sky-50",     fg: "text-sky-600",     ring: "ring-sky-100" },
            { icon: Hourglass,    label: "נשארו",  value: remainingUnits, unit: "יח״ל", bg: "bg-orange-50",  fg: "text-orange-600",  ring: "ring-orange-100" },
            { icon: CheckCircle2, label: "הושלמו", value: completedUnits, unit: "יח״ל", bg: "bg-emerald-50", fg: "text-emerald-600", ring: "ring-emerald-100" },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} ring-1 ${s.ring} rounded-2xl p-5 text-center animate-fade-in-up`} style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex justify-end mb-3">
                <div className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center">
                  <s.icon className={`h-4 w-4 ${s.fg}`} strokeWidth={2} />
                </div>
              </div>
              <p className={`text-[11px] font-semibold ${s.fg} mb-1`}>{s.label}</p>
              <p className="text-[26px] font-bold text-foreground leading-none tabular-nums">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.unit}</p>
            </div>
          ))}
        </div>
      </div>



      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mb-5">
        <div className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)] flex items-center justify-between">
          <div>
            <p className="text-[10.5px] text-muted-foreground font-medium">ממוצע ציונים</p>
            <p className="text-[22px] font-bold text-foreground tabular-nums leading-none mt-1">{avgGrade || "—"}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-primary" strokeWidth={2} />
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)] flex items-center justify-between">
          <div>
            <p className="text-[10.5px] text-muted-foreground font-medium">מטלות פתוחות להגשה</p>
            <p className="text-[22px] font-bold text-foreground tabular-nums leading-none mt-1">{openTasks}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <Hourglass className="h-5 w-5 text-orange-600" strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Progress chart — minimal */}
      <div className="bg-card rounded-2xl border border-border p-5 md:p-6 shadow-[var(--shadow-card)] mb-7">
        <div className="flex items-baseline justify-between mb-5">
          <span className="text-[10.5px] text-muted-foreground">יעד שבועי {targetPct}%</span>
          <h2 className="text-[13px] font-semibold text-foreground">מהזינוק לקו הסיום</h2>
        </div>
        <div className="space-y-3">
          {perSubject.map((s, i) => {
            const onTrack = s.pct >= targetPct;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] text-foreground/80 w-24 shrink-0 text-end truncate">{s.name}</span>
                <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${onTrack ? "bg-foreground/80" : "bg-foreground/35"}`}
                    style={{ width: `${Math.max(s.pct, 1)}%` }}
                  />
                </div>
                <span className="text-[10.5px] font-medium text-muted-foreground tabular-nums w-10 text-end">{s.pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subjects in one view */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[10.5px] text-muted-foreground">לחץ על מקצוע כדי להיכנס למסלול הלמידה</p>
          <h2 className="text-[15px] font-semibold text-foreground">המקצועות במבט אחד</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {perSubject.map((s, i) => {
            const m = metaFor(s.name);
            const Icon = m.icon;
            const statusLabel = s.pct === 0 ? "טרם החל" : s.pct === 100 ? "הושלם" : "בתהליך";
            const statusBg = s.pct === 0 ? "bg-violet-100 text-violet-700" : s.pct === 100 ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700";
            return (
              <button key={i} onClick={() => navigate(`/subjects/${encodeURIComponent(s.name)}`)}
                className={`group ${m.bg} rounded-2xl border border-border/60 p-4 text-right shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up`}
                style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  {s.status === "green" || s.status === "yellow" || s.status === "red"
                    ? <StatusBadge type={s.status} />
                    : <span className={`text-[9.5px] font-medium px-2 py-0.5 rounded-full ${statusBg}`}>{statusLabel}</span>}
                  <div className="flex items-center gap-2">
                    <div>
                      <h3 className="text-[14px] font-semibold text-foreground leading-tight">{s.name}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.units} יח״ל</p>
                    </div>
                    <div className={`w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${m.fg}`} strokeWidth={2} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[14px] font-bold text-foreground tabular-nums">{s.pct}%</span>
                  <span className="text-[10px] text-muted-foreground">התקדמות</span>
                </div>
                <div className="h-1.5 bg-white/70 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full ${m.fg.replace("text-", "bg-")} transition-all duration-700`} style={{ width: `${s.pct}%` }} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px]">
                  <span className="text-muted-foreground">{s.grade != null ? `ציון: ${s.grade}` : "אין ציון עדיין"}</span>
                  <span className="text-muted-foreground">{s.missing > 0 ? `${s.missing} מטלות` : "לא נקבע מועד"}</span>
                </div>
              </button>
            );
          })}

          {/* מבוא למדעים — אפליקציה חיצונית (Phase A). כניסה גלויה אחת שפותחת
              את science2 בטאב חדש; אין מדדי התקדמות פנימיים למקצוע חיצוני. */}
          {(() => {
            const m = metaFor("מבוא למדעים");
            const Icon = m.icon;
            return (
              <button
                onClick={() => openSubjectApp("science")}
                className={`group ${m.bg} rounded-2xl border border-border/60 p-4 text-right shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">נפתח בטאב חדש</span>
                  <div className="flex items-center gap-2">
                    <div>
                      <h3 className="text-[14px] font-semibold text-foreground leading-tight">מבוא למדעים</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">קורס אינטראקטיבי</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center">
                      <Icon className={`h-4 w-4 ${m.fg}`} strokeWidth={2} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                  <span className="font-semibold text-foreground">כניסה לאפליקציה</span>
                  <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:-translate-x-0.5 transition-transform" strokeWidth={2} />
                </div>
              </button>
            );
          })()}
        </div>
      </section>

      <div className="mt-12 text-center">
        <span className="text-[8.5px] text-muted-foreground/30 tracking-wider">האקדמיה למצוינות · מכון וינגייט</span>
      </div>
    </div>
  );
};

export default StudentHomePage;
