import { Users, BookOpen, TrendingUp, AlertTriangle } from "lucide-react";

const stats = [
  { label: "ספורטאים פעילים", value: "142", icon: Users, change: "+3 החודש" },
  { label: "קורסים פעילים", value: "18", icon: BookOpen, change: "סמסטר א׳" },
  { label: "ממוצע ציונים", value: "82.4", icon: TrendingUp, change: "+1.2 מהסמסטר הקודם" },
  { label: "התראות", value: "7", icon: AlertTriangle, change: "ספורטאים בסיכון" },
];

const DashboardContent = () => {
  return (
    <div className="p-8 space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">סקירה כללית</h2>
        <p className="text-muted-foreground text-sm mt-1">סמסטר א׳ תשפ״ה • עדכון אחרון: היום, 10:30</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-2xl border border-border p-6 transition-colors duration-150 hover:border-primary/20"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-semibold text-foreground mt-2">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-2">{stat.change}</p>
              </div>
              <div className="p-2.5 bg-accent rounded-xl">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">מצב רמזור לפי ענף</h3>
          <p className="text-sm text-muted-foreground mb-6">התפלגות הסטטוס האקדמי של הספורטאים</p>
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            תוכן גרף יוצג כאן
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-base font-semibold text-foreground mb-1">התראות אחרונות</h3>
          <p className="text-sm text-muted-foreground mb-6">ספורטאים שדורשים תשומת לב</p>
          <div className="space-y-3">
            {[
              { name: "יעל כהן", status: "אדום", color: "bg-destructive" },
              { name: "אורי לוי", status: "כתום", color: "bg-warning" },
              { name: "נועם ברק", status: "כתום", color: "bg-warning" },
            ].map((alert) => (
              <div key={alert.name} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${alert.color}`} />
                  <span className="text-sm text-foreground">{alert.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{alert.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
