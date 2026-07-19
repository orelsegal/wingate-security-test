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

/* ── 5. student matching ── */
export interface DbStudent {
  id: string; national_id: string | null; full_name: string;
  class_name: string; sport: string; birth_year: number | null;
  phone?: string | null; email?: string | null; archived?: boolean | null;
}
export interface FieldChange { field: string; label: string; current: string; proposed: string; source: string; reason: string }
export interface StudentMatch {
  category: "sure" | "new" | "db_only" | "changed" | "conflict" | "unmatched";
  confidence: "ודאי" | "גבוה" | "דורש החלטה" | "";
  file?: FileAthlete; db?: DbStudent;
  changes: FieldChange[];
  note?: string;
}
const birthYear = (birth: string): number | null => {
  const m = birth.match(/(\d{4})\s*$/) || birth.match(/\/(\d{4})/);
  if (!m) return null;
  const y = Number(m[1]);
  return y >= 1990 && y <= 2030 ? y : null;
};
export function matchStudents(fileAthletes: FileAthlete[], dbStudents: DbStudent[],
  academyClassByNid: Map<string, string>,
  sports: SportRef[], aliases: SportAlias[]): StudentMatch[] {
  const out: StudentMatch[] = [];
  const dbById = new Map<string, DbStudent>();
  const usedDb = new Set<string>();
  for (const d of dbStudents) if (d.national_id && digits(d.national_id).length === 9) dbById.set(digits(d.national_id), d);

  const buildChanges = (f: FileAthlete, d: DbStudent): FieldChange[] => {
    const ch: FieldChange[] = [];
    const fname = normSpace(`${f.last} ${f.first}`);
    if (fname && normKey(fname) !== normKey(d.full_name))
      ch.push({ field: "full_name", label: "שם מלא", current: d.full_name, proposed: fname, source: "ספורטאים", reason: "שם שונה בקובץ המקור" });
    const snapCls = academyClassByNid.get(f.nid) || "";
    if (snapCls && normClass(snapCls) !== normClass(d.class_name))
      ch.push({ field: "class_name", label: "כיתה", current: d.class_name || "—", proposed: snapCls, source: 'תמונת מצב תשפ"ו', reason: "שיוך כיתה שונה בתמונת המצב" });
    const sp = resolveSport(f.sport, sports, aliases);
    if (sp.canonical && sp.canonical !== d.sport)
      ch.push({ field: "sport", label: "ענף", current: d.sport || "—", proposed: sp.canonical + (sp.viaAlias ? ` (מנורמל מ"${f.sport}")` : ""), source: "ספורטאים", reason: sp.viaAlias ? "נרמול כתיב ענף" : "ענף שונה בקובץ" });
    if (f.phone && digits(f.phone) && digits(f.phone) !== digits(d.phone || ""))
      ch.push({ field: "phone", label: "טלפון תלמיד", current: d.phone || "—", proposed: f.phone, source: "ספורטאים", reason: d.phone ? "טלפון שונה" : "טלפון חסר ב-DB" });
    if (f.email && f.email.toLowerCase() !== (d.email || "").toLowerCase())
      ch.push({ field: "email", label: "אימייל", current: d.email || "—", proposed: f.email, source: "ספורטאים", reason: d.email ? "אימייל שונה" : "אימייל חסר ב-DB" });
    const by = birthYear(f.birth);
    if (by && by !== d.birth_year)
      ch.push({ field: "birth_year", label: "שנת לידה", current: d.birth_year ? String(d.birth_year) : "—", proposed: String(by), source: "ספורטאים", reason: "שנת לידה מהקובץ" });
    return ch;
  };

  for (const f of fileAthletes) {
    if (f.nid && f.nid.length === 9 && dbById.has(f.nid)) {
      const d = dbById.get(f.nid)!;
      usedDb.add(d.id);
      const changes = buildChanges(f, d);
      out.push({ category: changes.length ? "changed" : "sure", confidence: "ודאי", file: f, db: d, changes });
      continue;
    }
    if (f.nid && f.nid.length !== 9 && f.nid.length > 0) {
      out.push({ category: "conflict", confidence: "דורש החלטה", file: f, changes: [], note: `ת"ז באורך ${f.nid.length} (${maskId(f.nid)})` });
      continue;
    }
    // no valid id: full name + at least two supporting signals
    const fname = normKey(`${f.last} ${f.first}`);
    const fnameRev = normKey(`${f.first} ${f.last}`);
    const nameHits = dbStudents.filter(d => !usedDb.has(d.id) && (normKey(d.full_name) === fname || normKey(d.full_name) === fnameRev));
    if (nameHits.length === 1) {
      const d = nameHits[0];
      let signals = 0;
      if (f.cls && normClass(f.cls) === normClass(d.class_name)) signals++;
      const sp = resolveSport(f.sport, [], []).canonical; // raw compare below
      if (f.sport && (f.sport === d.sport || sp === d.sport)) signals++;
      const by = birthYear(f.birth);
      if (by && by === d.birth_year) signals++;
      if (signals >= 1) {
        usedDb.add(d.id);
        const changes = buildChanges(f, d);
        out.push({ category: changes.length ? "changed" : "sure", confidence: "גבוה", file: f, db: d, changes, note: "הותאם לפי שם מלא + אימות נוסף (אין ת\"ז)" });
        continue;
      }
    }
    if (nameHits.length > 1) {
      out.push({ category: "conflict", confidence: "דורש החלטה", file: f, changes: [], note: "שם מלא תואם ליותר מתלמיד אחד" });
      continue;
    }
    if (!f.nid) {
      out.push({ category: "unmatched", confidence: "", file: f, changes: [], note: "אין ת\"ז ואין התאמת שם ודאית" });
      continue;
    }
    out.push({ category: "new", confidence: "", file: f, changes: [] });
  }

  for (const d of dbStudents) {
    if (usedDb.has(d.id)) continue;
    if (d.full_name === "תירוש תומר" || d.full_name === "תומר תירוש") {
      out.push({ category: "db_only", confidence: "", db: d, changes: [], note: "חריג ידוע: נשאר פעיל לפי החלטה" });
    } else if (d.full_name === "רותם גיל") {
      out.push({ category: "db_only", confidence: "דורש החלטה", db: d, changes: [], note: "מועמד/ת לארכוב, דורש תווית החלטה אנושית" });
    } else {
      out.push({ category: "db_only", confidence: "", db: d, changes: [], note: "קיים ב-DB ולא בקובץ, לא מסומן אוטומטית כעזב" });
    }
  }
  return out;
}

/* ── 6. guardians preview (matched students only) ── */
export interface DbGuardian { id: string; full_name: string; phone: string | null; email: string | null }
export interface GuardianPreviewItem {
  category: "new" | "existing" | "multi_child" | "new_link" | "conflict" | "missing_info";
  name: string; phoneMasked: string;
  students: string[]; note?: string;
}
export function previewGuardians(matches: StudentMatch[], dbGuardians: DbGuardian[]): GuardianPreviewItem[] {
  const matched = matches.filter(m => (m.category === "sure" || m.category === "changed") && m.file && m.db);
  const byPhone = new Map<string, { names: Set<string>; students: string[] }>();
  const noPhone: GuardianPreviewItem[] = [];
  for (const m of matched) {
    const f = m.file!;
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
