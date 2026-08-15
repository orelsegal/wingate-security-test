import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudents, useAllStudentProgress, statusConfig, type StatusType } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";
import { classToGrade } from "@/lib/schoolUtils";
import { sectionForClass, groupBagrut, bagrutFilled } from "@/lib/bagrutView";

/**
 * חדר הבקרה · שני הרמזורים של עינת — על נתוני האמת בלבד.
 *
 * מקור הנתונים (מאומת): Supabase flfemffhswlpgpbvhuvy —
 *   רמזור למידה: students × student_subject_progress.status (ערך שמור שמוזן
 *     דרך הזנת הציונים/הייבוא; אינו מחושב כאן ואינו מומצא).
 *   מפת בגרות: student_bagrut_data — שורת הגיליון המקורית כלשונה; מוצגות
 *     ספירות מכניות של רכיבים מלאים/ריקים בלבד. רמזור הבגרות הנגזר
 *     (כלל 12 / 10–11 חסרים מההקלטה) ממתין לאישור אילו עמודות נחשבות
 *     "חלק בגרות" — ולכן מסומן "בהכנה" ולא מומצא.
 *
 * צורת העבודה שנשמרה מההקלטה: שני מסכים במתג אחד, פילוחים לפי
 * שכבה/ענף/מקצוע, חיפוש, ומכנה מפורש בכל מספר ("מציג X מתוך Y").
 * RLS: הנתונים נקראים תחת הרשאות admin בלבד (המסך מוגן בהתאם).
 */

type Tab = "learning" | "bagrut";
type StatusFilter = "all" | StatusType;

interface ProgressRow {
  id: string;
  student_id: string;
  status: string | null;
  subjects?: { subject_name?: string | null } | null;
}
interface BagrutRow { student_id: string; data: Record<string, unknown> | null }
type MaybeArchived = { archived?: boolean | null };

const LearningTrafficBoardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin" || user?.role === "developer";

  const { data: students = [], isLoading: sLoad } = useStudents();
  const { data: allProgress = [], isLoading: pLoad } = useAllStudentProgress();

  const bagrutQuery = useQuery({
    queryKey: ["bagrut-board"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_bagrut_data" as "students")
        .select("student_id, data");
      if (error) throw error;
      return (data as unknown as BagrutRow[]) || [];
    },
  });

  const [tab, setTab] = useState<Tab>("learning");
  const [q, setQ] = useState("");
  const [gradeF, setGradeF] = useState("all");
  const [sportF, setSportF] = useState("all");
  const [subjectF, setSubjectF] = useState("all");
  const [statusF, setStatusF] = useState<StatusFilter>("all");

  const active = useMemo(() => students.filter(s => !(s as unknown as MaybeArchived).archived), [students]);

  const progressByStudent = useMemo(() => {
    const m = new Map<string, ProgressRow[]>();
    (allProgress as unknown as ProgressRow[]).forEach(p => {
      const arr = m.get(p.student_id) || [];
      arr.push(p);
      m.set(p.student_id, arr);
    });
    return m;
  }, [allProgress]);

  const bagrutByStudent = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    (bagrutQuery.data || []).forEach((r: BagrutRow) => m.set(r.student_id, r.data || {}));
    return m;
  }, [bagrutQuery.data]);

  const grades = useMemo(() => Array.from(new Set(active.map(s => classToGrade(s.class_name || "")).filter(Boolean))).sort(), [active]);
  const sports = useMemo(() => Array.from(new Set(active.map(s => s.sport).filter(Boolean))).sort(), [active]);
  const subjects = useMemo(() => Array.from(new Set((allProgress as unknown as ProgressRow[]).map(p => p.subjects?.subject_name).filter(Boolean))).sort(), [allProgress]);

  const rows = useMemo(() => {
    return active
      .filter(s => (gradeF === "all" || classToGrade(s.class_name || "") === gradeF))
      .filter(s => (sportF === "all" || s.sport === sportF))
      .filter(s => !q.trim() || s.full_name.includes(q.trim()))
      .map(s => {
        let prog = progressByStudent.get(s.id) || [];
        if (subjectF !== "all") prog = prog.filter(p => p.subjects?.subject_name === subjectF);
        if (statusF !== "all") prog = prog.filter(p => p.status === statusF);
        return { s, prog };
      })
      .filter(r => (subjectF === "all" && statusF === "all") || r.prog.length > 0)
      .sort((a, b) => a.s.full_name.localeCompare(b.s.full_name, "he"));
  }, [active, gradeF, sportF, q, subjectF, statusF, progressByStudent]);

  const lightCount = useMemo(() => rows.reduce((n, r) => n + r.prog.length, 0), [rows]);
  const statusTotals = useMemo(() => {
    const t: Record<StatusType, number> = { green: 0, yellow: 0, red: 0 };
    rows.forEach(r => r.prog.forEach((p: ProgressRow) => { if (p.status && p.status in t) t[p.status as StatusType]++; }));
    return t;
  }, [rows]);

  if (!isAdmin) {
    return (
      <div className="p-10 text-center" dir="rtl">
        <p className="text-[14px] font-medium text-foreground">חדר הבקרה זמין למנהלת המערכת בלבד</p>
        <p className="text-[12px] text-muted-foreground mt-1.5">נתוני הרמזור נקראים תחת הרשאות ניהול (RLS).</p>
      </div>
    );
  }

  if (sLoad || pLoad) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  const selectCls = "h-9 rounded-lg border border-border bg-card px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40";

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-[1280px] mx-auto" dir="rtl">
      {/* header + tab switch (her two screens, one toggle) */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-semibold text-foreground tracking-tight">חדר בקרה · רמזורים</h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            {tab === "learning"
              ? "מצב לימודי לפי מקצוע · הסטטוס כפי שנשמר במערכת (הזנת ציונים וייבוא), לא מחושב אוטומטית"
              : "מפת הבגרות · שורת הגיליון המקורית של כל תלמיד, ספירות מכניות בלבד"}
          </p>
        </div>
        <div className="flex rounded-xl border border-border overflow-hidden">
          {(["learning", "bagrut"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-[12.5px] font-semibold transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-accent/40"
              }`}>
              {t === "learning" ? "רמזור למידה" : "מפת בגרות"}
            </button>
          ))}
        </div>
      </div>

      {/* explicit denominators — every number carries its unit */}
      <p className="text-[12.5px] text-muted-foreground mb-4">
        מציג <span className="font-semibold text-foreground tabular-nums">{rows.length}</span> מתוך{" "}
        <span className="tabular-nums">{active.length}</span> תלמידים
        {tab === "learning" && (
          <> · <span className="font-semibold text-foreground tabular-nums">{lightCount}</span> רמזורים
            {" · "}
            <span className="text-[hsl(var(--success))]">{statusTotals.green} במסלול</span>
            {" · "}
            <span className="text-[hsl(var(--warning))]">{statusTotals.yellow} פערים</span>
            {" · "}
            <span className="text-destructive">{statusTotals.red} בסיכון</span>
          </>
        )}
      </p>

      {/* her פילוחים: שכבה / ענף / מקצוע / סטטוס / חיפוש */}
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
        {tab === "learning" && (
          <>
            <select value={subjectF} onChange={e => setSubjectF(e.target.value)} className={selectCls} aria-label="מקצוע">
              <option value="all">כל המקצועות</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={statusF} onChange={e => setStatusF(e.target.value as StatusFilter)} className={selectCls} aria-label="סטטוס">
              <option value="all">כל הסטטוסים</option>
              <option value="green">במסלול</option>
              <option value="yellow">פערים</option>
              <option value="red">בסיכון</option>
            </select>
          </>
        )}
        <label className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 right-2.5 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.6} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש תלמיד..."
            className="h-9 w-44 rounded-lg border border-border bg-card pr-8 pl-3 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </label>
      </div>

      {/* rows */}
      {rows.length === 0 ? (
        <div className="card-premium p-10 text-center">
          <p className="text-[13px] text-muted-foreground">אין תלמידים תואמים לפילוח הנוכחי.</p>
        </div>
      ) : (
        <div className="card-premium divide-y divide-border overflow-hidden">
          {rows.map(({ s, prog }) => {
            const bag = bagrutByStudent.get(s.id);
            const section = sectionForClass(s.class_name);
            const groups = tab === "bagrut" ? groupBagrut(section, bag) : [];
            const flat = tab === "bagrut" ? groups.flatMap(g => g.items) : [];
            const filled = tab === "bagrut" ? bagrutFilled(groups).length : 0;
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/students/${s.id}`)}
                className="w-full px-4 md:px-5 py-3 text-start hover:bg-accent/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-foreground">{s.full_name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {s.class_name || "ללא כיתה"} · {s.sport || "ללא ענף"}
                    </p>
                  </div>
                  {tab === "learning" ? (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {prog.length === 0 ? (
                        <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border">
                          אין רשומות מקצוע
                        </span>
                      ) : prog.map((p: ProgressRow) => {
                        const st = (p.status || "") as StatusType;
                        const cfg = statusConfig[st];
                        return (
                          <span key={p.id}
                            className={`inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full border ${cfg ? cfg.bgClass + " " + cfg.textClass : "bg-muted/60 text-muted-foreground"}`}>
                            {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />}
                            {p.subjects?.subject_name}
                            {cfg ? ` · ${cfg.label}` : " · טרם הוגדר"}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px]">
                      {bag ? (
                        <>
                          <span className="text-foreground font-semibold tabular-nums">{filled}</span>
                          <span className="text-muted-foreground">רכיבים מלאים מתוך {flat.length}</span>
                          <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                            רמזור בגרות · בהכנה
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">אין שורת בגרות בגיליון</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {tab === "bagrut" && (
        <p className="text-[10.5px] text-muted-foreground mt-3 leading-relaxed">
          רמזור הבגרות הנגזר (מעל 12 חלקים חסרים אדום · 10–11 צהוב · פחות ירוק, לפי הכלל שהוגדר בהקלטה)
          ימתין עד אישור אילו עמודות בגיליון נחשבות "חלק בגרות". עד אז מוצגות ספירות מכניות בלבד — לא רמזור מומצא.
        </p>
      )}
    </div>
  );
};

export default LearningTrafficBoardPage;
