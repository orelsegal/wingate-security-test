import type { SubjectTheme } from "../data/types";

/**
 * Subject theme — the only visual/wording file a new subject app has to touch.
 * Base colours (ivory / white / navy / mineral blue) stay shared;
 * a subject adds exactly one accent colour.
 */
export const theme: SubjectTheme = {
  subjectName: "מקצוע לדוגמה",
  percentBadge: "30%",
  accent: "#12866B",
  accentSoft: "#E6F2EE",
  accentStrong: "#0E6A55",
  icon: "◈",
  words: {
    unit: "יחידה",
    units: "יחידות",
    step: "תחנה",
    steps: "תחנות",
    mapTitle: "מפת היחידות",
    mapSubtitle: "כל יחידה נפתחת אחרי אישור הקודמת",
  },
};
