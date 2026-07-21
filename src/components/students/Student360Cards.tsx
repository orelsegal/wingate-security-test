/** Reusable cards for the Student 360 profile: learning groups, sport &
 *  coaches (legacy + managed, merged without duplicates), and the activity
 *  feed. Real data only — every missing domain gets an explicit empty
 *  state, never invented content. */
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Dumbbell, History, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lgApi, yearLabel, type LgDetails, type LgListItem } from "@/lib/learningGroupsApi";
import type { Student } from "@/hooks/useStudents";
import type { StudentRelationships } from "@/lib/peopleApi";
import { mergeCoaches, relationshipEvents, formatEventDate } from "@/lib/student360";

const lg = lgApi(supabase as any);

const Card = ({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) => (
  <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-card)] p-4 sm:p-5" dir="rtl">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" strokeWidth={1.6} />
      <h2 className="text-[14px] font-semibold text-foreground">{title}</h2>
    </div>
    {children}
  </div>
);

export const EmptyLine = ({ text }: { text: string }) => (
  <p className="text-[12.5px] text-muted-foreground py-2">{text}</p>
);

/* ── learning groups: the student's ACTIVE memberships, via the existing
     learning-groups RPCs only (no new assignment mechanism) ── */
export interface StudentGroupRow {
  id: string; name: string; subject: string; year: string;
  teachers: string[]; joinedAt: string | null;
}
export function useStudentGroups(studentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["student-360-groups", studentId],
    enabled,
    retry: false,
    queryFn: async (): Promise<StudentGroupRow[]> => {
      const groups = (await lg.list(null, "active")) as LgListItem[];
      const details = await Promise.all(
        groups.slice(0, 40).map(g => lg.details(g.id).catch(() => null)),
      );
      const rows: StudentGroupRow[] = [];
      for (const d of details as (LgDetails | null)[]) {
        if (!d) continue;
        const m = d.active_students.find(s => s.student_id === studentId);
        if (!m) continue;
        const meta = groups.find(g => g.id === d.group.id);
        rows.push({
          id: d.group.id, name: d.group.name,
          subject: meta?.subject_name || "",
          year: yearLabel(d.group.academic_year_start),
          teachers: d.teachers.map(t => t.full_name || "").filter(Boolean),
          joinedAt: m.joined_at || null,
        });
      }
      return rows;
    },
  });
}

export const LearningGroupsCard = ({ studentId, enabled }: { studentId: string; enabled: boolean }) => {
  const q = useStudentGroups(studentId, enabled);
  return (
    <Card title="קבוצות לימוד" icon={BookOpen}>
      {!enabled ? (
        <EmptyLine text="צפייה בקבוצות לימוד זמינה למשתמשים עם הרשאת ניהול קבוצות." />
      ) : q.isLoading ? (
        <div className="space-y-2 py-1" aria-hidden>
          {[0, 1].map(i => <div key={i} className="h-10 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : q.isError ? (
        <EmptyLine text="צפייה בקבוצות לימוד אינה זמינה בהרשאה הנוכחית." />
      ) : (q.data || []).length === 0 ? (
        <EmptyLine text="התלמיד/ה אינו/ה משובץ/ת כרגע לאף קבוצת לימוד פעילה." />
      ) : (
        <ul className="space-y-2">
          {q.data!.map(g => (
            <li key={g.id} className="rounded-xl border border-border/70 px-3 py-2.5">
              <p className="text-[13px] font-medium text-foreground break-words">
                {g.name}
                <span className="text-[11.5px] text-muted-foreground font-normal"> · {g.subject} · <span dir="ltr">{g.year}</span></span>
              </p>
              <p className="text-[11.5px] text-muted-foreground break-words">
                {g.teachers.length > 0 ? `מורה: ${g.teachers.join(", ")}` : "טרם שויכו מורים"}
                {g.joinedAt ? ` · הצטרפות: ${formatEventDate(g.joinedAt)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground mt-2.5">
        חברות היסטורית בקבוצות עדיין אינה נשמרת בנתונים, ולכן אינה מוצגת.
      </p>
    </Card>
  );
};

/* ── sport & coaches: legacy assigned_coach + managed links, merged ── */
export const SportCard = ({ student, rel, relAvailable }: {
  student: Student; rel: StudentRelationships | null; relAvailable: boolean;
}) => {
  const legacy = (student as any).assigned_coach as string | null | undefined;
  const { current, historical } = mergeCoaches(legacy, rel?.coaches || null);
  const srcLabel = (s: MergedSources) =>
    s.length === 2 ? "קשר מנוהל, מופיע גם ברשומה הישנה"
    : s[0] === "legacy" ? "מקור: רשומת התלמיד (שדה ישן)"
    : "קשר מנוהל";
  type MergedSources = ("legacy" | "relationship")[];
  return (
    <Card title="ספורט ומאמנים" icon={Dumbbell}>
      <p className="text-[13px] text-foreground mb-2">
        ענף: <span className="font-medium">{student.sport || "לא צוין"}</span>
      </p>
      {current.length === 0 ? (
        <EmptyLine text="אין מאמן/ת משויך/ת כרגע." />
      ) : (
        <ul className="space-y-2">
          {current.map((c, i) => (
            <li key={i} className="rounded-xl border border-border/70 px-3 py-2.5">
              <p className="text-[13px] font-medium text-foreground break-words">
                {c.name}
                {c.roleLabel && <span className="text-[11.5px] text-muted-foreground font-normal"> · {c.roleLabel}</span>}
              </p>
              <p className="text-[11.5px] text-muted-foreground">
                {srcLabel(c.sources)}
                {c.activeFrom ? ` · מאז ${formatEventDate(c.activeFrom)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      {historical.length > 0 && (
        <>
          <p className="text-[12px] font-medium text-muted-foreground mt-3 mb-1.5">שיוכים היסטוריים</p>
          <ul className="space-y-1.5">
            {historical.map((c, i) => (
              <li key={i} className="text-[12px] text-muted-foreground break-words">
                {c.name}{c.roleLabel ? ` · ${c.roleLabel}` : ""}
                {c.activeFrom ? ` · ${formatEventDate(c.activeFrom)}` : ""}
                {c.activeTo ? ` עד ${formatEventDate(c.activeTo)}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}
      {!relAvailable && (
        <p className="text-[11px] text-muted-foreground mt-2.5">
          קשרי מאמנים מנוהלים מוצגים למשתמשים עם הרשאת קשרים; מוצג המידע מרשומת התלמיד בלבד.
        </p>
      )}
    </Card>
  );
};

/* ── activity & history: real relationship events only ── */
export const ActivityCard = ({ rel, relAvailable }: { rel: StudentRelationships | null; relAvailable: boolean }) => {
  const events = relationshipEvents(rel);
  return (
    <Card title="פעילות והיסטוריה" icon={History}>
      {!relAvailable ? (
        <EmptyLine text="היסטוריית פעילות תוצג כאן למשתמשים עם הרשאה מתאימה. מקור נתונים מלא לפעולות מערכת יתווסף בשלב עתידי." />
      ) : events.length === 0 ? (
        <EmptyLine text="אין עדיין אירועים מתועדים. שינויים בקשרים ובשיוכים יופיעו כאן כשיתרחשו." />
      ) : (
        <ol className="relative border-r border-border/60 pr-4 space-y-2.5">
          {events.map((ev, i) => (
            <li key={i} className="relative">
              <span className="absolute -right-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary/20 ring-2 ring-background" />
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{formatEventDate(ev.date)}</span>
                <p className="text-[12.5px] text-foreground leading-snug break-words">{ev.text}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
};
