import { Users, BookOpen, TrendingUp, AlertTriangle, BarChart3, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { statusConfig, studentsData } from "@/lib/studentData";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import type { StatusType } from "@/lib/studentData";
import { useMemo } from "react";

const branches = [
  { name: "שחייה", green: 18, yellow: 4, red: 1, overall: "green" as StatusType },
  { name: "טניס", green: 12, yellow: 6, red: 3, overall: "yellow" as StatusType },
  { name: "כדורסל", green: 22, yellow: 5, red: 2, overall: "green" as StatusType },
  { name: "אתלטיקה", green: 15, yellow: 7, red: 1, overall: "yellow" as StatusType },
  { name: "התעמלות", green: 10, yellow: 3, red: 0, overall: "green" as StatusType },
];

const DashboardContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const scopedStudents = useMemo(() => {
    if (!user) return studentsData;
    if (user.role === "parent") return studentsData.filter(s => user.scopeFilter?.includes(s.id));
    if (user.role === "coach") return studentsData.filter(s => user.scopeFilter?.includes(s.branch));
    return studentsData;
  }, [user]);

  const scopedBranches = useMemo(() => {
    if (user?.role === "coach") return branches.filter(b => user.scopeFilter?.includes(b.name));
    return branches;
  }, [user]);

  const totalStudents = scopedStudents.length;
  const totalSubjects = 7;
  const totalStatuses = totalStudents * totalSubjects;
  const redCount = scopedStudents.filter(s => s.status === "red").length;
  const yellowCount = scopedStudents.filter(s => s.status === "yellow").length;
  const greenCount = scopedStudents.filter(s => s.status === "green").length;
  const avgScore = totalStudents > 0
    ? (scopedStudents.reduce((sum, s) => sum + s.avg, 0) / totalStudents).toFixed(1)
    : "—";

  const recentAlerts = scopedStudents
    .filter(s => s.status === "red" || s.status === "yellow")
    .slice(0, 5)
    .map(s => ({ name: s.name, sport: s.branch, status: s.status, avatar: s.avatar }));

  const isTeacher = user?.role === "teacher";

  return (
    <div className="p-5 md:p-10 lg:p-12 max-w-[1400px]">

      {/* ═══════════════════════════════════════════════
          SECTION 1 — STATUS SUMMARY (top, prominent)
          ═══════════════════════════════════════════════ */}
      <section className="mb-10 md:mb-14">
        {/* Live indicator + date */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span>{new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-[22px] md:text-[26px] font-semibold text-foreground tracking-tight leading-tight">
              {isTeacher ? "מעקב מקצועות לימוד" : "מפת מצב לימודית"}
            </h2>
            <p className="text-muted-foreground text-[13px] mt-1.5">
              סמסטר א׳ תשפ״ה
              {user?.role === "coach" && ` · ענף ${user.scopeFilter?.[0]}`}
            </p>
          </div>
          {redCount > 0 && (
            <button
              onClick={() => navigate("/students?status=red")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/8 text-destructive text-[13px] font-medium hover:bg-destructive/12 transition-colors duration-150 shrink-0 self-start sm:self-auto"
            >
              <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
              <span>ספורטאים בסיכון</span>
              <span className="px-1.5 py-0.5 rounded-md bg-destructive/12 text-[11px] font-semibold">{redCount}</span>
            </button>
          )}
        </div>

        {/* Stats — large numbers, minimal chrome */}
        {!isTeacher && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[
              { label: "ספורטאים", value: String(totalStudents), icon: Users, sub: "פעילים במערכת" },
              { label: "סטטוסים לימודיים", value: String(totalStatuses), icon: BarChart3, sub: `${totalStudents} × ${totalSubjects} מקצועות` },
              { label: "ממוצע כללי", value: avgScore, icon: TrendingUp, sub: "ממוצע משוקלל" },
              { label: "בסיכון", value: String(redCount), icon: AlertTriangle, sub: "דורשים טיפול" },
            ].map((stat) => (
              <div key={stat.label} className="card-premium p-5 md:p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <stat.icon className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                  <span className="text-[12px] text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-[30px] md:text-[36px] font-semibold text-foreground leading-none tracking-tight">
                  {stat.value}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-2">{stat.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick status distribution bar */}
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

      {/* ═══════════════════════════════════════════════
          SECTION 2 — SUBJECTS OVERVIEW (middle)
          ═══════════════════════════════════════════════ */}
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
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="card-premium divide-y divide-border">
          {scopedBranches.map((branch) => {
            const total = branch.green + branch.yellow + branch.red;
            const greenPct = (branch.green / total) * 100;
            const yellowPct = (branch.yellow / total) * 100;
            const redPct = (branch.red / total) * 100;
            return (
              <div key={branch.name} className="flex items-center gap-4 px-5 md:px-6 py-4">
                <span className="text-[13px] font-medium text-foreground w-20 shrink-0">{branch.name}</span>

                {/* Mini stacked bar */}
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
                  <span className="text-[11px] text-muted-foreground/50">{total}</span>
                  <StatusBadge type={branch.overall} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          SECTION 3 — DETAILED BREAKDOWN (bottom)
          ═══════════════════════════════════════════════ */}
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
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="card-premium divide-y divide-border">
          {recentAlerts.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-10 text-center">אין ספורטאים לטיפול כרגע</p>
          ) : (
            recentAlerts.map((alert) => (
              <div
                key={alert.name}
                onClick={() => {
                  const s = studentsData.find(st => st.name === alert.name);
                  if (s) navigate(`/students/${s.id}`);
                }}
                className="flex items-center justify-between px-5 md:px-6 py-4 cursor-pointer hover:bg-accent/30 transition-colors duration-100"
              >
                <div className="flex items-center gap-3">
                  <img src={alert.avatar} alt={alert.name} className="w-8 h-8 rounded-full bg-accent shrink-0" />
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
