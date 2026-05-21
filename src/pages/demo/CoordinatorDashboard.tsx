/**
 * Coordinator dashboard — full management/control center.
 * Demo-only. Shows mock KPIs + recent sessions + alerts.
 */
import DemoShell, { DemoNavItem } from "@/components/demo/DemoShell";
import { Activity, CalendarDays, ClipboardList, LayoutDashboard, Users, FileBarChart, Bell } from "lucide-react";

const TINT = "hsl(220, 70%, 55%)";

const nav: DemoNavItem[] = [
  { label: "סקירה כללית",   path: "/coordinator/dashboard", icon: LayoutDashboard },
  { label: "ניהול מפגשים",  path: "/coordinator/sessions",  icon: CalendarDays },
  { label: "צוות ומורים",   path: "/coordinator/staff",     icon: Users },
  { label: "ספורטאים",      path: "/coordinator/athletes",  icon: ClipboardList },
  { label: "דוחות",         path: "/coordinator/reports",   icon: FileBarChart },
  { label: "פעילות מערכת",  path: "/coordinator/activity",  icon: Activity },
];

const kpis = [
  { label: "מפגשים השבוע",     value: 47, trend: "+8" },
  { label: "ממתינים לאישור",   value: 6,  trend: "דחוף" },
  { label: "צוות פעיל",        value: 14, trend: "+1" },
  { label: "ספורטאים פעילים",  value: 92, trend: "+3" },
];

const alerts = [
  { title: "מפגש לא אושר ע״י המורה",  meta: "ד״ר רון אביב · מתמטיקה · מחר 16:00", level: "warning" },
  { title: "בקשה חדשה מהורה",         meta: "משפ׳ כהן · אנגלית · השבוע",          level: "info" },
  { title: "סיכום מפגש חסר",          meta: "אורית לוי · פיזיקה · אתמול",         level: "danger" },
];

const sessions = [
  { time: "08:30", tutor: "ד״ר רון אביב",  athlete: "נועם כהן",   subject: "מתמטיקה", status: "confirmed" },
  { time: "10:00", tutor: "אורית לוי",      athlete: "שיר ברק",     subject: "פיזיקה",   status: "pending" },
  { time: "12:15", tutor: "אבי שטרן",       athlete: "תום מזרחי",   subject: "אנגלית",   status: "confirmed" },
  { time: "14:45", tutor: "ד״ר רון אביב",  athlete: "ליאן זילבר",   subject: "מתמטיקה", status: "summary-missing" },
];

const statusBadge = (s: string) => {
  switch (s) {
    case "confirmed":       return { txt: "מאושר",         cls: "bg-success/15 text-success" };
    case "pending":         return { txt: "ממתין לאישור",  cls: "bg-warning/15 text-warning" };
    case "summary-missing": return { txt: "סיכום חסר",     cls: "bg-destructive/15 text-destructive" };
    default:                return { txt: s,                cls: "bg-muted text-muted-foreground" };
  }
};

const CoordinatorDashboard = () => (
  <DemoShell nav={nav} tint={TINT} workspaceLabel="מרכז שליטה — רכזת">
    <div className="p-6 md:p-8 max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-foreground tracking-tight">בוקר טוב, אורל</h1>
        <p className="text-[13px] text-muted-foreground mt-1">סקירה תפעולית של היום. 6 פעולות דורשות תשומת לב.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card border rounded-xl p-4">
            <p className="text-[11.5px] text-muted-foreground">{k.label}</p>
            <p className="text-[26px] font-semibold mt-1 leading-none tracking-tight">{k.value}</p>
            <p className="text-[11px] mt-2" style={{ color: TINT }}>{k.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sessions today */}
        <section className="lg:col-span-2 bg-card border rounded-xl p-5">
          <h2 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4" style={{ color: TINT }} />
            מפגשי היום
          </h2>
          <div className="divide-y">
            {sessions.map((s, i) => {
              const b = statusBadge(s.status);
              return (
                <div key={i} className="flex items-center gap-3 py-3">
                  <span className="text-[12px] font-mono text-muted-foreground w-12">{s.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{s.athlete} · {s.subject}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.tutor}</p>
                  </div>
                  <span className={`text-[10.5px] px-2 py-1 rounded ${b.cls}`}>{b.txt}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Alerts */}
        <section className="bg-card border rounded-xl p-5">
          <h2 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4" style={{ color: TINT }} />
            התראות
          </h2>
          <ul className="space-y-3">
            {alerts.map((a, i) => (
              <li key={i} className="border-s-2 ps-3 py-1" style={{ borderColor: TINT }}>
                <p className="text-[12.5px] font-medium">{a.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{a.meta}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  </DemoShell>
);

export default CoordinatorDashboard;
