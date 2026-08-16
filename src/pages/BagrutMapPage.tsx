import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft, GraduationCap, Loader2, Search, SlidersHorizontal,
  List, BarChart3, PieChart, AlertTriangle, Download, Printer, Sigma, X,
} from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";
import { RamzorDot, RamzorChip } from "@/components/RamzorBadge";
import StatusDonut from "@/components/charts/StatusDonut";
import CompletionBars from "@/components/charts/CompletionBars";
import { exportBagrutXlsx } from "@/lib/exportBagrut";
import { bagrutBandLabel, metaFor, BAGRUT_THRESHOLDS, type BagrutBand } from "@/lib/learningTraffic";
import {
  studentBagrut, bandTally, overallCompletion, completionBySubject,
  completionBySubjectAndGrade, componentBreakdown, mostMissing, mathReport,
  STUDENT_BANDS, type StudentBand, type StudentBagrut,
} from "@/lib/bagrutStats";

/**
 * מפת דרכים לבגרות — מסך הניהול המלא, על הנתונים האמיתיים בלבד.
 *
 * מקור: public.student_bagrut_data — שורת הגיליון של כל תלמיד כלשונה.
 * "רכיב" = עמודה בגיליון של אותה שכבה. "חסר" = תא ריק. הספירה מכנית:
 * אין ציון מומצא, אין השלמה ואין ניחוש (bagrutStats.ts, פונקציות טהורות).
 *
 * עיקרון: dataset מסונן אחד מזין את הכול — כרטיסי הסיכום, התרשימים,
 * הטבלאות והרשימה מתעדכנים יחד מאותו מקור. כל KPI וכל פלח בתרשים הם
 * כפתור שמוביל לרשימת התלמידים שמאחוריו.
 *
 * שמות הצבעים אינם מוצגים: המצב נקרא מהרמזור החזותי ומהניסוח המקצועי.
 */

interface BagrutRow { student_id: string; data: Record<string, unknown> | null }
type MaybeArchived = { archived?: boolean | null };
type ViewMode = "list" | "bars" | "donut";

const bandOf = (b: StudentBand) => (b === "לא הוזן" ? null : (b as BagrutBand));

const BagrutMapPage = () => {
  const navigate = useNavigate();
  const { data: students = [], isLoading: sLoad } = useStudents();

  const bagrutQuery = useQuery({
    queryKey: ["bagrut-map"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_bagrut_data" as "students")
        .select("student_id, data");
      if (error) throw error;
      return (data as unknown as BagrutRow[]) || [];
    },
  });

  const [q, setQ] = useState("");
  const [gradeF, setGradeF] = useState("all");
  const [sportF, setSportF] = useState("all");
  const [subjectF, setSubjectF] = useState("all");
  const [bandF, setBandF] = useState<"all" | StudentBand>("all");
  const [view, setView] = useState<ViewMode>("list");
  const [openId, setOpenId] = useState<string | null>(null);
  const [riskOnly, setRiskOnly] = useState(false);
  const [showMath, setShowMath] = useState(false);

  const active = useMemo(
    () => students.filter(s => !(s as unknown as MaybeArchived).archived),
    [students],
  );
  const bagrutById = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    (bagrutQuery.data || []).forEach(r => m.set(r.student_id, r.data || {}));
    return m;
  }, [bagrutQuery.data]);

  /** כל התלמידים, מחושבים פעם אחת */
  const all = useMemo(
    () => active.map(s => studentBagrut(s, bagrutById.get(s.id))),
    [active, bagrutById],
  );

  const grades = useMemo(() => [...new Set(all.map(r => r.grade).filter(Boolean))].sort(), [all]);
  const sports = useMemo(() => [...new Set(all.map(r => r.sport).filter(Boolean))].sort(), [all]);
  const subjects = useMemo(
    () => [...new Set(all.flatMap(r => r.bySubject.map(g => g.subject)))].sort((a, b) => a.localeCompare(b, "he")),
    [all],
  );

  /** ה-dataset המסונן — מזין את כל המספרים, התרשימים והרשימה */
  const rows = useMemo(() => {
    let out = all
      .filter(r => gradeF === "all" || r.grade === gradeF)
      .filter(r => sportF === "all" || r.sport === sportF)
      .filter(r => !q.trim() || r.name.includes(q.trim()))
      .filter(r => bandF === "all" || r.band === bandF);
    // סינון מקצוע מצמצם את התלמידים לאלה שהמקצוע קיים בגיליון שלהם,
    // והספירות שלהם מחושבות על אותו מקצוע בלבד — אחרת המספרים ישקרו.
    if (subjectF !== "all") {
      out = out
        .filter(r => r.bySubject.some(g => g.subject === subjectF))
        .map(r => {
          const g = r.bySubject.find(x => x.subject === subjectF)!;
          const grp = r.groups.filter(x => x.subject === subjectF);
          return { ...r, groups: grp, bySubject: [g], total: g.total, filled: g.filled, missing: g.missing, pct: g.pct };
        });
    }
    return out;
  }, [all, gradeF, sportF, q, bandF, subjectF]);

  const listRows = useMemo(
    () => (riskOnly ? mostMissing(rows, rows.length) : rows)
      .slice()
      .sort((a, b) => b.missing - a.missing || a.name.localeCompare(b.name, "he")),
    [rows, riskOnly],
  );

  const tally = useMemo(() => bandTally(rows), [rows]);
  const overall = useMemo(() => overallCompletion(rows), [rows]);
  const bySubject = useMemo(() => completionBySubject(rows), [rows]);
  const matrix = useMemo(() => completionBySubjectAndGrade(rows), [rows]);
  const breakdown = useMemo(() => componentBreakdown(rows), [rows]);
  const atRisk = useMemo(() => mostMissing(rows), [rows]);
  const math = useMemo(() => (showMath ? mathReport(rows) : []), [rows, showMath]);

  const filterNote = [
    gradeF === "all" ? null : `שכבה ${gradeF}`,
    sportF === "all" ? null : `ענף ${sportF}`,
    subjectF === "all" ? null : `מקצוע ${subjectF}`,
    bandF === "all" ? null : metaFor(bandOf(bandF)).label,
    q.trim() ? `חיפוש "${q.trim()}"` : null,
  ].filter(Boolean).join(" · ") || "ללא סינון";

  const clearFilters = () => {
    setGradeF("all"); setSportF("all"); setSubjectF("all"); setBandF("all"); setQ(""); setRiskOnly(false);
  };
  const anyFilter = gradeF !== "all" || sportF !== "all" || subjectF !== "all" || bandF !== "all" || !!q.trim() || riskOnly;

  if (sLoad || bagrutQuery.isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }
  if (bagrutQuery.isError) {
    return (
      <div className="p-10 text-center" dir="rtl">
        <p className="text-[14px] font-medium text-foreground">אין לך הרשאה לצפות במפת הבגרות</p>
        <p className="text-[12px] text-muted-foreground mt-1.5">ההגבלה נאכפת בשרת לפי התפקיד שלך.</p>
      </div>
    );
  }

  const selectCls = "h-9 rounded-lg border border-border bg-card px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40";
  const viewBtn = (m: ViewMode, Icon: typeof List, label: string) => (
    <button onClick={() => setView(m)} aria-pressed={view === m} title={label} aria-label={label}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        view === m ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted/50"
      }`}>
      <Icon className="h-4 w-4" strokeWidth={1.8} />
    </button>
  );

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-[1280px] mx-auto" dir="rtl">
      <header className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-semibold text-foreground tracking-tight">מפת דרכים לבגרות</h1>
          <p className="text-[12px] text-muted-foreground mt-1">
            מצב ההתקדמות לתעודת בגרות · הספירה מבוססת על גיליון הבגרות כלשונו
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button onClick={() => exportBagrutXlsx(listRows, filterNote)}
            className="h-9 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <Download className="h-3.5 w-3.5" strokeWidth={1.8} /> ייצוא לאקסל
          </button>
          <button onClick={() => window.print()}
            className="h-9 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <Printer className="h-3.5 w-3.5" strokeWidth={1.8} /> הדפסה
          </button>
        </div>
      </header>

      {/* מהי תעודת בגרות מלאה — ההסבר שביקשה עינת, מתקפל */}
      <details className="card-premium px-4 py-3 mb-4">
        <summary className="text-[13px] font-semibold text-foreground cursor-pointer select-none inline-flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" strokeWidth={1.7} />
          מהי תעודת בגרות מלאה?
        </summary>
        <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed">
          כל המקצועות והחלקים שצריך להשלים, כפי שהם מופיעים בגיליון הבגרות של כל שכבה.
          רכיב נחשב <span className="font-semibold text-foreground">חסר</span> כשהתא שלו בגיליון ריק.
        </p>
        <ul className="mt-2 space-y-1.5">
          {(["אדום", "צהוב", "ירוק"] as BagrutBand[]).map(b => (
            <li key={b} className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <RamzorDot status={b} />
              <span className="font-medium" style={{ color: metaFor(b).ink }}>{metaFor(b).label}</span>
              <span className="text-muted-foreground/80">· {bagrutBandLabel[b]}</span>
            </li>
          ))}
          <li className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <RamzorDot status={null} />
            <span className="font-medium" style={{ color: metaFor(null).ink }}>לא הוזן</span>
            <span className="text-muted-foreground/80">· אין גיליון בגרות לתלמיד</span>
          </li>
        </ul>
      </details>

      {/* ── פילוחים — כל שינוי מעדכן את כל המספרים והתרשימים יחד ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4 print:hidden">
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.6} /> פילוח:
        </span>
        <select value={gradeF} onChange={e => setGradeF(e.target.value)} className={selectCls} aria-label="שכבה">
          <option value="all">כל השכבות</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={subjectF} onChange={e => setSubjectF(e.target.value)} className={selectCls} aria-label="מקצוע">
          <option value="all">כל המקצועות</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sportF} onChange={e => setSportF(e.target.value)} className={selectCls} aria-label="ענף ספורט">
          <option value="all">כל הענפים</option>
          {sports.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={bandF} onChange={e => setBandF(e.target.value as "all" | StudentBand)} className={selectCls} aria-label="מצב">
          <option value="all">כל המצבים</option>
          {STUDENT_BANDS.map(b => <option key={b} value={b}>{metaFor(bandOf(b)).label}</option>)}
        </select>
        <label className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 right-2.5 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.6} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש תלמיד..." aria-label="חיפוש תלמיד"
            className="h-9 w-40 rounded-lg border border-border bg-card pr-8 pl-3 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </label>
        {anyFilter && (
          <button onClick={clearFilters}
            className="h-9 inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11.5px] text-muted-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <X className="h-3.5 w-3.5" strokeWidth={2} /> ניקוי פילוח
          </button>
        )}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <span className="inline-flex items-center gap-1.5">
          {viewBtn("list", List, "תצוגת רשימה")}
          {viewBtn("bars", BarChart3, "תצוגת עמודות")}
          {viewBtn("donut", PieChart, "תצוגת טבעת")}
        </span>
      </div>

      {/* ── סיכום: כמות ואחוז לכל מצב, כל כרטיס מוביל לרשימה ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="card-premium p-4">
          <span className="text-[11.5px] font-medium text-muted-foreground">תלמידים</span>
          <p className="text-[26px] font-semibold text-foreground leading-none mt-2 tabular-nums">{rows.length}</p>
          <p className="text-[10.5px] text-muted-foreground/70 mt-1.5">מתוך {all.length} במערכת</p>
        </div>
        {tally.map(t => {
          const on = bandF === t.band;
          return (
            <button key={t.band} onClick={() => { setBandF(on ? "all" : t.band); setRiskOnly(false); }} aria-pressed={on}
              className={`card-premium p-4 text-start transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${on ? "ring-2 ring-primary/40" : "hover:shadow-md"}`}>
              <span className="flex items-center gap-2">
                <RamzorDot status={bandOf(t.band)} size="md" />
                <span className="text-[11.5px] font-medium" style={{ color: metaFor(bandOf(t.band)).ink }}>
                  {metaFor(bandOf(t.band)).label}
                </span>
              </span>
              <p className="text-[26px] font-semibold text-foreground leading-none mt-2 tabular-nums">
                {t.count} <span className="text-[13px] font-medium text-muted-foreground">· {t.pct}%</span>
              </p>
              <p className="text-[10.5px] text-muted-foreground/70 mt-1.5">
                {t.band === "לא הוזן" ? "אין גיליון בגרות" : bagrutBandLabel[t.band as BagrutBand]}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── קבוצת פעולה: דורשי טיפול ── */}
      {atRisk.length > 0 && (
        <div className="card-premium p-4 mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
            <h2 className="text-[13.5px] font-semibold text-foreground inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.8} style={{ color: metaFor("אדום").ink }} />
              התלמידים עם הכי הרבה רכיבים חסרים
              <span className="text-[11.5px] font-medium text-muted-foreground">({atRisk.length} מוצגים)</span>
            </h2>
            <button onClick={() => { setRiskOnly(!riskOnly); setBandF("all"); }} aria-pressed={riskOnly}
              className={`h-8 rounded-lg border px-2.5 text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                riskOnly ? "bg-primary text-white border-primary" : "bg-card border-border text-foreground hover:bg-muted/50"
              }`}>
              {riskOnly ? "הצגת כל התלמידים" : "הצגת קבוצת הטיפול בלבד"}
            </button>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {atRisk.map(r => (
              <li key={r.id}>
                <button onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  <RamzorDot status={bandOf(r.band)} context={r.name} />
                  <span className="flex-1 text-start truncate">{r.name}</span>
                  <span className="text-[10.5px] text-muted-foreground shrink-0">{r.className}</span>
                  <span className="tabular-nums font-semibold shrink-0" style={{ color: metaFor("אדום").ink }}>{r.missing} חסרים</span>
                  <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[10.5px] text-muted-foreground/70 mt-2">
            הדירוג מכני: מספר התאים הריקים בגיליון של אותו תלמיד. לחיצה פותחת את פירוט החוסרים שלו ברשימה שלמטה.
          </p>
        </div>
      )}

      {/* ── תצוגת טבעת ── */}
      {view === "donut" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <section className="card-premium p-4">
            <h2 className="text-[13.5px] font-semibold text-foreground mb-1">התפלגות התלמידים לפי מצב</h2>
            <p className="text-[10.5px] text-muted-foreground/80 mb-3">לחיצה על מצב מסננת את כל המסך.</p>
            <StatusDonut
              slices={tally.map(t => ({ key: t.band, status: bandOf(t.band), value: t.count }))}
              centerValue={String(rows.length)} centerLabel="תלמידים"
              selected={bandF === "all" ? null : bandF}
              onSelect={k => setBandF(bandF === k ? "all" : (k as StudentBand))}
            />
          </section>
          <section className="card-premium p-4">
            <h2 className="text-[13.5px] font-semibold text-foreground mb-1">אחוז השלמה כללי</h2>
            <p className="text-[10.5px] text-muted-foreground/80 mb-3">
              רכיבי הבגרות של התלמידים המוצגים. רכיב הוא תא בגיליון: יש ערך או שאין.
            </p>
            <StatusDonut
              slices={[
                { key: "filled", status: "ירוק", value: overall.filled, label: "הושלמו" },
                { key: "missing", status: "אדום", value: overall.missing, label: "חסרים" },
              ]}
              centerValue={`${overall.pct}%`} centerLabel="הושלמו"
            />
          </section>
        </div>
      )}

      {/* ── תצוגת עמודות ── */}
      {view === "bars" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <section className="card-premium p-4">
            <h2 className="text-[13.5px] font-semibold text-foreground mb-1">אחוז השלמה לפי מקצוע</h2>
            <p className="text-[10.5px] text-muted-foreground/80 mb-3">
              מתוך רכיבי הבגרות של המקצוע אצל התלמידים המוצגים. לחיצה מסננת לפי מקצוע.
            </p>
            <CompletionBars
              rows={bySubject.map(s => ({ key: s.subject, label: s.subject, filled: s.filled, total: s.total, pct: s.pct }))}
              selected={subjectF === "all" ? null : subjectF}
              onSelect={k => setSubjectF(subjectF === k ? "all" : k)}
            />
          </section>
          <section className="card-premium p-4 overflow-x-auto">
            <h2 className="text-[13.5px] font-semibold text-foreground mb-1">אחוז השלמה לפי מקצוע ושכבה</h2>
            <p className="text-[10.5px] text-muted-foreground/80 mb-3">איפה בדיוק נמצא הפער. תא ריק = אין רכיבים לשכבה זו.</p>
            <table className="w-full text-[11.5px] border-collapse">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-start font-medium py-1.5 pe-2">מקצוע</th>
                  {matrix.grades.map(g => <th key={g} className="text-start font-medium py-1.5 px-1.5">{g}</th>)}
                  <th className="text-start font-medium py-1.5 px-1.5">סה״כ</th>
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map(r => (
                  <tr key={r.subject} className="border-t border-border/50">
                    <td className="py-1.5 pe-2 text-foreground">{r.subject}</td>
                    {matrix.grades.map(g => {
                      const c = r.cells[g];
                      return (
                        <td key={g} className="py-1.5 px-1.5 tabular-nums">
                          {c ? <span title={`${c.filled} מתוך ${c.total} רכיבים`}>{c.pct}%</span>
                            : <span className="text-muted-foreground/50">—</span>}
                        </td>
                      );
                    })}
                    <td className="py-1.5 px-1.5 tabular-nums font-semibold text-foreground"
                      title={`${r.totalCell.filled} מתוך ${r.totalCell.total} רכיבים`}>{r.totalCell.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* ── פירוט לפי מקצוע ורכיב — נגיש בכל תצוגה ── */}
      <details className="card-premium px-4 py-3 mb-4">
        <summary className="text-[13px] font-semibold text-foreground cursor-pointer select-none">
          פירוט השלמה לפי מקצוע ורכיב
        </summary>
        <p className="text-[11px] text-muted-foreground mt-2 mb-3">
          לכל רכיב: כמה מהתלמידים המוצגים כבר הוזן להם ערך. שם הרכיב והמשקל הם כלשונם בגיליון.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {breakdown.map(sub => (
            <div key={sub.subject} className="rounded-xl border border-border/70 bg-muted/10 overflow-hidden">
              <p className="px-3 py-1.5 bg-muted/40 text-[12px] font-semibold text-foreground border-b border-border/60">{sub.subject}</p>
              <ul className="divide-y divide-border/40">
                {sub.components.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="text-[11px] text-muted-foreground leading-snug flex-1 min-w-0 truncate" title={c.label}>{c.label}</span>
                    {c.weight && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground shrink-0">{c.weight}</span>}
                    <span className="text-[11px] tabular-nums text-foreground font-medium shrink-0">{c.pct}%</span>
                    <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">{c.filled}/{c.students}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {/* ── דוח מתמטיקה ── */}
      <div className="mb-4">
        <button onClick={() => setShowMath(!showMath)} aria-expanded={showMath}
          className="h-9 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <Sigma className="h-3.5 w-3.5" strokeWidth={1.8} />
          {showMath ? "סגירת דוח המתמטיקה" : "דוח מתמטיקה"}
        </button>
        {showMath && (
          <div className="card-premium p-4 mt-2 overflow-x-auto">
            <p className="text-[11px] text-muted-foreground mb-3">
              רכיבי המתמטיקה של כל תלמיד, כלשונם בגיליון (שאלונים, ציון פנימי, ציון שנתי).
              <span className="font-medium text-foreground"> מספר יחידות הלימוד אינו עמודה בגיליון</span> ולכן אינו נגזר כאן.
            </p>
            {math.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">אין רכיבי מתמטיקה לתלמידים המוצגים.</p>
            ) : (
              <table className="w-full text-[11.5px] border-collapse">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-start font-medium py-1.5 pe-2">תלמיד</th>
                    <th className="text-start font-medium py-1.5 px-1.5">כיתה</th>
                    <th className="text-start font-medium py-1.5 px-1.5">הושלמו</th>
                    {math[0].cells.map((c, i) => (
                      <th key={i} className="text-start font-medium py-1.5 px-1.5 whitespace-nowrap">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {math.map(r => (
                    <tr key={r.id} className="border-t border-border/50">
                      <td className="py-1.5 pe-2 text-foreground whitespace-nowrap">{r.name}</td>
                      <td className="py-1.5 px-1.5 text-muted-foreground whitespace-nowrap">{r.className}</td>
                      <td className="py-1.5 px-1.5 tabular-nums">{r.filled}/{r.total}</td>
                      {r.cells.map((c, i) => (
                        <td key={i} className={`py-1.5 px-1.5 ${c.value ? "text-foreground" : "text-muted-foreground/50"}`}>
                          {c.value || "לא הוזן"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <p className="text-[12.5px] text-muted-foreground mb-3">
        מציג <span className="font-semibold text-foreground tabular-nums">{listRows.length}</span> מתוך{" "}
        <span className="tabular-nums">{all.length}</span> תלמידים
        <span className="text-muted-foreground/70"> · {filterNote}</span>
      </p>

      {/* ── הרשימה ── */}
      {listRows.length === 0 ? (
        <div className="card-premium p-10 text-center">
          <p className="text-[13px] text-muted-foreground">אין תלמידים תואמים לפילוח הנוכחי.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {listRows.map(r => (
            <StudentCard key={r.id} r={r} open={openId === r.id}
              onToggle={() => setOpenId(openId === r.id ? null : r.id)}
              onProfile={() => navigate(`/students/${r.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
};

/** שורת תלמיד — מצב חזותי, אחוז השלמה, התפלגות רכיבים ומעבר לפירוט מלא */
const StudentCard = ({ r, open, onToggle, onProfile }: {
  r: StudentBagrut; open: boolean; onToggle: () => void; onProfile: () => void;
}) => {
  const band = r.hasSheet ? (r.band as BagrutBand) : null;
  return (
    <div className="card-premium overflow-hidden" style={band ? { borderColor: metaFor(band).edge } : undefined}>
      <button onClick={onToggle} aria-expanded={open}
        className="w-full px-4 py-3 text-start hover:bg-accent/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-foreground">{r.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {r.className || "ללא כיתה"} · {r.sport || "ללא ענף"}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {r.hasSheet ? (
              <>
                <RamzorChip status={band} prefix={`${r.missing} חסרים ·`} className="font-semibold" />
                <span className="text-[11px] text-muted-foreground tabular-nums">{r.filled}/{r.total} רכיבים</span>
                <span className="text-[11px] font-semibold text-foreground tabular-nums">{r.pct}%</span>
                <span className="w-20 h-1.5 rounded-full bg-muted/60 overflow-hidden flex" aria-hidden>
                  <span className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
                </span>
              </>
            ) : (
              <RamzorChip status={null} prefix="אין גיליון בגרות ·" />
            )}
            <ChevronLeft className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "-rotate-90" : ""}`} strokeWidth={1.8} />
          </div>
        </div>

        {/* התפלגות רכיבים לפי מקצוע — קריאה מהירה בלי לפתוח */}
        {r.hasSheet && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {r.bySubject.map(g => (
              <span key={g.subject}
                className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full border"
                style={{
                  background: metaFor(g.state === "הושלם" ? "ירוק" : g.state === "חלקי" ? "צהוב" : null).soft,
                  borderColor: metaFor(g.state === "הושלם" ? "ירוק" : g.state === "חלקי" ? "צהוב" : null).edge,
                  color: metaFor(g.state === "הושלם" ? "ירוק" : g.state === "חלקי" ? "צהוב" : null).ink,
                }}
                title={`${g.subject}: ${g.filled} מתוך ${g.total} רכיבים — ${g.state}`}>
                <RamzorDot status={g.state === "הושלם" ? "ירוק" : g.state === "חלקי" ? "צהוב" : null} context={g.subject} />
                {g.subject} {g.filled}/{g.total}
              </span>
            ))}
          </div>
        )}
      </button>

      {open && r.hasSheet && (
        <div className="px-4 pb-4 pt-1 border-t border-border/60">
          <p className="text-[11px] text-muted-foreground mb-2.5">
            הרכיבים כלשונם בגיליון · המשקל מוצג כפי שהוא רשום בשם הרכיב · ריק = לא הוזן
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {r.groups.map(g => {
              const slice = r.bySubject.find(x => x.subject === g.subject);
              return (
                <div key={g.subject} className="rounded-xl border border-border/70 bg-muted/10 overflow-hidden">
                  <p className="px-3 py-1.5 bg-muted/40 text-[12px] font-semibold text-foreground border-b border-border/60 flex items-center justify-between gap-2">
                    <span>{g.subject}</span>
                    {slice && <span className="text-[10.5px] font-medium text-muted-foreground tabular-nums">{slice.filled}/{slice.total} · {slice.pct}%</span>}
                  </p>
                  <div className="divide-y divide-border/40">
                    {g.items.map((it, i) => {
                      const empty = it.value.trim() === "";
                      return (
                        <div key={i} className="flex items-start justify-between gap-3 px-3 py-1.5">
                          <span className="text-[11px] text-muted-foreground leading-snug">{it.label}</span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[11.5px] font-medium ${empty ? "text-muted-foreground/50" : "text-foreground"}`}>
                              {empty ? "לא הוזן" : it.value}
                            </span>
                            <RamzorDot status={empty ? null : "ירוק"} context={it.label} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-3 print:hidden">
            <button onClick={onProfile}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
              לכרטיס התלמיד המלא
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground">
              <Printer className="h-3.5 w-3.5" strokeWidth={1.8} /> הדפסת הפירוט
            </button>
          </div>
          <p className="text-[10.5px] text-muted-foreground/70 mt-2">
            שיפור ציון והערה לכל רכיב אינם קיימים בגיליון הבגרות שבמערכת, ולכן אינם מוצגים כאן.
          </p>
        </div>
      )}
    </div>
  );
};

export default BagrutMapPage;
