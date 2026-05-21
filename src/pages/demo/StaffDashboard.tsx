/**
 * Staff / Tutor dashboard — only the tutor's own sessions, confirmations,
 * summaries, and assigned students.
 */
import { useState } from "react";
import DemoShell, { DemoNavItem } from "@/components/demo/DemoShell";
import { CalendarDays, ClipboardCheck, FileText, LayoutDashboard, Users, Check, X } from "lucide-react";

const TINT = "hsl(160, 55%, 42%)";

const nav: DemoNavItem[] = [
  { label: "המפגשים שלי",     path: "/staff/dashboard",   icon: LayoutDashboard },
  { label: "אישורי מפגשים",   path: "/staff/confirm",     icon: ClipboardCheck },
  { label: "סיכומי מפגש",     path: "/staff/summaries",   icon: FileText },
  { label: "ספורטאים שלי",    path: "/staff/athletes",    icon: Users },
];

const initialSessions = [
  { id: 1, time: "08:30 · היום",   athlete: "נועם כהן",   subject: "מתמטיקה", status: "confirmed" },
  { id: 2, time: "14:45 · היום",   athlete: "ליאן זילבר",  subject: "מתמטיקה", status: "summary-missing" },
  { id: 3, time: "10:00 · מחר",    athlete: "תום מזרחי",   subject: "מתמטיקה", status: "pending" },
  { id: 4, time: "16:30 · מחר",    athlete: "שיר ברק",     subject: "מתמטיקה", status: "pending" },
];

const myAthletes = [
  { name: "נועם כהן",   meta: "8 מפגשים · התקדמות טובה",     status: "green" },
  { name: "ליאן זילבר",  meta: "5 מפגשים · פערים בגיאומטריה", status: "yellow" },
  { name: "תום מזרחי",   meta: "3 מפגשים · ספורטאי חדש",      status: "green" },
  { name: "שיר ברק",     meta: "6 מפגשים · בסיכון",            status: "red" },
];

const statusBadge = (s: string) => {
  switch (s) {
    case "confirmed":       return { txt: "מאושר",         cls: "bg-success/15 text-success" };
    case "pending":         return { txt: "ממתין לאישור",  cls: "bg-warning/15 text-warning" };
    case "summary-missing": return { txt: "סיכום חסר",     cls: "bg-destructive/15 text-destructive" };
    default:                return { txt: s,                cls: "bg-muted text-muted-foreground" };
  }
};

const statusDot = (s: string) => s === "green" ? "bg-success" : s === "yellow" ? "bg-warning" : "bg-destructive";

const StaffDashboard = () => {
  const [sessions, setSessions] = useState(initialSessions);

  const confirm = (id: number) =>
    setSessions((arr) => arr.map((s) => s.id === id ? { ...s, status: "confirmed" } : s));
  const decline = (id: number) =>
    setSessions((arr) => arr.filter((s) => s.id !== id));

  return (
    <DemoShell nav={nav} tint={TINT} workspaceLabel="המפגשים שלי — ד״ר רון אביב">
      <div className="p-6 md:p-8 max-w-[1100px] space-y-6">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight">שלום ד״ר רון</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            יש לך {sessions.filter((s) => s.status === "pending").length} מפגשים לאישור ו־{sessions.filter((s) => s.status === "summary-missing").length} סיכום חסר.
          </p>
        </div>

        <section className="bg-card border rounded-xl p-5">
          <h2 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4" style={{ color: TINT }} />
            המפגשים הקרובים שלי
          </h2>
          <div className="divide-y">
            {sessions.map((s) => {
              const b = statusBadge(s.status);
              return (
                <div key={s.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{s.athlete} · {s.subject}</p>
                    <p className="text-[11px] text-muted-foreground">{s.time}</p>
                  </div>
                  <span className={`text-[10.5px] px-2 py-1 rounded ${b.cls}`}>{b.txt}</span>
                  {s.status === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => confirm(s.id)}
                        className="h-7 w-7 rounded-md bg-success/15 text-success hover:bg-success/25 flex items-center justify-center"
                        title="אשר">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => decline(s.id)}
                        className="h-7 w-7 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25 flex items-center justify-center"
                        title="דחה">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {s.status === "summary-missing" && (
                    <button className="text-[11.5px] font-medium h-7 px-3 rounded-md border" style={{ color: TINT, borderColor: TINT }}>
                      כתוב סיכום
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-card border rounded-xl p-5">
          <h2 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: TINT }} />
            הספורטאים המשויכים אליי
          </h2>
          <ul className="divide-y">
            {myAthletes.map((a, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <span className={`h-2 w-2 rounded-full ${statusDot(a.status)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground">{a.meta}</p>
                </div>
                <button className="text-[11.5px] text-muted-foreground hover:text-foreground">פתח כרטיס</button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </DemoShell>
  );
};

export default StaffDashboard;
