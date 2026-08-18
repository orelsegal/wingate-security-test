import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * src/integrations/supabase/types.ts נוצר לפני שחוזה ההגשות הותקן, ולכן
 * הלקוח המוקלד אינו מכיר את הטבלאות החדשות. יצירה מחדש של הטיפוסים
 * דורשת גישה למסד שאין לי כאן, ולכן השאילתה הזאת יוצאת דרך מצביע לא
 * מוקלד. זו הנקודה היחידה בקובץ שמוותרת על הטיפוסים, והצורה שחוזרת
 * מאומתת מיד ל-InboxRow. כשהטיפוסים ייווצרו מחדש, מוחקים את השורה הזאת.
 */
const db = supabase as unknown as {
  from: (t: string) => {
    select: (q: string) => {
      in: (c: string, v: readonly string[]) => {
        order: (c: string, o: { ascending: boolean }) =>
          Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
    };
  };
};

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
 * להגשות — אלה כבר סוננו — אבל הוא רחב יותר מהחוזה, ולכן שם התלמידה
 * מגיע דרך שער מעט רחב יותר מהתשובה עצמה.
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
  /** הגרסה האחרונה בלבד. content הוא ה-jsonb שהתלמידה מסרה. */
  latest: { revision: number; content: unknown; created_at: string } | null;
}

interface RawRow extends Omit<InboxRow, "latest"> {
  versions: { revision: number; content: unknown; created_at: string }[] | null;
}

const SELECT = `
  id, status, revision, submitted_at, updated_at,
  task:learning_tasks ( id, title, external_app, external_key ),
  student:students ( id, full_name, class_name ),
  versions:submission_versions ( revision, content, created_at )
`;

export function useSubmissionInbox() {
  return useQuery<InboxRow[]>({
    queryKey: ["submission-inbox"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("submissions")
        .select(SELECT)
        .in("status", PENDING_STATUSES)
        .order("submitted_at", { ascending: true });

      if (error) throw error;

      // Keep only the newest version per submission. Done here rather than
      // in the query so a submission whose versions are not readable still
      // renders as a row with no answer, instead of vanishing silently.
      return ((data ?? []) as unknown as RawRow[]).map(r => {
        const latest = (r.versions ?? [])
          .slice()
          .sort((a, b) => b.revision - a.revision)[0] ?? null;
        const { versions: _drop, ...rest } = r;
        return { ...rest, latest } as InboxRow;
      });
    },
  });
}
