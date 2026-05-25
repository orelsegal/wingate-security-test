import { Users, TrendingUp, ChevronLeft, Loader2, Filter } from "lucide-react";
import InitialsAvatar from "@/components/InitialsAvatar";
import { useNavigate } from "react-router-dom";
import { useStudents, type StatusType } from "@/hooks/useStudents";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useUiLabels } from "@/context/UiLabelsContext";
import { useMemo, useState } from "react";
import DataExportTools from "@/components/DataExportTools";
import AIInsightsPanel from "@/components/AIInsightsPanel";

type FilterValue = "all" | "green" | "yellow" | "red";

interface Props {
  /** When true, omits outer padding so the parent container provides spacing. */
  embedded?: boolean;
}

const DashboardVariantA = ({ embedded = false }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { labels } = useUiLabels();
  const { data: students = [], isLoading } = useStudents();
  const [statusFilter, setStatusFilter] = useState<FilterValue>("all");

  /* ── Aggregate data ── */
  const branchStats = useMemo(() => {
    const map = new Map<string, { green: number; yellow: number; red: number }>();
    students.forEach((s) => {
      const b = s.sport;
      if (!map.has(b)) map.set(b, { green: 0, yellow: 0, red: 0 });
      const entry = map.get(b)!;
      if (s.overall_status === "green") entry.green++;
      else if (s.overall_status === "yellow") entry.yellow++;
      else entry.red++;
    });
    return Array.from(map.entries()).map(([name, counts]) => ({
      name,
      ...counts,
      total: counts.green + counts.yellow + counts.red,
      overall: (counts.red > 0 ? "red" : counts.yellow > 0 ? "yellow" : "green") as StatusType,
    }));
  }, [students]);

  const totalStudents = students.length;
  const redCount   = students.filter(s => s.overall_status === "red").length;
  const yellowCount = students.filter(s => s.overall_status === "yellow").length;
  const greenCount  = students.filter(s => s.overall_status === "green").length;
  const avgScore = totalStudents > 0
    ? (students.reduce((sum, s) => sum + (s.avg_score || 0), 0) / totalStudents).toFixed(1)
    : "—";

  /* Filter applied to the alerts list */
  const filteredAlerts = useMemo(() => {
    const base = students
      .filter(s => s.overall_status === "red" || s.overall_status === "yellow")
      .sort((a, b) => (a.overall_status === "red" && b.overall_status !== "red" ? -1 : 1))
      .slice(0, 8)
      .map(s => ({ id: s.id, name: s.full_name, sport: s.sport, status: s.overall_status as StatusType }));
    if (statusFilter === "all") return base;
    return base.filter(a => a.status === statusFilter);
  }, [students, statusFilter]);

  const isTeacher = user?.role === "teacher";
  const greenPct  = totalStudents ? (greenCount / totalStudents) * 100 : 0;
  const yellowPct = totalStudents ? (yellowCount / totalStudents) * 100 : 0;
  const redPct    = totalStudents ? (redCount / totalStudents) * 100 : 0;

  const filterLabel: Record<FilterValue, string> = {
    all:    "כל הסטטוסים",
    green:  "במסלול בלבד",
    yellow: "פערים בלבד",
    red:    "בסיכון בלבד",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={embedded ? "max-w-[1400px]" : "p-5 md:p-8 lg:p-10 max-w-[1400px]"} dir="rtl">

      {/* ══════════════════════════════════════════
          SECTION 1 — PAGE HEADER
      ══════════════════════════════════════════ */}
      <section className="mb-12 md:mb-16">
        {/* Live date */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success/60" />
          </span>
          <span>{new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-light text-foreground/70 tracking-tight leading-tight">
              {isTeacher ? labels.pages.adminDashboard.titleTeacher : labels.pages.adminDashboard.titleAdmin}
            </h1>
            <p className="text-[12px] font-light text-muted-foreground mt-1.5">
              {labels.pages.adminDashboard.subtitle}
              {user?.role === "coach" && ` · ענף ${user.scopeFilter?.[0]}`}
            </p>
          </div>

          {/* Controls row: filter + export */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0 self-start">
            {/* Status filter */}
            <label className="flex items-center gap-2 h-9 px-3.5 rounded-xl border border-border/30 bg-muted/30 text-[12px] cursor-pointer hover:border-border/50 transition-colors">
              <Filter className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
              <span className="text-muted-foreground/60 font-light">פילטר:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterValue)}
                className="bg-transparent text-foreground/70 border-0 outline-none cursor-pointer font-light text-[12px] pr-1"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="green">במסלול בלבד</option>
                <option value="yellow">פערים בלבד</option>
                <option value="red">בסיכון בלבד</option>
              </select>
            </label>

            {/* Export */}
            {(user?.role === "admin" || user?.role === "teacher" || user?.role === "coach") && (
              <DataExportTools
                students={students}
                label="כל הספורטאים"
                contextLabel="כל המערכת"
                showImport
              />
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 2 — 4 KPI CARDS
      ══════════════════════════════════════════ */}
      {!isTeacher && (
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-12 md:mb-16">
          {/* Card 1 — total students */}
          <div className="bg-muted/30 rounded-[var(--radius)] p-5 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-muted-foreground/50">ספורטאים</span>
              <Users className="h-3.5 w-3.5 text-muted-foreground/20" strokeWidth={1.5} />
            </div>
            <p className="text-[28px] font-light text-foreground leading-none tabular-nums font-stat">
              {totalStudents}
            </p>
            <p className="text-[11px] font-light text-muted-foreground/50 mt-2.5">פעילים במערכת</p>
          </div>

          {/* Card 2 — average score */}
          <div className="bg-muted/30 rounded-[var(--radius)] p-5 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-muted-foreground/50">ממוצע כללי</span>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/20" strokeWidth={1.5} />
            </div>
            <p className="text-[28px] font-light text-foreground leading-none tabular-nums font-stat">
              {avgScore}
            </p>
            <p className="text-[11px] font-light text-muted-foreground/50 mt-2.5">ממוצע משוקלל</p>
          </div>

          {/* Card 3 — on track */}
          <div className="bg-muted/30 rounded-[var(--radius)] p-5 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-muted-foreground/50">במסלול</span>
            </div>
            <p className="text-[28px] font-light text-foreground leading-none tabular-nums font-stat">
              {greenCount}
            </p>
            <p className="text-[11px] font-light text-muted-foreground/50 mt-2.5">
              {totalStudents ? Math.round((greenCount / totalStudents) * 100) : 0}% מהספורטאים
            </p>
          </div>

          {/* Card 4 — needs attention */}
          <div className="bg-muted/30 rounded-[var(--radius)] p-5 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-muted-foreground/50">דורשים טיפול</span>
            </div>
            <p className="text-[28px] font-light text-foreground leading-none tabular-nums font-stat">
              {yellowCount + redCount}
            </p>
            <p className="text-[11px] font-light text-muted-foreground/50 mt-2.5">
              {yellowCount} פערים · {redCount} בסיכון
            </p>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          SECTION 3 — DISTRIBUTION BAR
      ══════════════════════════════════════════ */}
      {!isTeacher && totalStudents > 0 && (
        <section className="bg-muted/30 rounded-[var(--radius)] p-5 md:p-6 mb-12 md:mb-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] uppercase tracking-[0.15em] font-medium text-muted-foreground/50">התפלגות סטטוס כולל</h2>
            <span className="text-[11px] font-light text-muted-foreground/40">{totalStudents} ספורטאים</span>
          </div>

          {/* Hairline bar, no gap, no rounding */}
          <div className="flex h-[2px] rounded-none overflow-hidden bg-muted/60 mb-4">
            {greenPct > 0 && (
              <div className="bg-success/35 transition-all duration-700" style={{ width: `${greenPct}%` }} />
            )}
            {yellowPct > 0 && (
              <div className="bg-warning/35 transition-all duration-700" style={{ width: `${yellowPct}%` }} />
            )}
            {redPct > 0 && (
              <div className="bg-destructive/30 transition-all duration-700" style={{ width: `${redPct}%` }} />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-5">
            {[
              { label: "במסלול",  count: greenCount,  cls: "bg-success/30"     },
              { label: "פערים",   count: yellowCount, cls: "bg-warning/30"     },
              { label: "בסיכון",  count: redCount,    cls: "bg-destructive/25" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${s.cls} shrink-0`} />
                <span className="text-[11px] font-light text-muted-foreground/60">
                  <span className="text-foreground/60 tabular-nums">{s.count}</span>
                  <span className="text-muted-foreground/30">/{totalStudents}</span>
                  {" "}{s.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          SECTION 4 — AI INSIGHTS (single instance)
      ══════════════════════════════════════════ */}
      {(user?.role === "admin" || user?.role === "teacher" || user?.role === "coach") && (
        <AIInsightsPanel students={students} role={user.role} navigate={navigate} />
      )}

      {/* ══════════════════════════════════════════
          SECTION 5 — BRANCH STATUS TABLE
      ══════════════════════════════════════════ */}
      <section className="mb-12 md:mb-16">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.15em] font-medium text-muted-foreground/50">
              {isTeacher ? "מעקב אקדמי לפי ענף" : "סטטוס לפי ענף"}
            </h2>
            <p className="text-[11px] font-light text-muted-foreground/50 mt-1">התפלגות מצב אקדמי לפי ענף ספורט</p>
          </div>
          <button
            onClick={() => navigate("/courses")}
            className="inline-flex items-center gap-1 text-[11px] font-light text-muted-foreground/50 hover:text-foreground/60 transition-colors"
          >
            <span>כל המקצועות</span>
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="bg-muted/30 rounded-[var(--radius)] overflow-hidden">
          {/* ── Column headers (desktop) ── */}
          <div
            className="hidden md:grid px-5 py-3 border-b border-border/30 bg-transparent gap-4 items-center"
            style={{ gridTemplateColumns: "1fr 52px 80px 68px 68px 1fr 80px" }}
          >
            {[
              { label: "ענף",        cls: "text-start" },
              { label: 'סה"כ',      cls: "text-center" },
              { label: "במסלול",    cls: "text-center" },
              { label: "פערים",     cls: "text-center" },
              { label: "בסיכון",    cls: "text-center" },
              { label: "התפלגות",   cls: "" },
              { label: "סטטוס",     cls: "text-center" },
            ].map(col => (
              <span key={col.label} className={`text-[10px] uppercase tracking-[0.15em] font-medium text-muted-foreground/50 ${col.cls}`}>
                {col.label}
              </span>
            ))}
          </div>

          {/* ── Branch rows ── */}
          {branchStats.length === 0 ? (
            <p className="text-[12px] font-light text-muted-foreground/50 py-12 text-center">אין נתונים להצגה</p>
          ) : branchStats.map((branch) => {
            const gPct = (branch.green / branch.total) * 100;
            const yPct = (branch.yellow / branch.total) * 100;
            const rPct = (branch.red / branch.total) * 100;
            return (
              <div key={branch.name} className="border-b border-border/30 last:border-0">
                {/* Mobile row */}
                <div className="md:hidden px-4 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-light text-foreground/70">{branch.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-light text-muted-foreground">{branch.green}</span>
                      <span className="text-[12px] font-light text-muted-foreground">{branch.yellow}</span>
                      {branch.red > 0 && <span className="text-[12px] font-light text-muted-foreground">{branch.red}</span>}
                      <StatusBadge type={branch.overall} />
                    </div>
                  </div>
                  <div className="flex h-[2px] rounded-none overflow-hidden bg-muted/60">
                    {gPct > 0 && <div className="bg-success/35" style={{ width: `${gPct}%` }} />}
                    {yPct > 0 && <div className="bg-warning/35" style={{ width: `${yPct}%` }} />}
                    {rPct > 0 && <div className="bg-destructive/30" style={{ width: `${rPct}%` }} />}
                  </div>
                </div>

                {/* Desktop row */}
                <div
                  className="hidden md:grid px-5 py-5 items-center gap-4"
                  style={{ gridTemplateColumns: "1fr 52px 80px 68px 68px 1fr 80px" }}
                >
                  <span className="text-[12px] font-light text-foreground/70">{branch.name}</span>
                  <span className="text-[12px] font-light text-muted-foreground text-center tabular-nums">{branch.total}</span>
                  <span className="text-[12px] font-light text-muted-foreground text-center tabular-nums">{branch.green}</span>
                  <span className="text-[12px] font-light text-muted-foreground text-center tabular-nums">
                    {branch.yellow}
                  </span>
                  <span className="text-[12px] font-light text-muted-foreground text-center tabular-nums">
                    {branch.red}
                  </span>
                  {/* Hairline progress bar */}
                  <div className="flex h-[2px] rounded-none overflow-hidden bg-muted/60">
                    {gPct > 0 && <div className="bg-success/35 transition-all" style={{ width: `${gPct}%` }} />}
                    {yPct > 0 && <div className="bg-warning/35 transition-all" style={{ width: `${yPct}%` }} />}
                    {rPct > 0 && <div className="bg-destructive/30 transition-all" style={{ width: `${rPct}%` }} />}
                  </div>
                  <div className="flex justify-center">
                    <StatusBadge type={branch.overall} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 6 — STUDENTS NEEDING ATTENTION
      ══════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.15em] font-medium text-muted-foreground/50">ספורטאים לטיפול</h2>
            <p className="text-[11px] font-light text-muted-foreground/50 mt-1">
              {statusFilter === "all"
                ? "דורשים התייחסות של הצוות החינוכי"
                : `מוצגים: ${filterLabel[statusFilter]}`}
            </p>
          </div>
          <button
            onClick={() => navigate("/students?status=red")}
            className="inline-flex items-center gap-1 text-[11px] font-light text-muted-foreground/50 hover:text-foreground/60 transition-colors"
          >
            <span>הצג הכל</span>
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="bg-muted/30 rounded-[var(--radius)]">
          {filteredAlerts.length === 0 ? (
            <p className="text-[12px] font-light text-muted-foreground/50 py-12 text-center">
              {statusFilter === "all" ? "אין ספורטאים לטיפול כרגע 🎉" : "אין תוצאות לפילטר הנבחר"}
            </p>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => navigate(`/students/${alert.id}`)}
                className="flex items-center justify-between px-5 md:px-6 py-5 cursor-pointer border-b border-border/20 last:border-0 transition-colors duration-100"
              >
                <div className="flex items-center gap-3">
                  <InitialsAvatar name={alert.name} size="sm" />
                  <div>
                    <p className="text-[12px] font-light text-foreground/70 leading-tight">{alert.name}</p>
                    <p className="text-[11px] font-light text-muted-foreground/50 mt-0.5">{alert.sport}</p>
                  </div>
                </div>
                <StatusBadge type={alert.status} />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardVariantA;
