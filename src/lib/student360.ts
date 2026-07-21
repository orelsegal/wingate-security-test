/** Pure logic for the Student 360 profile: merging the legacy
 *  students.assigned_coach field with managed coach relationships, and
 *  deriving the activity feed from relationship dates. No network. */

import type { StudentRelationships } from "@/lib/peopleApi";
import { COACH_ROLE_LABELS, RELATIONSHIP_LABELS } from "@/lib/peopleApi";

const key = (v: string | null | undefined) =>
  (v || "").replace(/\s+/g, " ").trim().replace(/[\s'׳"״-]/g, "").replace(/יי/g, "י");

export interface MergedCoach {
  name: string;
  /** where this coach comes from; the same person never appears twice */
  sources: ("legacy" | "relationship")[];
  roleLabel: string | null;
  active: boolean;
  activeFrom: string | null;
  activeTo: string | null;
}

/** Merge the legacy assigned_coach text with the managed coach links.
 *  A coach present in both appears ONCE with both sources; legacy data is
 *  never dropped or modified. Historical links stay separate rows. */
export function mergeCoaches(
  legacyCoach: string | null | undefined,
  relCoaches: StudentRelationships["coaches"] | null | undefined,
): { current: MergedCoach[]; historical: MergedCoach[] } {
  const current: MergedCoach[] = [];
  const historical: MergedCoach[] = [];
  const legacy = (legacyCoach || "").trim();
  let legacyMerged = false;
  for (const c of relCoaches || []) {
    const row: MergedCoach = {
      name: c.full_name,
      sources: ["relationship"],
      roleLabel: COACH_ROLE_LABELS[c.role_type] || c.role_type,
      active: c.active,
      activeFrom: c.active_from || null,
      activeTo: c.active_to || null,
    };
    if (legacy && key(c.full_name) === key(legacy) && c.active) {
      row.sources = ["legacy", "relationship"];
      legacyMerged = true;
    }
    (c.active ? current : historical).push(row);
  }
  if (legacy && !legacyMerged) {
    current.push({
      name: legacy, sources: ["legacy"], roleLabel: null,
      active: true, activeFrom: null, activeTo: null,
    });
  }
  return { current, historical };
}

export interface ActivityEvent { date: string; text: string }

/** Real events only: relationship start/end dates from
 *  get_student_relationships. Newest first. */
export function relationshipEvents(rel: StudentRelationships | null | undefined): ActivityEvent[] {
  if (!rel) return [];
  const out: ActivityEvent[] = [];
  for (const g of rel.guardians || []) {
    const label = RELATIONSHIP_LABELS[g.relationship_type] || g.relationship_type;
    if (g.active_from) out.push({ date: g.active_from, text: `נוצר קשר הורה (${label}): ${g.full_name}` });
    if (g.active_to) out.push({ date: g.active_to, text: `הסתיים קשר הורה (${label}): ${g.full_name}` });
  }
  for (const c of rel.coaches || []) {
    const label = COACH_ROLE_LABELS[c.role_type] || c.role_type;
    if (c.active_from) out.push({ date: c.active_from, text: `נוצר שיוך מאמן/ת (${label}): ${c.full_name}` });
    if (c.active_to) out.push({ date: c.active_to, text: `הסתיים שיוך מאמן/ת (${label}): ${c.full_name}` });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const formatEventDate = (iso: string): string => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
};
