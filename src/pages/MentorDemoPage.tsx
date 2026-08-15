import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardList, Send, UserCheck, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import SendUpdateDialog from "@/components/SendUpdateDialog";

/**
 * מסך המאמנטור — אב־טיפוס מסומן על נתונים סינתטיים בלבד.
 *
 * "מאמנטור" הוא המונח הארגוני של וינגייט לתפקיד הליווי הכיתתי.
 * התפקיד עדיין אינו קיים במודל ההרשאות (app_role) וב־RLS, ולכן:
 * - אין כאן role חדש ואין קריאת נתוני אמת: כל הנתונים סינתטיים ומסומנים.
 * - המסך נגיש למנהל/מפתח בלבד, כהדגמת מוצר.
 * - שום פעולה אינה נשמרת בשרת, והמסך אומר זאת במפורש.
 *
 * מה המסך מדגים (לפי הטקסונומיה במילון המוצר):
 * 1. תמונת כיתה רוחבית ברמת דפוס: פעילות אחרונה + על מי ההמתנה (owner),
 *    בלי ציונים ובלי תוכן תשובות — גבול המידע של התפקיד.
 * 2. דיווח מעקב (נפרד ממשוב לימודי) → הקצאת אחראי → סטטוס טיפול →
 *    פעולה הבאה → סגירה, עם יומן אירועים.
 * 3. שליחת עדכון לגורם מורשה דרך Preview, בלי שליחה חיצונית.
 */

interface SynthStudent {
  id: string;
  name: string;
  lastActivity: string;
  pattern: "active" | "stuck" | "waiting_teacher" | "no_activity";
  patternNote: string;
  owner: "התלמיד" | "המורה" | "המערכת";
}

/* נתונים סינתטיים במפורש — שמות דמה בלבד */
const SYNTH_CLASS: SynthStudent[] = [
  { id: "s1", name: "אור (דמה)",    lastActivity: "היום",          pattern: "active",          patternNote: "פעילות סדירה במקצועות המסלול", owner: "התלמיד" },
  { id: "s2", name: "נועה (דמה)",   lastActivity: "אתמול",         pattern: "active",          patternNote: "פעילות סדירה במקצועות המסלול", owner: "התלמיד" },
  { id: "s3", name: "יואב (דמה)",   lastActivity: "לפני 12 ימים",  pattern: "no_activity",     patternNote: "ללא פעילות ממושכת",            owner: "התלמיד" },
  { id: "s4", name: "מאיה (דמה)",   lastActivity: "לפני 3 ימים",   pattern: "waiting_teacher", patternNote: "הגשה ממתינה לבדיקה מעל שבוע",  owner: "המורה" },
  { id: "s5", name: "איתן (דמה)",   lastActivity: "לפני 5 ימים",   pattern: "stuck",           patternNote: "עצירה על אותה משימה",          owner: "התלמיד" },
  { id: "s6", name: "שירה (דמה)",   lastActivity: "לפני יומיים",   pattern: "active",          patternNote: "פעילות סדירה במקצועות המסלול", owner: "התלמיד" },
];

const patternMeta: Record<SynthStudent["pattern"], { label: string; chip: string }> = {
  active:          { label: "פעילות סדירה",  chip: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  stuck:           { label: "תקוע על משימה", chip: "bg-amber-50 text-amber-900 border-amber-200" },
  waiting_teacher: { label: "ממתין לבדיקה",  chip: "bg-sky-50 text-sky-900 border-sky-200" },
  no_activity:     { label: "אין פעילות",     chip: "bg-red-50 text-red-900 border-red-200" },
};

type CareStatus = "open" | "in_progress" | "closed";

interface CareEvent { at: string; text: string }

const MentorDemoPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* דיווח המעקב הסינתטי — נוצר על ידי מורה, נפרד מכל משוב לימודי */
  const [careOwner, setCareOwner] = useState<string>("");
  const [careStatus, setCareStatus] = useState<CareStatus>("open");
  const [nextAction, setNextAction] = useState("שיחה אישית עם התלמיד השבוע");
  const [log, setLog] = useState<CareEvent[]>([
    { at: "12.8", text: "המורה לתנ״ך (דמה) פתחה דיווח מעקב: עצירה ממושכת ביחידה הנוכחית" },
  ]);
  const [sendOpen, setSendOpen] = useState(false);

  const addLog = (text: string) =>
    setLog(l => [...l, { at: new Date().toLocaleDateString("he-IL", { day: "numeric", month: "numeric" }), text }]);

  const statusLabel: Record<CareStatus, string> = { open: "פתוח", in_progress: "בטיפול", closed: "הטיפול הושלם" };

  const attention = useMemo(() => SYNTH_CLASS.filter(s => s.pattern !== "active"), []);

  if (user?.role !== "admin" && user?.role !== "developer") {
    return (
      <div className="p-10 text-center" dir="rtl">
        <p className="text-[14px] font-medium text-foreground">תצוגת המאמנטור זמינה בשלב זה למנהל המערכת בלבד</p>
        <p className="text-[12px] text-muted-foreground mt-1.5">זהו אב־טיפוס להדגמה; תפקיד המאמנטור טרם קיים במערכת ההרשאות.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-[12px] text-primary hover:underline">לעמוד הבית</button>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-[1100px] mx-auto" dir="rtl">
      {/* prototype banner — the whole screen is synthetic */}
      <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-2.5">
        <p className="text-[11px] text-violet-900 leading-relaxed">
          <span className="font-bold">אב־טיפוס · נתונים סינתטיים בלבד.</span>{" "}
          תפקיד המאמנטור טרם קיים במודל ההרשאות; המסך מדגים את גבולות המידע והזרימות המתוכננים.
          שום פעולה כאן אינה נשמרת בשרת.
        </p>
      </div>

      <header className="mb-6">
        <h1 className="text-[24px] md:text-[28px] font-semibold text-foreground tracking-tight">הכיתה שלי</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          מאמנטור · כיתה ט2 (דמה) · {SYNTH_CLASS.length} תלמידים · מבט דפוסים חוצה־מקצועות, ללא ציונים וללא תוכן תשובות
        </p>
      </header>

      {/* class-wide pattern view */}
      <section className="card-premium overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border bg-muted/50 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" strokeWidth={1.6} />
          <h2 className="text-[13.5px] font-semibold text-foreground">תמונת הכיתה</h2>
          <span className="text-[11px] text-muted-foreground">{attention.length} מתוך {SYNTH_CLASS.length} דורשים תשומת לב</span>
        </div>
        {SYNTH_CLASS.map(s => {
          const m = patternMeta[s.pattern];
          return (
            <div key={s.id} className="px-5 py-3.5 border-b border-border last:border-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-[13px] font-medium text-foreground w-32 shrink-0">{s.name}</span>
              <span className={`inline-flex self-start items-center px-2.5 py-0.5 rounded-full border text-[11px] font-medium shrink-0 ${m.chip}`}>{m.label}</span>
              <span className="text-[12px] text-muted-foreground flex-1 min-w-0">{s.patternNote}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">פעילות: {s.lastActivity}</span>
              <span className="text-[11px] shrink-0">
                <span className="text-muted-foreground">נדרש לפעול: </span>
                <span className="font-semibold text-foreground">{s.owner}</span>
              </span>
            </div>
          );
        })}
        <p className="px-5 py-2.5 text-[10.5px] text-muted-foreground bg-muted/30">
          גבול המידע של המאמנטור: דפוס והמתנה בלבד. ציונים, תשובות ותוכן משוב אינם נגישים בתפקיד זה.
        </p>
      </section>

      {/* care flow: report → owner → status → next action → closure */}
      <section className="card-premium p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="h-4 w-4 text-destructive" strokeWidth={1.6} />
          <h2 className="text-[13.5px] font-semibold text-foreground">דיווח מעקב פתוח</h2>
          <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 font-medium">הדגמה · לא נשמר בשרת</span>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[13px] font-semibold text-foreground">יואב (דמה) · עצירה ממושכת בתנ״ך</p>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                נפתח על ידי: המורה לתנ״ך (דמה) · 12.8 · נפרד מהמשוב הלימודי על המשימות עצמן
              </p>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
              careStatus === "closed" ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : careStatus === "in_progress" ? "bg-amber-50 text-amber-900 border-amber-200"
              : "bg-red-50 text-red-900 border-red-200"}`}>
              {statusLabel[careStatus]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">אחראי לטיפול</label>
            <select value={careOwner}
              onChange={e => { setCareOwner(e.target.value); if (e.target.value) { setCareStatus("in_progress"); addLog(`הוקצה אחראי: ${e.target.value}`); } }}
              className="w-full h-9 rounded-lg border border-border bg-card px-2.5 text-[12.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
              <option value="">בחירת אחראי...</option>
              <option value="המאמנטור (דמה)">המאמנטור (דמה)</option>
              <option value="המורה לתנ״ך (דמה)">המורה לתנ״ך (דמה)</option>
              <option value="רכזת השכבה (דמה)">רכזת השכבה (דמה)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">הפעולה הבאה</label>
            <input type="text" value={nextAction} onChange={e => setNextAction(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-card px-3 text-[12.5px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setSendOpen(true)}
            disabled={!careOwner}
            className="h-9 px-4 rounded-xl border border-border bg-card text-[12.5px] text-foreground inline-flex items-center gap-1.5 disabled:opacity-50">
            <Send className="h-3.5 w-3.5" strokeWidth={1.8} />
            שליחת עדכון
          </button>
          <button
            onClick={() => { setCareStatus("closed"); addLog("הטיפול נסגר: בוצעה שיחה ותואם המשך"); }}
            disabled={careStatus === "closed" || !careOwner}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            סגירת הטיפול
          </button>
          {!careOwner && <span className="text-[10.5px] text-muted-foreground">להמשך נדרש אחראי לטיפול</span>}
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5" strokeWidth={1.7} /> יומן הטיפול
          </p>
          <ul className="space-y-1">
            {log.map((e, i) => (
              <li key={i} className="text-[11.5px] text-foreground/80 flex items-start gap-2">
                <span className="text-muted-foreground tabular-nums shrink-0">{e.at}</span>
                {e.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* what this role never sees */}
      <section className="rounded-2xl border border-border bg-muted/20 p-4 mb-8">
        <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" strokeWidth={1.7} />
          מה המאמנטור אינו רואה, בכוונה
        </p>
        <p className="text-[11.5px] text-muted-foreground leading-relaxed">
          ציונים · תוכן תשובות והגשות · משוב לימודי מפורט · הערות מעקב של מקצועות שאינם באחריותו.
          התלמיד וההורה אינם חשופים לתיוג הפנימי שבמסך זה. אכיפה אמיתית של הגבולות האלה תדרוש
          הוספת התפקיד למודל ההרשאות וב־RLS — צעד שטרם בוצע.
        </p>
      </section>

      <SendUpdateDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        contextLabel="דיווח מעקב · הכיתה שלי"
        studentName="יואב (דמה)"
        recipients={[
          { id: "r1", name: "המורה לתנ״ך (דמה)", role: "מורה מקצועי" },
          { id: "r2", name: "המאמן האישי (דמה)", role: "מאמן" },
          { id: "r3", name: "רכזת השכבה (דמה)", role: "רכזת" },
        ]}
        defaultBody={`בהמשך לדיווח המעקב: ${nextAction}. אשמח לתיאום.`}
      />
    </div>
  );
};

export default MentorDemoPage;
