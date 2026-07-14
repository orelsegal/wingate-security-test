import { bagrutColumns } from "@/data/bagrutColumns";

/** Shared bagrut-roadmap view logic: turn a student's verbatim sheet row
 *  (section + values) into subject-grouped rows — one per original column.
 *  No interpretation, no aggregation, no representative grade. */

const KW: { name: string; kw: string[] }[] = [
  { name: "תנ״ך", kw: ["תנך", 'תנ"ך', "תנ״ך"] },
  { name: "ספרות", kw: ["ספרות"] },
  { name: "לשון", kw: ["לשון"] },
  { name: "היסטוריה", kw: ["היסטוריה"] },
  { name: "אזרחות", kw: ["אזרחות"] },
  { name: "אנגלית", kw: ["אנגלית", "E ", "שאלון G", "COBE", "שאלון F"] },
  { name: "מתמטיקה", kw: ["מתמטיקה"] },
  { name: "חינוך גופני", kw: ["חינוך גופני"] },
];
const ORDER = [...KW.map(k => k.name), "אחר"];
const ID_COLS = ["#", "שם משפחה", "שם פרטי", "שם", 'ת"ז', "תעודת זהות", "ענף", "כיתה", "‏"];
const subjOf = (h: string) => { for (const s of KW) if (s.kw.some(k => h.includes(k))) return s.name; return "אחר"; };

export interface BagrutItem { label: string; value: string }
export interface BagrutGroup { subject: string; items: BagrutItem[] }

/** civicsDetails: the student_subject_progress.details jsonb for אזרחות (from the civics file). */
export function groupBagrut(
  section: string | undefined,
  values: (string | null)[] | undefined,
  civicsDetails?: Record<string, string | null> | null,
): BagrutGroup[] {
  const cols = (section && bagrutColumns[section]) || [];
  const groups: Record<string, BagrutItem[]> = {};
  cols.forEach((h, i) => {
    if (ID_COLS.includes(h)) return;
    const g = subjOf(h);
    (groups[g] = groups[g] || []).push({ label: h, value: ((values?.[i]) ?? "").toString() });
  });
  if (civicsDetails) {
    groups["אזרחות"] = groups["אזרחות"] || [];
    ["סמל שאלון", "שאלון", "מועד", "ציון הגשה", "אופן היבחנות", "ייגש לבחינה"].forEach(k => {
      if (k in civicsDetails) groups["אזרחות"].push({ label: `${k} (קובץ אזרחות)`, value: (civicsDetails[k] ?? "").toString() });
    });
  }
  return ORDER.filter(g => groups[g]?.length).map(g => ({ subject: g, items: groups[g] }));
}

/** All non-empty items flattened (for compact previews). */
export function bagrutFilled(groups: BagrutGroup[]): BagrutItem[] {
  return groups.flatMap(g => g.items).filter(it => it.value.trim() !== "");
}

/** Full grouped display — one row per original column, empty shown as —. RTL, no status. */
export const BagrutGroupsView = ({ groups }: { groups: BagrutGroup[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3" dir="rtl">
    {groups.map(g => (
      <div key={g.subject} className="rounded-xl border border-border/70 bg-muted/10 overflow-hidden">
        <div className="px-3 py-2 bg-muted/40 text-[12.5px] font-semibold text-foreground border-b border-border/60">{g.subject}</div>
        <div className="divide-y divide-border/40">
          {g.items.map((row, i) => (
            <div key={i} className="flex items-start justify-between gap-3 px-3 py-1.5">
              <span className="text-[11.5px] text-muted-foreground leading-snug">{row.label}</span>
              <span className={`text-[12px] shrink-0 text-start ${row.value.trim() === "" ? "text-muted-foreground/40" : "text-foreground font-medium"}`}>
                {row.value.trim() === "" ? "—" : row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
