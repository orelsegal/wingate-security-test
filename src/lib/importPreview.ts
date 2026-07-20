/** Import-Preview core (stage 3C). Pure, dependency-free logic over
 *  arrays-of-arrays extracted from the workbook in the browser.
 *  Nothing here talks to the network or stores anything. */

export type AOA = string[][];

/* ── generic helpers ── */
export const digits = (v: string | null | undefined) => (v || "").replace(/\D/g, "");
export const normSpace = (v: string | null | undefined) => (v || "").replace(/\s+/g, " ").trim();
export const normClass = (v: string | null | undefined) => (v || "").replace(/[\s'׳"״]/g, "");
export const maskId = (nid: string) => (nid.length >= 5 ? nid.slice(0, 3) + "***" + nid.slice(-1) : "***");
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

/* ── 1. block extraction from an academy-snapshot sheet ──
   Blocks are detected by every "שם משפחה" header cell; per block the record
   number column is header-1 and fields sit at fixed offsets. Rows are
   accepted only when the number equals the next expected value (internal
   blank/separator rows are skipped, helper tables never match). */
export interface FileStudent {
  first: string; last: string; sport: string; phone: string; email: string;
  birth: string; nid: string; gender: string; cls: string; coach: string;
  source_block: string; row: number;
}
export function parseAcademyBlocks(aoa: AOA): { students: FileStudent[]; blocks: { title: string; count: number }[] } {
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
      students.push({
        last, first,
        sport: normSpace(row[c + 2]), phone: normSpace(row[c + 3]), email: normSpace(row[c + 4]),
        birth: normSpace(row[c + 5]), nid: digits(row[c + 6]), gender: normSpace(row[c + 7]).toLowerCase(),
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
export interface FileStaff { name: string; role: string; phone: string; email: string }
const OFFICE_WORDS = ["מזכירות", "פקס", "חדר", "מוקד", "אקדמיה", "שער", "מרפאה"];
export function parseStaffSheet(aoa: AOA): FileStaff[] {
  const out: FileStaff[] = [];
  for (let r = 3; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const name = normSpace(row[0]);
    if (!name) continue;
    const role = normSpace(row[2]);
    if (role === "פקס" || OFFICE_WORDS.some(w => name.includes(w))) continue;
    out.push({ name, role, phone: normSpace(row[1]), email: normSpace(row[3]) });
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
const birthYear = (birth: string): number | null => {
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

/* ── 8. counts helper for section chips ── */
export function countBy<T extends { category: string }>(items: T[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const it of items) c[it.category] = (c[it.category] || 0) + 1;
  return c;
}
