import { Users, TrendingUp, AlertTriangle, BarChart3, ChevronLeft, Loader2, Download } from "lucide-react";
import InitialsAvatar from "@/components/InitialsAvatar";
import { useNavigate } from "react-router-dom";
import { useStudents, statusConfig, type StatusType } from "@/hooks/useStudents";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useUiLabels } from "@/context/UiLabelsContext";
import { useMemo } from "react";
import DataExportTools from "@/components/DataExportTools";
import AIInsightsPanel from "@/components/AIInsightsPanel";
import EditableElement from "@/components/builder/EditableElement";
const DashboardContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { labels } = useUiLabels();
  const { data: students = [], isLoading } = useStudents();

  // Derive branch stats from real data
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
  const totalSubjects = 7;
  const totalStatuses = totalStudents * totalSubjects;
  const redCount = students.filter(s => s.overall_status === "red").length;
  const yellowCount = students.filter(s => s.overall_status === "yellow").length;
  const greenCount = students.filter(s => s.overall_status === "green").length;
  const avgScore = totalStudents > 0
    ? (students.reduce((sum, s) => sum + (s.avg_score || 0), 0) / totalStudents).toFixed(1)
    : "—";

  const recentAlerts = students
    .filter(s => s.overall_status === "red" || s.overall_status === "yellow")
    .slice(0, 5)
    .map(s => ({ id: s.id, name: s.full_name, sport: s.sport, status: s.overall_status as StatusType }));

  const isTeacher = user?.role === "teacher";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-5 md:p-10 lg:p-12 max-w-[1400px]">

      {/* ═══ SECTION 1 — STATUS SUMMARY ═══ */}
      <section className="mb-10 md:mb-14">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span>{new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <EditableElement
            id="dashboard.pageTitle"
            type="page-title"
            pageKey="admin-dashboard"
            defaultLabel={isTeacher ? labels.pages.adminDashboard.titleTeacher : labels.pages.adminDashboard.titleAdmin}
            defaultSubtitle={labels.pages.adminDashboard.subtitle}
          >
            {({ label, subtitle }) => (
              <div>
                <h2 className="text-[22px] md:text-[26px] font-semibold text-foreground tracking-tight leading-tight">
                  {label}
                </h2>
                <p className="text-muted-foreground text-[13px] mt-1.5">
                  {subtitle ?? labels.pages.adminDashboard.subtitle}
                  {user?.role === "coach" && ` · ענף ${user.scopeFilter?.[0]}`}
                </p>
              </div>
            )}
          </EditableElement>
          <div className="flex items-center gap-2 flex-wrap shrink-0 self-start sm:self-auto">
            {redCount > 0 && (
              <button
                onClick={() => navigate("/students?status=red")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/8 text-destructive text-[13px] font-medium hover:bg-destructive/12 transition-colors duration-150"
              >
                <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                <span>ספורטאים בסיכון</span>
                <span className="px-1.5 py-0.5 rounded-md bg-destructive/12 text-[11px] font-semibold">{redCount}</span>
              </button>
            )}
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

        {!isTeacher && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
            {[
              { key: "students", label: "ספורטאים", value: String(totalStudents), icon: Users, sub: "פעילים במערכת" },
              { key: "avg", label: "ממוצע כללי", value: avgScore, icon: TrendingUp, sub: "ממוצע משוקלל" },
              { key: "risk", label: "בסיכון", value: String(redCount), icon: AlertTriangle, sub: "דורשים טיפול" },
            ].map((stat) => (
              <EditableElement
                key={stat.key}
                id={`dashboard.statCard.${stat.key}`}
                type="card"
                pageKey="admin-dashboard"
                defaultLabel={stat.label}
                defaultSubtitle={stat.sub}
              >
                {({ label, subtitle, stylePresetClass }) => (
                  <div className={`card-premium card-accent-line p-5 md:p-6 ${stylePresetClass}`}>
                    <div className="flex items-center gap-2.5 mb-4">
                      <stat.icon className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                      <span className="text-[12px] text-muted-foreground">{label}</span>
                    </div>
                    <p className="text-[30px] md:text-[36px] font-semibold text-foreground leading-none tracking-tight font-stat">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-2">{subtitle ?? stat.sub}</p>
                  </div>
                )}
              </EditableElement>
            ))}
          </div>
        )}

        {!isTeacher && totalStudents > 0 && (
          <div className="mt-5 card-premium p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] text-muted-foreground">התפלגות סטטוס כולל</span>
              <span className="text-[11px] text-muted-foreground/50">{totalStudents} ספורטאים</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-accent gap-px">
              <div className="bg-success rounded-s-full transition-all duration-500" style={{ width: `${(greenCount / totalStudents) * 100}%` }} />
              <div className="bg-warning transition-all duration-500" style={{ width: `${(yellowCount / totalStudents) * 100}%` }} />
              <div className="bg-destructive rounded-e-full transition-all duration-500" style={{ width: `${(redCount / totalStudents) * 100}%` }} />
            </div>
            <div className="flex items-center gap-5 mt-3">
              {([
                { label: "במסלול", count: greenCount, type: "green" as StatusType },
                { label: "פערים", count: yellowCount, type: "yellow" as StatusType },
                { label: "בסיכון", count: redCount, type: "red" as StatusType },
              ]).map(s => (
                <div key={s.type} className="flex items-center gap-1.5">
                  <span className={`w-[6px] h-[6px] rounded-full ${statusConfig[s.type].dotClass}`} />
                  <span className="text-[11px] text-muted-foreground">{s.count} {s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ═══ AI INSIGHTS ═══ */}
      {(user?.role === "admin" || user?.role === "teacher" || user?.role === "coach") && (
        <AIInsightsPanel students={students} role={user.role} navigate={navigate} />
      )}

      {/* ═══ SECTION 2 — BRANCH OVERVIEW ═══ */}
      <section className="mb-10 md:mb-14">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[16px] font-semibold text-foreground">
              {isTeacher ? "מעקב אקדמי לפי ענף" : "סטטוס לפי ענף"}
            </h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">התפלגות מצב אקדמי</p>
          </div>
          <button
            onClick={() => navigate("/courses")}
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>כל המקצועות</span>
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="card-premium divide-y divide-border">
          {branchStats.map((branch) => {
            const greenPct = (branch.green / branch.total) * 100;
            const yellowPct = (branch.yellow / branch.total) * 100;
            const redPct = (branch.red / branch.total) * 100;
            return (
              <div key={branch.name} className="flex items-center gap-4 px-5 md:px-6 py-4">
                <span className="text-[13px] font-medium text-foreground w-20 shrink-0">{branch.name}</span>
                <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-accent gap-px">
                  <div className="bg-success rounded-s-full" style={{ width: `${greenPct}%` }} />
                  <div className="bg-warning" style={{ width: `${yellowPct}%` }} />
                  {redPct > 0 && <div className="bg-destructive rounded-e-full" style={{ width: `${redPct}%` }} />}
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground shrink-0 w-36 justify-end">
                  <span>{branch.green} במסלול</span>
                  <span className="text-border">·</span>
                  <span>{branch.yellow} פערים</span>
                  {branch.red > 0 && (
                    <>
                      <span className="text-border">·</span>
                      <span>{branch.red} בסיכון</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[11px] text-muted-foreground/50">{branch.total}</span>
                  <StatusBadge type={branch.overall} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ SECTION 3 — ALERTS ═══ */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[14px] font-medium text-foreground">ספורטאים לטיפול</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">דורשים התייחסות של הצוות החינוכי</p>
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
          {recentAlerts.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-10 text-center">אין ספורטאים לטיפול כרגע</p>
          ) : (
            recentAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => navigate(`/students/${alert.id}`)}
                className="flex items-center justify-between px-5 md:px-6 py-4 cursor-pointer hover:bg-accent/30 transition-colors duration-100"
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

export default DashboardContent;
