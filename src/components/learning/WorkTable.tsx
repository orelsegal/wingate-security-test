import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, AlertTriangle, RotateCcw, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RamzorDot } from "@/components/RamzorBadge";
import { metaFor, type Ramzor } from "@/lib/learningTraffic";
import {
  COMPONENT_KINDS, weightedGrade, checkWeights, numericScore, cellKey,
  type AssessmentComponent, type AssessmentScore, type ComponentKind, type SaveState,
} from "@/lib/assessments";

/**
 * סביבת העבודה של המורה והמנהל — טבלה אחת, באותו מסך ובאותו route.
 *
 * הכול קורה כאן: צפייה, הזנה, עריכה, הסבר ופעולה. אין מסך "הזנת ציונים"
 * נפרד ואין workflow מקביל. מה שמשתנה בין התפקידים הוא מה שהשרת מחזיר
 * ומה שהוא מרשה לכתוב — לא המסך.
 *
 * שמירה: כל תא נשמר לשרת בפני עצמו ומדווח על מצבו. אין הצלחה מדומה —
 * "נשמר" מוצג רק אחרי שהשרת אישר, ושגיאה נשארת על המסך עם ניסיון חוזר.
 */

export interface WorkStudent {
  id: string;
  name: string;
  className: string;
  sport: string;
  /** אחוז ההשלמה במפת הדרכים לבגרות — מגיליון הבגרות, לקריאה בלבד */
  bagrutPct: number | null;
  ramzor: Ramzor | null;
  notes: string | null;
  haliffa: string[];
  haliffaNotes: string | null;
  gradesRaw: string | null;
}

interface Props {
  subjectId: string;
  subjectName: string;
  students: WorkStudent[];
  /** האם השרת מרשה למשתמש הזה לכתוב במקצוע הזה */
  canWrite: boolean;
  periodLabel: string;
  onOpenStudent: (id: string) => void;
}

const WorkTable = ({ subjectId, subjectName, students, canWrite, periodLabel, onOpenStudent }: Props) => {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [lastError, setLastError] = useState<Record<string, string>>({});
  const [weightPreview, setWeightPreview] = useState<Record<string, number>>({});

  const compQuery = useQuery({
    queryKey: ["assessment-components", subjectId],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_components" as "students")
        .select("id, subject_id, class_name, kind, name, due_date, weight, is_active")
        .eq("subject_id" as never, subjectId as never);
      if (error) throw error;
      return (data as unknown as AssessmentComponent[]) || [];
    },
  });

  const scoreQuery = useQuery({
    queryKey: ["assessment-scores", subjectId],
    retry: false,
    enabled: !!compQuery.data?.length,
    queryFn: async () => {
      const ids = (compQuery.data || []).map(c => c.id);
      const { data, error } = await supabase
        .from("assessment_scores" as "students")
        .select("id, component_id, student_id, score, submitted, note")
        .in("component_id" as never, ids as never);
      if (error) throw error;
      return (data as unknown as AssessmentScore[]) || [];
    },
  });

  const components = useMemo(
    () => (compQuery.data || []).slice().sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "") || a.name.localeCompare(b.name, "he")),
    [compQuery.data],
  );
  const previewed = useMemo(
    () => components.map(c => (c.id in weightPreview ? { ...c, weight: weightPreview[c.id] } : c)),
    [components, weightPreview],
  );
  const scoreMap = useMemo(() => {
    const m = new Map<string, AssessmentScore>();
    (scoreQuery.data || []).forEach(s => m.set(cellKey(s.component_id, s.student_id), s));
    return m;
  }, [scoreQuery.data]);

  const weights = checkWeights(previewed);
  const hasPreview = Object.keys(weightPreview).length > 0;

  /** שמירת ציון — upsert אחד, מצב מפורש לכל תא */
  const saveScore = useMutation({
    mutationFn: async (v: { componentId: string; studentId: string; score: string; submitted: boolean }) => {
      const { error } = await supabase
        .from("assessment_scores" as "students")
        .upsert({
          component_id: v.componentId, student_id: v.studentId,
          score: v.score.trim() === "" ? null : v.score.trim(),
          submitted: v.submitted,
        } as never, { onConflict: "component_id,student_id" } as never);
      if (error) throw error;
    },
  });

  const commit = async (componentId: string, studentId: string, score: string, submitted: boolean) => {
    const k = cellKey(componentId, studentId);
    setSaveStates(s => ({ ...s, [k]: "saving" }));
    setLastError(e => { const n = { ...e }; delete n[k]; return n; });
    try {
      await saveScore.mutateAsync({ componentId, studentId, score, submitted });
      setSaveStates(s => ({ ...s, [k]: "saved" }));
      qc.invalidateQueries({ queryKey: ["assessment-scores", subjectId] });
    } catch (err) {
      setSaveStates(s => ({ ...s, [k]: "error" }));
      setLastError(e => ({ ...e, [k]: (err as { message?: string })?.message || "השמירה נכשלה" }));
    }
  };

  const notDeployed = /does not exist|schema cache|relation/i.test(
    String((compQuery.error as { message?: string })?.message || ""),
  );
  if (compQuery.isError && notDeployed) {
    return (
      <section className="card-premium p-5" dir="rtl">
        <h2 className="text-[13.5px] font-semibold text-foreground">סביבת העבודה טרם הופעלה במסד הנתונים</h2>
        <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
          המסך מוכן והרשאות הכתיבה נבדקו, אך טבלאות רכיבי ההערכה עדיין לא הורצו על מסד הנתונים.
          עד להרצה אין הזנה — והמסך לא יעמיד פנים שהוא שומר.
        </p>
      </section>
    );
  }
  if (compQuery.isLoading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <section className="card-premium overflow-hidden" dir="rtl">
      {/* ── סרגל הטבלה ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-border/60">
        <div className="min-w-0">
          <h2 className="text-[13.5px] font-semibold text-foreground">
            {subjectName}
            <span className="text-[11.5px] font-medium text-muted-foreground"> · {periodLabel}</span>
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {students.length} תלמידים · {components.length} רכיבי הערכה
            {weights.message && (
              <span className="inline-flex items-center gap-1 me-2" style={{ color: metaFor("צהוב").ink }}>
                <AlertTriangle className="h-3 w-3" strokeWidth={2} />{weights.message}
              </span>
            )}
            {weights.ok && <span className="me-2" style={{ color: metaFor("ירוק").ink }}>· סכום המשקלים 100%</span>}
          </p>
        </div>
        {canWrite && (
          <button onClick={() => setAdding(true)}
            className="h-9 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.2} /> הוספת רכיב הערכה
          </button>
        )}
      </div>

      {hasPreview && (
        <div className="px-4 py-2 border-b border-border/60 bg-muted/30 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11.5px] text-foreground">
            תצוגה מקדימה של שינוי משקלים — הציונים המשוקללים למטה מחושבים לפי המשקלים החדשים. השינוי טרם נשמר.
          </p>
          <span className="flex items-center gap-2">
            <button onClick={() => setWeightPreview({})}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-[11.5px] hover:bg-muted/50">ביטול</button>
            <button
              onClick={async () => {
                for (const [id, w] of Object.entries(weightPreview)) {
                  await supabase.from("assessment_components" as "students")
                    .update({ weight: w } as never).eq("id" as never, id as never);
                }
                setWeightPreview({});
                qc.invalidateQueries({ queryKey: ["assessment-components", subjectId] });
              }}
              className="h-8 rounded-lg bg-primary px-2.5 text-[11.5px] font-semibold text-white">שמירת המשקלים</button>
          </span>
        </div>
      )}

      {/* ── דסקטופ: טבלת עבודה אחת ── */}
      <div className="hidden md:block overflow-x-auto max-h-[70vh]">
        <table className="w-full text-[11.5px] border-collapse">
          <thead className="sticky top-0 z-20 bg-card">
            <tr className="text-muted-foreground">
              <th className="sticky right-0 z-30 bg-card text-start font-medium py-2 px-3 border-b border-border/60 min-w-[150px]">תלמיד</th>
              <th className="text-start font-medium py-2 px-2 border-b border-border/60">ענף</th>
              <th className="text-start font-medium py-2 px-2 border-b border-border/60">שכבה</th>
              <th className="text-start font-medium py-2 px-2 border-b border-border/60 whitespace-nowrap">מפת הדרך</th>
              {components.map(c => (
                <th key={c.id} className="text-start font-medium py-2 px-2 border-b border-border/60 min-w-[92px]">
                  <span className="block text-foreground">{c.name}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {c.kind}{c.due_date ? ` · ${c.due_date}` : ""}
                  </span>
                  <label className="block text-[10px] text-muted-foreground mt-0.5">
                    משקל
                    <input type="number" min={0} max={100} disabled={!canWrite}
                      value={c.id in weightPreview ? weightPreview[c.id] : c.weight}
                      onChange={e => setWeightPreview(p => ({ ...p, [c.id]: Number(e.target.value) }))}
                      aria-label={`משקל הרכיב ${c.name}`}
                      className="w-11 ms-1 h-5 rounded border border-border bg-card px-1 text-[10px] text-foreground disabled:opacity-60" />
                    %
                  </label>
                </th>
              ))}
              <th className="text-start font-medium py-2 px-2 border-b border-border/60 whitespace-nowrap">ציון משוקלל</th>
              <th className="text-start font-medium py-2 px-2 border-b border-border/60">מצב</th>
              <th className="text-start font-medium py-2 px-2 border-b border-border/60 min-w-[140px]">הסיבה למצב</th>
              <th className="text-start font-medium py-2 px-2 border-b border-border/60 min-w-[120px]">מענה</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => {
              const byComp = new Map(components.map(c => [c.id, scoreMap.get(cellKey(c.id, s.id))]));
              const w = weightedGrade(previewed, byComp);
              return (
                <tr key={s.id} className="border-b border-border/40 hover:bg-accent/15">
                  <th scope="row" className="sticky right-0 z-10 bg-card text-start font-medium py-1.5 px-3">
                    <button onClick={() => onOpenStudent(s.id)}
                      className="text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded">
                      {s.name}
                    </button>
                  </th>
                  <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">{s.sport || "—"}</td>
                  <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">{s.className || "—"}</td>
                  <td className="py-1.5 px-2 tabular-nums">
                    {s.bagrutPct == null ? <span className="text-muted-foreground/50">לא הוזן</span> : `${s.bagrutPct}%`}
                  </td>
                  {components.map(c => (
                    <td key={c.id} className="py-1 px-1.5">
                      <ScoreCell
                        value={byComp.get(c.id)?.score ?? ""}
                        submitted={byComp.get(c.id)?.submitted ?? true}
                        disabled={!canWrite}
                        state={saveStates[cellKey(c.id, s.id)] || "idle"}
                        error={lastError[cellKey(c.id, s.id)]}
                        label={`${s.name} · ${c.name}`}
                        onCommit={(val, sub) => commit(c.id, s.id, val, sub)}
                      />
                    </td>
                  ))}
                  <td className="py-1.5 px-2 tabular-nums font-semibold text-foreground whitespace-nowrap"
                    title={w.value == null ? "אין ציון מספרי ברכיבים הפעילים" : `מחושב על ${w.usedWeight}% מתוך ${w.totalWeight}% משקל פעיל`}>
                    {w.value == null ? <span className="font-normal text-muted-foreground/50">לא הוזן</span> : w.value}
                    {w.value != null && w.usedWeight < w.totalWeight && (
                      <span className="block text-[9.5px] font-normal text-muted-foreground">על {w.usedWeight}% מ־{w.totalWeight}%</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <RamzorDot status={s.ramzor} context={s.name} />
                      <span style={{ color: metaFor(s.ramzor).ink }}>{metaFor(s.ramzor).label}</span>
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-muted-foreground">
                    {[s.notes?.trim(), s.gradesRaw?.trim() ? `ציונים: ${s.gradesRaw.trim()}` : null]
                      .filter(Boolean).join(" · ") || <span className="text-muted-foreground/50">לא הוזן</span>}
                  </td>
                  <td className="py-1.5 px-2 text-muted-foreground">
                    {s.haliffa?.length ? s.haliffa.join(" · ") : <span className="text-muted-foreground/50">לא הוזן</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── מובייל: כרטיסים, לא טבלה דחוסה ── */}
      <div className="md:hidden divide-y divide-border/50">
        {students.map(s => {
          const byComp = new Map(components.map(c => [c.id, scoreMap.get(cellKey(c.id, s.id))]));
          const w = weightedGrade(previewed, byComp);
          return (
            <div key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => onOpenStudent(s.id)} className="text-start">
                  <p className="text-[13.5px] font-semibold text-foreground">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.className || "—"} · {s.sport || "—"}</p>
                </button>
                <span className="inline-flex items-center gap-1.5 shrink-0">
                  <RamzorDot status={s.ramzor} context={s.name} />
                  <span className="text-[11.5px]" style={{ color: metaFor(s.ramzor).ink }}>{metaFor(s.ramzor).label}</span>
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11.5px]">
                <span className="text-muted-foreground">מפת הדרך: <span className="text-foreground tabular-nums">{s.bagrutPct == null ? "לא הוזן" : `${s.bagrutPct}%`}</span></span>
                <span className="text-muted-foreground">משוקלל: <span className="text-foreground font-semibold tabular-nums">{w.value ?? "לא הוזן"}</span></span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {components.map(c => (
                  <li key={c.id} className="flex items-center gap-2">
                    <span className="flex-1 text-[11.5px] text-muted-foreground truncate">
                      {c.name} <span className="text-[10px]">({c.kind} · {c.weight}%)</span>
                    </span>
                    <ScoreCell
                      value={byComp.get(c.id)?.score ?? ""}
                      submitted={byComp.get(c.id)?.submitted ?? true}
                      disabled={!canWrite}
                      state={saveStates[cellKey(c.id, s.id)] || "idle"}
                      error={lastError[cellKey(c.id, s.id)]}
                      label={`${s.name} · ${c.name}`}
                      onCommit={(val, sub) => commit(c.id, s.id, val, sub)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {components.length === 0 && (
        <p className="px-4 py-6 text-center text-[12px] text-muted-foreground">
          עדיין אין רכיבי הערכה במקצוע הזה.{canWrite ? " הוסיפו רכיב כדי להתחיל להזין ציונים." : ""}
        </p>
      )}

      {adding && (
        <AddComponentDialog
          subjectId={subjectId}
          classes={[...new Set(students.map(s => s.className).filter(Boolean))]}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); qc.invalidateQueries({ queryKey: ["assessment-components", subjectId] }); }}
        />
      )}
    </section>
  );
};

/** תא ציון — עריכה במקום, ומצב שמירה אמיתי */
const ScoreCell = ({ value, submitted, disabled, state, error, label, onCommit }: {
  value: string; submitted: boolean; disabled: boolean; state: SaveState;
  error?: string; label: string; onCommit: (v: string, submitted: boolean) => void;
}) => {
  const [draft, setDraft] = useState(value);
  const [dirty, setDirty] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const shown = dirty ? draft : value;
  const n = numericScore(shown);

  return (
    <span className="inline-flex items-center gap-1">
      <input
        ref={ref}
        value={shown}
        disabled={disabled}
        aria-label={`ציון · ${label}`}
        placeholder="—"
        onChange={e => { setDraft(e.target.value); setDirty(true); }}
        onBlur={() => { if (dirty) { onCommit(draft, submitted); setDirty(false); } }}
        onKeyDown={e => {
          if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { setDraft(value); setDirty(false); }
        }}
        className={`w-14 h-7 rounded border bg-card px-1.5 text-[11.5px] text-center tabular-nums text-foreground disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
          state === "error" ? "border-destructive" : "border-border"
        }`}
      />
      {state === "saving" && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-label="שומר" />}
      {state === "saved" && <Check className="h-3 w-3" style={{ color: metaFor("ירוק").ink }} aria-label="נשמר" />}
      {state === "error" && (
        <button onClick={() => onCommit(dirty ? draft : value, submitted)} title={error || "השמירה נכשלה — ניסיון חוזר"}
          aria-label={`השמירה נכשלה. ניסיון חוזר · ${label}`}
          className="inline-flex items-center" style={{ color: metaFor("אדום").ink }}>
          <RotateCcw className="h-3 w-3" strokeWidth={2.2} />
        </button>
      )}
      {shown.trim() !== "" && n == null && (
        <span className="text-[9.5px] text-muted-foreground" title="ערך שאינו מספרי נשמר כלשונו ואינו נכנס לשקלול">לא בשקלול</span>
      )}
    </span>
  );
};

/** הוספת רכיב הערכה — מתוך הטבלה, בלי לעזוב את המסך */
const AddComponentDialog = ({ subjectId, classes, onClose, onSaved }: {
  subjectId: string; classes: string[]; onClose: () => void; onSaved: () => void;
}) => {
  const [kind, setKind] = useState<ComponentKind>("מבדק");
  const [name, setName] = useState("");
  const [due, setDue] = useState("");
  const [weight, setWeight] = useState(0);
  const [cls, setCls] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.from("assessment_components" as "students").insert({
      subject_id: subjectId,
      class_name: cls || null,
      kind, name: name.trim(),
      due_date: due || null,
      weight, is_active: isActive,
    } as never);
    setBusy(false);
    if (error) { setErr(error.message || "השמירה נכשלה"); return; }
    onSaved();
  };

  const field = "h-9 w-full rounded-lg border border-border bg-card px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-foreground/30 p-4" dir="rtl"
      role="dialog" aria-modal="true" aria-label="הוספת רכיב הערכה">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-foreground">הוספת רכיב הערכה</h3>
          <button onClick={onClose} aria-label="סגירה" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2.5">
          <label className="block">
            <span className="block text-[11px] text-muted-foreground mb-1">סוג</span>
            <select value={kind} onChange={e => setKind(e.target.value as ComponentKind)} className={field}>
              {COMPONENT_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] text-muted-foreground mb-1">שם</span>
            <input value={name} onChange={e => setName(e.target.value)} className={field} placeholder="מבדק אלגברה" />
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="block text-[11px] text-muted-foreground mb-1">תאריך</span>
              <input type="date" value={due} onChange={e => setDue(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="block text-[11px] text-muted-foreground mb-1">משקל באחוזים</span>
              <input type="number" min={0} max={100} value={weight} onChange={e => setWeight(Number(e.target.value))} className={field} />
            </label>
          </div>
          <label className="block">
            <span className="block text-[11px] text-muted-foreground mb-1">שיוך לכיתה</span>
            <select value={cls} onChange={e => setCls(e.target.value)} className={field}>
              <option value="">כל הכיתות שלי במקצוע</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[12px] text-foreground">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            הרכיב פעיל בחישוב הציון המשוקלל
          </label>
          {err && <p className="text-[11.5px]" style={{ color: metaFor("אדום").ink }}>{err}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onClose} className="h-9 rounded-lg border border-border bg-card px-3 text-[12px]">ביטול</button>
          <button onClick={save} disabled={busy || !name.trim()}
            className="h-9 rounded-lg bg-primary px-3 text-[12px] font-semibold text-white disabled:opacity-50 inline-flex items-center gap-1.5">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            שמירה
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkTable;
