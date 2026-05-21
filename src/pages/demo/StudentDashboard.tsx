/**
 * Student dashboard (demo) — only the student's own requests, sessions and updates.
 */
import { useState } from "react";
import DemoShell, { DemoNavItem } from "@/components/demo/DemoShell";
import { CalendarDays, BellRing, LayoutDashboard, PlusCircle, MessageSquare } from "lucide-react";

const TINT = "hsl(30, 80%, 50%)";

const nav: DemoNavItem[] = [
  { label: "המסך שלי",          path: "/student/dashboard", icon: LayoutDashboard },
  { label: "בקשת מפגש חדשה",   path: "/student/request",   icon: PlusCircle },
  { label: "מפגשים שלי",        path: "/student/sessions",  icon: CalendarDays },
  { label: "עדכונים",            path: "/student/updates",   icon: BellRing },
];

const mySessions = [
  { when: "מחר · 16:00", tutor: "ד״ר רון אביב", subject: "מתמטיקה", status: "confirmed" },
  { when: "ראשון · 17:30", tutor: "אורית לוי",   subject: "פיזיקה",   status: "pending" },
];

const updates = [
  { title: "סיכום מהמפגש האחרון התקבל", meta: "ד״ר רון אביב · אתמול" },
  { title: "המורה אישרה את המפגש שלך",   meta: "מתמטיקה · מחר 16:00" },
  { title: "בקשתך לפיזיקה הועברה לרכזת", meta: "ממתין לאישור" },
];

const statusBadge = (s: string) => s === "confirmed"
  ? { txt: "מאושר", cls: "bg-success/15 text-success" }
  : { txt: "ממתין לאישור", cls: "bg-warning/15 text-warning" };

const StudentDashboard = () => {
  const [requested, setRequested] = useState(false);
  return (
    <DemoShell nav={nav} tint={TINT} workspaceLabel="המרחב שלי — נועם">
      <div className="p-6 md:p-8 max-w-[900px] space-y-6">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight">שלום נועם</h1>
          <p className="text-[13px] text-muted-foreground mt-1">המפגשים, הבקשות והעדכונים האישיים שלך.</p>
        </div>

        {/* Quick action */}
        <section className="bg-card border rounded-xl p-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium">צריך/ה מפגש חדש?</p>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">שלח/י בקשה — הרכזת תאשר ותתאם מורה.</p>
          </div>
          <button
            onClick={() => setRequested(true)}
            className="text-[12.5px] font-medium h-9 px-4 rounded-lg text-white"
            style={{ background: TINT }}
          >
            {requested ? "הבקשה נשלחה ✓" : "בקש מפגש"}
          </button>
        </section>

        <section className="bg-card border rounded-xl p-5">
          <h2 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4" style={{ color: TINT }} />
            המפגשים שלי
          </h2>
          <div className="divide-y">
            {mySessions.map((s, i) => {
              const b = statusBadge(s.status);
              return (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium">{s.subject} · {s.tutor}</p>
                    <p className="text-[11px] text-muted-foreground">{s.when}</p>
                  </div>
                  <span className={`text-[10.5px] px-2 py-1 rounded ${b.cls}`}>{b.txt}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-card border rounded-xl p-5">
          <h2 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" style={{ color: TINT }} />
            עדכונים אחרונים
          </h2>
          <ul className="space-y-3">
            {updates.map((u, i) => (
              <li key={i} className="border-s-2 ps-3 py-1" style={{ borderColor: TINT }}>
                <p className="text-[12.5px] font-medium">{u.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{u.meta}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </DemoShell>
  );
};

export default StudentDashboard;
