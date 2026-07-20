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
const { matchIdentities, normalizeNid, parseAcademyBlocks, rawCellToNidString } = lib;

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

if (fail > 0) {
  console.error(`import-preview regression: ${fail} failures — build blocked.`);
  process.exit(1);
}
console.log(`import-preview regression: ${pass}/${pass} passed.`);
