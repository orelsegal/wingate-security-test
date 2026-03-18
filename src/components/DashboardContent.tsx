import { Users, BookOpen, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { statusConfig, studentsData } from "@/lib/studentData";
import { StatusBadge } from "@/components/StatusBadge";
import type { StatusType } from "@/lib/studentData";

const totalStudents = studentsData.length;
const totalSubjects = 6;
const totalIndicators = totalStudents * totalSubjects;

const stats = [
  { label: "ספורטאים", value: String(totalStudents), icon: Users, subtitle: "רשומים במערכת", description: "מספר הספורטאים הפעילים באקדמיה" },
  { label: "מדדי התקדמות", value: String(totalIndicators), icon: BarChart3, subtitle: `${totalStudents} ספורטאים × ${totalSubjects} מקצועות`, description: "סה״כ נקודות מעקב אקדמיות" },
  { label: "ממוצע ציונים", value: "82.4", icon: TrendingUp, subtitle: "+1.2 מהסמסטר הקודם", description: "ממוצע משוקלל כלל המקצועות" },
  { label: "התראות", value: "7", icon: AlertTriangle, subtitle: "ספורטאים בסיכון", description: "דורשים התייחסות מיידית" },
];

const branches = [
  { name: "שחייה", green: 18, yellow: 4, red: 1, overall: "green" as StatusType },
  { name: "טניס", green: 12, yellow: 6, red: 3, overall: "yellow" as StatusType },
  { name: "כדורסל", green: 22, yellow: 5, red: 2, overall: "green" as StatusType },
  { name: "אתלטיקה", green: 15, yellow: 7, red: 1, overall: "yellow" as StatusType },
  { name: "התעמלות", green: 10, yellow: 3, red: 0, overall: "green" as StatusType },
];

const recentAlerts = [
  { name: "ליאה חשאי", sport: "אתלטיקה", status: "red" as StatusType },
  { name: "ניקול גולובנסקי", sport: "כדורסל", status: "red" as StatusType },
  { name: "יעל עטר", sport: "אתלטיקה", status: "red" as StatusType },
  { name: "אביתר נאור", sport: "שחייה", status: "yellow" as StatusType },
];

const DashboardContent = () => {
  return (
    <div className="p-5 md:p-10 lg:p-12 space-y-8 md:space-y-10 max-w-[1400px]">
      {/* Page Title */}
      <div className="space-y-1.5">
        <h2 className="text-xl md:text-[1.65rem] font-semibold text-foreground tracking-tight">
          מה המצב היום?
        </h2>
        <p className="text-muted-foreground text-[13px] md:text-sm">
          תמונת מצב אקדמית &middot; האקדמיה למצוינות בספורט &middot; סמסטר א׳ תשפ״ה
        </p>
      </div>

      {/* Stats Grid */}
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

      {/* Main Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
        {/* Traffic Light by Branch */}
        <div className="lg:col-span-3 card-premium p-5 md:p-8">
          <div className="mb-7 md:mb-8">
            <h3 className="text-[15px] md:text-base font-semibold text-foreground">
              מצב אקדמי לפי ענף
            </h3>
            <p className="text-[13px] text-muted-foreground mt-1">
              סטטוס כללי של כל ענף ספורט
            </p>
          </div>

          <div className="space-y-1">
            {branches.map((branch, i) => {
              const total = branch.green + branch.yellow + branch.red;
              return (
                <div
                  key={branch.name}
                  className={`flex items-center justify-between py-4 ${
                    i < branches.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[13px] font-medium text-foreground w-20">{branch.name}</span>
                    <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
                      <span>{branch.green} תקין</span>
                      <span className="text-border">·</span>
                      <span>{branch.yellow} במעקב</span>
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
              התראות אחרונות
            </h3>
            <p className="text-[13px] text-muted-foreground mt-1">
              ספורטאים שדורשים תשומת לב
            </p>
          </div>

          <div className="space-y-1">
            {recentAlerts.map((alert, i) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
