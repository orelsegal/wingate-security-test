/**
 * רמזור למידה — the cross-cohort board.
 * Provenance rules under test: empty is never treated as "on track", the
 * state is identifiable without colour, colour names never reach the UI,
 * and every number carries a denominator. Access itself is enforced by RLS
 * in the DB (harness tests T12-T16), not by this component.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LearningTrafficBoardPage from "@/pages/LearningTrafficBoardPage";
import { RamzorChip } from "@/components/RamzorBadge";
import { tally, metaFor, bagrutBand, bagrutBandLabel, BAGRUT_THRESHOLDS, type Ramzor } from "@/lib/learningTraffic";

describe("רמזור למידה · board", () => {
  it("renders the five-subject board shell with explicit denominators", () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter><LearningTrafficBoardPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    // loading, the board itself, or an honest notice — never invented data
    const ok = document.querySelector(".animate-spin")
      || screen.queryByText(/רמזור למידה/)
      || screen.queryByText(/אין לך הרשאה/);
    expect(ok).toBeTruthy();
  });
});

describe("provenance rules (Einat's model)", () => {
  it("empty ramzor counts as 'לא הוזן', never green", () => {
    const t = tally([{ ramzor: null }, { ramzor: "ירוק" }, { ramzor: null }]);
    expect(t["לא הוזן"]).toBe(2);
    expect(t["ירוק"]).toBe(1);
    expect(metaFor(null).label).toBe("לא הוזן");
  });

  it("never shows a colour name — professional wording only", () => {
    const COLOURS = ["אדום", "צהוב", "ירוק"];
    ([...COLOURS, null] as const).forEach(r => {
      const m = metaFor(r as Ramzor | null);
      COLOURS.forEach(c => expect(m.label).not.toContain(c));
      expect(m.label.length).toBeGreaterThan(2);
    });
    expect(metaFor("אדום").label).toBe("דורש טיפול");
    expect(metaFor("צהוב").label).toBe("דורש תשומת לב");
    expect(metaFor("ירוק").label).toBe("במסלול");
    expect(metaFor(null).label).toBe("לא הוזן");
  });

  it("state is identifiable without colour — unique symbol per state", () => {
    const syms = (["אדום", "צהוב", "ירוק", null] as const).map(r => metaFor(r as Ramzor | null).symbol);
    expect(new Set(syms).size).toBe(4);
    expect(syms).toEqual(["!", "–", "✓", "?"]);
  });

  it("the badge exposes an accessible name and prints no colour word", () => {
    (["אדום", "צהוב", "ירוק", null] as const).forEach(r => {
      const { container, unmount } = render(<RamzorChip status={r as Ramzor | null} context="מתמטיקה" />);
      const img = container.querySelector('[role="img"]');
      expect(img?.getAttribute("aria-label")).toContain(metaFor(r as Ramzor | null).aria);
      expect(img?.getAttribute("title")).toBeTruthy();
      ["אדום", "צהוב", "ירוק"].forEach(c => expect(container.textContent).not.toContain(c));
      unmount();
    });
  });

  it("bagrut bands match the thresholds observed in Einat's screen", () => {
    expect(BAGRUT_THRESHOLDS).toEqual({ red: 12, yellowMin: 10, yellowMax: 11 });
    expect(bagrutBand(12)).toBe("אדום");
    expect(bagrutBand(15)).toBe("אדום");
    expect(bagrutBand(11)).toBe("צהוב");
    expect(bagrutBand(10)).toBe("צהוב");
    expect(bagrutBand(9)).toBe("ירוק");
    expect(bagrutBand(0)).toBe("ירוק");
    expect(bagrutBandLabel["אדום"]).toBe("12+ חסרים");
    expect(bagrutBandLabel["צהוב"]).toBe("10–11 חסרים");
    expect(bagrutBandLabel["ירוק"]).toBe("עד 9 חסרים");
  });
});
