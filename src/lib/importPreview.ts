/** Import-Preview core (stage 3C). Pure, dependency-free logic over
 *  arrays-of-arrays extracted from the workbook in the browser.
 *  Nothing here talks to the network or stores anything. */

export type AOA = string[][];

/* ── generic helpers ── */
export const digits = (v: string | null | undefined) => (v || "").replace(/\D/g, "");
export const normSpace = (v: string | null | undefined) => (v || "").replace(/\s+/g, " ").trim();
export const normClass = (v: string | null | undefined) => (v || "").replace(/[\s'׳"״]/g, "");
export const maskId = (nid: string) => (nid.length >= 5 ? nid.slice(0, 3) + "***" + nid.slice(-1) : "***");
export const maskPhone = (p: string | null | undefined) => {
  const d = digits(p);
  return d.length >= 5 ? d.slice(0, 3) + "***" + d.slice(-2) : d ? "***" : "";
};
export const maskEmail = (e: string | null | undefined) => (e ? e[0] + "***" : "");
const normKey = (v: string) => normSpace(v).replace(/[\s'׳"״-]/g, "").replace(/יי/g, "י");

/** Israeli id normalization: strip non-digits, LEFT-PAD lost leading zeros
 *  to 9 digits (numeric storage drops them), then checksum-validate. */
export function normalizeNid(v: string | null | undefined): { nid: string; valid: boolean } {
  let d = digits(v);
  if (!d) return { nid: "", valid: false };
  if (d.length >= 7 && d.length < 9) d = d.padStart(9, "0");
  if (d.length !== 9) return { nid: d, valid: false };
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let x = Number(d[i]) * (i % 2 === 0 ? 1 : 2);
    if (x > 9) x -= 9;
    sum += x;
  }
  return { nid: d, valid: sum % 10 === 0 };
}

/** Convert a RAW cell value (SheetJS raw:true) to a national-id string:
 *  numbers are rendered without scientific notation, strings pass through,
 *  errors/empty become "" (→ invalid downstream in normalizeNid). */
export function rawCellToNidString(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v).toFixed(0);
  if (typeof v === "string") return v.trim();
  return "";
}

/* ── 1. block extraction from an academy-snapshot sheet ──
   Blocks are detected by every "שם משפחה" header cell; per block the record
   number column is header-1 and fields sit at fixed offsets. Rows are
   accepted only when the number equals the next expected value (internal
   blank/separator rows are skipped, helper tables never match). */
export interface FileStudent {
  first: string; last: string; sport: string; phone: string; email: string;
  birth: string; nid: string; gender: string; cls: string; coach: string;
  /** where the national id came from: the raw cell value or the formatted text */
  nid_lineage: "raw" | "formatted";
  source_block: string; row: number;
}
/** rawAoa (optional): the same sheet read with raw:true. It is used ONLY for
 *  the national-id column — some ת"ז cells are wrongly date-formatted and
 *  their FORMATTED value comes back empty/garbage, while the raw numeric
 *  value is the real id. All other fields keep the formatted read. */
export function parseAcademyBlocks(aoa: AOA, rawAoa?: unknown[][]): { students: FileStudent[]; blocks: { title: string; count: number }[] } {
  let headerRow = -1;
  for (let r = 0; r < Math.min(aoa.length, 8); r++) {
    if ((aoa[r] || []).filter(c => normSpace(c) === "שם משפחה").length >= 2) { headerRow = r; break; }
  }
  if (headerRow < 0) return { students: [], blocks: [] };
  const cols = (aoa[headerRow] || []).map((c, i) => ({ c: normSpace(c), i })).filter(x => x.c === "שם משפחה").map(x => x.i);
  const titles = aoa[headerRow - 1] || [];
  const students: FileStudent[] = [];
  const blocks: { title: string; count: number }[] = [];
  for (const c of cols) {
    const numCol = c - 1;
    const title = normSpace(titles.slice(Math.max(0, c - 2), c + 6).find(t => normSpace(t)) || `בלוק ${c}`);
    let expected = 1, count = 0, lastRow = headerRow;
    for (let r = headerRow + 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      const raw = normSpace(row[numCol]);
      if (raw !== String(expected)) continue;
      // gap guard: a continuation appearing far below the previous record
      // belongs to a helper table, not to the main block
      if (r - lastRow > 5) break;
      const last = normSpace(row[c]), first = normSpace(row[c + 1]);
      if (!last && !first) continue;
      // national id: prefer the RAW cell (survives wrong date formatting);
      // fall back to the formatted text when no raw sheet was provided
      const rawNid = rawAoa ? digits(rawCellToNidString(rawAoa[r]?.[c + 6])) : "";
      const fmtNid = digits(row[c + 6]);
      const nid = rawAoa ? (rawNid || fmtNid) : fmtNid;
      students.push({
        last, first,
        sport: normSpace(row[c + 2]), phone: normSpace(row[c + 3]), email: normSpace(row[c + 4]),
        birth: normSpace(row[c + 5]), nid,
        nid_lineage: rawAoa && rawNid ? "raw" : "formatted",
        gender: normSpace(row[c + 7]).toLowerCase(),
        cls: normSpace(row[c + 10]), coach: normSpace(row[c + 11]),
        source_block: title, row: r + 1,
      });
      expected++; count++; lastRow = r;
    }
    blocks.push({ title, count });
  }
  return { students, blocks };
}

/* ── 2. athletes registry (ספורטאים): identity + parents + coach ── */
export interface FileAthlete {
  first: string; last: string; sport: string; coach: string; cls: string;
  nid: string; phone: string; email: string; birth: string; gender: string;
  father: string; father_phone: string; mother: string; mother_phone: string;
  madrich: string; row: number;
}
export function parseAthletes(aoa: AOA): FileAthlete[] {
  const out: FileAthlete[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const first = normSpace(row[1]), last = normSpace(row[2]);
    if (!first && !last) continue;
    out.push({
      first, last, sport: normSpace(row[3]), coach: normSpace(row[6]), cls: normSpace(row[7]),
      nid: digits(row[8]), phone: normSpace(row[9]), email: normSpace(row[18]),
      birth: normSpace(row[19]), gender: normSpace(row[20]).toLowerCase(),
      father: normSpace(row[11]), father_phone: digits(row[12]),
      mother: normSpace(row[13]), mother_phone: digits(row[14]),
      madrich: normSpace(row[24]), row: r + 1,
    });
  }
  return out;
}

/* ── 3. staff sheet (צוות): person rows only ── */
export interface FileStaff { name: string; role: string; phone: string; email: string; row: number }
const OFFICE_WORDS = ["מזכירות", "פקס", "חדר", "מוקד", "אקדמיה", "שער", "מרפאה"];
export function parseStaffSheet(aoa: AOA): FileStaff[] {
  const out: FileStaff[] = [];
  for (let r = 3; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const name = normSpace(row[0]);
    if (!name) continue;
    const role = normSpace(row[2]);
    if (role === "פקס" || OFFICE_WORDS.some(w => name.includes(w))) continue;
    out.push({ name, role, phone: normSpace(row[1]), email: normSpace(row[3]), row: r + 1 });
  }
  return out;
}

/* ── 4. sport normalization via sport_aliases ── */
export interface SportRef { id: string; sport_name: string }
export interface SportAlias { alias_normalized: string; sport_id: string }
export function resolveSport(raw: string, sports: SportRef[], aliases: SportAlias[]):
  { canonical: string | null; viaAlias: boolean } {
  const v = normSpace(raw);
  if (!v) return { canonical: null, viaAlias: false };
  const direct = sports.find(s => s.sport_name === v);
  if (direct) return { canonical: direct.sport_name, viaAlias: false };
  const a = aliases.find(x => x.alias_normalized === v);
  if (a) {
    const s = sports.find(x => x.id === a.sport_id);
    if (s) return { canonical: s.sport_name, viaAlias: true };
  }
  return { canonical: null, viaAlias: false };
}

/* ── 5. identity matching — SEPARATED from field changes ──
   Identity buckets: exact (id), strong (name + supporting signal),
   source_only, db_only, human_review. Field changes are attached to
   matched rows and NEVER demote the identity bucket. Conservation
   controls guarantee every file row and every DB row lands in exactly
   one bucket — the UI must block results if the controls fail. */
export interface DbStudent {
  id: string; national_id: string | null; full_name: string;
  class_name: string; sport: string; birth_year: number | null;
  phone?: string | null; email?: string | null; archived?: boolean | null;
}
export interface MatchInput {
  first: string; last: string; nid: string; cls: string; sport: string;
  birth: string; phone: string; email: string;
}
export interface FieldChange { field: string; label: string; current: string; proposed: string; source: string; reason: string }
export interface IdentityRow {
  identity: "exact" | "strong" | "source_only" | "db_only" | "human_review";
  file?: MatchInput; db?: DbStudent;
  changes: FieldChange[];
  note?: string;
}
export interface MatchReport {
  rows: IdentityRow[];
  counts: {
    exact: number; strong: number; confident: number;
    source_only: number; db_only: number; human_review: number; with_changes: number;
  };
  controls: { fileTotal: number; dbTotal: number; fileCovered: number; dbCovered: number; passed: boolean; errors: string[] };
}
export const birthYear = (birth: string): number | null => {
  const m = birth.match(/(\d{4})\s*$/) || birth.match(/\/(\d{4})/);
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1990 && y <= 2030 ? y : null;
};
export function matchIdentities(
  fileRows: MatchInput[], dbStudents: DbStudent[],
  opts: { classByNid?: Map<string, string>; sports: SportRef[]; aliases: SportAlias[]; sourceLabel: string },
): MatchReport {
  const rows: IdentityRow[] = [];
  const usedDb = new Set<string>();
  const dbById = new Map<string, DbStudent>();
  for (const d of dbStudents) {
    const n = normalizeNid(d.national_id);
    if (n.nid.length === 9 && !dbById.has(n.nid)) dbById.set(n.nid, d);
  }
  const nameIndex = (name: string) => normKey(name);
  const buildChanges = (f: MatchInput, d: DbStudent): FieldChange[] => {
    const ch: FieldChange[] = [];
    const fname = normSpace(`${f.last} ${f.first}`);
    if (fname && nameIndex(fname) !== nameIndex(d.full_name) && nameIndex(`${f.first} ${f.last}`) !== nameIndex(d.full_name))
      ch.push({ field: "full_name", label: "שם מלא", current: d.full_name, proposed: fname, source: opts.sourceLabel, reason: "שם שונה במקור" });
    const snapCls = opts.classByNid?.get(normalizeNid(f.nid).nid) || f.cls;
    if (snapCls && normClass(snapCls) !== normClass(d.class_name))
      ch.push({ field: "class_name", label: "כיתה", current: d.class_name || "—", proposed: snapCls, source: opts.sourceLabel, reason: "שיוך כיתה שונה" });
    const sp = resolveSport(f.sport, opts.sports, opts.aliases);
    if (sp.canonical && sp.canonical !== d.sport)
      ch.push({ field: "sport", label: "ענף", current: d.sport || "—", proposed: sp.canonical + (sp.viaAlias ? ` (מנורמל מ"${f.sport}")` : ""), source: opts.sourceLabel, reason: sp.viaAlias ? "נרמול כתיב ענף" : "ענף שונה במקור" });
    if (f.phone && digits(f.phone) && digits(f.phone) !== digits(d.phone || ""))
      ch.push({ field: "phone", label: "טלפון תלמיד", current: d.phone || "—", proposed: f.phone, source: opts.sourceLabel, reason: d.phone ? "טלפון שונה" : "טלפון חסר ב-DB" });
    if (f.email && f.email.toLowerCase() !== (d.email || "").toLowerCase())
      ch.push({ field: "email", label: "אימייל", current: d.email || "—", proposed: f.email, source: opts.sourceLabel, reason: d.email ? "אימייל שונה" : "אימייל חסר ב-DB" });
    const by = birthYear(f.birth);
    if (by && by !== d.birth_year)
      ch.push({ field: "birth_year", label: "שנת לידה", current: d.birth_year ? String(d.birth_year) : "—", proposed: String(by), source: opts.sourceLabel, reason: "שנת לידה מהמקור" });
    const fid = normalizeNid(f.nid);
    if (fid.valid && !normalizeNid(d.national_id).valid)
      ch.push({ field: "national_id", label: 'ת"ז', current: "—", proposed: maskId(fid.nid), source: opts.sourceLabel, reason: 'ת"ז חסרה ב-DB' });
    return ch;
  };

  for (const f of fileRows) {
    const fid = normalizeNid(f.nid);
    // exact by normalized id
    if (fid.nid.length === 9 && dbById.has(fid.nid)) {
      const d = dbById.get(fid.nid)!;
      if (usedDb.has(d.id)) { rows.push({ identity: "human_review", file: f, changes: [], note: 'ת"ז מופיעה פעמיים בקובץ' }); continue; }
      usedDb.add(d.id);
      const fk1 = nameIndex(`${f.last} ${f.first}`), fk2 = nameIndex(`${f.first} ${f.last}`), dk = nameIndex(d.full_name);
      if (fk1 !== dk && fk2 !== dk && fk1.length > 0) {
        // same id, very different name — human decision, both sides covered
        rows.push({ identity: "human_review", file: f, db: d, changes: [], note: 'ת"ז זהה אך השם שונה מהותית' });
        continue;
      }
      rows.push({ identity: "exact", file: f, db: d, changes: buildChanges(f, d), note: fid.valid ? undefined : 'ת"ז לא עוברת ביקורת ספרת ביקורת' });
      continue;
    }
    // malformed id (not 9 after padding) with content — flag, but still try name fallback
    const idNote = f.nid && fid.nid.length !== 9 ? `ת"ז באורך חריג (${maskId(fid.nid)})` : undefined;
    // strong: unique full-name match + at least one supporting signal
    const fk1 = nameIndex(`${f.last} ${f.first}`), fk2 = nameIndex(`${f.first} ${f.last}`);
    const hits = dbStudents.filter(d => !usedDb.has(d.id) && (nameIndex(d.full_name) === fk1 || nameIndex(d.full_name) === fk2));
    if (hits.length === 1) {
      const d = hits[0];
      let signals = 0;
      if (f.cls && normClass(f.cls) === normClass(d.class_name)) signals++;
      const sp = resolveSport(f.sport, opts.sports, opts.aliases);
      if (f.sport && (f.sport === d.sport || sp.canonical === d.sport)) signals++;
      const by = birthYear(f.birth);
      if (by && by === d.birth_year) signals++;
      if (signals >= 1) {
        usedDb.add(d.id);
        rows.push({ identity: "strong", file: f, db: d, changes: buildChanges(f, d), note: idNote ? idNote + " · הותאם לפי שם+אימות" : "הותאם לפי שם מלא + אימות נוסף" });
        continue;
      }
      rows.push({ identity: "human_review", file: f, changes: [], note: (idNote ? idNote + " · " : "") + "שם תואם אך ללא אות תומך (כיתה/ענף/שנת לידה)" });
      continue;
    }
    if (hits.length > 1) {
      rows.push({ identity: "human_review", file: f, changes: [], note: (idNote ? idNote + " · " : "") + "שם מלא תואם ליותר מתלמיד אחד" });
      continue;
    }
    if (idNote) {
      rows.push({ identity: "human_review", file: f, changes: [], note: idNote });
      continue;
    }
    rows.push({ identity: "source_only", file: f, changes: [] });
  }

  for (const d of dbStudents) {
    if (usedDb.has(d.id)) continue;
    if (rows.some(r => r.db?.id === d.id)) continue; // covered by a human_review pair
    let note = "קיים ב-DB ולא במקור, לא מסומן אוטומטית כעזב";
    if (d.full_name === "תירוש תומר" || d.full_name === "תומר תירוש") note = "חריג ידוע: נשאר פעיל לפי החלטה";
    if (d.full_name === "רותם גיל") note = "מועמד/ת לארכוב, דורש תווית החלטה אנושית";
    rows.push({ identity: "db_only", db: d, changes: [] });
    rows[rows.length - 1].note = note;
  }

  const counts = {
    exact: rows.filter(r => r.identity === "exact").length,
    strong: rows.filter(r => r.identity === "strong").length,
    confident: 0,
    source_only: rows.filter(r => r.identity === "source_only").length,
    db_only: rows.filter(r => r.identity === "db_only").length,
    human_review: rows.filter(r => r.identity === "human_review").length,
    with_changes: rows.filter(r => (r.identity === "exact" || r.identity === "strong") && r.changes.length > 0).length,
  };
  counts.confident = counts.exact + counts.strong;

  const fileCovered = rows.filter(r => r.file).length;
  const dbCovered = new Set(rows.filter(r => r.db).map(r => r.db!.id)).size;
  const errors: string[] = [];
  if (fileCovered !== fileRows.length) errors.push(`כיסוי שורות מקור: ${fileCovered}/${fileRows.length}`);
  if (dbCovered !== dbStudents.length) errors.push(`כיסוי שורות DB: ${dbCovered}/${dbStudents.length}`);
  return {
    rows, counts,
    controls: { fileTotal: fileRows.length, dbTotal: dbStudents.length, fileCovered, dbCovered, passed: errors.length === 0, errors },
  };
}

/* ── 6. guardians preview (matched students only) ── */
export interface DbGuardian { id: string; full_name: string; phone: string | null; email: string | null }
export interface GuardianPreviewItem {
  category: "new" | "existing" | "multi_child" | "new_link" | "conflict" | "missing_info";
  name: string; phoneMasked: string;
  students: string[]; note?: string;
}
export function previewGuardians(matches: IdentityRow[], dbGuardians: DbGuardian[]): GuardianPreviewItem[] {
  const matched = matches.filter(m => (m.identity === "exact" || m.identity === "strong") && m.file && m.db);
  const byPhone = new Map<string, { names: Set<string>; students: string[] }>();
  const noPhone: GuardianPreviewItem[] = [];
  for (const m of matched) {
    // parent fields exist only on athlete-registry inputs (Control B source)
    const f = m.file as unknown as FileAthlete;
    if (f.father === undefined && f.mother === undefined) continue;
    for (const [nm, ph] of [[f.father, f.father_phone], [f.mother, f.mother_phone]] as const) {
      if (!nm && !ph) continue;
      if (!ph) { noPhone.push({ category: "missing_info", name: nm, phoneMasked: "—", students: [m.db!.full_name], note: "הורה ללא טלפון, זיהוי לא ודאי" }); continue; }
      if (!byPhone.has(ph)) byPhone.set(ph, { names: new Set(), students: [] });
      const g = byPhone.get(ph)!;
      if (nm) g.names.add(nm);
      g.students.push(m.db!.full_name);
    }
  }
  const dbByPhone = new Map(dbGuardians.filter(g => g.phone).map(g => [digits(g.phone!), g]));
  const out: GuardianPreviewItem[] = [];
  for (const [ph, g] of byPhone) {
    const masked = ph.slice(0, 3) + "***" + ph.slice(-2);
    const students = Array.from(new Set(g.students));
    if (g.names.size > 1) {
      out.push({ category: "conflict", name: Array.from(g.names).join(" / "), phoneMasked: masked, students, note: "אותו טלפון עם שמות שונים, דורש החלטה אנושית" });
      continue;
    }
    const name = Array.from(g.names)[0] || "ללא שם";
    const existing = dbByPhone.get(ph);
    if (existing) out.push({ category: "existing", name: existing.full_name, phoneMasked: masked, students, note: "זוהה לפי טלפון זהה" });
    else if (students.length > 1) out.push({ category: "multi_child", name, phoneMasked: masked, students, note: "הורה אחד לכמה ילדים (טלפון משותף)" });
    else out.push({ category: "new", name, phoneMasked: masked, students });
  }
  // every phone-guardian also implies links (new until DB has any)
  return [...out, ...noPhone];
}

/* ── 7. staff & coach preview ── */
export interface DbStaffItem { id: string; full_name: string; roles: string[] }
export interface CoachPreviewItem {
  category: "staff_person" | "coach_sure" | "coach_variant" | "coach_missing" | "noise" | "new_link";
  name: string; note?: string; candidates?: string[]; count?: number;
}
export function previewStaff(fileStaff: FileStaff[], coachNames: Map<string, number>, dbStaff: DbStaffItem[]): CoachPreviewItem[] {
  const out: CoachPreviewItem[] = [];
  const staffNames = fileStaff.map(s => s.name);
  const dbNames = new Set(dbStaff.map(s => normKey(s.full_name)));
  for (const s of fileStaff) {
    out.push({ category: "staff_person", name: s.name, note: dbNames.has(normKey(s.name)) ? "כבר קיים בצוות במערכת" : (s.role || undefined) });
  }
  for (const [coach, n] of coachNames) {
    if (!coach) continue;
    if (coach === "וינגייט") { out.push({ category: "noise", name: coach, count: n, note: "ערך רעש, אינו אדם" }); continue; }
    if (staffNames.some(sn => normKey(sn) === normKey(coach))) {
      out.push({ category: "coach_sure", name: coach, count: n, note: "תואם בוודאות לטאב הצוות" });
      continue;
    }
    const candidates = staffNames.filter(sn => {
      const a = normKey(sn), b = normKey(coach);
      return a.includes(b) || b.includes(a) ||
        (a.length > 4 && b.length > 4 && (a.slice(0, 4) === b.slice(0, 4) || a.slice(-4) === b.slice(-4)));
    });
    if (candidates.length > 0) out.push({ category: "coach_variant", name: coach, count: n, candidates, note: "וריאציית כתיב אפשרית, דורש אישור אנושי" });
    else out.push({ category: "coach_missing", name: coach, count: n, note: "לא נמצא בטאב הצוות, לא ייווצר אוטומטית" });
  }
  return out;
}

/* ── 8. links preview — planned guardian/coach links vs EXISTING links ──
   Existing links arrive in ONE get_all_people_links call (ids + type +
   flags only; no PII). Every planned parent/coach-student pair lands in
   exactly one category, and every existing ACTIVE link is either matched
   by a planned pair or reported as db_only — the conservation controls
   verify both directions so no link disappears or is counted twice.
   Pass existing=null when the RPC is not applied yet: classification
   then runs without existing-link recognition (everything is "new"). */
export interface ExistingLinksInput {
  guardian_links: { link_id: string; guardian_id: string; student_id: string; relationship_type: string; active: boolean }[];
  coach_links: { assignment_id: string; staff_member_id: string; student_id: string; role_type: string; active: boolean }[];
}
export type LinkCategory = "new" | "unchanged" | "update" | "historical" | "conflict" | "db_only" | "unlinkable";
export interface LinkItem {
  kind: "guardian" | "coach"; category: LinkCategory;
  person: string; phoneMasked?: string; student: string; note?: string;
}
export interface LinksReport {
  items: LinkItem[];
  guardians: { unique: number; linkableNow: number; unlinkable: number; conflicts: number; plannedLinks: number };
  coaches: { unique: number; linkableNow: number; unlinkable: number; plannedLinks: number };
  controls: { plannedTotal: number; existingActiveTotal: number; plannedCovered: number; existingCovered: number; passed: boolean; errors: string[] };
  /** importable pairs (matched student, no conflict) — the exact rows a
   *  server dry-run payload is built from; conflict/unlinkable stay out */
  planned: {
    guardianLinks: { name: string; phone: string; studentId: string; rel: "father" | "mother" }[];
    coachLinks: { name: string; studentId: string }[];
  };
  /** explicit PEOPLE entities with stable refs (payload v2): every unique
   *  guardian/coach candidate from the file, including unlinkable ones,
   *  with ALL its student pairs (studentDbId null = student unmatched) */
  peopleModel: {
    guardians: { ref: string; names: string[]; phone: string; sourceRows: number[];
      entries: { studentDbId: string | null; student: string; rel: "father" | "mother" }[] }[];
    coaches: { ref: string; name: string;
      entries: { studentDbId: string | null; student: string }[] }[];
  };
}
export function previewLinks(
  athleteRows: IdentityRow[], dbGuardians: DbGuardian[], dbStaff: DbStaffItem[],
  existing: ExistingLinksInput | null, studentNameById?: Map<string, string>,
): LinksReport {
  const items: LinkItem[] = [];
  const gl = existing?.guardian_links || [];
  const cl = existing?.coach_links || [];
  const usedG = new Set<string>(), usedC = new Set<string>();
  const dbGByPhone = new Map(dbGuardians.filter(g => g.phone).map(g => [digits(g.phone!), g]));
  const dbSByName = new Map(dbStaff.map(s => [normKey(s.full_name), s]));

  // group file parents by phone (or name when no phone) — one guardian per key
  interface GAgg { names: Set<string>; phone: string; rows: number[]; entries: { matched: boolean; dbId?: string; student: string; rel: "father" | "mother" }[] }
  const gAgg = new Map<string, GAgg>();
  interface CAgg { name: string; entries: { matched: boolean; dbId?: string; student: string }[] }
  const cAgg = new Map<string, CAgg>();
  for (const m of athleteRows) {
    const f = m.file as unknown as FileAthlete | undefined;
    if (!f) continue;
    const matched = (m.identity === "exact" || m.identity === "strong") && !!m.db;
    const student = matched ? m.db!.full_name : normSpace(`${f.last} ${f.first}`);
    if (f.father !== undefined || f.mother !== undefined) {
      for (const [nm, ph, rel] of [[f.father, f.father_phone, "father"], [f.mother, f.mother_phone, "mother"]] as const) {
        if (!normSpace(nm) && !ph) continue;
        const key = ph ? `p:${ph}` : `n:${normKey(nm)}`;
        if (!gAgg.has(key)) gAgg.set(key, { names: new Set(), phone: ph || "", rows: [], entries: [] });
        const a = gAgg.get(key)!;
        if (normSpace(nm)) a.names.add(normSpace(nm));
        if (f.row) a.rows.push(f.row);
        a.entries.push({ matched, dbId: matched ? m.db!.id : undefined, student, rel });
      }
    }
    const coach = normSpace(f.coach);
    if (coach && coach !== "וינגייט") {
      const key = normKey(coach);
      if (!cAgg.has(key)) cAgg.set(key, { name: coach, entries: [] });
      cAgg.get(key)!.entries.push({ matched, dbId: matched ? m.db!.id : undefined, student });
    }
  }

  const plannedGuardianLinks: LinksReport["planned"]["guardianLinks"] = [];
  const plannedCoachLinks: LinksReport["planned"]["coachLinks"] = [];
  let gConflicts = 0, gLinkable = 0, gUnlinkable = 0, plannedG = 0;
  for (const a of gAgg.values()) {
    const masked = a.phone ? maskPhone(a.phone) : "ללא טלפון";
    const conflict = a.names.size > 1;
    if (conflict) gConflicts++;
    const name = Array.from(a.names).join(" / ") || "ללא שם";
    if (a.entries.some(e => e.matched)) gLinkable++; else gUnlinkable++;
    const dbG = a.phone ? dbGByPhone.get(a.phone) : undefined;
    for (const e of a.entries) {
      plannedG++;
      if (!e.matched) { items.push({ kind: "guardian", category: "unlinkable", person: name, phoneMasked: masked, student: e.student, note: "התלמיד אינו מותאם, הקשר לא ניתן לקישור בשלב זה" }); continue; }
      if (conflict) { items.push({ kind: "guardian", category: "conflict", person: name, phoneMasked: masked, student: e.student, note: "אותו טלפון עם שמות שונים, דורש החלטה" }); continue; }
      plannedGuardianLinks.push({ name, phone: a.phone, studentId: e.dbId!, rel: e.rel });
      if (!dbG) { items.push({ kind: "guardian", category: "new", person: name, phoneMasked: masked, student: e.student }); continue; }
      const pair = gl.filter(l => l.guardian_id === dbG.id && l.student_id === e.dbId);
      const act = pair.find(l => l.active);
      if (act) {
        usedG.add(act.link_id);
        const same = act.relationship_type === e.rel;
        items.push({ kind: "guardian", category: same ? "unchanged" : "update", person: name, phoneMasked: masked, student: e.student, note: same ? "קשר קיים ללא שינוי" : "סוג הקשר שונה מהרשום, עדכון מוצע" });
      } else if (pair.length > 0) {
        items.push({ kind: "guardian", category: "historical", person: name, phoneMasked: masked, student: e.student, note: "קיים קשר היסטורי שנסגר, חיבור מחדש דורש החלטה" });
      } else {
        items.push({ kind: "guardian", category: "new", person: name, phoneMasked: masked, student: e.student });
      }
    }
  }
  for (const l of gl) {
    if (!l.active || usedG.has(l.link_id)) continue;
    items.push({ kind: "guardian", category: "db_only", person: "הורה מקושר במערכת", student: studentNameById?.get(l.student_id) || "תלמיד/ה", note: "קשר פעיל ב-DB שאינו מופיע בקובץ, לא ייסגר אוטומטית" });
  }

  let cLinkable = 0, cUnlinkable = 0, plannedC = 0;
  for (const a of cAgg.values()) {
    if (a.entries.some(e => e.matched)) cLinkable++; else cUnlinkable++;
    const sm = dbSByName.get(normKey(a.name));
    for (const e of a.entries) {
      plannedC++;
      if (!e.matched) { items.push({ kind: "coach", category: "unlinkable", person: a.name, student: e.student, note: "התלמיד אינו מותאם, הקשר לא ניתן לקישור בשלב זה" }); continue; }
      plannedCoachLinks.push({ name: a.name, studentId: e.dbId! });
      if (!sm) { items.push({ kind: "coach", category: "new", person: a.name, student: e.student, note: "המאמן/ת טרם קיים/ת במערכת" }); continue; }
      const pair = cl.filter(l => l.staff_member_id === sm.id && l.student_id === e.dbId);
      const act = pair.find(l => l.active);
      if (act) { usedC.add(act.assignment_id); items.push({ kind: "coach", category: "unchanged", person: a.name, student: e.student, note: "שיוך קיים ללא שינוי" }); }
      else if (pair.length > 0) items.push({ kind: "coach", category: "historical", person: a.name, student: e.student, note: "קיים שיוך היסטורי שנסגר, חיבור מחדש דורש החלטה" });
      else items.push({ kind: "coach", category: "new", person: a.name, student: e.student });
    }
  }
  for (const l of cl) {
    if (!l.active || usedC.has(l.assignment_id)) continue;
    items.push({ kind: "coach", category: "db_only", person: "מאמן/ת מקושר/ת במערכת", student: studentNameById?.get(l.student_id) || "תלמיד/ה", note: "שיוך פעיל ב-DB שאינו מופיע בקובץ, לא ייסגר אוטומטית" });
  }

  const plannedTotal = plannedG + plannedC;
  const plannedCovered = items.filter(i => i.category !== "db_only").length;
  const existingActiveTotal = gl.filter(l => l.active).length + cl.filter(l => l.active).length;
  const existingCovered = usedG.size + usedC.size + items.filter(i => i.category === "db_only").length;
  const errors: string[] = [];
  if (plannedCovered !== plannedTotal) errors.push(`כיסוי קשרים מהקובץ: ${plannedCovered}/${plannedTotal}`);
  if (existingCovered !== existingActiveTotal) errors.push(`כיסוי קשרים פעילים ב-DB: ${existingCovered}/${existingActiveTotal}`);
  return {
    items,
    guardians: { unique: gAgg.size, linkableNow: gLinkable, unlinkable: gUnlinkable, conflicts: gConflicts, plannedLinks: plannedG },
    coaches: { unique: cAgg.size, linkableNow: cLinkable, unlinkable: cUnlinkable, plannedLinks: plannedC },
    controls: { plannedTotal, existingActiveTotal, plannedCovered, existingCovered, passed: errors.length === 0, errors },
    planned: { guardianLinks: plannedGuardianLinks, coachLinks: plannedCoachLinks },
    peopleModel: {
      guardians: Array.from(gAgg.values()).map((a, i) => ({
        ref: `gp-${i}`, names: Array.from(a.names), phone: a.phone, sourceRows: a.rows,
        entries: a.entries.map(e => ({ studentDbId: e.matched ? e.dbId! : null, student: e.student, rel: e.rel })),
      })),
      coaches: Array.from(cAgg.values()).map((a, i) => ({
        ref: `cc-${i}`, name: a.name,
        entries: a.entries.map(e => ({ studentDbId: e.matched ? e.dbId! : null, student: e.student })),
      })),
    },
  };
}

/* ── 8b. server dry-run: payload + browser-side expectation ──
   The browser builds ONE payload (planned records + conflict cases +
   human decisions) and computes the counts it EXPECTS the server to
   return. The server re-verifies everything independently; any gap
   between the two blocks continuation. can_import is always false at
   this stage. */
export interface DryRunPayload {
  version: 1;
  students: { national_id: string; full_name: string; class_name: string; sport: string; birth_year: number | null }[];
  guardian_links: { guardian_name: string; guardian_phone: string; student_id: string; relationship_type: "father" | "mother" }[];
  coach_links: { coach_name: string; student_id: string; role_type: "primary" }[];
  conflicts: { key: string }[];
  decisions: { key: string; decision: string }[];
}
export interface DryRunCounts {
  new: number; unchanged: number; updates: number; historical: number; conflicts: number; skipped: number;
}
export function buildDryRunPayload(
  reportA: MatchReport, links: LinksReport,
  conflictKeys: string[], decisions: Record<string, string>,
): DryRunPayload {
  return {
    version: 1,
    students: reportA.rows
      .filter(m => m.identity === "source_only" && m.file)
      .map(m => ({
        national_id: normalizeNid(m.file!.nid).nid,
        full_name: normSpace(`${m.file!.last} ${m.file!.first}`),
        class_name: m.file!.cls, sport: m.file!.sport,
        birth_year: birthYear(m.file!.birth),
      })),
    guardian_links: links.planned.guardianLinks.map(g => ({
      guardian_name: g.name, guardian_phone: g.phone, student_id: g.studentId, relationship_type: g.rel,
    })),
    coach_links: links.planned.coachLinks.map(c => ({ coach_name: c.name, student_id: c.studentId, role_type: "primary" as const })),
    conflicts: conflictKeys.map(key => ({ key })),
    decisions: Object.entries(decisions).map(([key, decision]) => ({ key, decision })),
  };
}
/** counts the browser expects the server dry-run to return for the payload */
export function expectedDryRunCounts(
  reportA: MatchReport, links: LinksReport,
  conflictsTotal: number, decisions: Record<string, string>,
): DryRunCounts {
  const li = (k: LinkCategory) => links.items.filter(i => i.category === k).length;
  const decided = Object.values(decisions).filter(v => v === "link" || v === "create").length;
  return {
    new: reportA.counts.source_only + li("new"),
    unchanged: li("unchanged"),
    updates: li("update"),
    historical: li("historical"),
    conflicts: decided,
    skipped: conflictsTotal - decided,
  };
}
export function compareDryRun(expected: DryRunCounts, server: DryRunCounts): string[] {
  const labels: Record<keyof DryRunCounts, string> = {
    new: "חדשים", unchanged: "ללא שינוי", updates: "עדכונים",
    historical: "היסטוריים", conflicts: "קונפליקטים", skipped: "מדולגים",
  };
  return (Object.keys(labels) as (keyof DryRunCounts)[])
    .filter(k => expected[k] !== (server?.[k] ?? -1))
    .map(k => `${labels[k]}: דפדפן ${expected[k]} מול שרת ${server?.[k] ?? "חסר"}`);
}

/* ── 8c. payload VERSION 2 — people are EXPLICIT entities ──
   Every guardian candidate (all of them, including unlinkable ones),
   every canonical staff person from the צוות tab and every coach-column
   candidate travels as its own record with a stable in-payload ref.
   Links reference refs; nothing is ever derived implicitly from a link.
   The server classifies every entity domain separately with its own
   conservation, and can_import stays false. */
export const nameKey = (v: string) => normKey(v);
/** the exact fuzzy rule the server mirrors for coach-name variants */
export const nameFuzzy = (a: string, b: string): boolean =>
  a.length > 0 && b.length > 0 && (
    a.includes(b) || b.includes(a) ||
    (a.length > 4 && b.length > 4 && (a.slice(0, 4) === b.slice(0, 4) || a.slice(-4) === b.slice(-4))));

export interface PayloadStaffPerson {
  ref: string; full_name: string; phone: string; email: string;
  planned_role: string; lineage: string; source_row: number;
  /** set ONLY by an explicit human "different people, same name" decision;
   *  the server dedup key becomes name+seq so the pair is not blocked */
  distinct_seq?: number;
}
export interface DryRunPayloadV2 {
  version: 2;
  students: { ref: string; national_id: string; full_name: string; class_name: string; sport: string; birth_year: number | null }[];
  guardian_people: { ref: string; full_name: string; name_variants: string[]; phone: string; email: string; source_rows: number[]; lineage: string }[];
  guardian_links: { ref: string; person_ref: string; student_id: string | null; relationship_type: "father" | "mother" }[];
  staff_people: PayloadStaffPerson[];
  coach_candidates: { ref: string; name: string; students_count: number }[];
  coach_links: { ref: string; candidate_ref: string; student_id: string | null; role_type: "primary" }[];
  conflicts: { key: string }[];
  decisions: { key: string; decision: string }[];
  skipped_items: { kind: string; label: string }[];
}
export function buildDryRunPayloadV2(
  reportA: MatchReport, links: LinksReport, staffFile: FileStaff[],
  coachNames: Map<string, number>, dbOnlyNames: string[],
  conflictKeys: string[], decisions: Record<string, string>,
  staffResolved?: PayloadStaffPerson[],
): DryRunPayloadV2 {
  const coaches = links.peopleModel.coaches;
  const coachCount = (name: string) => coachNames.get(name)
    ?? Array.from(coachNames.entries()).find(([n]) => nameKey(n) === nameKey(name))?.[1] ?? 0;
  // noise values (e.g. וינגייט) are excluded from the people model but ARE
  // candidates — appended with refs continuing the sequence, zero links
  const noise = Array.from(coachNames.keys()).filter(n => n === "וינגייט");
  return {
    version: 2,
    students: reportA.rows
      .filter(m => m.identity === "source_only" && m.file)
      .map((m, i) => ({
        ref: `st-${i}`,
        national_id: normalizeNid(m.file!.nid).nid,
        full_name: normSpace(`${m.file!.last} ${m.file!.first}`),
        class_name: m.file!.cls, sport: m.file!.sport,
        birth_year: birthYear(m.file!.birth),
      })),
    guardian_people: links.peopleModel.guardians.map(g => ({
      ref: g.ref, full_name: g.names[0] || "", name_variants: g.names,
      phone: g.phone, email: "", source_rows: g.sourceRows, lineage: "ספורטאים",
    })),
    guardian_links: links.peopleModel.guardians.flatMap(g =>
      g.entries.map((e, j) => ({
        ref: `${g.ref}-l${j}`, person_ref: g.ref,
        student_id: e.studentDbId, relationship_type: e.rel,
      }))),
    staff_people: staffResolved ?? staffFile.map((s, i) => ({
      ref: `sp-${i}`, full_name: s.name, phone: s.phone, email: s.email,
      planned_role: s.role, lineage: "צוות", source_row: s.row,
    })),
    coach_candidates: [
      ...coaches.map(c => ({ ref: c.ref, name: c.name, students_count: coachCount(c.name) })),
      ...noise.map((n, i) => ({ ref: `cc-${coaches.length + i}`, name: n, students_count: coachNames.get(n) || 0 })),
    ],
    coach_links: coaches.flatMap(c =>
      c.entries.map((e, j) => ({
        ref: `${c.ref}-l${j}`, candidate_ref: c.ref,
        student_id: e.studentDbId, role_type: "primary" as const,
      }))),
    conflicts: conflictKeys.map(key => ({ key })),
    decisions: Object.entries(decisions).map(([key, decision]) => ({ key, decision })),
    skipped_items: dbOnlyNames.map(label => ({ kind: "student_db_only", label })),
  };
}

export interface DryRunV2Counts {
  students: { new: number; existing: number; conflict: number; skipped: number };
  guardian_people: { new: number; existing: number; conflict: number; skipped: number };
  guardian_links: { new: number; unchanged: number; updates: number; historical: number; conflict: number; skipped: number };
  staff_people: { new: number; existing: number; possible_match: number; conflict: number; skipped: number };
  coach_candidates: { exact: number; possible_match: number; missing: number; noise: number; skipped: number };
  coach_links: { new: number; unchanged: number; updates: number; historical: number; conflict: number; skipped: number };
  conflicts: { decided: number; skipped: number; total: number };
}
/** counts the browser expects the v2 server dry-run to return; mirrors the
 *  server rules exactly (same normalization, same fuzzy rule) */
export function expectedDryRunV2(
  payload: DryRunPayloadV2, links: LinksReport, dbGuardians: DbGuardian[], dbStaff: DbStaffItem[],
): DryRunV2Counts {
  const dbGPhones = new Set(dbGuardians.map(g => digits(g.phone)).filter(Boolean));
  const dbStaffKeys = dbStaff.map(s => nameKey(s.full_name));
  const linkable = new Set(payload.guardian_links.filter(l => l.student_id).map(l => l.person_ref));
  const gp = { new: 0, existing: 0, conflict: 0, skipped: 0 };
  for (const p of payload.guardian_people) {
    if (p.name_variants.filter(n => normSpace(n)).length > 1) gp.conflict++;
    else if (p.phone && dbGPhones.has(p.phone)) gp.existing++;
    else if (linkable.has(p.ref)) gp.new++;
    else gp.skipped++;
  }
  // link expectations come from the preview classification, which already
  // compared every pair against the EXISTING links from get_all_people_links
  const li = (kind: "guardian" | "coach", c: LinkCategory) => links.items.filter(i => i.kind === kind && i.category === c).length;
  const gl = {
    new: li("guardian", "new"), unchanged: li("guardian", "unchanged"), updates: li("guardian", "update"),
    historical: li("guardian", "historical"), conflict: li("guardian", "conflict"), skipped: li("guardian", "unlinkable"),
  };
  const sp = { new: 0, existing: 0, possible_match: 0, conflict: 0, skipped: 0 };
  const seenStaff = new Set<string>();
  for (const s of payload.staff_people) {
    // distinct_seq encodes the explicit human "different people" decision
    const dk = nameKey(s.full_name) + "#" + (s.distinct_seq ?? 0);
    const k = nameKey(s.full_name);
    if (seenStaff.has(dk)) { sp.conflict++; continue; }
    seenStaff.add(dk);
    if (dbStaffKeys.some(d => d === k)) sp.existing++;
    else if (dbStaffKeys.some(d => nameFuzzy(d, k))) sp.possible_match++;
    else sp.new++;
  }
  const staffKeys = payload.staff_people.map(s => nameKey(s.full_name));
  const cc = { exact: 0, possible_match: 0, missing: 0, noise: 0, skipped: 0 };
  for (const c of payload.coach_candidates) {
    const k = nameKey(c.name);
    if (c.name === "וינגייט") cc.noise++;
    else if (staffKeys.includes(k) || dbStaffKeys.includes(k)) cc.exact++;
    else if (staffKeys.some(s => nameFuzzy(s, k)) || dbStaffKeys.some(s => nameFuzzy(s, k))) cc.possible_match++;
    else cc.missing++;
  }
  const cl = {
    new: li("coach", "new"), unchanged: li("coach", "unchanged"), updates: li("coach", "update"),
    historical: li("coach", "historical"), conflict: li("coach", "conflict"), skipped: li("coach", "unlinkable"),
  };
  const decided = payload.decisions.filter(d => d.decision === "link" || d.decision === "create").length;
  return {
    students: { new: payload.students.length, existing: 0, conflict: 0, skipped: 0 },
    guardian_people: gp, guardian_links: gl, staff_people: sp,
    coach_candidates: cc, coach_links: cl,
    conflicts: { decided, skipped: payload.conflicts.length - decided, total: payload.conflicts.length },
  };
}
/* ── 8d. staff duplicate groups + human resolution (stage 3D.3) ──
   The צוות tab holds the same person on several rows (different roles) and
   possibly different people sharing a name. NOTHING is merged by name
   alone: every group gets a human decision, and the default is
   "undecided → not imported" (the server keeps blocking that group). */
export interface StaffDupGroup {
  key: string;             // normalized-name key, stable per file
  name: string;
  rows: FileStaff[];       // all source rows in file order
  /** merge evidence: same non-empty phone/email supports "same person";
   *  DIFFERENT non-empty phones/emails strongly warn against merging */
  evidence: "supports_merge" | "warns_against_merge" | "none";
}
export type StaffDupDecision = "merge" | "separate" | "dedupe" | "skip" | "defer";
export function groupStaffDuplicates(staffFile: FileStaff[]): StaffDupGroup[] {
  const byKey = new Map<string, FileStaff[]>();
  for (const s of staffFile) {
    const k = nameKey(s.name);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(s);
  }
  const groups: StaffDupGroup[] = [];
  for (const [key, rows] of byKey) {
    if (rows.length < 2) continue;
    const phones = new Set(rows.map(r => digits(r.phone)).filter(Boolean));
    const emails = new Set(rows.map(r => r.email.toLowerCase()).filter(Boolean));
    const evidence: StaffDupGroup["evidence"] =
      phones.size > 1 || emails.size > 1 ? "warns_against_merge"
      : (phones.size === 1 && rows.filter(r => digits(r.phone)).length > 1)
        || (emails.size === 1 && rows.filter(r => r.email).length > 1) ? "supports_merge"
      : "none";
    groups.push({ key, name: rows[0].name, rows, evidence });
  }
  return groups;
}
export interface StaffResolution {
  people: PayloadStaffPerson[];
  /** conservation over the SOURCE rows: every row lands in exactly one bucket */
  stats: {
    sourceRows: number;      // all צוות rows
    canonical: number;       // person records actually sent in the payload
    mergedRows: number;      // rows folded into a merged person (same person)
    dedupedRows: number;     // duplicate rows dropped (same row twice)
    separateRows: number;    // rows kept as distinct people by decision
    skippedRows: number;     // rows excluded by a skip decision
    undecidedRows: number;   // rows of undecided/deferred groups (sent, still blocked)
    accounted: number; passed: boolean;
  };
}
export function resolveStaffPeople(
  staffFile: FileStaff[], decisions: Record<string, StaffDupDecision | undefined>,
): StaffResolution {
  const groups = new Map(groupStaffDuplicates(staffFile).map(g => [g.key, g]));
  const handled = new Set<string>();
  const people: PayloadStaffPerson[] = [];
  let mergedRows = 0, dedupedRows = 0, separateRows = 0, skippedRows = 0, undecidedRows = 0;
  let ref = 0;
  const push = (p: Omit<PayloadStaffPerson, "ref">) => people.push({ ref: `sp-${ref++}`, ...p });
  for (const s of staffFile) {
    const k = nameKey(s.name);
    const g = groups.get(k);
    if (!g) {
      push({ full_name: s.name, phone: s.phone, email: s.email, planned_role: s.role, lineage: "צוות", source_row: s.row });
      continue;
    }
    if (handled.has(k)) continue;
    handled.add(k);
    const d = decisions[k];
    if (d === "merge") {
      // ONE person, ALL distinct roles kept for staff_member_roles later
      const roles = Array.from(new Set(g.rows.map(r => r.role).filter(Boolean)));
      push({
        full_name: g.rows[0].name,
        phone: g.rows.find(r => digits(r.phone))?.phone || "",
        email: g.rows.find(r => r.email)?.email || "",
        planned_role: roles.join(" · ").slice(0, 120),
        lineage: "צוות", source_row: g.rows[0].row,
      });
      mergedRows += g.rows.length - 1;
    } else if (d === "dedupe") {
      const r0 = g.rows[0];
      push({ full_name: r0.name, phone: r0.phone, email: r0.email, planned_role: r0.role, lineage: "צוות", source_row: r0.row });
      dedupedRows += g.rows.length - 1;
    } else if (d === "separate") {
      g.rows.forEach((r, i) => {
        push({ full_name: r.name, phone: r.phone, email: r.email, planned_role: r.role, lineage: "צוות", source_row: r.row, distinct_seq: i });
      });
      separateRows += g.rows.length;
    } else if (d === "skip") {
      skippedRows += g.rows.length;
    } else {
      // undecided / deferred: rows are sent unresolved, the server keeps
      // blocking exactly this group. Undecided is never imported.
      for (const r of g.rows) {
        push({ full_name: r.name, phone: r.phone, email: r.email, planned_role: r.role, lineage: "צוות", source_row: r.row });
      }
      undecidedRows += g.rows.length;
    }
  }
  const dupRowsTotal = Array.from(groups.values()).reduce((n, g) => n + g.rows.length, 0);
  const plainRows = staffFile.length - dupRowsTotal;
  const canonical = people.length;
  // every source row in exactly one bucket:
  // plain rows + (merged: 1 canonical + folded) + (dedupe: 1 + dropped) +
  // separate rows + skipped rows + undecided rows
  const accounted = plainRows + mergedRows + dedupedRows + separateRows + skippedRows + undecidedRows
    + Array.from(groups.values()).filter(g => decisions[g.key] === "merge" || decisions[g.key] === "dedupe").length;
  return {
    people,
    stats: {
      sourceRows: staffFile.length, canonical, mergedRows, dedupedRows, separateRows,
      skippedRows, undecidedRows, accounted, passed: accounted === staffFile.length,
    },
  };
}

export const DRY_RUN_V2_DOMAINS: { key: keyof DryRunV2Counts; label: string }[] = [
  { key: "students", label: "תלמידים" },
  { key: "guardian_people", label: "הורים כאנשים" },
  { key: "guardian_links", label: "קשרי הורים" },
  { key: "staff_people", label: "אנשי צוות" },
  { key: "coach_candidates", label: "מועמדי מאמנים" },
  { key: "coach_links", label: "קשרי מאמנים" },
  { key: "conflicts", label: "קונפליקטים" },
];
export function compareDryRunV2(expected: DryRunV2Counts, server: Partial<DryRunV2Counts> | null | undefined): string[] {
  const out: string[] = [];
  for (const { key, label } of DRY_RUN_V2_DOMAINS) {
    const e = expected[key] as Record<string, number>;
    const s = (server?.[key] || null) as Record<string, number> | null;
    for (const k of Object.keys(e)) {
      if (e[k] !== (s ? s[k] : undefined)) out.push(`${label}/${k}: דפדפן ${e[k]} מול שרת ${s ? s[k] ?? "חסר" : "חסר"}`);
    }
  }
  return out;
}

/* ── 9. counts helper for section chips ── */
export function countBy<T extends { category: string }>(items: T[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const it of items) c[it.category] = (c[it.category] || 0) + 1;
  return c;
}
