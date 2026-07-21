/** Owner/Admin operations board for the home page: real, permission-scoped
 *  alerts ordered by urgency, each with an explanation and an action.
 *  Data sources: students (scoped hook), student_admin_status (RLS admin),
 *  get_all_people_links (owner-only RPC, one call), list_learning_groups
 *  (permission-gated). A source this caller cannot read renders as a quiet
 *  permission note, never as invented numbers. Import stays read-only. */
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Database, Layers, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/hooks/useStudents";
import { peopleApi } from "@/lib/peopleApi";
import { lgApi } from "@/lib/learningGroupsApi";
import { useIsSystemOwner } from "@/hooks/useSystemOwner";
import { computeOpsAlerts, opsAlertCount, type OpsLinks } from "@/lib/opsBoard";

const people = peopleApi(supabase as any);
const lg = lgApi(supabase as any);

const AlertRow = ({ tone, title, explain, names, action, onAction }: {
  tone: "red" | "warn" | "info";
  title: string; explain: string;
  names?: string[];
  action: string; onAction: () => void;
}) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-b-0">
    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
      tone === "red" ? "bg-destructive" : tone === "warn" ? "bg-warning" : "bg-muted-foreground/40"}`} />
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      <p className="text-[11.5px] text-muted-foreground mt-0.5 break-words">
        {explain}
        {names && names.length > 0 && (
          <span> · {names.slice(0, 3).join(", ")}{names.length > 3 ? ` ועוד ${names.length - 3}` : ""}</span>
        )}
      </p>
    </div>
    <button onClick={onAction}
      className="shrink-0 inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded pt-0.5">
      {action}
      <ArrowLeft className="h-3 w-3" strokeWidth={1.8} />
    </button>
  </div>
);

const OpsBoard = () => {
  const navigate = useNavigate();
  const { data: isSystemOwner } = useIsSystemOwner();
  const { data: students = [], isLoading: studentsLoading, isError: studentsError } = useStudents();

  // manual traffic light — RLS lets admins read; anyone else gets an error → null
  const statusQuery = useQuery({
    queryKey: ["ops-admin-statuses"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_admin_status" as any)
        .select("student_id, status, status_note");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
  // ONE call for all links — owner-only RPC; error → domain hidden honestly
  const linksQuery = useQuery({
    queryKey: ["all-people-links"],
    enabled: !!isSystemOwner,
    retry: false,
    queryFn: () => people.allPeopleLinks(),
  });
  const groupsQuery = useQuery({
    queryKey: ["ops-active-groups"],
    retry: false,
    queryFn: () => lg.list(null, "active"),
  });

  if (studentsLoading) {
    return (
      <div className="card-premium p-4 sm:p-5 mb-5" aria-busy="true">
        <div className="space-y-2.5">
          {[0, 1, 2].map(i => <div key={i} className="h-9 rounded-lg bg-muted/40 animate-pulse" />)}
        </div>
      </div>
    );
  }
  if (studentsError) {
    return (
      <div className="card-premium p-4 sm:p-5 mb-5">
        <p className="text-[13px] text-destructive">טעינת נתוני התלמידים נכשלה. אפשר לרענן ולנסות שוב.</p>
      </div>
    );
  }

  const alerts = computeOpsAlerts(
    students as any[],
    statusQuery.isError ? null : (statusQuery.data as any[] | undefined) ?? null,
    linksQuery.data ? (linksQuery.data as unknown as OpsLinks) : null,
  );
  const openCount = opsAlertCount(alerts);
  const activeGroups = groupsQuery.data ? (groupsQuery.data as any[]).length : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-3 items-start mb-5">
      {/* ── alerts, ordered by urgency ── */}
      <div className="card-premium px-4 sm:px-5 py-3.5 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-primary" strokeWidth={1.6} />
          <h2 className="text-[14px] font-semibold text-foreground">דורש טיפול</h2>
          {openCount > 0 && (
            <span className="text-[11px] text-muted-foreground">{openCount} פריטים פתוחים</span>
          )}
        </div>
        {openCount === 0 && !alerts.bootstrap ? (
          <p className="text-[12.5px] text-muted-foreground py-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.6} />
            אין כרגע התראות פתוחות.
          </p>
        ) : (
          <div>
            {alerts.attention.length > 0 && (
              <AlertRow tone="red"
                title={`${alerts.attention.length} תלמידים בסטטוס ניהולי צהוב או אדום`}
                explain="סומנו ידנית כדורשים מעקב"
                names={alerts.attention.map(a => a.name)}
                action="לרשימת הספורטאים" onAction={() => navigate("/students")} />
            )}
            {alerts.noCoach.length > 0 && (
              <AlertRow tone="warn"
                title={`${alerts.noCoach.length} תלמידים פעילים ללא מאמן/ת`}
                explain="אין שדה מאמן ברשומה ואין שיוך מנוהל פעיל"
                names={alerts.noCoach.map(a => a.name)}
                action="לרשימת הספורטאים" onAction={() => navigate("/students")} />
            )}
            {alerts.noGuardians && alerts.noGuardians.length > 0 && (
              <AlertRow tone="warn"
                title={`${alerts.noGuardians.length} תלמידים פעילים ללא קשר הורה`}
                explain="אין קשר הורה פעיל במערכת; הוספה דרך טאב הקשרים בפרופיל"
                action="לרשימת הספורטאים" onAction={() => navigate("/students")} />
            )}
            {alerts.invalidNid.length > 0 && (
              <AlertRow tone="info"
                title={`${alerts.invalidNid.length} תלמידים ללא תעודת זהות תקינה`}
                explain="חסרה או לא עוברת בדיקת תקינות; משפיע על ייבוא עתידי"
                action="להזנת נתונים" onAction={() => navigate("/data-entry")} />
            )}
          </div>
        )}
        {alerts.bootstrap && (
          <div className="flex items-start gap-3 py-2.5 border-t border-border/50 mt-1">
            <span className="mt-1 w-2 h-2 rounded-full shrink-0 bg-muted-foreground/40" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground">קשרי הורים ומאמנים טרם יובאו למערכת.</p>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                לאחר השלמת הייבוא יוצגו כאן רק חוסרים אמיתיים.
              </p>
            </div>
            <button onClick={() => navigate("/admin/data-import")}
              className="shrink-0 inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded pt-0.5">
              לייבוא ועדכון נתונים
              <ArrowLeft className="h-3 w-3" strokeWidth={1.8} />
            </button>
          </div>
        )}
        {!isSystemOwner && (
          <p className="text-[11px] text-muted-foreground mt-2">
            בדיקת קשרי הורים ומאמנים מנוהלים זמינה לבעלי המערכת בלבד.
          </p>
        )}
      </div>

      {/* ── side rail: real counts + import status ── */}
      <div className="card-premium p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-muted-foreground inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" strokeWidth={1.6} />תלמידים פעילים
          </span>
          <span className="text-[14px] font-semibold text-foreground tabular-nums">{alerts.activeCount}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-muted-foreground">בארכיון</span>
          <span className="text-[14px] font-semibold text-foreground tabular-nums">{alerts.archivedCount}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-muted-foreground inline-flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" strokeWidth={1.6} />קבוצות לימוד פעילות
          </span>
          {activeGroups !== null ? (
            <button onClick={() => navigate("/admin/learning-groups")}
              className="text-[14px] font-semibold text-primary tabular-nums hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded">
              {activeGroups}
            </button>
          ) : (
            <span className="text-[11px] text-muted-foreground">לפי הרשאה</span>
          )}
        </div>
        {isSystemOwner && (
          <div className="pt-2 border-t border-border/60">
            <p className="text-[12px] text-muted-foreground inline-flex items-center gap-1.5 mb-1">
              <Database className="h-3.5 w-3.5" strokeWidth={1.6} />ייבוא נתונים
            </p>
            <p className="text-[11.5px] text-foreground">
              תצוגה מקדימה פעילה; הייבוא עצמו סגור בשלב זה.
            </p>
            <button onClick={() => navigate("/admin/data-import")}
              className="text-[11.5px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded mt-0.5">
              למסך הייבוא
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpsBoard;
