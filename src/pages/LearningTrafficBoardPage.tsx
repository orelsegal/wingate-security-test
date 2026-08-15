import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, SlidersHorizontal, ChevronLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudents } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";
import { classToGrade } from "@/lib/schoolUtils";
import {
  LEARNING_SUBJECTS, RAMZOR_VALUES, metaFor, tally,
  type Ramzor, type LearningStatusRow,
} from "@/lib/learningTraffic";

/**
 * רמזור למידה — המסך הרוחבי (המודל של עינת, בשפה החזותית שלנו).
 *
 * נתונים: public.learning_status — רמזור · ציונים · הערות · חליפה (רב־ערכית)
 * · הערות חליפה, לכל תלמיד × מקצוע. RLS אוכף בשרת את חמשת התפקידים: מורה
 * מקבל רק את המקצוע שלו, מאמנטור רק את כיתתו, הורה/תלמיד רק את שלהם —
 * המסך אינו "מסתיר", השרת פשוט לא מחזיר. ריק = "לא הוזן", לעולם לא ירוק.
 * צבע לעולם לא עומד לבדו: לכל מצב יש גם מילה.
 */

interface StatusRow extends LearningStatusRow { subjects?: { subject_name?: string | null } | null }
type MaybeArchived = { archived?: boolean | null };

const LearningTrafficBoardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: students = [], isLoading: sLoad } = useStudents();
  const statusQuery = useQuery({
    queryKey: ["learning-status-board"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_status" as "students")
        .select("student_id, subject_id, ramzor, grades_raw, notes, haliffa, haliffa_notes, subjects(subject_name)");
      if (error) throw error;
      return (data as unknown as StatusRow[]) || [];
    },
  });

  const [q, setQ] = useState("");
  const [gradeF, setGradeF] = useState("all");
  const [sportF, setSportF] = useState("all");
  const [subjectF, setSubjectF] = useState("all");
  const [ramzorF, setRamzorF] = useState<"all" | Ramzor>("all");

  const active = useMemo(
    () => students.filter(s => !(s as unknown as MaybeArchived).archived),
    [students],
  );

  const byStudent = useMemo(() => {
    const m = new Map<string, StatusRow[]>();
    (statusQuery.data || []).forEach(r => {
      const arr = m.get(r.student_id) || [];
      arr.push(r);
      m.set(r.student_id, arr);
    });
    return m;
  }, [statusQuery.data]);

  const grades = useMemo(
    () => Array.from(new Set(active.map(s => classToGrade(s.class_name || "")).filter(Boolean))).sort(),
    [active],
  );
  const sports = useMemo(
    () => Array.from(new Set(active.map(s => s.sport).filter(Boolean))).sort(),
    [active],
  );

  const rows = useMemo(() => {
    return active
      .filter(s => gradeF === "all" || classToGrade(s.class_name || "") === gradeF)
      .filter(s => sportF === "all" || s.sport === sportF)
      .filter(s => !q.trim() || s.full_name.includes(q.trim()))
      .map(s => {
        let st = byStudent.get(s.id) || [];
        if (subjectF !== "all") st = st.filter(r => r.subjects?.subject_name === subjectF);
        return { s, st };
      })
      .filter(r => ramzorF === "all" || r.st.some(x => x.ramzor === ramzorF))
      .sort((a, b) => a.s.full_name.localeCompare(b.s.full_name, "he"));
  }, [active, gradeF, sportF, q, subjectF, ramzorF, byStudent]);

  const totals = useMemo(() => tally(rows.flatMap(r => r.st)), [rows]);
  const cellsShown = rows.reduce((n, r) => n + r.st.length, 0);

  if (sLoad || statusQuery.isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }
  if (statusQuery.isError) {
    // distinguish "table not created yet" from "no permission" — never blame
    // the user for a deployment step, and never invent data instead.
    const msg = String((statusQuery.error as { message?: string })?.message || "");
    const notDeployed = /does not exist|schema cache|relation/i.test(msg);
    return (
      <div className="p-10 text-center" dir="rtl">
        <p className="text-[14px] font-medium text-foreground">
          {notDeployed ? "רמזור הלמידה טרם הופעל במסד הנתונים" : "אין לך הרשאה לצפות ברמזור הלמידה"}
        </p>
        <p className="text-[12px] text-muted-foreground mt-1.5">
          {notDeployed
            ? "המסך מוכן; נדרשת הרצת המיגרציה על מסד הנתונים כדי להציג נתונים."
            : "ההגבלה נאכפת בשרת לפי התפקיד שלך."}
        </p>
      </div>
    );
  }

  const selectCls = "h-9 rounded-lg border border-border bg-card px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40";
  const roleNote =
    user?.role === "teacher" ? "מוצגים המקצועות שאליהם שויכת"
    : user?.role === "parent" ? "מוצג הילד המשויך לחשבונך"
    : user?.role === "student" ? "מוצג המידע שלך בלבד"
    : "מוצגים כלל התלמידים";

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-[1280px] mx-auto" dir="rtl">
      <header className="mb-4">
        <h1 className="text-[22px] md:text-[26px] font-semibold text-foreground tracking-tight">רמזור למידה</h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          חמישה מקצועות · רמזור, ציונים, הערות ומענה · {roleNote}
        </p>
      </header>

      {/* סיכום מספרי, כל מספר עם מכנה */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {(["אדום", "צהוב", "ירוק"] as Ramzor[]).map(k => {
          const m = metaFor(k);
          return (
            <button key={k} onClick={() => setRamzorF(ramzorF === k ? "all" : k)}
              aria-pressed={ramzorF === k}
              className={`card-premium p-4 text-start transition-all ${ramzorF === k ? "ring-2 ring-primary/40" : "hover:shadow-md"}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${m.dot}`} />
                <span className="text-[11.5px] font-medium text-muted-foreground">{m.label}</span>
              </div>
              <p className="text-[26px] font-semibold text-foreground leading-none mt-2 tabular-nums">{totals[k]}</p>
              <p className="text-[10.5px] text-muted-foreground/70 mt-1.5">מתוך {cellsShown} רשומות מקצוע</p>
            </button>
          );
        })}
        <div className="card-premium p-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/35" />
            <span className="text-[11.5px] font-medium text-muted-foreground">לא הוזן</span>
          </div>
          <p className="text-[26px] font-semibold text-foreground leading-none mt-2 tabular-nums">{totals["לא הוזן"]}</p>
          <p className="text-[10.5px] text-muted-foreground/70 mt-1.5">אין מידע — לא ירוק ולא אפס</p>
        </div>
      </div>

      <p className="text-[12.5px] text-muted-foreground mb-3">
        מציג <span className="font-semibold text-foreground tabular-nums">{rows.length}</span> מתוך{" "}
        <span className="tabular-nums">{active.length}</span> תלמידים
      </p>

      {/* פילוחים */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.6} /> פילוח:
        </span>
        <select value={gradeF} onChange={e => setGradeF(e.target.value)} className={selectCls} aria-label="שכבה">
          <option value="all">כל השכבות</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={sportF} onChange={e => setSportF(e.target.value)} className={selectCls} aria-label="ענף">
          <option value="all">כל הענפים</option>
          {sports.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={subjectF} onChange={e => setSubjectF(e.target.value)} className={selectCls} aria-label="מקצוע">
          <option value="all">כל המקצועות</option>
          {LEARNING_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={ramzorF} onChange={e => setRamzorF(e.target.value as "all" | Ramzor)} className={selectCls} aria-label="רמזור">
          <option value="all">כל הרמזורים</option>
          {RAMZOR_VALUES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <label className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 right-2.5 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.6} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש תלמיד..."
            aria-label="חיפוש תלמיד"
            className="h-9 w-44 rounded-lg border border-border bg-card pr-8 pl-3 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </label>
      </div>

      {/* כרטיסי תלמידים */}
      {rows.length === 0 ? (
        <div className="card-premium p-10 text-center">
          <p className="text-[13px] text-muted-foreground">
            {(statusQuery.data || []).length === 0
              ? "טרם הוזנו נתוני רמזור למידה."
              : "אין תלמידים תואמים לפילוח הנוכחי."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map(({ s, st }) => {
            const t = tally(st);
            return (
              <button key={s.id} onClick={() => navigate(`/students/${s.id}`)}
                className="card-premium p-4 text-start hover:shadow-[var(--shadow-card-hover)] transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-foreground">{s.full_name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {s.class_name || "ללא כיתה"} · {s.sport || "ללא ענף"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary shrink-0">
                    לפרטים
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                </div>

                {/* התפלגות המצב */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {(["אדום", "צהוב", "ירוק", "לא הוזן"] as const).map(k => {
                    if (!t[k]) return null;
                    const m = metaFor(k === "לא הוזן" ? null : (k as Ramzor));
                    return (
                      <span key={k} className={`inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full border ${m.chip}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                        {t[k]} {m.label}
                      </span>
                    );
                  })}
                </div>

                {/* המקצועות */}
                <div className="flex flex-wrap gap-1.5">
                  {st.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground">אין רשומות מקצוע</span>
                  ) : st.map((r, i) => {
                    const m = metaFor(r.ramzor);
                    return (
                      <span key={i} className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full border ${m.chip}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                        {r.subjects?.subject_name}
                        {r.haliffa?.length ? " · מענה" : ""}
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LearningTrafficBoardPage;
