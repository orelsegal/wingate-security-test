import { Users, BookOpen, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
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

  // Role-based data isolation
  const scopedStudents = useMemo(() => {
    if (!user) return studentsData;
    if (user.role === "parent") return studentsData.filter(s => user.scopeFilter?.includes(s.id));
    if (user.role === "coach") return studentsData.filter(s => user.scopeFilter?.includes(s.branch));
    return studentsData; // admin, teacher
  }, [user]);

  const scopedBranches = useMemo(() => {
    if (user?.role === "coach") return branches.filter(b => user.scopeFilter?.includes(b.name));
    return branches;
  }, [user]);

  const totalStudents = scopedStudents.length;
  const totalSubjects = 6;
  const totalIndicators = totalStudents * totalSubjects;
  const redCount = scopedStudents.filter(s => s.status === "red").length;
  const avgScore = totalStudents > 0
    ? (scopedStudents.reduce((sum, s) => sum + s.avg, 0) / totalStudents).toFixed(1)
    : "—";

  const recentAlerts = scopedStudents
    .filter(s => s.status === "red" || s.status === "yellow")
    .slice(0, 5)
    .map(s => ({ name: s.name, sport: s.branch, status: s.status }));

  // Teacher: show only subjects-related view (no full dashboard stats)
  const isTeacher = user?.role === "teacher";

  const stats = [
    { label: "ספורטאים", value: String(totalStudents), icon: Users, subtitle: "רשומים במערכת", description: "סה״כ ספורטאים פעילים" },
    { label: "מדדי מעקב", value: String(totalIndicators), icon: BarChart3, subtitle: `${totalStudents} ספורטאים × ${totalSubjects} מקצועות`, description: "נקודות בקרה אקדמיות" },
    { label: "ממוצע כללי", value: avgScore, icon: TrendingUp, subtitle: "ממוצע משוקלל", description: "ממוצע משוקלל כלל המקצועות" },
    { label: "בסיכון", value: String(redCount), icon: AlertTriangle, subtitle: "דורשים טיפול", description: "ספורטאים עם פערים משמעותיים" },
  ];

  return (
    <div className="p-5 md:p-10 lg:p-12 space-y-8 md:space-y-10 max-w-[1400px]">
      {/* Live status strip */}
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
        <span>מצב עדכני להיום &middot; {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</span>
      </div>

      {/* Page Title + Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-4">
        <div className="space-y-1.5">
          <h2 className="text-xl md:text-[1.65rem] font-semibold text-foreground tracking-tight">
            {isTeacher ? "מעקב מקצועות לימוד" : "מפת מצב לימודית"}
          </h2>
          <p className="text-muted-foreground text-[13px] md:text-sm">
            תמונת מצב עדכנית לפי מקצועות &middot; סמסטר א׳ תשפ״ה
            {user?.role === "coach" && ` · ענף ${user.scopeFilter?.[0]}`}
          </p>
        </div>

        {redCount > 0 && (
          <button
            onClick={() => navigate("/students?status=red")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-[13px] font-medium hover:bg-destructive/15 transition-colors duration-150 shrink-0 self-start sm:self-auto"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>הצג ספורטאים בסיכון</span>
            <span className="px-1.5 py-0.5 rounded-md bg-destructive/15 text-[11px] font-semibold">{redCount}</span>
          </button>
        )}
      </div>

      {/* Stats Grid - hidden for teacher, show only subject stats */}
      {!isTeacher && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {stats.map((stat) => (
            <div key={stat.label} className="card-premium p-5 md:p-7" title={stat.description}>
              <div className="flex items-start justify-between mb-4 md:mb-5">
                <div className="p-2.5 bg-accent rounded-xl">
                  <stat.icon className="h-[18px] w-[18px] text-primary" />
                </div>
              </div>
              <p className="text-[13px] text-muted-foreground leading-tight">{stat.label}</p>
              <p className="text-[28px] md:text-[34px] font-semibold text-foreground mt-1.5 leading-none tracking-tight">
                {stat.value}
              </p>
              <p className="text-[12px] text-muted-foreground mt-2">{stat.subtitle}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1 leading-snug">{stat.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
        {/* Traffic Light by Branch */}
        <div className="lg:col-span-3 card-premium p-5 md:p-8">
          <div className="mb-7 md:mb-8">
            <h3 className="text-[15px] md:text-base font-semibold text-foreground">
              {isTeacher ? "מעקב אקדמי לפי ענף" : "סטטוס כולל לפי ענף"}
            </h3>
            <p className="text-[13px] text-muted-foreground mt-1">
              התפלגות מצב אקדמי בכל ענף
            </p>
          </div>

          <div className="space-y-1">
            {scopedBranches.map((branch, i) => {
              const total = branch.green + branch.yellow + branch.red;
              return (
                <div
                  key={branch.name}
                  className={`flex items-center justify-between py-4 ${
                    i < scopedBranches.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[13px] font-medium text-foreground w-20">{branch.name}</span>
                    <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
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
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-muted-foreground">{total}</span>
                    <StatusBadge type={branch.overall} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-6 pt-5 border-t border-border">
            {(["green", "yellow", "red"] as StatusType[]).map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={`w-[6px] h-[6px] rounded-full ${statusConfig[type].dotClass}`} />
                <span className="text-[12px] text-muted-foreground">{statusConfig[type].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="lg:col-span-2 card-premium p-5 md:p-8">
          <div className="mb-7 md:mb-8">
            <h3 className="text-[15px] md:text-base font-semibold text-foreground">
              ספורטאים לטיפול
            </h3>
            <p className="text-[13px] text-muted-foreground mt-1">
              דורשים התייחסות של הצוות החינוכי
            </p>
          </div>

          <div className="space-y-1">
            {recentAlerts.length === 0 ? (
              <p className="text-[13px] text-muted-foreground py-6 text-center">אין ספורטאים לטיפול בטווח הנוכחי</p>
            ) : (
              recentAlerts.map((alert, i) => (
                <div
                  key={alert.name}
                  className={`flex items-center justify-between py-3.5 ${
                    i < recentAlerts.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-[13px] font-medium text-foreground leading-tight">{alert.name}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{alert.sport}</p>
                    </div>
                  </div>
                  <StatusBadge type={alert.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
