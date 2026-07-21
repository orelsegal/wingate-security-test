import { useMemo, useState } from "react";
import { UploadCloud, FileSpreadsheet, Search, Download, ShieldCheck, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents, useSports } from "@/hooks/useStudents";
import { peopleApi } from "@/lib/peopleApi";
import {
  parseAcademyBlocks, parseAthletes, parseStaffSheet, matchIdentities, normalizeNid,
  previewGuardians, previewStaff, previewLinks, countBy, maskId, maskPhone, maskEmail, resolveSport,
  buildDryRunPayloadV2, expectedDryRunV2, compareDryRunV2, DRY_RUN_V2_DOMAINS,
  type AOA, type MatchReport, type GuardianPreviewItem, type CoachPreviewItem,
  type LinksReport, type ExistingLinksInput, type DryRunV2Counts, type FileStaff,
} from "@/lib/importPreview";
import type { DryRunResult } from "@/lib/peopleApi";
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
const LINK_LABELS: Record<string, string> = {
  new: "קשר חדש", unchanged: "קיים ללא שינוי", update: "עדכון קשר",
  historical: "קשר היסטורי", conflict: "קונפליקט", db_only: "קיים רק ב-DB", unlinkable: "לא ניתן לקשר",
};
const DECISION_OPTS = [
  { v: "link", label: "חיבור לרשומה הקיימת" },
  { v: "create", label: "יצירה כרשומה חדשה בעתיד" },
  { v: "skip", label: "דילוג" },
  { v: "defer", label: "השארה להחלטה מאוחרת" },
] as const;
const UNDECIDED = "לא הוחלט, לא ייובא";
const METRIC_LABELS: Record<string, string> = {
  new: "חדשים", existing: "קיימים", conflict: "קונפליקטים", skipped: "מדולגים / לא ניתן לקשר",
  unchanged: "ללא שינוי", updates: "עדכונים", historical: "היסטוריים",
  possible_match: "התאמה אפשרית", exact: "התאמה מדויקת", missing: "לא נמצא בצוות", noise: "רעש",
  decided: "הוחלטו", total: 'סה"כ',
};
const decisionLabel = (v: string | undefined) => DECISION_OPTS.find(o => o.v === v)?.label || UNDECIDED;

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
  staffFile: FileStaff[];
  coachNames: [string, number][];
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
  // ONE call for all existing links; fails quietly until the migration is applied
  const allLinksQuery = useQuery({ queryKey: ["all-people-links"], queryFn: () => api.allPeopleLinks(), retry: false });

  const onFile = async (file: File | null) => {
    setParseError(null); setParsed(null); setDecisions({});
    setDryRun(null); setDryRunError(null);
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
      // raw read (numbers as numbers) — used ONLY for the ת"ז column of the
      // academy snapshots, where wrong date formatting empties the formatted value
      const aoaRaw = (name: string): unknown[][] => sheetNames.includes(name)
        ? (XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: "" }) as unknown[][])
        : [];
      if (missingRequired.length > 0) {
        const empty = { rows: [], counts: { exact: 0, strong: 0, confident: 0, source_only: 0, db_only: 0, human_review: 0, with_changes: 0 }, controls: { fileTotal: 0, dbTotal: 0, fileCovered: 0, dbCovered: 0, passed: false, errors: ["לא נבדק"] } } as MatchReport;
        setParsed({
          fileName: file.name, sheetNames, missingRequired,
          athletesCount: 0, blocks: [], blocks87: [], staffCount: 0, staffFile: [], coachNames: [],
          reportA: empty, reportB: empty, guardians: [], staffItems: [], sportRows: [],
        });
        return;
      }
      const athletes = parseAthletes(aoa("ספורטאים"));
      const snap = parseAcademyBlocks(aoa('תמונת מצב אקדמיה תשפ"ו'), aoaRaw('תמונת מצב אקדמיה תשפ"ו'));
      const snap87 = parseAcademyBlocks(aoa('תמונת מצב אקדמיה תשפ"ז'), aoaRaw('תמונת מצב אקדמיה תשפ"ז'));
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
        staffCount: staff.length, staffFile: staff, coachNames: Array.from(coachCounts.entries()),
        reportA, reportB, guardians, staffItems, sportRows,
      });
    } catch {
      setParseError("קריאת הקובץ נכשלה. ודאי שזה קובץ Excel תקין ונסי שוב.");
    } finally {
      setBusy(false);
    }
  };

  const [control, setControl] = useState<"A" | "B">("A");
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const activeReport = parsed ? (control === "A" ? parsed.reportA : parsed.reportB) : null;
  // link classification against EXISTING links (one get_all_people_links call);
  // until the migration is applied the query errors and we classify without it
  const linksReport: LinksReport | null = useMemo(() => {
    if (!parsed || parsed.missingRequired.length > 0) return null;
    const namesById = new Map((dbStudents as any[]).map(d => [d.id as string, d.full_name as string]));
    return previewLinks(
      parsed.reportB.rows,
      (guardiansQuery.data || []) as any[],
      ((staffQuery.data || []) as any[]).map(s => ({ id: s.id, full_name: s.full_name, roles: s.roles || [] })),
      (allLinksQuery.data as ExistingLinksInput | undefined) ?? null,
      namesById,
    );
  }, [parsed, guardiansQuery.data, staffQuery.data, allLinksQuery.data, dbStudents]);
  const controlsPassed = !!parsed && parsed.missingRequired.length === 0
    && parsed.reportA.controls.passed && parsed.reportB.controls.passed
    && (!linksReport || linksReport.controls.passed);
  const gCounts = useMemo(() => countBy(parsed?.guardians || []), [parsed]);
  const sCounts = useMemo(() => countBy(parsed?.staffItems || []), [parsed]);
  const gLinkCounts = useMemo(() => countBy((linksReport?.items || []).filter(i => i.kind === "guardian")), [linksReport]);
  const cLinkCounts = useMemo(() => countBy((linksReport?.items || []).filter(i => i.kind === "coach")), [linksReport]);
  const conflicts = useMemo(() => [
    ...(parsed?.reportA.rows || []).filter(m => m.identity === "human_review").map((m, i) => ({
      key: `A-${i}`, area: 'תלמידים (תשפ"ו)', name: m.file ? `${m.file.last} ${m.file.first}` : m.db?.full_name || "", note: m.note || "" })),
    ...(parsed?.reportB.rows || []).filter(m => m.identity === "human_review").map((m, i) => ({
      key: `B-${i}`, area: "תלמידים (ספורטאים)", name: m.file ? `${m.file.last} ${m.file.first}` : m.db?.full_name || "", note: m.note || "" })),
    ...(parsed?.guardians || []).filter(g => g.category === "conflict").map((g, i) => ({ key: `G-${i}`, area: "הורים", name: g.name, note: g.note || "" })),
    ...(parsed?.staffItems || []).filter(s => s.category === "coach_variant" || s.category === "coach_missing").map((s, i) => ({
      key: `C-${i}`, area: "מאמנים", name: s.name, note: (s.note || "") + (s.candidates?.length ? ` · מועמדים: ${s.candidates.join(", ")}` : "") })),
  ], [parsed]);
  const decidedCount = conflicts.filter(c => decisions[c.key]).length;

  // server dry-run: read-only re-verification; never enables import
  const [dryRun, setDryRun] = useState<{ server: DryRunResult; expected: DryRunV2Counts; mismatches: string[] } | null>(null);
  const [dryRunBusy, setDryRunBusy] = useState(false);
  const [dryRunError, setDryRunError] = useState<string | null>(null);
  const serverAsCounts = (s: DryRunResult): Partial<DryRunV2Counts> => ({
    students: s.students_counts, guardian_people: s.guardian_people_counts,
    guardian_links: s.guardian_link_counts, staff_people: s.staff_people_counts,
    coach_candidates: s.coach_candidate_counts, coach_links: s.coach_link_counts,
    conflicts: s.conflict_counts,
  });
  const runDryRun = async () => {
    if (!parsed || !controlsPassed || !linksReport) return;
    setDryRunBusy(true); setDryRunError(null); setDryRun(null);
    try {
      const dbOnlyNames = parsed.reportA.rows.filter(m => m.identity === "db_only" && m.db).map(m => m.db!.full_name);
      const payload = buildDryRunPayloadV2(
        parsed.reportA, linksReport, parsed.staffFile, new Map(parsed.coachNames),
        dbOnlyNames, conflicts.map(c => c.key), decisions);
      const server = await api.dryRunImport(payload);
      const expected = expectedDryRunV2(
        payload, linksReport,
        (guardiansQuery.data || []) as any[],
        ((staffQuery.data || []) as any[]).map(s => ({ id: s.id, full_name: s.full_name, roles: s.roles || [] })));
      setDryRun({ server, expected, mismatches: compareDryRunV2(expected, serverAsCounts(server)) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setDryRunError(
        msg.includes("prepare_people_import_dry_run") || msg.includes("does not exist") || msg.includes("404")
          ? "ה-RPC של ה-Dry Run טרם הוחל במסד. יש להריץ את המיגרציה ואז לנסות שוב."
          : msg === "not_authorized" ? "אין הרשאה להריץ Dry Run."
          : "בדיקת ה-Dry Run נכשלה. אפשר לנסות שוב.");
    } finally {
      setDryRunBusy(false);
    }
  };

  const filteredMatches = (activeReport?.rows || []).filter(m =>
    (studentFilter === "all" || m.identity === studentFilter) &&
    (!q || (m.file && `${m.file.last} ${m.file.first}`.includes(q)) || (m.db && m.db.full_name.includes(q))));

  // reports never contain a full national id, phone or email
  const maskChange = (field: string, v: string) => {
    if (v === "—") return v;
    if (field === "phone") return maskPhone(v) || "—";
    if (field === "email") return maskEmail(v) || "—";
    return v;
  };
  const reportItems = (r: MatchReport) => r.rows.map(m => ({
    identity: m.identity,
    name: m.file ? `${m.file.last} ${m.file.first}` : m.db?.full_name,
    id_masked: m.file?.nid ? maskId(normalizeNid(m.file.nid).nid) : (m.db?.national_id ? maskId(normalizeNid(m.db.national_id).nid) : null),
    note: m.note || null,
    changes: m.changes.map(c => ({ field: c.label, current: maskChange(c.field, c.current), proposed: maskChange(c.field, c.proposed), source: c.source, reason: c.reason })),
  }));
  const downloadReport = () => {
    if (!parsed || !controlsPassed) return;
    const report = {
      generated_at: new Date().toISOString(),
      file: parsed.fileName,
      control_a_snapshot: { counts: parsed.reportA.counts, controls: parsed.reportA.controls, items: reportItems(parsed.reportA) },
      control_b_athletes: { counts: parsed.reportB.counts, controls: parsed.reportB.controls, items: reportItems(parsed.reportB) },
      guardians: { counts: gCounts, items: parsed.guardians },
      links: linksReport ? { guardians: linksReport.guardians, coaches: linksReport.coaches, controls: linksReport.controls } : null,
      staff: { counts: sCounts, items: parsed.staffItems },
      sports: parsed.sportRows,
      decisions: conflicts.map(c => ({ area: c.area, name: c.name, decision: decisionLabel(decisions[c.key]) })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wingate-import-preview.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const downloadExcel = () => {
    if (!parsed || !controlsPassed || !linksReport) return;
    const wb = XLSX.utils.book_new();
    (wb as any).Workbook = { Views: [{ RTL: true }] };
    const add = (name: string, rows: (string | number)[][], widths?: number[]) => {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      if (widths) ws["!cols"] = widths.map(wch => ({ wch }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    };
    const c = parsed.reportA.counts, cb = parsed.reportB.counts;
    add("סיכום", [
      ["דוח Preview לייבוא נתונים (ללא ייבוא בפועל)"],
      ["קובץ", parsed.fileName],
      ["הופק", new Date().toLocaleString("he-IL")],
      [],
      ['בקרה A · תמונת מצב תשפ"ו'],
      ["התאמה ודאית", c.exact], ["התאמה חזקה", c.strong], ["מותאמים", c.confident],
      ["רק במקור", c.source_only], ["רק ב-DB", c.db_only], ["להחלטה אנושית", c.human_review],
      ["בקרת כיסוי", parsed.reportA.controls.passed ? "עברה" : "נכשלה"],
      [],
      ["בקרה B · ספורטאים"],
      ["התאמה ודאית", cb.exact], ["התאמה חזקה", cb.strong], ["מותאמים", cb.confident],
      ["רק במקור", cb.source_only], ["רק ב-DB", cb.db_only], ["להחלטה אנושית", cb.human_review],
      ["בקרת כיסוי", parsed.reportB.controls.passed ? "עברה" : "נכשלה"],
      [],
      ["הורים וקשרים"],
      ["הורים ייחודיים", linksReport.guardians.unique],
      ["הורים שניתן לקשר כרגע", linksReport.guardians.linkableNow],
      ["הורים שלא ניתן לקשר (התלמיד אינו מותאם)", linksReport.guardians.unlinkable],
      ["הורים בקונפליקט", linksReport.guardians.conflicts],
      ["קשרי הורה-תלמיד", linksReport.guardians.plannedLinks],
      [],
      ["מאמנים וקשרים"],
      ["מאמנים ייחודיים", linksReport.coaches.unique],
      ["מאמנים שניתן לקשר כרגע", linksReport.coaches.linkableNow],
      ["מאמנים שלא ניתן לקשר (התלמיד אינו מותאם)", linksReport.coaches.unlinkable],
      ["קשרי מאמן-תלמיד", linksReport.coaches.plannedLinks],
      ["בקרת כיסוי קשרים", linksReport.controls.passed ? "עברה" : "נכשלה"],
      [],
      ["החלטות קונפליקטים", `${decidedCount} מתוך ${conflicts.length}`],
      ["כלל", "כל מקרה שלא הוחלט לא ייובא"],
    ], [38, 24]);
    const newRows: (string | number)[][] = [["מקור", "שם", 'ת"ז ממוסכת', "כיתה", "ענף"]];
    for (const [label, rep] of [['בקרה A · תשפ"ו', parsed.reportA], ["בקרה B · ספורטאים", parsed.reportB]] as const)
      for (const m of rep.rows) if (m.identity === "source_only" && m.file)
        newRows.push([label, `${m.file.last} ${m.file.first}`, m.file.nid ? maskId(normalizeNid(m.file.nid).nid) : "", m.file.cls, m.file.sport]);
    add("תלמידים חדשים", newRows, [18, 22, 12, 8, 14]);
    const updRows: (string | number)[][] = [["מקור", "שם", "שדה", "ערך נוכחי", "ערך מוצע", "סיבה"]];
    for (const rep of [parsed.reportA, parsed.reportB])
      for (const m of rep.rows) if ((m.identity === "exact" || m.identity === "strong") && m.changes.length)
        for (const ch of m.changes)
          updRows.push([rep === parsed.reportA ? 'בקרה A · תשפ"ו' : "בקרה B · ספורטאים",
            m.db?.full_name || "", ch.label, maskChange(ch.field, ch.current), maskChange(ch.field, ch.proposed), ch.reason]);
    add("עדכוני תלמידים", updRows, [18, 22, 12, 18, 18, 20]);
    add("הורים וקשרים", [["הורה", "טלפון ממוסך", "תלמיד/ה", "סיווג", "הערה"],
      ...linksReport.items.filter(i => i.kind === "guardian").map(i => [i.person, i.phoneMasked || "", i.student, LINK_LABELS[i.category], i.note || ""])],
      [22, 14, 20, 16, 30]);
    add("צוות ומאמנים", [["סוג", "שם", "סיווג", "פרטים"],
      ...parsed.staffItems.map(s => ["צוות/מאמן", s.name, STAFF_LABELS[s.category], (s.note || "") + (s.candidates?.length ? ` · מועמדים: ${s.candidates.join(", ")}` : "")]),
      ...linksReport.items.filter(i => i.kind === "coach").map(i => ["קשר מאמן-תלמיד", i.person, LINK_LABELS[i.category], `${i.student}${i.note ? ` · ${i.note}` : ""}`])],
      [16, 22, 18, 34]);
    add("קונפליקטים", [["תחום", "שם", "פרטים", "החלטה"],
      ...conflicts.map(cc => [cc.area, cc.name, cc.note, decisionLabel(decisions[cc.key])])],
      [18, 22, 34, 22]);
    add("מדולגים", [["תחום", "שם", "סיבה"],
      ...conflicts.filter(cc => decisions[cc.key] === "skip").map(cc => [cc.area, cc.name, "סומן לדילוג בהחלטה ידנית"]),
      [], ["טאבים מוחרגים במכוון", "מצב חירום, עוזבים, מועמדים, סיכומים, מידות, כתובות ומידע רפואי", ""]],
      [24, 40, 24]);
    XLSX.writeFile(wb, "wingate-import-preview.xlsx");
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
                      ...(parsed.reportB.controls.errors.map(e => `בקרה B: ${e}`)),
                      ...((linksReport?.controls.errors || []).map(e => `בקרת קשרים: ${e}`))].join(" · ") || "כשל לא מזוהה"}
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
                <p className="text-[11.5px] text-muted-foreground mb-2">מספר ההורים ומספר הקשרים נספרים בנפרד. הייבוא עצמו ייפתח בנפרד משלב התלמידים.</p>
                {allLinksQuery.isError && (
                  <p className="text-[11.5px] text-warning mb-2">
                    זיהוי קשרים קיימים במערכת יופעל לאחר החלת מיגרציית get_all_people_links. עד אז כל הקשרים מסווגים כחדשים.
                  </p>
                )}
                {linksReport && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Chip label="הורים ייחודיים" n={linksReport.guardians.unique} />
                    <Chip label="הורים שניתן לקשר כרגע" n={linksReport.guardians.linkableNow} />
                    <Chip label="הורים שלא ניתן לקשר (התלמיד אינו מותאם)" n={linksReport.guardians.unlinkable} tone="warn" />
                    <Chip label="הורים בקונפליקט" n={linksReport.guardians.conflicts} tone="bad" />
                    <Chip label="קשרי הורה-תלמיד" n={linksReport.guardians.plannedLinks} />
                  </div>
                )}
                {linksReport && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {Object.entries(LINK_LABELS).map(([k, label]) => (
                      <Chip key={k} label={label} n={gLinkCounts[k] || 0}
                        tone={k === "conflict" ? "bad" : k === "unlinkable" || k === "historical" ? "warn" : undefined} />
                    ))}
                  </div>
                )}
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
                {linksReport && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Chip label="מאמנים ייחודיים" n={linksReport.coaches.unique} />
                    <Chip label="מאמנים שניתן לקשר כרגע" n={linksReport.coaches.linkableNow} />
                    <Chip label="מאמנים שלא ניתן לקשר (התלמיד אינו מותאם)" n={linksReport.coaches.unlinkable} tone="warn" />
                    <Chip label="קשרי מאמן-תלמיד" n={linksReport.coaches.plannedLinks} />
                  </div>
                )}
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

              {/* 6. conflicts + human decisions */}
              <section className="card-premium p-4 sm:p-5 mb-4">
                <h2 className="text-[14px] font-semibold text-foreground mb-2">6. קונפליקטים והחלטות ({conflicts.length})</h2>
                {conflicts.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">אין קונפליקטים.</p>
                ) : (
                  <>
                    <p className="text-[11.5px] text-muted-foreground mb-3">
                      ברירת המחדל לכל מקרה: {UNDECIDED}. שום החלטה אינה מתבצעת אוטומטית,
                      הבחירות נשמרות בדוח בלבד ואינן כותבות דבר למערכת.
                    </p>
                    <div className="space-y-2 max-h-[480px] overflow-y-auto">
                      {conflicts.map(c => {
                        const d = decisions[c.key];
                        return (
                          <div key={c.key} className="rounded-xl border border-border/70 p-3">
                            <p className="text-[12.5px] text-foreground break-words">
                              <span className="text-muted-foreground">[{c.area}]</span> {c.name} · {c.note}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {DECISION_OPTS.map(o => (
                                <button key={o.v}
                                  onClick={() => {
                                    setDryRun(null);
                                    setDecisions(p => {
                                      const next = { ...p };
                                      if (next[c.key] === o.v) delete next[c.key]; else next[c.key] = o.v;
                                      return next;
                                    });
                                  }}
                                  className={`h-7 px-2.5 rounded-lg text-[11px] border transition-colors ${
                                    d === o.v ? "bg-primary/10 text-primary border-primary/30 font-medium" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                                  {o.label}
                                </button>
                              ))}
                              {!d && (
                                <span className="h-7 px-2.5 inline-flex items-center rounded-lg text-[11px] bg-warning/10 text-warning border border-warning/30">
                                  {UNDECIDED}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11.5px] text-muted-foreground mt-3">
                      הוחלטו {decidedCount} מתוך {conflicts.length} מקרים. כל מקרה שלא הוחלט לא ייובא.
                    </p>
                  </>
                )}
              </section>

              {/* 7. summary */}
              <section className="card-premium p-4 sm:p-5">
                <h2 className="text-[14px] font-semibold text-foreground mb-2">7. סיכום</h2>
                <p className="text-[12.5px] text-muted-foreground mb-3">
                  בקרה A (תשפ"ו): {parsed.reportA.counts.exact} ודאיות · {parsed.reportA.counts.strong} חזקות · {parsed.reportA.counts.confident} מותאמות · {parsed.reportA.counts.source_only} רק במקור · {parsed.reportA.counts.db_only} רק ב-DB · {parsed.reportA.counts.human_review} להחלטה אנושית ·
                  {" "}בקרה B (ספורטאים): {parsed.reportB.counts.confident} מותאמות מתוך {parsed.reportB.controls.fileTotal} ·
                  {" "}הורים שניתן לקשר כרגע: {linksReport?.guardians.linkableNow ?? 0} · קשרי הורה-תלמיד: {linksReport?.guardians.plannedLinks ?? 0} ·
                  {" "}מאמנים שניתן לקשר כרגע: {linksReport?.coaches.linkableNow ?? 0} · קשרי מאמן-תלמיד: {linksReport?.coaches.plannedLinks ?? 0} ·
                  {" "}צוות: {parsed.staffCount} · החלטות: {decidedCount}/{conflicts.length}
                </p>
                {/* server dry-run: read-only, blocks continuation on mismatch */}
                <div className="rounded-xl border border-border/70 p-3 mb-3">
                  <p className="text-[12.5px] font-medium text-foreground mb-1.5">בדיקת Dry Run בשרת</p>
                  <p className="text-[11.5px] text-muted-foreground mb-2">
                    השרת בודק מחדש מול המסד מה חדש, מה קיים ומה קונפליקט, בלי לכתוב דבר.
                    מקרים שלא הוחלטו נשארים מדולגים.
                  </p>
                  <button onClick={runDryRun} disabled={dryRunBusy || !controlsPassed}
                    className={`${btnGhost} ${dryRunBusy || !controlsPassed ? "opacity-50 cursor-not-allowed" : ""}`}>
                    {dryRunBusy ? "בודקת מול השרת..." : "בדיקת Dry Run בשרת"}
                  </button>
                  {dryRunError && <p className="text-[12px] text-destructive mt-2">{dryRunError}</p>}
                  {dryRun && (
                    <div className="mt-3">
                      <div className="overflow-x-auto space-y-3">
                        {DRY_RUN_V2_DOMAINS.map(({ key, label }) => {
                          const e = (dryRun.expected[key] || {}) as Record<string, number>;
                          const s = (serverAsCounts(dryRun.server)[key] || {}) as Record<string, number>;
                          const cons = (dryRun.server.conservation as any)?.[key];
                          return (
                            <div key={key}>
                              <p className="text-[12px] font-medium text-foreground mb-1">
                                {label}
                                <span className={`ms-2 text-[11px] ${cons?.passed ? "text-primary" : "text-destructive"}`}>
                                  שימור {cons?.passed ? "✓" : "✗"} <span dir="ltr">({cons?.classified ?? "?"}/{cons?.total ?? "?"})</span>
                                </span>
                              </p>
                              <table className="text-[12px] w-full min-w-[380px]">
                                <thead>
                                  <tr className="text-muted-foreground">
                                    <th className="text-start font-medium pb-1">מדד</th>
                                    <th className="text-start font-medium pb-1">Preview בדפדפן</th>
                                    <th className="text-start font-medium pb-1">Dry Run בשרת</th>
                                    <th className="text-start font-medium pb-1">תואם</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.keys(e).map(k => (
                                    <tr key={k} className="border-t border-border/50">
                                      <td className="py-1">{METRIC_LABELS[k] || k}</td>
                                      <td className="py-1 tabular-nums">{e[k]}</td>
                                      <td className="py-1 tabular-nums">{s[k] ?? "?"}</td>
                                      <td className="py-1">{e[k] === s[k] ? "✓" : "✗"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2" dir="ltr">
                        fingerprint: {dryRun.server.fingerprint?.slice(0, 16)}…
                      </p>
                      {dryRun.server.blockers?.length > 0 && (
                        <p className="text-[12px] text-destructive mt-1">
                          חסימות מהשרת: {dryRun.server.blockers.join(" · ")}
                        </p>
                      )}
                      {(dryRun.mismatches.length > 0 || !dryRun.server.conservation?.passed) ? (
                        <p className="text-[12px] text-destructive font-medium mt-2 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                          אי-התאמה בין ה-Preview בדפדפן ל-Dry Run בשרת. ההמשך חסום עד לבירור.
                          {dryRun.mismatches.length > 0 ? ` (${dryRun.mismatches.join(" · ")})` : ""}
                        </p>
                      ) : (
                        <p className="text-[12px] text-primary font-medium mt-2">
                          הבדיקה בשרת תואמת את ה-Preview. הייבוא עצמו עדיין סגור בשלב זה.
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={downloadExcel} className={`${btnPrimary} inline-flex items-center gap-1.5`}>
                    <Download className="h-4 w-4" strokeWidth={1.7} />
                    הורדת דוח Excel
                  </button>
                  <button onClick={downloadReport} className={btnGhost}>
                    דוח JSON (טכני)
                  </button>
                  <button disabled className={`${btnGhost} opacity-50 cursor-not-allowed`} title="ייפתח בשלב הבא">
                    אישור וייבוא, ייפתח בשלב הבא
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
