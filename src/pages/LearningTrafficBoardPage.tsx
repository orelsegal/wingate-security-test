import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, SlidersHorizontal, ChevronLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUiLabels } from "@/context/UiLabelsContext";
import { useStudents } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";
import { classToGrade } from "@/lib/schoolUtils";
import { groupBagrut, sectionForClass } from "@/lib/bagrutView";
import { RamzorDot, RamzorChip } from "@/components/RamzorBadge";
import WorkTable, { type WorkStudent } from "@/components/learning/WorkTable";
import StudentDrawer, { type DrawerData } from "@/components/learning/StudentDrawer";
import type { AssessmentComponent, AssessmentScore } from "@/lib/assessments";
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
 * המסך אינו "מסתיר", השרת פשוט לא מחזיר. תא ריק = "לא הוזן" — לעולם לא
 * "במסלול" ולא אפס.
 *
 * שמות הצבעים הם אוצר המילים של הנתונים בלבד ואינם מוצגים למשתמש: בממשק
 * יש רמזור חזותי (RamzorBadge) עם סימן צורני וניסוח מקצועי, כך שהמצב
 * מזוהה גם ללא צבע.
 */

interface StatusRow extends LearningStatusRow { subjects?: { subject_name?: string | null } | null }
type MaybeArchived = { archived?: boolean | null };

const LearningTrafficBoardPage = () => {
  const { user } = useAuth();
  const { labels } = useUiLabels();
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

  /* רכיבי הבגרות של אותו מקצוע — אותה טבלה שמזינה את מפת הבגרות,
     ואותן הרשאות. משמשת רק להצגת ההקשר בתוך פירוט המקצוע. */
  const bagrutQuery = useQuery({
    queryKey: ["bagrut-map"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_bagrut_data" as "students")
        .select("student_id, data");
      if (error) throw error;
      return (data as unknown as { student_id: string; data: Record<string, unknown> | null }[]) || [];
    },
  });

  /* המקצועות שהמשתמש רשאי לכתוב בהם. RLS מחזיר למורה רק את השיוכים שלו,
     ולכן הרשימה הזו היא תמונת ההרשאה מהשרת — לא הנחה של הלקוח. */
  const mySubjectsQuery = useQuery({
    queryKey: ["my-teacher-subjects"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_subjects" as "students")
        .select("subject_id");
      if (error) return [] as { subject_id: string }[];
      return (data as unknown as { subject_id: string }[]) || [];
    },
  });
  const subjectsQuery = useQuery({
    queryKey: ["subjects-min"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("id, subject_name");
      if (error) throw error;
      return (data as unknown as { id: string; subject_name: string }[]) || [];
    },
  });

  const [q, setQ] = useState("");
  const [gradeF, setGradeF] = useState("all");
  const [sportF, setSportF] = useState("all");
  const [subjectF, setSubjectF] = useState("all");
  const [ramzorF, setRamzorF] = useState<"all" | Ramzor>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

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

  /* ── סביבת העבודה ── */
  const activeSubject = useMemo(() => {
    if (subjectF === "all") return null;
    return (subjectsQuery.data || []).find(s => s.subject_name === subjectF) || null;
  }, [subjectF, subjectsQuery.data]);

  const taughtIds = useMemo(
    () => new Set((mySubjectsQuery.data || []).map(r => r.subject_id)),
    [mySubjectsQuery.data],
  );
  const isAdminRole = user?.role === "admin" || user?.role === "developer";
  const canWriteActive = !!activeSubject && (isAdminRole || taughtIds.has(activeSubject.id));

  /** רכיבי הבגרות של תלמיד במקצוע נתון — כלשונם, בלי פרשנות */
  const bagrutByStudent = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    (bagrutQuery.data || []).forEach(r => m.set(r.student_id, r.data || {}));
    return m;
  }, [bagrutQuery.data]);
  const bagrutParts = (studentId: string, subject: string) => {
    const rec = bagrutByStudent.get(studentId);
    if (!rec || !subject) return [];
    const s = active.find(x => x.id === studentId);
    const groups = groupBagrut(sectionForClass(s?.class_name), rec);
    return (groups.find(g => g.subject === subject)?.items || [])
      .map(it => ({ label: it.label, value: it.value.trim() }));
  };

  /* אותם מפתחות שבהם WorkTable משתמש — הנתונים מגיעים מה-cache, בלי קריאה נוספת */
  const drawerComponents = useQuery({
    queryKey: ["assessment-components", activeSubject?.id],
    enabled: !!activeSubject && !!drawerId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_components" as "students")
        .select("id, subject_id, class_name, kind, name, due_date, weight, is_active")
        .eq("subject_id" as never, activeSubject!.id as never);
      if (error) throw error;
      return (data as unknown as AssessmentComponent[]) || [];
    },
  });
  const drawerScores = useQuery({
    queryKey: ["assessment-scores", activeSubject?.id],
    enabled: !!activeSubject && !!drawerId && !!drawerComponents.data?.length,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_scores" as "students")
        .select("id, component_id, student_id, score, submitted, note, updated_at")
        .in("component_id" as never, (drawerComponents.data || []).map(c => c.id) as never);
      if (error) throw error;
      return (data as unknown as (AssessmentScore & { updated_at?: string })[]) || [];
    },
  });

  /** התלמידים שמזינים את טבלת העבודה — אותו dataset מסונן */
  const workStudents: WorkStudent[] = useMemo(() => {
    if (!activeSubject) return [];
    return rows.map(({ s, st }) => {
      const r = st.find(x => x.subjects?.subject_name === activeSubject.subject_name);
      const rec = bagrutByStudent.get(s.id);
      const groups = rec ? groupBagrut(sectionForClass(s.class_name), rec) : [];
      const items = groups.flatMap(g => g.items);
      const filled = items.filter(i => i.value.trim() !== "").length;
      return {
        id: s.id,
        name: s.full_name,
        className: s.class_name || "",
        sport: s.sport || "",
        bagrutPct: items.length ? Math.round((filled / items.length) * 100) : null,
        ramzor: r?.ramzor ?? null,
        notes: r?.notes ?? null,
        haliffa: r?.haliffa ?? [],
        haliffaNotes: r?.haliffa_notes ?? null,
        gradesRaw: r?.grades_raw ?? null,
      };
    });
  }, [rows, activeSubject, bagrutByStudent]);

  /** הנתונים של פאנל הצד — מורכבים מאותם מקורות, בלי המצאה */
  const drawerData: DrawerData | null = useMemo(() => {
    if (!drawerId) return null;
    const w = workStudents.find(x => x.id === drawerId);
    const s = active.find(x => x.id === drawerId);
    if (!w || !s) return null;
    const rec = bagrutByStudent.get(drawerId);
    const items = (rec ? groupBagrut(sectionForClass(s.class_name), rec) : []).flatMap(g => g.items);
    const filled = items.filter(i => i.value.trim() !== "").length;
    const mine = (drawerScores.data || []).filter(x => x.student_id === drawerId);
    const map = new Map<string, AssessmentScore | undefined>();
    mine.forEach(x => map.set(x.component_id, x));
    const last = mine.map(x => x.updated_at).filter(Boolean).sort().pop() || null;
    return {
      ...w,
      bagrutFilled: filled,
      bagrutTotal: items.length,
      components: drawerComponents.data || [],
      scores: map,
      lastUpdate: last ?? null,
    };
  }, [drawerId, workStudents, active, bagrutByStudent, drawerComponents.data, drawerScores.data]);

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
                <RamzorDot status={k} size="md" />
                <span className="text-[11.5px] font-medium" style={{ color: m.ink }}>{m.label}</span>
              </div>
              <p className="text-[26px] font-semibold text-foreground leading-none mt-2 tabular-nums">{totals[k]}</p>
              <p className="text-[10.5px] text-muted-foreground/70 mt-1.5">מתוך {cellsShown} רשומות מקצוע</p>
            </button>
          );
        })}
        <div className="card-premium p-4">
          <div className="flex items-center gap-2">
            <RamzorDot status={null} size="md" />
            <span className="text-[11.5px] font-medium" style={{ color: metaFor(null).ink }}>לא הוזן</span>
          </div>
          <p className="text-[26px] font-semibold text-foreground leading-none mt-2 tabular-nums">{totals["לא הוזן"]}</p>
          <p className="text-[10.5px] text-muted-foreground/70 mt-1.5">אין מידע. לא "במסלול" ולא אפס</p>
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
        {/* ערך הסינון נשאר ערך הנתונים; מה שנקרא הוא הניסוח המקצועי */}
        <select value={ramzorF} onChange={e => setRamzorF(e.target.value as "all" | Ramzor)} className={selectCls} aria-label="מצב">
          <option value="all">כל המצבים</option>
          {RAMZOR_VALUES.map(r => <option key={r} value={r}>{metaFor(r).label}</option>)}
        </select>
        <label className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 right-2.5 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.6} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש תלמיד..."
            aria-label="חיפוש תלמיד"
            className="h-9 w-44 rounded-lg border border-border bg-card pr-8 pl-3 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </label>
      </div>

      {/* ── סביבת העבודה: אותו מסך, אותו route. נפתחת כשנבחר מקצוע פעיל ── */}
      {activeSubject ? (
        <div className="mb-5">
          <WorkTable
            subjectId={activeSubject.id}
            subjectName={activeSubject.subject_name}
            students={workStudents}
            canWrite={canWriteActive}
            periodLabel={labels.nav.semester}
            onOpenStudent={id => setDrawerId(id)}
          />
          {!canWriteActive && (
            <p className="text-[11px] text-muted-foreground mt-2">
              הצפייה בלבד. השרת אינו מתיר לך לכתוב במקצוע הזה.
            </p>
          )}
        </div>
      ) : (
        <p className="text-[11.5px] text-muted-foreground mb-4">
          בחרו מקצוע בפילוח כדי לפתוח את סביבת העבודה: הזנת ציונים, רכיבי הערכה וציון משוקלל, באותו מסך.
        </p>
      )}

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
            const open = openId === s.id;
            return (
              <div key={s.id} className="card-premium overflow-hidden">
                <button onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open}
                  className="w-full p-4 text-start hover:bg-accent/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-foreground">{s.full_name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {s.class_name || "ללא כיתה"} · {s.sport || "ללא ענף"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary shrink-0">
                      {open ? "סגירה" : "לפירוט"}
                      <ChevronLeft className={`h-3.5 w-3.5 transition-transform ${open ? "-rotate-90" : ""}`} strokeWidth={2} />
                    </span>
                  </div>

                  {/* התפלגות המצב */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {(["אדום", "צהוב", "ירוק", "לא הוזן"] as const).map(k => {
                      if (!t[k]) return null;
                      return (
                        <RamzorChip
                          key={k}
                          status={k === "לא הוזן" ? null : (k as Ramzor)}
                          prefix={`${t[k]} ·`}
                        />
                      );
                    })}
                  </div>

                  {/* המקצועות — שם המקצוע גלוי, המצב נקרא מהעיגול ומה-tooltip */}
                  <div className="flex flex-wrap gap-1.5">
                    {st.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground">אין רשומות מקצוע</span>
                    ) : st.map((r, i) => (
                      <RamzorChip
                        key={i}
                        status={r.ramzor}
                        context={r.subjects?.subject_name || undefined}
                        prefix={`${r.subjects?.subject_name ?? ""}${r.haliffa?.length ? " · מענה" : ""}`}
                        labelHidden
                      />
                    ))}
                  </div>
                </button>

                {open && (
                  <div className="px-4 pb-4 pt-1 border-t border-border/60">
                    {st.length === 0 ? (
                      <p className="text-[11.5px] text-muted-foreground">אין רשומות מקצוע לתלמיד זה.</p>
                    ) : (
                      <div className="space-y-2">
                        {st.map((r, i) => {
                          const subject = r.subjects?.subject_name || "";
                          const parts = bagrutParts(s.id, subject);
                          return (
                            <div key={i} className="rounded-xl border border-border/70 bg-muted/10 overflow-hidden">
                              <p className="px-3 py-1.5 bg-muted/40 text-[12px] font-semibold text-foreground border-b border-border/60 flex items-center gap-2">
                                <RamzorDot status={r.ramzor} context={subject} />
                                {subject}
                                <span className="text-[10.5px] font-medium" style={{ color: metaFor(r.ramzor).ink }}>
                                  {metaFor(r.ramzor).label}
                                </span>
                              </p>
                              <dl className="divide-y divide-border/40 text-[11.5px]">
                                <Field label="ציונים" value={r.grades_raw} hint="כלשונם בקובץ, כולל ריבוי ערכים" />
                                <Field label="הערת מורה" value={r.notes} />
                                <Field label="מענה שנבחר" value={r.haliffa?.length ? r.haliffa.join(" · ") : null} />
                                <Field label="הערות מענה" value={r.haliffa_notes} />
                              </dl>
                              {parts.length > 0 && (
                                <div className="px-3 py-2 border-t border-border/50 bg-card/40">
                                  <p className="text-[10.5px] text-muted-foreground mb-1.5">
                                    רכיבי הבגרות של {subject} לתלמיד זה:
                                  </p>
                                  <ul className="space-y-0.5">
                                    {parts.map((p, k) => (
                                      <li key={k} className="flex items-center justify-between gap-2 text-[11px]">
                                        <span className="text-muted-foreground truncate" title={p.label}>{p.label}</span>
                                        <span className="flex items-center gap-1.5 shrink-0">
                                          <span className={p.value ? "text-foreground font-medium" : "text-muted-foreground/50"}>
                                            {p.value || "לא הוזן"}
                                          </span>
                                          <RamzorDot status={p.value ? "ירוק" : null} context={p.label} />
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <button onClick={() => navigate(`/students/${s.id}`)}
                      className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
                      לכרטיס התלמיד המלא
                      <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* פאנל הצד — הטבלה והפילטרים נשארים מאחוריו */}
      {drawerData && (
        <StudentDrawer data={drawerData} onClose={() => setDrawerId(null)}
          onProfile={() => navigate(`/students/${drawerData.id}`)} />
      )}

      {/* ── מה שעדיין לא נבנה — נאמר במפורש, בלי להיראות פעיל ── */}
      <section className="card-premium p-4 mt-5 border-dashed">
        <h2 className="text-[13px] font-semibold text-foreground mb-1.5">הזנה ועדכון בידי הצוות, השלב הבא</h2>
        <p className="text-[11.5px] text-muted-foreground leading-relaxed">
          הזנת ציונים, הוספת משימה או מתכונת עם תאריך, בחירת מענה ורישום הערה. כל אלה
          נצפו אצל עינת ועדיין אינם פעילים כאן. שכבת הכתיבה תיפתח רק אחרי שכללי ההרשאה
          לכתיבה ייבדקו בשרת, כדי שמורה לא יוכל לכתוב על מקצוע שאינו שלו.
          עד אז המסך הוא לקריאה בלבד ואינו מדמה שמירה.
        </p>
      </section>
    </div>
  );
};

/** שורת פירוט — ערך ריק מוצג כ"לא הוזן", לעולם לא כאילו הוזן */
const Field = ({ label, value, hint }: { label: string; value?: string | null; hint?: string }) => (
  <div className="flex items-start justify-between gap-3 px-3 py-1.5">
    <dt className="text-muted-foreground shrink-0">
      {label}
      {hint && <span className="block text-[10px] text-muted-foreground/60">{hint}</span>}
    </dt>
    <dd className={`text-start ${value?.trim() ? "text-foreground font-medium" : "text-muted-foreground/50"}`}>
      {value?.trim() || "לא הוזן"}
    </dd>
  </div>
);

export default LearningTrafficBoardPage;
