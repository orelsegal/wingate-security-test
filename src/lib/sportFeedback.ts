/**
 * sportFeedback — maps Hebrew/English sport names to a canonical key
 * used by SportFeedbackOverlay to choose the right animated scene.
 */
export type SportType =
  | "volleyball"
  | "beach_volleyball"
  | "table_tennis"
  | "climbing"
  | "swimming"
  | "artistic_swimming"
  | "gymnastics"
  | "generic";

export type FeedbackEventType = "success" | "failure";

const NORM = (s: string) => s.trim().toLowerCase();

/** Map any incoming sport label (Hebrew or English) to a canonical SportType. */
export const resolveSport = (raw?: string | null): SportType => {
  if (!raw) return "generic";
  const s = NORM(raw);

  if (/(שחייה אומנותית|שחיה אומנותית|artistic)/.test(s)) return "artistic_swimming";
  if (/(שחייה|שחיה|swim)/.test(s)) return "swimming";
  if (/(כדורעף חופים|כדורעף ים|beach.*vol|חופים)/.test(s)) return "beach_volleyball";
  if (/(כדורעף|volleyball)/.test(s)) return "volleyball";
  if (/(טניס שולחן|פינג פונג|פינג-פונג|table tennis|pingpong|ping pong)/.test(s)) return "table_tennis";
  if (/(טיפוס|climb)/.test(s)) return "climbing";
  if (/(התעמלות|gymnast)/.test(s)) return "gymnastics";

  return "generic";
};

export const SPORT_LABELS: Record<SportType, string> = {
  volleyball: "כדורעף",
  beach_volleyball: "כדורעף חופים",
  table_tennis: "טניס שולחן",
  climbing: "טיפוס",
  swimming: "שחייה",
  artistic_swimming: "שחייה אומנותית",
  gymnastics: "התעמלות",
  generic: "ספורט",
};

export const CAPTIONS: Record<FeedbackEventType, string[]> = {
  failure: ["אופססס!", "כמעט!", "נסה שוב!", "הפעם זה ברח...", "לא נורא, עוד ניסיון!"],
  success: ["אלוף/ה!", "איזה ביצוע!", "נקודה!", "מושלם!", "בול!", "יששש!"],
};
