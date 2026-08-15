import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, GraduationCap, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";
import { classToGrade } from "@/lib/schoolUtils";
import { sectionForClass, groupBagrut, type BagrutGroup } from "@/lib/bagrutView";
import { bagrutBand, bagrutBandLabel, BAGRUT_THRESHOLDS, type BagrutBand } from "@/lib/learningTraffic";

/**
 * מפת דרכים לבגרות — המודל של עינת על הנתונים האמיתיים שכבר במערכת.
 *
 * מקור: public.student_bagrut_data — שורת הגיליון המקורית של כל תלמיד,
 * כלשונה. "חסר" = רכיב בגרות שהתא שלו ריק בגיליון. הספירה מכנית בלבד:
 * אין ציון מומצא, אין השלמה ואין ניחוש. ריק = "לא הוזן".
 *
 * הספים הם אלה שנצפו במסך של עינת ואומתו מול המספרים שלה:
 * אדום 12+ חסרים · צהוב 10–11 · ירוק עד 9  (learningTraffic.ts, תצורה אחת).
 */

interface BagrutRow { student_id: string; data: Record<string, unknown> | null }
type MaybeArchived = { archived?: boolean | null };

const bandStyle: Record<BagrutBand, { chip: string; dot: string; card: string }> = {
  "אדום": { chip: "bg-destructive/10 text-destructive border-destructive/25", dot: "bg-destructive", card: "border-destructive/20" },
  "צהוב": { chip: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/25", dot: "bg-[hsl(var(--warning))]", card: "border-[hsl(var(--warning))]/20" },
  "ירוק": { chip: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/25", dot: "bg-[hsl(var(--success))]", card: "border-[hsl(var(--success))]/20" },
};

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
  const [bandF, setBandF] = useState<"all" | BagrutBand>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const active = useMemo(
    () => students.filter(s => !(s as unknown as MaybeArchived).archived),
    [students],
  );
  const bagrutById = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    (bagrutQuery.data || []).forEach(r => m.set(r.student_id, r.data || {}));
    return m;
  }, [bagrutQuery.data]);

  const grades = useMemo(() => Array.from(new Set(active.map(s => classToGrade(s.class_name || "")).filter(Boolean))).sort(), [active]);
  const sports = useMemo(() => Array.from(new Set(active.map(s => s.sport).filter(Boolean))).sort(), [active]);

  /** ספירה מכנית של רכיבים חסרים מתוך שורת הגיליון */
  const computed = useMemo(() => {
    return active.map(s => {
      const rec = bagrutById.get(s.id);
      const groups: BagrutGroup[] = rec ? groupBagrut(sectionForClass(s.class_name), rec) : [];
      const items = groups.flatMap(g => g.items);
      const missing = items.filter(it => it.value.trim() === "").length;
      const filled = items.length - missing;
      return { s, groups, total: items.length, missing, filled, hasSheet: !!rec && items.length > 0 };
    });
  }, [active, bagrutById]);

  const rows = useMemo(() => {
    return computed
      .filter(r => gradeF === "all" || classToGrade(r.s.class_name || "") === gradeF)
      .filter(r => sportF === "all" || r.s.sport === sportF)
      .filter(r => !q.trim() || r.s.full_name.includes(q.trim()))
      .filter(r => bandF === "all" || (r.hasSheet && bagrutBand(r.missing) === bandF))
      .sort((a, b) => b.missing - a.missing || a.s.full_name.localeCompare(b.s.full_name, "he"));
  }, [computed, gradeF, sportF, q, bandF]);

  const withSheet = computed.filter(r => r.hasSheet);
  const counts = useMemo(() => {
    const c: Record<BagrutBand, number> = { "אדום": 0, "צהוב": 0, "ירוק": 0 };
    withSheet.forEach(r => { c[bagrutBand(r.missing)]++; });
    return c;
  }, [withSheet]);

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

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-[1280px] mx-auto" dir="rtl">
      <header className="mb-4">
        <h1 className="text-[22px] md:text-[26px] font-semibold text-foreground tracking-tight">מפת דרכים לבגרות</h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          מצב ההתקדמות לתעודת בגרות · הספירה מבוססת על גיליון הבגרות כלשונו
        </p>
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
          הספים: אדום {BAGRUT_THRESHOLDS.red}+ חסרים · צהוב {BAGRUT_THRESHOLDS.yellowMin}–{BAGRUT_THRESHOLDS.yellowMax} · ירוק עד {BAGRUT_THRESHOLDS.yellowMin - 1}.
        </p>
      </details>

      {/* KPI — כל מספר עם מכנה */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="card-premium p-4">
          <span className="text-[11.5px] font-medium text-muted-foreground">תלמידים</span>
          <p className="text-[26px] font-semibold text-foreground leading-none mt-2 tabular-nums">{withSheet.length}</p>
          <p className="text-[10.5px] text-muted-foreground/70 mt-1.5">עם גיליון בגרות מתוך {active.length}</p>
        </div>
        {(["אדום", "צהוב", "ירוק"] as BagrutBand[]).map(b => (
          <button key={b} onClick={() => setBandF(bandF === b ? "all" : b)} aria-pressed={bandF === b}
            className={`card-premium p-4 text-start transition-all ${bandF === b ? "ring-2 ring-primary/40" : "hover:shadow-md"}`}>
            <span className="inline-flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${bandStyle[b].dot}`} />
              <span className="text-[11.5px] font-medium text-muted-foreground">{b} ({bagrutBandLabel[b]})</span>
            </span>
            <p className="text-[26px] font-semibold text-foreground leading-none mt-2 tabular-nums">{counts[b]}</p>
            <p className="text-[10.5px] text-muted-foreground/70 mt-1.5">לחצו לפירוט החוסרים</p>
          </button>
        ))}
      </div>

      <p className="text-[12.5px] text-muted-foreground mb-3">
        מציג <span className="font-semibold text-foreground tabular-nums">{rows.length}</span> מתוך{" "}
        <span className="tabular-nums">{active.length}</span> תלמידים
      </p>

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
        <label className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 right-2.5 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.6} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש תלמיד..." aria-label="חיפוש תלמיד"
            className="h-9 w-44 rounded-lg border border-border bg-card pr-8 pl-3 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="card-premium p-10 text-center">
          <p className="text-[13px] text-muted-foreground">אין תלמידים תואמים לפילוח הנוכחי.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ s, groups, total, missing, filled, hasSheet }) => {
            const band = hasSheet ? bagrutBand(missing) : null;
            const st = band ? bandStyle[band] : null;
            const open = openId === s.id;
            const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
            return (
              <div key={s.id} className={`card-premium overflow-hidden ${st ? st.card : ""}`}>
                <button
                  onClick={() => setOpenId(open ? null : s.id)}
                  aria-expanded={open}
                  className="w-full px-4 py-3 text-start hover:bg-accent/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-foreground">{s.full_name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {s.class_name || "ללא כיתה"} · {s.sport || "ללא ענף"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      {hasSheet ? (
                        <>
                          <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${st!.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st!.dot}`} />
                            {band} · {missing} חסרים
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">
                            {filled}/{total} רכיבים
                          </span>
                          <span className="w-20 h-1.5 rounded-full bg-muted/60 overflow-hidden flex">
                            <span className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </span>
                        </>
                      ) : (
                        <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border">
                          לא הוזן גיליון בגרות
                        </span>
                      )}
                      <ChevronLeft className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "-rotate-90" : ""}`} strokeWidth={1.8} />
                    </div>
                  </div>
                </button>

                {open && hasSheet && (
                  <div className="px-4 pb-4 pt-1 border-t border-border/60">
                    <p className="text-[11px] text-muted-foreground mb-2.5">
                      הרכיבים כלשונם בגיליון · ריק = לא הוזן
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {groups.map(g => (
                        <div key={g.subject} className="rounded-xl border border-border/70 bg-muted/10 overflow-hidden">
                          <p className="px-3 py-1.5 bg-muted/40 text-[12px] font-semibold text-foreground border-b border-border/60">{g.subject}</p>
                          <div className="divide-y divide-border/40">
                            {g.items.map((it, i) => {
                              const empty = it.value.trim() === "";
                              return (
                                <div key={i} className="flex items-start justify-between gap-3 px-3 py-1.5">
                                  <span className="text-[11px] text-muted-foreground leading-snug">{it.label}</span>
                                  <span className={`text-[11.5px] shrink-0 font-medium ${empty ? "text-muted-foreground/50" : "text-foreground"}`}>
                                    {empty ? "לא הוזן" : it.value}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
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
    </div>
  );
};

export default BagrutMapPage;
