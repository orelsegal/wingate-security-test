import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * src/integrations/supabase/types.ts נוצר לפני שחוזה ההגשות הותקן, ולכן
 * הלקוח המוקלד אינו מכיר את הטבלאות החדשות. יצירה מחדש של הטיפוסים
 * דורשת גישה למסד שאין לי כאן, ולכן השאילתה הזאת יוצאת דרך מצביע לא
 * מוקלד. זו הנקודה היחידה בקובץ שמוותרת על הטיפוסים, והצורה שחוזרת
 * מאומתת מיד ל-InboxRow. כשהטיפוסים ייווצרו מחדש, מוחקים את השורה הזאת.
 */
type Ref = { referencedTable?: string; ascending?: boolean };
type Q = {
  select: (q: string) => Q;
  in: (c: string, v: readonly string[]) => Q;
  order: (c: string, o?: Ref) => Q;
  limit: (n: number, o?: Ref) => Q;
  then: (
    r: (v: { data: unknown[] | null; error: { message: string; code?: string } | null }) => void,
  ) => Promise<void>;
};
const db = supabase as unknown as { from: (t: string) => Q };

/**
 * תיבת ההגשות של המורה — נתונים אמיתיים.
 *
 * שורה אחת מגיעה שלמה: ההגשה, הגרסה האחרונה שנמסרה, המשימה, וזהות
 * התלמידה. הכול בשאילתה אחת דרך PostgREST, ולכן הכול עובר ב-RLS:
 *
 *   submissions          — policy sub_read, שנשענת על
 *                          app_can_review_submission, שהוא subject scoped
 *   submission_versions  — policy sv_read, נגזרת מאותה הגשה
 *   learning_tasks       — policy lt_read, קטלוג המשימות הפעילות
 *   students             — policy "Teachers view their group students"
 *
 * אין service role, אין SECURITY DEFINER עוקף, ואין שימוש ב-
 * app_teaches_student הישן. מורה שאינה מלמדת את התלמידה במקצוע הזה
 * לא תקבל את השורה מלכתחילה, ולכן גם לא את השם ולא את התשובה.
 *
 * הערה על היקף: המדיניות על students נשענת על is_teacher_of_student,
 * שהוא group scoped ולא subject scoped. הוא אינו יכול להרחיב גישה
 * להגשות — אלה כבר סוננו — אבל שם התלמידה מגיע דרך שער מעט רחב יותר
 * מהתשובה עצמה. המדיניות הזאת אינה משתנה כאן.
 */

/** רק מצבים עמידים שקיימים בפועל בחוזה החי.
 *  submit_task משאיר awaiting_review, ו-resubmit משאיר
 *  resubmitted_awaiting — שניהם ממתינים לבדיקה.
 *  'submitted' הוא ברירת מחדל של העמודה ואף RPC אינו משאיר אותו. */
export const PENDING_STATUSES = ["awaiting_review", "resubmitted_awaiting"] as const;

export type PendingStatus = (typeof PENDING_STATUSES)[number];

export interface InboxRow {
  id: string;
  status: PendingStatus;
  revision: number;
  submitted_at: string;
  updated_at: string;
  task: { id: string; title: string; external_app: string; external_key: string } | null;
  student: { id: string; full_name: string; class_name: string | null } | null;
  /** הגרסה האחרונה בלבד, כפי שהמסד החזיר אותה. */
  latest: { revision: number; content: unknown; created_at: string } | null;
  /** true כאשר הגרסה שחזרה אינה תואמת ל-submissions.revision. */
  revisionMismatch: boolean;
}

interface RawRow extends Omit<InboxRow, "latest" | "revisionMismatch"> {
  versions: { revision: number; content: unknown; created_at: string }[] | null;
}

const SELECT = `
  id, status, revision, submitted_at, updated_at,
  task:learning_tasks ( id, title, external_app, external_key ),
  student:students ( id, full_name, class_name ),
  versions:submission_versions ( revision, content, created_at )
`;

/**
 * enabled — ה-hook לא יורה כלל למשתמש שאינו מורשה. ה-guard בעמוד הוא
 * שכבת UX; RLS נשארת שכבת האבטחה, ושתיהן פועלות במקביל.
 */
export function useSubmissionInbox(enabled: boolean) {
  return useQuery<InboxRow[]>({
    queryKey: ["submission-inbox"],
    enabled,
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      // הגרסה האחרונה בלבד: PostgREST ממיין ומגביל את ה-relation המוטמע
      // בצד השרת, אחת לכל שורת אב. ההיסטוריה כולה אינה יורדת לדפדפן.
      const { data, error } = (await db
        .from("submissions")
        .select(SELECT)
        .in("status", PENDING_STATUSES)
        .order("submitted_at", { ascending: true })
        .order("revision", { referencedTable: "submission_versions", ascending: false })
        .limit(1, { referencedTable: "submission_versions" })) as unknown as {
        data: unknown[] | null;
        error: { message: string; code?: string } | null;
      };

      if (error) {
        // פרטי השגיאה נשארים לדיאגנוסטיקה בלבד ואינם מוצגים למשתמש.
        // אין כאן תוכן תלמידה: רק קוד וטקסט של המסד.
        console.error("[submission-inbox] query failed", {
          code: error.code, message: error.message,
        });
        throw new Error("INBOX_QUERY_FAILED");
      }

      return ((data ?? []) as unknown as RawRow[]).map(r => {
        const latest = (r.versions ?? [])[0] ?? null;
        const { versions: _drop, ...rest } = r;
        return {
          ...rest,
          latest,
          revisionMismatch: latest != null && latest.revision !== r.revision,
        } as InboxRow;
      });
    },
  });
}
