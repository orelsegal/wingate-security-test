import { useMemo, useState } from "react";
import { UploadCloud, FileSpreadsheet, Search, Download, ShieldCheck, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents, useSports } from "@/hooks/useStudents";
import { peopleApi } from "@/lib/peopleApi";
import {
  parseAcademyBlocks, parseAthletes, parseStaffSheet, matchIdentities, normalizeNid,
  previewGuardians, previewStaff, countBy, maskId, resolveSport,
  type AOA, type MatchReport, type GuardianPreviewItem, type CoachPreviewItem,
} from "@/lib/importPreview";
import { OwnerGate, fieldCls, btnPrimary, btnGhost } from "@/components/people/PeopleShared";

const api = peopleApi(supabase as any);

const REQUIRED_SHEETS = ["ספורטאים", 'תמונת מצב אקדמיה תשפ"ו', "צוות"];
const OPTIONAL_SHEETS = ['תמונת מצב אקדמיה תשפ"ז', "מדריכים"];
const STEPS = ["בחירת קובץ", "בדיקת מבנה", "מאגר תלמידים", "הורים וקשרים", "צוות ומאמנים", "קונפליקטים", "סיכום"];

const IDENTITY_LABELS: Record<string, string> = {
  exact: "התאמה ודאית (ת\"ז)", strong: "התאמה חזקה (שם+אימות)",
  source_only: "רק במקור", db_only: "רק ב-DB", human_review: "דורש החלטה אנושית",
};
const GUARDIAN_LABELS: Record<string, string> = {
  new: "הורה חדש", existing: "זוהה בביטחון", multi_child: "הורה לכמה ילדים",
  new_link: "קשר חדש", conflict: "קונפליקט", missing_info: "חסר מידע",
};
const STAFF_LABELS: Record<string, string> = {
  staff_person: "איש צוות בקובץ", coach_sure: "מאמן תואם בוודאות",
  coach_variant: "וריאציית כתיב", coach_missing: "מאמן שאינו בצוות", noise: "ערך רעש",
};

const Chip = ({ label, n, tone }: { label: string; n: number; tone?: "warn" | "bad" }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
    tone === "bad" ? "bg-destructive/10 text-destructive border-destructive/30"
    : tone === "warn" ? "bg-warning/10 text-warning border-warning/30"
    : "bg-muted/40 text-foreground border-border"}`}>
    {label}
    <span className="tabular-nums font-semibold">{n}</span>
  </span>
);

const DataImportPage = () => (
  <OwnerGate><ImportInner /></OwnerGate>
);

interface Parsed {
  fileName: string;
  sheetNames: string[];
  missingRequired: string[];
  athletesCount: number;
  blocks: { title: string; count: number }[];
  blocks87: { title: string; count: number }[];
  staffCount: number;
  reportA: MatchReport;   // Control A: תמונת מצב תשפ"ו מול ה-DB
  reportB: MatchReport;   // Control B: ספורטאים מול ה-DB
  guardians: GuardianPreviewItem[];
  staffItems: CoachPreviewItem[];
  sportRows: { raw: string; canonical: string | null; viaAlias: boolean; count: number }[];
}

const ImportInner = () => {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [studentFilter, setStudentFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const { data: dbStudents = [] } = useStudents();
  const { data: sports = [] } = useSports();
  const aliasesQuery = useQuery({
    queryKey: ["sport-aliases"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sport_aliases" as any).select("alias_normalized, sport_id");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
  const guardiansQuery = useQuery({ queryKey: ["guardians", false], queryFn: () => api.listGuardians(null, false) });
  const staffQuery = useQuery({ queryKey: ["staff", false], queryFn: () => api.listStaff(null, false) });

  const onFile = async (file: File | null) => {
    setParseError(null); setParsed(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setParseError("אפשר להעלות רק קובץ Excel בסיומת xlsx.");
      return;
    }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetNames = wb.SheetNames;
      const missingRequired = REQUIRED_SHEETS.filter(s => !sheetNames.includes(s));
      const aoa = (name: string): AOA => sheetNames.includes(name)
        ? (XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: "" }) as AOA)
        : [];
      if (missingRequired.length > 0) {
        const empty = { rows: [], counts: { exact: 0, strong: 0, confident: 0, source_only: 0, db_only: 0, human_review: 0, with_changes: 0 }, controls: { fileTotal: 0, dbTotal: 0, fileCovered: 0, dbCovered: 0, passed: false, errors: ["לא נבדק"] } } as MatchReport;
        setParsed({
          fileName: file.name, sheetNames, missingRequired,
          athletesCount: 0, blocks: [], blocks87: [], staffCount: 0,
          reportA: empty, reportB: empty, guardians: [], staffItems: [], sportRows: [],
        });
        return;
      }
      const athletes = parseAthletes(aoa("ספורטאים"));
      const snap = parseAcademyBlocks(aoa('תמונת מצב אקדמיה תשפ"ו'));
      const snap87 = parseAcademyBlocks(aoa('תמונת מצב אקדמיה תשפ"ז'));
      const staff = parseStaffSheet(aoa("צוות"));
      const classByNid = new Map(snap.students.map(s => [normalizeNid(s.nid).nid, s.cls]).filter(([k]) => (k as string).length === 9) as [string, string][]);
      const sportRefs = (sports as any[]).map(s => ({ id: s.id, sport_name: s.sport_name }));
      const aliases = (aliasesQuery.data || []) as any[];
      const db = (dbStudents as any[]).map(d => ({
        id: d.id, national_id: d.national_id, full_name: d.full_name,
        class_name: d.class_name, sport: d.sport, birth_year: d.birth_year,
        phone: d.phone, email: d.email, archived: d.archived,
      }));
      // Control A: the academy snapshot (the tab the DB roster was built from)
      const reportA = matchIdentities(snap.students, db, { classByNid, sports: sportRefs, aliases, sourceLabel: 'תמונת מצב תשפ"ו' });
      // Control B: the athletes registry — run separately, never mixed with A
      const reportB = matchIdentities(athletes, db, { classByNid, sports: sportRefs, aliases, sourceLabel: "ספורטאים" });
      const guardians = previewGuardians(reportB.rows, (guardiansQuery.data || []) as any[]);
      const coachCounts = new Map<string, number>();
      for (const a of athletes) if (a.coach) coachCounts.set(a.coach, (coachCounts.get(a.coach) || 0) + 1);
      const staffItems = previewStaff(staff, coachCounts, ((staffQuery.data || []) as any[]).map(s => ({ id: s.id, full_name: s.full_name, roles: s.roles || [] })));
      const sportCounts = new Map<string, number>();
      for (const a of athletes) if (a.sport) sportCounts.set(a.sport, (sportCounts.get(a.sport) || 0) + 1);
      const sportRows = Array.from(sportCounts.entries()).map(([raw, count]) => {
        const r = resolveSport(raw, sportRefs, aliases);
        return { raw, canonical: r.canonical, viaAlias: r.viaAlias, count };
      }).sort((a, b) => b.count - a.count);
      setParsed({
        fileName: file.name, sheetNames, missingRequired,
        athletesCount: athletes.length, blocks: snap.blocks, blocks87: snap87.blocks,
        staffCount: staff.length, reportA, reportB, guardians, staffItems, sportRows,
      });
    } catch {
      setParseError("קריאת הקובץ נכשלה. ודאי שזה קובץ Excel תקין ונסי שוב.");
    } finally {
      setBusy(false);
    }
  };

  const [control, setControl] = useState<"A" | "B">("A");
  const activeReport = parsed ? (control === "A" ? parsed.reportA : parsed.reportB) : null;
  const controlsPassed = !!parsed && parsed.missingRequired.length === 0
    && parsed.reportA.controls.passed && parsed.reportB.controls.passed;
  const gCounts = useMemo(() => countBy(parsed?.guardians || []), [parsed]);
  const sCounts = useMemo(() => countBy(parsed?.staffItems || []), [parsed]);
  const conflicts = useMemo(() => [
    ...(parsed?.reportA.rows || []).filter(m => m.identity === "human_review").map(m => ({
      area: 'תלמידים (תשפ"ו)', name: m.file ? `${m.file.last} ${m.file.first}` : m.db?.full_name || "", note: m.note || "" })),
    ...(parsed?.reportB.rows || []).filter(m => m.identity === "human_review").map(m => ({
      area: "תלמידים (ספורטאים)", name: m.file ? `${m.file.last} ${m.file.first}` : m.db?.full_name || "", note: m.note || "" })),
    ...(parsed?.guardians || []).filter(g => g.category === "conflict").map(g => ({ area: "הורים", name: g.name, note: g.note || "" })),
    ...(parsed?.staffItems || []).filter(s => s.category === "coach_variant" || s.category === "coach_missing").map(s => ({
      area: "מאמנים", name: s.name, note: (s.note || "") + (s.candidates?.length ? ` · מועמדים: ${s.candidates.join(", ")}` : "") })),
  ], [parsed]);

  const filteredMatches = (activeReport?.rows || []).filter(m =>
    (studentFilter === "all" || m.identity === studentFilter) &&
    (!q || (m.file && `${m.file.last} ${m.file.first}`.includes(q)) || (m.db && m.db.full_name.includes(q))));

  const reportItems = (r: MatchReport) => r.rows.map(m => ({
    identity: m.identity,
    name: m.file ? `${m.file.last} ${m.file.first}` : m.db?.full_name,
    id_masked: m.file?.nid ? maskId(normalizeNid(m.file.nid).nid) : (m.db?.national_id ? maskId(normalizeNid(m.db.national_id).nid) : null),
    note: m.note || null,
    changes: m.changes.map(c => ({ field: c.label, current: c.current, proposed: c.proposed, source: c.source, reason: c.reason })),
  }));
  const downloadReport = () => {
    if (!parsed || !controlsPassed) return;
    const report = {
      generated_at: new Date().toISOString(),
      file: parsed.fileName,
      control_a_snapshot: { counts: parsed.reportA.counts, controls: parsed.reportA.controls, items: reportItems(parsed.reportA) },
      control_b_athletes: { counts: parsed.reportB.counts, controls: parsed.reportB.controls, items: reportItems(parsed.reportB) },
      guardians: { counts: gCounts, items: parsed.guardians },
      staff: { counts: sCounts, items: parsed.staffItems },
      sports: parsed.sportRows,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wingate-import-preview.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const stepDone = (i: number): boolean => {
    if (!parsed) return false;
    if (i <= 1) return true;
    if (parsed.missingRequired.length > 0) return false;
    return true;
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1000px]" dir="rtl">
      <h1 className="text-[20px] sm:text-[24px] font-semibold text-foreground flex items-center gap-2">
        <UploadCloud className="h-5 w-5 text-primary" strokeWidth={1.6} />
        ייבוא ועדכון נתונים
      </h1>
      <p className="text-[13px] text-muted-foreground mt-1 mb-4">
        תצוגה מקדימה בלבד, שום נתון אינו מיובא בשלב הזה.
      </p>

      {/* stepper */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {STEPS.map((s, i) => (
          <span key={s} className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
            stepDone(i) ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border"}`}>
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {/* 1. file */}
      <section className="card-premium p-4 sm:p-5 mb-4">
        <h2 className="text-[14px] font-semibold text-foreground mb-2">1. בחירת קובץ</h2>
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/40 transition-colors">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.4} />
          <span className="text-[13px] text-foreground font-medium">{busy ? "קוראת את הקובץ..." : (parsed?.fileName || "בחרי קובץ Excel (xlsx)")}</span>
          <span className="text-[11.5px] text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.6} />
            הקובץ נבדק מקומית בדפדפן ואינו נשמר במערכת.
          </span>
          <input type="file" accept=".xlsx" className="hidden" onChange={e => onFile(e.target.files?.[0] || null)} />
        </label>
        {parseError && <p className="text-[12.5px] text-destructive mt-2">{parseError}</p>}
      </section>

      {parsed && (
        <>
          {/* 2. structure */}
          <section className="card-premium p-4 sm:p-5 mb-4">
            <h2 className="text-[14px] font-semibold text-foreground mb-2">2. בדיקת מבנה</h2>
            {parsed.missingRequired.length > 0 ? (
              <p className="text-[13px] text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" strokeWidth={1.6} />
                חסרים טאבים נדרשים: {parsed.missingRequired.join(", ")}. לא ניתן להמשיך.
              </p>
            ) : (
              <div className="text-[12.5px] text-foreground space-y-1">
                <p>ספורטאים: {parsed.athletesCount} רשומות · צוות: {parsed.staffCount} אנשים</p>
                <p className="text-muted-foreground">
                  תמונת מצב תשפ"ו: {parsed.blocks.map(b => `${b.title}: ${b.count}`).join(" · ") || "—"}
                </p>
                {parsed.blocks87.length > 0 && (
                  <p className="text-muted-foreground">
                    תמונת מצב תשפ"ז (staging בלבד, לא מיובא): {parsed.blocks87.map(b => b.count).reduce((a, b) => a + b, 0)} רשומות
                  </p>
                )}
                <p className="text-muted-foreground">
                  טאבים מוחרגים במכוון: מצב חירום, עוזבים, מועמדים, סיכומים, מידות, כתובות ומידע רפואי.
                </p>
              </div>
            )}
          </section>

          {parsed.missingRequired.length === 0 && (
            <>
              {/* controls gate — results are blocked when coverage checks fail */}
              {!controlsPassed && (
                <section className="card-premium p-4 sm:p-5 mb-4 border-destructive/40">
                  <p className="text-[13px] text-destructive font-medium flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" strokeWidth={1.6} />
                    בקרות ההתאמה נכשלו — התוצאות חסומות עד לתיקון.
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    {[...(parsed.reportA.controls.errors.map(e => `בקרה A: ${e}`)),
                      ...(parsed.reportB.controls.errors.map(e => `בקרה B: ${e}`))].join(" · ") || "כשל לא מזוהה"}
                  </p>
                </section>
              )}
              {controlsPassed && (
              <>
              {/* 3. students */}
              <section className="card-premium p-4 sm:p-5 mb-4">
                <h2 className="text-[14px] font-semibold text-foreground mb-2">3. מאגר תלמידים</h2>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => { setControl("A"); setStudentFilter("all"); }}
                    className={`h-8 px-3 rounded-lg text-[12px] border ${control === "A" ? "bg-primary/10 text-primary border-primary/30 font-medium" : "border-border text-muted-foreground"}`}>
                    בקרה A · תמונת מצב תשפ"ו
                  </button>
                  <button onClick={() => { setControl("B"); setStudentFilter("all"); }}
                    className={`h-8 px-3 rounded-lg text-[12px] border ${control === "B" ? "bg-primary/10 text-primary border-primary/30 font-medium" : "border-border text-muted-foreground"}`}>
                    בקרה B · ספורטאים
                  </button>
                </div>
                {activeReport && (
                  <p className="text-[11.5px] text-muted-foreground mb-2">
                    כיסוי מלא: {activeReport.controls.fileCovered}/{activeReport.controls.fileTotal} שורות מקור ·
                    {" "}{activeReport.controls.dbCovered}/{activeReport.controls.dbTotal} רשומות DB ·
                    {" "}מתוך המותאמים: {activeReport.counts.with_changes} עם שינויים מוצעים (שינוי אינו משנה את סיווג הזהות)
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Object.entries(IDENTITY_LABELS).map(([k, label]) => (
                    <button key={k} onClick={() => setStudentFilter(studentFilter === k ? "all" : k)}
                      className={studentFilter === k ? "ring-1 ring-primary rounded-full" : ""}>
                      <Chip label={label} n={(activeReport?.counts as any)?.[k] || 0} tone={k === "human_review" ? "bad" : undefined} />
                    </button>
                  ))}
                  <Chip label="מותאמים (ודאי+חזק)" n={activeReport?.counts.confident || 0} />
                  <Chip label="עם שינויים" n={activeReport?.counts.with_changes || 0} tone="warn" />
                </div>
                <div className="relative mb-3">
                  <Search className="h-3.5 w-3.5 absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground" strokeWidth={1.6} />
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש לפי שם" aria-label="חיפוש תלמיד" className={`${fieldCls} pe-9`} />
                </div>
                <div className="space-y-2 max-h-[420px] overflow-y-auto">
                  {filteredMatches.slice(0, 80).map((m, i) => (
                    <div key={i} className="rounded-xl border border-border/70 p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[13px] font-medium text-foreground break-words">
                          {m.file ? `${m.file.last} ${m.file.first}` : m.db?.full_name}
                          {m.file?.nid ? <span className="text-[11px] text-muted-foreground" dir="ltr"> · {maskId(normalizeNid(m.file.nid).nid)}</span> : null}
                        </p>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {IDENTITY_LABELS[m.identity]}
                        </span>
                      </div>
                      {m.note && <p className="text-[11.5px] text-muted-foreground mt-1">{m.note}</p>}
                      {m.changes.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {m.changes.map((c, j) => (
                            <p key={j} className="text-[11.5px] text-foreground break-words">
                              <span className="text-muted-foreground">{c.label}:</span> {c.current} ← {c.proposed}
                              <span className="text-muted-foreground"> · {c.source} · {c.reason}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredMatches.length === 0 && <p className="text-[12.5px] text-muted-foreground">אין רשומות בקטגוריה שנבחרה.</p>}
                  {filteredMatches.length > 80 && <p className="text-[11.5px] text-muted-foreground">מוצגות 80 הראשונות; הדוח המלא בהורדה.</p>}
                </div>
              </section>

              {/* 4. guardians */}
              <section className="card-premium p-4 sm:p-5 mb-4">
                <h2 className="text-[14px] font-semibold text-foreground mb-2">4. הורים וקשרים</h2>
                <p className="text-[11.5px] text-muted-foreground mb-2">מחושב רק עבור תלמידים שהותאמו בביטחון. הייבוא עצמו ייפתח בנפרד משלב התלמידים.</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Object.entries(GUARDIAN_LABELS).map(([k, label]) => (
                    <Chip key={k} label={label} n={gCounts[k] || 0} tone={k === "conflict" ? "bad" : k === "missing_info" ? "warn" : undefined} />
                  ))}
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {parsed.guardians.filter(g => g.category !== "existing").slice(0, 60).map((g, i) => (
                    <div key={i} className="rounded-lg border border-border/60 px-3 py-2">
                      <p className="text-[12.5px] text-foreground break-words">
                        {g.name} <span className="text-muted-foreground" dir="ltr">{g.phoneMasked}</span>
                        <span className="text-muted-foreground"> · {GUARDIAN_LABELS[g.category]}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground break-words">{g.students.join(", ")}{g.note ? ` · ${g.note}` : ""}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 5. staff */}
              <section className="card-premium p-4 sm:p-5 mb-4">
                <h2 className="text-[14px] font-semibold text-foreground mb-2">5. צוות ומאמנים</h2>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Object.entries(STAFF_LABELS).map(([k, label]) => (
                    <Chip key={k} label={label} n={sCounts[k] || 0} tone={k === "coach_missing" ? "bad" : k === "coach_variant" ? "warn" : undefined} />
                  ))}
                </div>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {parsed.staffItems.filter(s => s.category !== "staff_person").map((s, i) => (
                    <div key={i} className="rounded-lg border border-border/60 px-3 py-2">
                      <p className="text-[12.5px] text-foreground break-words">
                        {s.name}{s.count ? ` (${s.count} תלמידים)` : ""} · {STAFF_LABELS[s.category]}
                      </p>
                      {(s.note || s.candidates?.length) && (
                        <p className="text-[11px] text-muted-foreground break-words">
                          {s.note}{s.candidates?.length ? ` · מועמדים: ${s.candidates.join(", ")}` : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {/* sports normalization */}
                <p className="text-[12px] font-medium text-muted-foreground mt-4 mb-1.5">נרמול ענפים</p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.sportRows.map(r => (
                    <span key={r.raw} className={`px-2 py-0.5 rounded-full text-[11px] border ${
                      r.canonical ? (r.viaAlias ? "bg-warning/10 text-warning border-warning/30" : "bg-muted/40 text-foreground border-border")
                      : "bg-destructive/10 text-destructive border-destructive/30"}`}>
                      {r.raw}{r.canonical && r.canonical !== r.raw ? ` ← ${r.canonical}` : ""}{r.viaAlias ? " (alias)" : ""}{!r.canonical ? " · ללא ענף קנוני" : ""} · {r.count}
                    </span>
                  ))}
                </div>
              </section>

              {/* 6. conflicts */}
              <section className="card-premium p-4 sm:p-5 mb-4">
                <h2 className="text-[14px] font-semibold text-foreground mb-2">6. קונפליקטים ({conflicts.length})</h2>
                {conflicts.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">אין קונפליקטים.</p>
                ) : (
                  <div className="space-y-1.5">
                    {conflicts.map((c, i) => (
                      <p key={i} className="text-[12.5px] text-foreground break-words">
                        <span className="text-muted-foreground">[{c.area}]</span> {c.name} · {c.note}
                      </p>
                    ))}
                  </div>
                )}
              </section>

              {/* 7. summary */}
              <section className="card-premium p-4 sm:p-5">
                <h2 className="text-[14px] font-semibold text-foreground mb-2">7. סיכום</h2>
                <p className="text-[12.5px] text-muted-foreground mb-3">
                  בקרה A (תשפ"ו): {parsed.reportA.counts.exact} ודאיות · {parsed.reportA.counts.strong} חזקות · {parsed.reportA.counts.confident} מותאמות · {parsed.reportA.counts.source_only} רק במקור · {parsed.reportA.counts.db_only} רק ב-DB · {parsed.reportA.counts.human_review} להחלטה אנושית ·
                  {" "}בקרה B (ספורטאים): {parsed.reportB.counts.confident} מותאמות מתוך {parsed.reportB.controls.fileTotal} ·
                  {" "}הורים: {parsed.guardians.length} · צוות: {parsed.staffCount}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={downloadReport} className={`${btnPrimary} inline-flex items-center gap-1.5`}>
                    <Download className="h-4 w-4" strokeWidth={1.7} />
                    הורדת דוח Preview
                  </button>
                  <button disabled className={`${btnGhost} opacity-50 cursor-not-allowed`} title="ייפתח בשלב הבא">
                    אישור וייבוא — ייפתח בשלב הבא
                  </button>
                </div>
              </section>
              </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default DataImportPage;
