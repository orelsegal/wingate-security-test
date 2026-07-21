/**
 * Regression tests for the import-preview matching core.
 * Runs as part of `npm run build` and FAILS the build when the matching
 * controls are violated. Synthetic fixtures only — zero PII.
 */
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import os from "os";
import fs from "fs";
import { build } from "esbuild";
const here = path.dirname(fileURLToPath(import.meta.url));
// transpile the TS lib with esbuild (already a vite dependency) so the
// test runs on any Node version, locally and on the build server
const tmp = path.join(os.tmpdir(), `importPreview-test-${Date.now()}.mjs`);
await build({
  entryPoints: [path.join(here, "../src/lib/importPreview.ts")],
  bundle: true, format: "esm", platform: "node", outfile: tmp, logLevel: "silent",
});
const lib = await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);
// student-360 pure logic (separate lib; "@/" alias resolved to src)
const tmp2 = path.join(os.tmpdir(), `student360-test-${Date.now()}.mjs`);
await build({
  entryPoints: [path.join(here, "../src/lib/student360.ts")],
  bundle: true, format: "esm", platform: "node", outfile: tmp2, logLevel: "silent",
  alias: { "@": path.join(here, "../src") },
});
const s360 = await import(pathToFileURL(tmp2).href);
fs.unlinkSync(tmp2);
// ops-board pure logic
const tmp3 = path.join(os.tmpdir(), `opsboard-test-${Date.now()}.mjs`);
await build({
  entryPoints: [path.join(here, "../src/lib/opsBoard.ts")],
  bundle: true, format: "esm", platform: "node", outfile: tmp3, logLevel: "silent",
  alias: { "@": path.join(here, "../src") },
});
const ops = await import(pathToFileURL(tmp3).href);
fs.unlinkSync(tmp3);
const { matchIdentities, normalizeNid, parseAcademyBlocks, rawCellToNidString, previewLinks, maskPhone, maskEmail,
        buildDryRunPayload, expectedDryRunCounts, compareDryRun,
        buildDryRunPayloadV2, expectedDryRunV2, compareDryRunV2, nameKey, nameFuzzy,
        groupStaffDuplicates, resolveStaffPeople,
        buildDecisionsDraft, parseDecisionsDraft, restoreDecisions, sha256Hex } = lib;

let pass = 0, fail = 0;
const t = (name, cond) => { cond ? pass++ : (fail++, console.error("REGRESSION FAIL:", name)); };

/* ── national-id normalization ── */
// valid 9-digit id (checksum ok): 123456782
t("valid id passes checksum", normalizeNid("123456782").valid === true);
t("bad checksum flagged", normalizeNid("123456789").valid === false);
// leading zero lost by numeric storage: 012345675 stored as 12345675 (8 digits)
t("leading zero restored", normalizeNid("12345675").nid === "012345675");
t("padded id matches original", normalizeNid("012345675").nid === normalizeNid("12345675").nid);
t("6 digits not padded to 9", normalizeNid("123456").nid.length !== 9);

/* ── raw national-id cell recovery (date-formatted ת"ז cells) ── */
t("raw number → plain string, no sci-notation", rawCellToNidString(338009897) === "338009897");
t("raw large number no sci-notation", rawCellToNidString(1234567890) === "1234567890");
t("raw string passes through", rawCellToNidString(" 220002885 ") === "220002885");
t("raw error/empty → invalid", rawCellToNidString(undefined) === "" && normalizeNid(rawCellToNidString("")).valid === false);
{
  // synthetic snapshot: formatted read lost the id (date-formatted cell),
  // raw read has the real number; plus lost leading zero, 10-digit id,
  // #VALUE! and empty cells
  const header = ["", "שם משפחה", "שם פרטי", "ענף", "טלפון", 'דוא"ל', "תאריך לידה", 'ת"ז', "מגדר", "L", "F", "כיתה", "מאמן",
                  "", "", "שם משפחה", "שם", "ענף", "טלפון", 'דוא"ל', "תאריך לידה", "ת.ז.", "מגדר", "L", "F", "כיתה", "מאמן"];
  const fmt = [
    [], ["", "בלוק א"], header,
    ["1", "אלף", "א", "סיוף", "", "", "", "", "f", "", "", "ט", ""],            // date-formatted: formatted value EMPTY
    ["2", "בית", "ב", "סיוף", "", "", "", "", "f", "", "", "ט", ""],            // formatted empty, raw has lost leading zero
    ["3", "גימל", "ג", "סיוף", "", "", "", "0336552379", "f", "", "", "ט", ""], // 10 digits — must stay invalid
    ["4", "דלת", "ד", "סיוף", "", "", "", "#VALUE!", "f", "", "", "ט", ""],
    ["5", "הא", "ה", "סיוף", "", "", "", "", "f", "", "", "ט", ""],             // truly empty everywhere
  ];
  const raw = [
    [], [], [],
    ["1", "אלף", "א", "", "", "", "", 123456782, "f"],
    ["2", "בית", "ב", "", "", "", "", 12345675, "f"],
    ["3", "גימל", "ג", "", "", "", "", "0336552379", "f"],
    ["4", "דלת", "ד", "", "", "", "", "#VALUE!", "f"],
    ["5", "הא", "ה", "", "", "", "", "", "f"],
  ];
  const { students } = parseAcademyBlocks(fmt, raw);
  const byLast = (l) => students.find(s => s.last === l);
  t("raw beats empty formatted", byLast("אלף")?.nid === "123456782" && byLast("אלף")?.nid_lineage === "raw");
  t("lost leading zero recovered via normalizeNid", normalizeNid(byLast("בית")?.nid).nid === "012345675");
  t("10-digit id stays invalid (not truncated)", normalizeNid(byLast("גימל")?.nid).nid.length === 10 && normalizeNid(byLast("גימל")?.nid).valid === false);
  t("#VALUE! stays invalid", normalizeNid(byLast("דלת")?.nid).valid === false && byLast("דלת")?.nid === "");
  t("empty stays invalid", byLast("הא")?.nid === "");
  t("no raw sheet → formatted fallback lineage", parseAcademyBlocks(fmt).students[0].nid_lineage === "formatted");
}

/* ── identity vs field-changes separation ── */
const sports = [{ id: "sp1", sport_name: "סיוף" }];
const aliases = [{ alias_normalized: "סייף", sport_id: "sp1" }];
const db = [
  // id stored without leading zero, missing phone/email — classic drift
  { id: "d1", national_id: "12345675", full_name: "כהן דנה", class_name: "ט", sport: "סיוף", birth_year: 2010, phone: null, email: null },
  // no id in DB — must still match by name+signal (strong)
  { id: "d2", national_id: null, full_name: "לוי רון", class_name: "יא 1", sport: "סיוף", birth_year: 2009 },
  { id: "d3", national_id: "123456782", full_name: "תומר תירוש", class_name: "—", sport: "אחר", birth_year: null },
];
const file = [
  { first: "דנה", last: "כהן", nid: "012345675", cls: "ט", sport: "סייף", birth: "01/01/2010", phone: "050-1", email: "a@t" },
  { first: "רון", last: "לוי", nid: "", cls: "יא1", sport: "סיוף", birth: "02/02/2009", phone: "", email: "" },
  { first: "חדש", last: "לגמרי", nid: "", cls: "", sport: "", birth: "", phone: "", email: "" },
  { first: "בעיה", last: "תז", nid: "12345", cls: "", sport: "", birth: "", phone: "", email: "" },
];
const r = matchIdentities(file, db, { sports, aliases, sourceLabel: "בדיקה" });

// CONTROL 1: identity buckets never demoted by field changes
const d1row = r.rows.find(x => x.db?.id === "d1");
t("padded-id match is EXACT despite changes", d1row?.identity === "exact");
t("changes attached, not a category", (d1row?.changes.length || 0) >= 1);

// CONTROL 2: strong requires name + supporting signal (normalized class counts)
t("name+signal match is STRONG", r.rows.find(x => x.db?.id === "d2")?.identity === "strong");

// CONTROL 3: never match by name alone / bad ids go to human review
t("unknown row is source_only", r.rows.some(x => x.identity === "source_only" && x.file?.first === "חדש"));
t("malformed id needs human review", r.rows.some(x => x.identity === "human_review" && x.file?.first === "בעיה"));

// CONTROL 4: conservation — every file row and every DB row in exactly one bucket
t("controls passed", r.controls.passed === true);
t("file coverage exact", r.controls.fileCovered === file.length);
t("db coverage exact", r.controls.dbCovered === db.length);
t("db-only present", r.rows.some(x => x.identity === "db_only" && x.db?.id === "d3"));
t("counts consistent", r.counts.exact + r.counts.strong === r.counts.confident
  && r.counts.confident + r.counts.source_only + r.counts.human_review
     === file.length + (r.rows.filter(x => x.identity === "human_review" && !x.file).length)
  );

// CONTROL 5: same-id-different-name is never silently merged
const r2 = matchIdentities(
  [{ first: "אחר", last: "שם", nid: "123456782", cls: "", sport: "", birth: "", phone: "", email: "" }],
  [{ id: "d9", national_id: "123456782", full_name: "פלוני אלמוני", class_name: "", sport: "", birth_year: null }],
  { sports, aliases, sourceLabel: "בדיקה" },
);
t("same id, different name → human review", r2.rows.some(x => x.identity === "human_review" && x.db?.id === "d9"));
t("conflict pair still covers both sides", r2.controls.passed === true);

/* ── links preview: classification vs existing links + conservation ── */
{
  const mkRow = (identity, dbId, dbName, athlete) => ({
    identity, db: dbId ? { id: dbId, full_name: dbName } : undefined, file: athlete, changes: [],
  });
  const rows = [
    // matched student, mother has active identical link → unchanged
    mkRow("exact", "s1", "כהן דנה", { first: "דנה", last: "כהן", father: "", father_phone: "", mother: "רות", mother_phone: "0501111111", coach: "לוי יוסי" }),
    // matched student, father link exists but with different type in DB → update
    mkRow("exact", "s2", "לוי רון", { first: "רון", last: "לוי", father: "משה", father_phone: "0502222222", mother: "", mother_phone: "", coach: "לוי יוסי" }),
    // matched student, guardian exists in DB but link was CLOSED → historical
    mkRow("strong", "s3", "מזרחי גל", { first: "גל", last: "מזרחי", father: "דוד", father_phone: "0503333333", mother: "", mother_phone: "", coach: "כהן אבי" }),
    // matched student, guardian not in DB → new
    mkRow("exact", "s4", "פרץ טל", { first: "טל", last: "פרץ", father: "יעקב", father_phone: "0504444444", mother: "", mother_phone: "", coach: "" }),
    // UNMATCHED student → parent + coach are unlinkable
    mkRow("source_only", null, null, { first: "חדש", last: "לגמרי", father: "אבא", father_phone: "0505555555", mother: "", mother_phone: "", coach: "לוי יוסי" }),
    // same phone, two different parent names → conflict (דוד/סבטלנה case)
    mkRow("exact", "s6", "ברק עדן", { first: "עדן", last: "ברק", father: "דוד", father_phone: "0509999999", mother: "", mother_phone: "", coach: "" }),
    mkRow("exact", "s7", "ברק נועם", { first: "נועם", last: "ברק", father: "סבטלנה", father_phone: "0509999999", mother: "", mother_phone: "", coach: "" }),
  ];
  const dbGuardians = [
    { id: "g1", full_name: "רות כהן", phone: "0501111111", email: null },
    { id: "g2", full_name: "משה לוי", phone: "0502222222", email: null },
    { id: "g3", full_name: "דוד מזרחי", phone: "0503333333", email: null },
  ];
  const dbStaff = [{ id: "m1", full_name: "לוי יוסי", roles: ["coach"] }];
  const existing = {
    guardian_links: [
      { link_id: "L1", guardian_id: "g1", student_id: "s1", relationship_type: "mother", active: true },
      { link_id: "L2", guardian_id: "g2", student_id: "s2", relationship_type: "guardian", active: true },
      { link_id: "L3", guardian_id: "g3", student_id: "s3", relationship_type: "father", active: false },
      // active link in DB that the file does not mention → db_only, never auto-closed
      { link_id: "L4", guardian_id: "g1", student_id: "s9", relationship_type: "mother", active: true },
    ],
    coach_links: [
      { assignment_id: "A1", staff_member_id: "m1", student_id: "s1", role_type: "primary", active: true },
    ],
  };
  const lr = previewLinks(rows, dbGuardians, dbStaff, existing, new Map([["s9", "אחר מישהו"]]));
  const cat = (k, c) => lr.items.filter(i => i.kind === k && i.category === c).length;
  t("existing identical link → unchanged", cat("guardian", "unchanged") === 1);
  t("existing link with different type → update", cat("guardian", "update") === 1);
  t("closed link → historical, not silently reopened", cat("guardian", "historical") === 1);
  t("guardian not in DB → new", cat("guardian", "new") === 1);
  t("unmatched student parent → unlinkable", cat("guardian", "unlinkable") === 1);
  t("same phone different names → conflict on both", cat("guardian", "conflict") === 2);
  t("active DB link not in file → db_only", cat("guardian", "db_only") === 1);
  t("coach active assignment → unchanged", cat("coach", "unchanged") === 1);
  t("coach for unmatched student → unlinkable", cat("coach", "unlinkable") === 1);
  t("coach not in staff → new", cat("coach", "new") >= 1);
  // conservation: every planned pair covered once, every existing ACTIVE link covered once
  t("links conservation passed", lr.controls.passed === true);
  t("planned fully covered", lr.controls.plannedCovered === lr.controls.plannedTotal);
  t("existing active fully covered", lr.controls.existingCovered === lr.controls.existingActiveTotal && lr.controls.existingActiveTotal === 4);
  // counts: guardians vs links are separate numbers
  t("unique guardians counted once per phone", lr.guardians.unique === 6);
  t("unlinkable guardian counted", lr.guardians.unlinkable === 1);
  t("guardian conflicts counted once per guardian", lr.guardians.conflicts === 1);
  t("planned guardian links counted per pair", lr.guardians.plannedLinks === 7);
  // RPC not applied yet → everything classifies as new, conservation still holds
  const lr0 = previewLinks(rows, [], [], null);
  t("no existing data → no unchanged/update/db_only", lr0.items.every(i => !["unchanged", "update", "historical", "db_only"].includes(i.category)));
  t("no existing data → conservation still passes", lr0.controls.passed === true);
  // masking helpers never leak full values
  t("maskPhone hides middle digits", maskPhone("0501234567") === "050***67");
  t("maskEmail keeps first char only", maskEmail("parent@mail.com") === "p***");

  /* ── server dry-run: payload builder + browser expectation + compare ── */
  // planned arrays include exactly the importable pairs (no conflict/unlinkable)
  t("planned guardian links exclude conflict+unlinkable",
    lr.planned.guardianLinks.length === cat("guardian", "new") + cat("guardian", "unchanged") + cat("guardian", "update") + cat("guardian", "historical"));
  t("planned coach links exclude unlinkable",
    lr.planned.coachLinks.length === cat("coach", "new") + cat("coach", "unchanged") + cat("coach", "update") + cat("coach", "historical"));
  t("planned links carry db student ids", lr.planned.guardianLinks.every(g => typeof g.studentId === "string" && g.studentId.length > 0));
  const fakeReportA = { rows: [
    { identity: "source_only", file: { first: "א", last: "ב", nid: "987654325", cls: "י", sport: "סיוף", birth: "01/01/2010", phone: "", email: "" }, changes: [] },
    { identity: "exact", file: { first: "ג", last: "ד", nid: "123456782", cls: "ט", sport: "", birth: "", phone: "", email: "" }, db: { id: "x" }, changes: [] },
  ], counts: { source_only: 1 } };
  const payload = buildDryRunPayload(fakeReportA, lr, ["A-0", "B-0"], { "A-0": "link" });
  t("payload holds only source_only students", payload.students.length === 1 && payload.students[0].birth_year === 2010);
  t("payload carries conflict cases + decisions", payload.conflicts.length === 2 && payload.decisions.length === 1);
  t("payload version pinned", payload.version === 1);
  const exp = expectedDryRunCounts(fakeReportA, lr, 2, { "A-0": "link" });
  t("expected: decided counts as conflict, rest skipped", exp.conflicts === 1 && exp.skipped === 1);
  t("expected new = students + new links", exp.new === 1 + cat("guardian", "new") + cat("coach", "new"));
  t("compare: identical → no mismatches", compareDryRun(exp, { ...exp }).length === 0);
  t("compare: server drift detected", compareDryRun(exp, { ...exp, new: exp.new + 1 }).length === 1);
  t("compare: missing server counts detected", compareDryRun(exp, undefined).length === 6);

  /* ── payload VERSION 2: explicit people entities + refs ── */
  const staffFile = [{ name: "לוי יוסי", role: "מאמן סיוף", phone: "", email: "", row: 4 }];
  const coachNames = new Map([["לוי יוסי", 2], ["כהן אבי", 1], ["וינגייט", 3]]);
  const p2 = buildDryRunPayloadV2(fakeReportA, lr, staffFile, coachNames, ["פלוני עוזב"], ["A-0", "B-0"], { "A-0": "link" });
  t("v2 version pinned", p2.version === 2);
  t("v2 people are explicit: ALL unique guardians present (incl. unlinkable)",
    p2.guardian_people.length === lr.guardians.unique);
  t("v2 guardian links include unlinkable pairs",
    p2.guardian_links.length === lr.guardians.plannedLinks
    && p2.guardian_links.some(l => l.student_id === null));
  t("v2 every link references an in-payload person ref",
    p2.guardian_links.every(l => p2.guardian_people.some(p => p.ref === l.person_ref)));
  t("v2 person refs unique",
    new Set(p2.guardian_people.map(p => p.ref)).size === p2.guardian_people.length);
  {
    // one person (same phone) linked to two children = ONE person record, TWO links
    const multi = p2.guardian_people.find(p => p2.guardian_links.filter(l => l.person_ref === p.ref).length === 2);
    t("v2 one parent two children = one person, two links",
      !!multi && p2.guardian_people.filter(p => p.phone === multi.phone).length === 1);
  }
  t("v2 coach candidates carry noise separately",
    p2.coach_candidates.some(c => c.name === "וינגייט")
    && p2.coach_candidates.length === lr.coaches.unique + 1);
  t("v2 coach links reference candidate refs",
    p2.coach_links.every(l => p2.coach_candidates.some(c => c.ref === l.candidate_ref)));
  t("v2 skipped_items carry db-only students", p2.skipped_items.length === 1 && p2.skipped_items[0].kind === "student_db_only");
  const exp2 = expectedDryRunV2(p2, lr, [], [{ id: "m1", full_name: "לוי יוסי", roles: ["coach"] }]);
  t("v2 people conservation: new+existing+conflict+skipped = unique",
    exp2.guardian_people.new + exp2.guardian_people.existing + exp2.guardian_people.conflict + exp2.guardian_people.skipped
      === p2.guardian_people.length);
  t("v2 link conservation: all six buckets = links total",
    exp2.guardian_links.new + exp2.guardian_links.unchanged + exp2.guardian_links.updates
      + exp2.guardian_links.historical + exp2.guardian_links.conflict + exp2.guardian_links.skipped
      === p2.guardian_links.length);
  t("v2 unlinkable person is skipped, not created",
    exp2.guardian_people.skipped >= 1);
  t("v2 candidate exact vs staff", exp2.coach_candidates.exact >= 1);
  t("v2 candidate noise counted", exp2.coach_candidates.noise === 1);
  t("v2 conflicts: decided vs skipped", exp2.conflicts.decided === 1 && exp2.conflicts.skipped === 1);
  t("v2 compare: identical → clean", compareDryRunV2(exp2, { ...exp2 }).length === 0);
  t("v2 compare: domain drift detected",
    compareDryRunV2(exp2, { ...exp2, guardian_people: { ...exp2.guardian_people, new: exp2.guardian_people.new + 1 } }).length === 1);
  t("v2 compare: missing server → all domains flagged", compareDryRunV2(exp2, null).length > 20);
  t("nameFuzzy: containment matches", nameFuzzy(nameKey("אברהם לוי"), nameKey("אברהם לוי-כהן")) === true);
  t("nameFuzzy: unrelated names do not match", nameFuzzy(nameKey("אברהם לוי"), nameKey("צבי מור")) === false);
}

/* ── staff duplicate groups + human resolution (stage 3D.3) ── */
{
  const staff = [
    { name: "יחיד רגיל", role: "מורה", phone: "0501", email: "", row: 4 },
    { name: "כפול מזג", role: "תזונאי", phone: "0521111111", email: "", row: 5 },
    { name: "כפול מזג", role: "תזונאי בכיר", phone: "0521111111", email: "", row: 9 },
    { name: "כפול נפרד", role: "מחנך", phone: "0531111111", email: "", row: 6 },
    { name: "כפול נפרד", role: "מאמן", phone: "0532222222", email: "", row: 11 },
    { name: "כפול זהה", role: "תזונאית", phone: "", email: "", row: 7 },
    { name: "כפול זהה", role: "תזונאית", phone: "", email: "", row: 12 },
    { name: "כפול דלג", role: "אחר", phone: "", email: "", row: 8 },
    { name: "כפול דלג", role: "אחר ב", phone: "", email: "", row: 13 },
    { name: "כפול פתוח", role: "א", phone: "", email: "", row: 10 },
    { name: "כפול פתוח", role: "ב", phone: "", email: "", row: 14 },
  ];
  const groups = groupStaffDuplicates(staff);
  t("groups counted per NAME, not per row", groups.length === 5);
  t("same phone in group → merge-supporting evidence", groups.find(g => g.name === "כפול מזג")?.evidence === "supports_merge");
  t("different phones in group → strong warning", groups.find(g => g.name === "כפול נפרד")?.evidence === "warns_against_merge");
  const key = (n) => groups.find(g => g.name === n).key;
  const res = resolveStaffPeople(staff, {
    [key("כפול מזג")]: "merge", [key("כפול נפרד")]: "separate",
    [key("כפול זהה")]: "dedupe", [key("כפול דלג")]: "skip",
    // "כפול פתוח" intentionally undecided
  });
  const byName = (n) => res.people.filter(p => p.full_name === n);
  t("merge → one person with ALL roles kept", byName("כפול מזג").length === 1 && byName("כפול מזג")[0].planned_role === "תזונאי · תזונאי בכיר");
  t("separate → two people with distinct_seq", byName("כפול נפרד").length === 2
    && byName("כפול נפרד")[0].distinct_seq === 0 && byName("כפול נפרד")[1].distinct_seq === 1);
  t("dedupe → one row kept, no distinct_seq", byName("כפול זהה").length === 1 && byName("כפול זהה")[0].distinct_seq === undefined);
  t("skip → group not sent at all", byName("כפול דלג").length === 0);
  t("undecided → rows sent unresolved (server keeps blocking)", byName("כפול פתוח").length === 2
    && byName("כפול פתוח").every(p => p.distinct_seq === undefined));
  t("plain person untouched", byName("יחיד רגיל").length === 1);
  // conservation: every source row in exactly one bucket
  const s = res.stats;
  t("staff conservation accounts every source row once",
    s.passed && s.sourceRows === 11 && s.canonical === 7 && s.mergedRows === 1
    && s.dedupedRows === 1 && s.separateRows === 2 && s.skippedRows === 2 && s.undecidedRows === 2);
  t("canonical + folded + skipped = source rows",
    s.canonical + s.mergedRows + s.dedupedRows + s.skippedRows === s.sourceRows);
  // expectation mirrors the server dedup key: separate pair is NOT conflict
  const base = { rows: [], counts: { source_only: 0 } };
  const emptyLinks = previewLinks([], [], [], null);
  const pp = buildDryRunPayloadV2(base, emptyLinks, staff, new Map(), [], [], {}, res.people);
  const ee = expectedDryRunV2(pp, emptyLinks, [], []);
  t("resolved payload → zero staff conflicts expected", ee.staff_people.conflict === 1 /* only the undecided pair */
    && pp.staff_people.filter(p => p.distinct_seq !== undefined).length === 2);
}

/* ── decisions draft: save, validate, restore (stage 3D.4) ── */
{
  const fp = await sha256Hex("workbook-basis-a");
  const fp2 = await sha256Hex("workbook-basis-b");
  t("workbook fingerprint is stable", fp === await sha256Hex("workbook-basis-a"));
  t("changed workbook → different fingerprint", fp !== fp2 && fp.length === 64);
  const draft = buildDecisionsDraft(fp, "import-preview-3d.4",
    { "A-0": "link", "B-3": "skip", "GONE-9": "create" },
    { "כפולמזג": "merge", "נעלם": "separate" });
  const text = JSON.stringify(draft);
  // PII guard: the draft never carries an id, phone or email
  t("draft has no 9-digit id", !/\d{9}/.test(text));
  t("draft has no phone number", !/05\d{8}/.test(text));
  t("draft has no email", !text.includes("@"));
  // roundtrip
  const parsed = parseDecisionsDraft(text);
  t("draft roundtrip parses", parsed.ok === true && parsed.draft.workbook_fingerprint === fp);
  const res = restoreDecisions(parsed.draft, ["A-0", "B-3", "C-1"], ["כפולמזג"]);
  t("same keys restored exactly", res.conflict["A-0"] === "link" && res.conflict["B-3"] === "skip"
    && res.staff["כפולמזג"] === "merge" && res.restored === 3);
  t("decision for a key that no longer exists is NOT applied",
    res.notFound === 2 && !("GONE-9" in res.conflict) && !("נעלם" in res.staff));
  t("unresolved keys stay undecided", !("C-1" in res.conflict));
  // corrupt / foreign / wrong-version files are refused with a clear error
  t("corrupt JSON refused", parseDecisionsDraft("{not json").ok === false
    && parseDecisionsDraft("{not json").error === "invalid_json");
  t("foreign JSON refused", parseDecisionsDraft('{"hello":1}').error === "unsupported_kind");
  t("unsupported version refused",
    parseDecisionsDraft(JSON.stringify({ ...draft, version: 99 })).error === "unsupported_version");
  t("missing fingerprint refused",
    parseDecisionsDraft(JSON.stringify({ ...draft, workbook_fingerprint: "short" })).error === "missing_fingerprint");
  // a different-workbook draft is detected by the caller via fingerprint diff
  t("different workbook detected by fingerprint", draft.workbook_fingerprint !== fp2);
  // invalid decision values are dropped, not applied
  const bad = parseDecisionsDraft(JSON.stringify(buildDecisionsDraft(fp, "x", { "A-0": "hack" }, {})));
  t("invalid decision value never applied",
    bad.ok && restoreDecisions(bad.draft, ["A-0"], []).restored === 0);
}

/* ── student 360: legacy coach merge + relationship events (stage 4A) ── */
{
  const { mergeCoaches, relationshipEvents } = s360;
  const relCoach = (name, active, role = "primary", from = "2026-01-01", to = null) =>
    ({ full_name: name, role_type: role, active, active_from: from, active_to: to });
  // legacy only → one row, clearly sourced
  let m = mergeCoaches("לוי יוסי", []);
  t("360: legacy-only coach shown once with legacy source",
    m.current.length === 1 && m.current[0].sources.length === 1 && m.current[0].sources[0] === "legacy");
  // same coach in legacy AND managed link → ONE row, both sources
  m = mergeCoaches("לוי יוסי", [relCoach("לוי  יוסי", true)]);
  t("360: same coach never appears twice",
    m.current.length === 1 && m.current[0].sources.length === 2);
  // different people → two rows, legacy kept (never dropped)
  m = mergeCoaches("כהן אבי", [relCoach("לוי יוסי", true)]);
  t("360: legacy coach kept alongside managed coach",
    m.current.length === 2 && m.current.some(c => c.sources[0] === "legacy"));
  // historical links stay separate
  m = mergeCoaches(null, [relCoach("לוי יוסי", false, "primary", "2025-01-01", "2025-06-01")]);
  t("360: historical assignment separated from current",
    m.current.length === 0 && m.historical.length === 1 && m.historical[0].activeTo === "2025-06-01");
  // events derived from real dates only, newest first
  const ev = relationshipEvents({
    student_id: "s", guardians: [
      { full_name: "הורה א", relationship_type: "mother", active_from: "2026-02-01", active_to: null },
    ],
    coaches: [relCoach("לוי יוסי", false, "primary", "2026-01-01", "2026-03-01")],
  });
  t("360: relationship events sorted newest first",
    ev.length === 3 && ev[0].date === "2026-03-01" && ev[2].date === "2026-01-01");
  t("360: no relationships → no invented events", relationshipEvents(null).length === 0);
}

/* ── ops board: real, scoped alerts only (stage 4B) ── */
{
  const { computeOpsAlerts, opsAlertCount } = ops;
  const students = [
    { id: "s1", full_name: "אחת דמה", class_name: "ט", sport: "סיוף", national_id: "123456782", assigned_coach: "לוי יוסי" },
    { id: "s2", full_name: "שתיים דמה", class_name: "י", sport: "סיוף", national_id: "12345674", assigned_coach: "" },
    { id: "s3", full_name: "שלוש דמה", class_name: "", sport: "סיוף", national_id: "", assigned_coach: "" },
    { id: "s4", full_name: "ארבע דמה", class_name: "ט", sport: "סיוף", national_id: "123456789", assigned_coach: "", archived: true },
  ];
  const statuses = [
    { student_id: "s2", status: "yellow", status_note: "מעקב" },
    { student_id: "s1", status: "red", status_note: null },
    { student_id: "s9", status: "red", status_note: "לא קיים" }, // unknown id → dropped
  ];
  const links = {
    guardian_links: [{ student_id: "s1", active: true }, { student_id: "s3", active: false }],
    coach_links: [{ student_id: "s2", active: true }],
  };
  const a = computeOpsAlerts(students, statuses, links);
  t("ops: red sorts before yellow, unknown ids dropped",
    a.attention.length === 2 && a.attention[0].status === "red" && a.attention[0].name === "אחת דמה");
  t("ops: managed coach link clears the no-coach alert",
    a.noCoach.length === 1 && a.noCoach[0].id === "s3");
  t("ops: inactive guardian link does not count",
    a.noGuardians.length === 2 && a.noGuardians.every(x => ["s2", "s3"].includes(x.id)));
  t("ops: archived students excluded from alerts and counted separately",
    a.activeCount === 3 && a.archivedCount === 1 && !a.noCoach.some(x => x.id === "s4"));
  t("ops: invalid or missing national id flagged (valid + padded pass)",
    a.invalidNid.length === 1 && a.invalidNid[0].id === "s3");
  t("ops: alert count sums visible domains", opsAlertCount(a) === 2 + 1 + 2 + 1);
  // no links source (non-owner): guardians domain is null, not zero
  const b = computeOpsAlerts(students, null, null);
  t("ops: without links source guardians domain is null and coach falls back to legacy",
    b.noGuardians === null && b.noCoach.length === 2 && opsAlertCount(b) === 0 + 2 + 0 + 1);
  t("ops: normal links state is not bootstrap", a.bootstrap === false && b.bootstrap === false);

  // bootstrap: links readable but COMPLETELY empty (import not done yet)
  const boot = computeOpsAlerts(students, null, { guardian_links: [], coach_links: [] });
  t("ops: empty link tables → bootstrap, mass alerts suppressed",
    boot.bootstrap === true && boot.noCoach.length === 0 && boot.noGuardians === null);
  t("ops: bootstrap keeps invalid-nid alert untouched", boot.invalidNid.length === 1);
  t("ops: bootstrap contributes zero to the open-alert count", opsAlertCount(boot) === 1);
  // a real legacy assigned_coach is a coach in every state
  const withLegacy = computeOpsAlerts(
    [{ id: "s1", full_name: "אחת דמה", class_name: "ט", sport: "סיוף", national_id: "123456782", assigned_coach: "לוי יוסי" }],
    null, { guardian_links: [], coach_links: [] });
  t("ops: legacy coach never counted as missing", withLegacy.noCoach.length === 0);
  // the FIRST imported link ends bootstrap and resumes real classification
  const resumed = computeOpsAlerts(students, null,
    { guardian_links: [{ student_id: "s1", active: true }], coach_links: [] });
  t("ops: one imported link resumes normal alerts",
    resumed.bootstrap === false && resumed.noGuardians.length === 2 && resumed.noCoach.length === 2);
}

if (fail > 0) {
  console.error(`import-preview regression: ${fail} failures — build blocked.`);
  process.exit(1);
}
console.log(`import-preview regression: ${pass}/${pass} passed.`);
