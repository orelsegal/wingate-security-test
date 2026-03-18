import { Users, BookOpen, TrendingUp, AlertTriangle } from "lucide-react";

const stats = [
  { label: "ספורטאים פעילים", value: "142", icon: Users, subtitle: "+3 החודש" },
  { label: "קורסים פעילים", value: "18", icon: BookOpen, subtitle: "סמסטר א׳" },
  { label: "ממוצע ציונים", value: "82.4", icon: TrendingUp, subtitle: "+1.2 מהסמסטר הקודם" },
  { label: "התראות", value: "7", icon: AlertTriangle, subtitle: "ספורטאים בסיכון" },
];

const recentAlerts = [
  { name: "יעל כהן", sport: "טניס", status: "אדום", color: "bg-destructive" },
  { name: "אורי לוי", sport: "שחייה", status: "כתום", color: "bg-warning" },
  { name: "נועם ברק", sport: "כדורסל", status: "כתום", color: "bg-warning" },
  { name: "מיכל אברהם", sport: "אתלטיקה", status: "אדום", color: "bg-destructive" },
];

const branches = [
  { name: "שחייה", green: 18, yellow: 4, red: 1 },
  { name: "טניס", green: 12, yellow: 6, red: 3 },
  { name: "כדורסל", green: 22, yellow: 5, red: 2 },
  { name: "אתלטיקה", green: 15, yellow: 7, red: 1 },
  { name: "התעמלות", green: 10, yellow: 3, red: 0 },
];

const DashboardContent = () => {
  return (
    <div className="p-5 md:p-10 lg:p-12 space-y-8 md:space-y-10 max-w-[1400px]">
      {/* Page Title */}
      <div className="space-y-1.5">
        <h2 className="text-xl md:text-[1.65rem] font-semibold text-foreground tracking-tight">
          סקירה כללית
        </h2>
        <p className="text-muted-foreground text-[13px] md:text-sm">
          סמסטר א׳ תשפ״ה &middot; עדכון אחרון: היום, 10:30
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className="card-premium p-5 md:p-7">
            <div className="flex items-start justify-between mb-4 md:mb-5">
              <div className="p-2.5 bg-accent rounded-xl">
                <stat.icon className="h-[18px] w-[18px] text-primary" />
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground leading-tight">{stat.label}</p>
            <p className="text-[28px] md:text-[34px] font-semibold text-foreground mt-1.5 leading-none tracking-tight">
              {stat.value}
            </p>
            <p className="text-[12px] text-muted-foreground mt-3">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Main Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
        {/* Traffic Light by Branch */}
        <div className="lg:col-span-3 card-premium p-5 md:p-8">
          <div className="mb-7 md:mb-8">
            <h3 className="text-[15px] md:text-base font-semibold text-foreground">
              מצב רמזור לפי ענף
            </h3>
            <p className="text-[13px] text-muted-foreground mt-1">
              התפלגות הסטטוס האקדמי של הספורטאים
            </p>
          </div>

          <div className="space-y-4">
            {branches.map((branch) => {
              const total = branch.green + branch.yellow + branch.red;
              const greenPct = (branch.green / total) * 100;
              const yellowPct = (branch.yellow / total) * 100;
              const redPct = (branch.red / total) * 100;

              return (
                <div key={branch.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-foreground">{branch.name}</span>
                    <span className="text-[12px] text-muted-foreground">{total} ספורטאים</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-accent gap-[2px]">
                    <div
                      className="bg-success rounded-full transition-all duration-300"
                      style={{ width: `${greenPct}%` }}
                    />
                    <div
                      className="bg-warning rounded-full transition-all duration-300"
                      style={{ width: `${yellowPct}%` }}
                    />
                    {redPct > 0 && (
                      <div
                        className="bg-destructive rounded-full transition-all duration-300"
                        style={{ width: `${redPct}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-7 pt-5 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-success" />
              <span className="text-[12px] text-muted-foreground">תקין</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-warning" />
              <span className="text-[12px] text-muted-foreground">דורש תשומת לב</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
              <span className="text-[12px] text-muted-foreground">בסיכון</span>
            </div>
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
                  <span className={`w-2 h-2 rounded-full ${alert.color} shrink-0`} />
                  <div>
                    <p className="text-[13px] font-medium text-foreground leading-tight">{alert.name}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{alert.sport}</p>
                  </div>
                </div>
                <span className="text-[12px] text-muted-foreground">{alert.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
