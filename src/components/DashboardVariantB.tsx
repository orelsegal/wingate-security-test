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

const DashboardVariantB = ({ embedded = false }: Props) => {
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
      <section className="mb-8 md:mb-10">
        {/* Live date */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
          </span>
          <span>{new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-[28px] md:text-[32px] font-bold text-foreground tracking-tight leading-tight">
              {isTeacher ? labels.pages.adminDashboard.titleTeacher : labels.pages.adminDashboard.titleAdmin}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              {labels.pages.adminDashboard.subtitle}
              {user?.role === "coach" && ` · ענף ${user.scopeFilter?.[0]}`}
            </p>
          </div>

          {/* Controls row: filter + export */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0 self-start">
            {/* Status filter */}
            <label className="flex items-center gap-2 h-9 px-3.5 rounded-xl border border-border bg-card text-[12px] cursor-pointer hover:border-primary/30 transition-colors">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
              <span className="text-muted-foreground font-medium">פילטר:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterValue)}
                className="bg-transparent text-foreground border-0 outline-none cursor-pointer font-medium text-[12px] pr-1"
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
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {/* Card 1 — total students */}
          <div className="card-premium border-r-2 border-r-primary/40 p-5 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-muted-foreground">ספורטאים</span>
              <Users className="h-3.5 w-3.5 text-muted-foreground/30" strokeWidth={1.5} />
            </div>
            <p className="text-[40px] md:text-[46px] font-bold text-foreground leading-none tracking-tight font-stat">
              {totalStudents}
            </p>
            <p className="text-[12px] font-semibold text-muted-foreground mt-2.5">פעילים במערכת</p>
          </div>

          {/* Card 2 — average score */}
          <div className="card-premium border-r-2 border-r-primary/40 p-5 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-muted-foreground">ממוצע כללי</span>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/30" strokeWidth={1.5} />
            </div>
            <p className="text-[40px] md:text-[46px] font-bold text-foreground leading-none tracking-tight font-stat">
              {avgScore}
            </p>
            <p className="text-[12px] font-semibold text-muted-foreground mt-2.5">ממוצע משוקלל</p>
          </div>

          {/* Card 3 — on track (green dot) */}
          <div className="card-premium border-r-2 border-r-success/60 p-5 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-muted-foreground">במסלול</span>
              <span className="w-3 h-3 rounded-full bg-success ring-1 ring-success/20" />
            </div>
            <p className="text-[40px] md:text-[46px] font-bold text-foreground leading-none tracking-tight font-stat">
              {greenCount}
            </p>
            <p className="text-[12px] font-semibold text-muted-foreground mt-2.5">
              {totalStudents ? Math.round((greenCount / totalStudents) * 100) : 0}% מהספורטאים
            </p>
          </div>

          {/* Card 4 — needs attention (orange dot) */}
          <div className="card-premium border-r-2 border-r-warning/50 p-5 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-muted-foreground">דורשים טיפול</span>
              <span className="w-3 h-3 rounded-full bg-warning ring-1 ring-warning/20" />
            </div>
            <p className="text-[40px] md:text-[46px] font-bold text-foreground leading-none tracking-tight font-stat">
              {yellowCount + redCount}
            </p>
            <p className="text-[12px] font-semibold text-muted-foreground mt-2.5">
              {yellowCount} פערים · {redCount} בסיכון
            </p>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          SECTION 3 — DISTRIBUTION BAR
      ══════════════════════════════════════════ */}
      {!isTeacher && totalStudents > 0 && (
        <section className="card-premium p-5 md:p-6 mb-8 md:mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-bold text-foreground">התפלגות סטטוס כולל</h2>
            <span className="text-[11px] text-muted-foreground/60">{totalStudents} ספורטאים</span>
          </div>

          {/* Bold thick bar with full-saturation segments */}
          <div className="flex h-4 rounded-lg overflow-hidden bg-muted/60 gap-1 mb-4">
            {greenPct > 0 && (
              <div className="bg-success rounded-s-lg transition-all duration-700" style={{ width: `${greenPct}%` }} />
            )}
            {yellowPct > 0 && (
              <div className="bg-warning transition-all duration-700" style={{ width: `${yellowPct}%` }} />
            )}
            {redPct > 0 && (
              <div className="bg-destructive rounded-e-lg transition-all duration-700" style={{ width: `${redPct}%` }} />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-5">
            {[
              { label: "במסלול",  count: greenCount,  cls: "bg-success"     },
              { label: "פערים",   count: yellowCount, cls: "bg-warning"     },
              { label: "בסיכון",  count: redCount,    cls: "bg-destructive" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${s.cls} shrink-0`} />
                <span className="text-[13px] font-semibold text-foreground">
                  <span className="tabular-nums">{s.count}</span>
                  <span className="text-muted-foreground font-normal">/{totalStudents}</span>
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
      <section className="mb-10 md:mb-12">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[17px] font-bold text-foreground">
              {isTeacher ? "מעקב אקדמי לפי ענף" : "סטטוס לפי ענף"}
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">התפלגות מצב אקדמי לפי ענף ספורט</p>
          </div>
          <button
            onClick={() => navigate("/courses")}
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>כל המקצועות</span>
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="card-premium overflow-hidden">
          {/* ── Column headers (desktop) ── */}
          <div
            className="hidden md:grid px-5 py-3 border-b border-border bg-primary/8 gap-4 items-center"
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
              <span key={col.label} className={`text-[11px] font-bold uppercase tracking-wide text-muted-foreground ${col.cls}`}>
                {col.label}
              </span>
            ))}
          </div>

          {/* ── Branch rows ── */}
          {branchStats.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-12 text-center">אין נתונים להצגה</p>
          ) : branchStats.map((branch) => {
            const gPct = (branch.green / branch.total) * 100;
            const yPct = (branch.yellow / branch.total) * 100;
            const rPct = (branch.red / branch.total) * 100;
            return (
              <div key={branch.name} className="border-b border-border last:border-0">
                {/* Mobile row */}
                <div className="md:hidden px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[14px] font-bold text-foreground">{branch.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[16px] font-bold text-success">{branch.green}</span>
                      <span className="text-[16px] font-bold text-warning">{branch.yellow}</span>
                      {branch.red > 0 && <span className="text-[16px] font-bold text-destructive">{branch.red}</span>}
                      <StatusBadge type={branch.overall} />
                    </div>
                  </div>
                  <div className="flex h-4 rounded-lg overflow-hidden bg-muted/60 gap-1">
                    {gPct > 0 && <div className="bg-success rounded-s-lg" style={{ width: `${gPct}%` }} />}
                    {yPct > 0 && <div className="bg-warning" style={{ width: `${yPct}%` }} />}
                    {rPct > 0 && <div className="bg-destructive rounded-e-lg" style={{ width: `${rPct}%` }} />}
                  </div>
                </div>

                {/* Desktop row */}
                <div
                  className="hidden md:grid px-5 py-4 items-center gap-4"
                  style={{ gridTemplateColumns: "1fr 52px 80px 68px 68px 1fr 80px" }}
                >
                  <span className="text-[14px] font-bold text-foreground">{branch.name}</span>
                  <span className="text-[13px] text-muted-foreground text-center tabular-nums">{branch.total}</span>
                  <span className="text-[16px] font-bold text-success text-center tabular-nums">{branch.green}</span>
                  <span className={`text-[16px] font-bold text-center tabular-nums ${branch.yellow > 0 ? "text-warning" : "text-muted-foreground/20"}`}>
                    {branch.yellow}
                  </span>
                  <span className={`text-[16px] font-bold text-center tabular-nums ${branch.red > 0 ? "text-destructive" : "text-muted-foreground/20"}`}>
                    {branch.red}
                  </span>
                  {/* Progress bar */}
                  <div className="flex h-4 rounded-lg overflow-hidden bg-muted/60 gap-1">
                    {gPct > 0 && <div className="bg-success rounded-s-lg transition-all" style={{ width: `${gPct}%` }} />}
                    {yPct > 0 && <div className="bg-warning transition-all" style={{ width: `${yPct}%` }} />}
                    {rPct > 0 && <div className="bg-destructive rounded-e-lg transition-all" style={{ width: `${rPct}%` }} />}
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
            <h2 className="text-[17px] font-bold text-foreground">ספורטאים לטיפול</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {statusFilter === "all"
                ? "דורשים התייחסות של הצוות החינוכי"
                : `מוצגים: ${filterLabel[statusFilter]}`}
            </p>
          </div>
          <button
            onClick={() => navigate("/students?status=red")}
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>הצג הכל</span>
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="card-premium divide-y divide-border">
          {filteredAlerts.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-12 text-center">
              {statusFilter === "all" ? "אין ספורטאים לטיפול כרגע 🎉" : "אין תוצאות לפילטר הנבחר"}
            </p>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => navigate(`/students/${alert.id}`)}
                className="flex items-center justify-between px-5 md:px-6 py-4 cursor-pointer hover:bg-primary/5 transition-colors duration-100"
              >
                <div className="flex items-center gap-3">
                  <InitialsAvatar name={alert.name} size="sm" />
                  <div>
                    <p className="text-[13px] font-medium text-foreground leading-tight">{alert.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{alert.sport}</p>
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

export default DashboardVariantB;
