/**
 * תנ״ך · זירת המשחקים — בדיקות רינדור והיגיון (ללא רשת, ללא אימות).
 * הדגש: כל תוכן המשחקים נגזר מהמאגר האמיתי, הניקוד נשמר במכשיר בלבד,
 * והתווית "גרסת הדגמה" נשארת גלויה.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// canvas-confetti מצייר על canvas אמיתי; ב-jsdom אין כזה, ולכן מוחלף בגרסת דמה.
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TanakhArenaPage from "@/pages/TanakhArenaPage";
import TanakhRoadmapPage from "@/pages/TanakhRoadmapPage";
import { TANAKH_UNITS, ARCS, UNIT1 } from "@/tanakh/tanakhData";
import {
  ARENA_GAMES, ARENA_SCORES_KEY, medalFor, medalCount,
  loadArenaScores, saveArenaResult, clearArenaScores,
} from "@/tanakh/arenaGames";

beforeEach(() => {
  clearArenaScores();
});

describe("arena content comes from the real Tanakh material", () => {
  it("every round is built only from tanakhData — no invented text", () => {
    const terms = UNIT1.glossary.map(g => g.term);
    const defs = UNIT1.glossary.map(g => g.def);
    const titles = TANAKH_UNITS.map(u => u.title);
    const chapters = TANAKH_UNITS.map(u => u.chapters);
    const questions = TANAKH_UNITS.map(u => u.question);
    const arcNames = [ARCS.bereshit.name, ARCS["shaul-david"].name];
    const verseWords = new Set(UNIT1.textOpening.split(/[\s׃]+/).filter(Boolean));

    const allowedPrompts = new Set([...terms, ...titles, ...questions]);
    const allowedOptions = new Set([...defs, ...chapters, ...titles, ...arcNames]);

    ARENA_GAMES.forEach(game => {
      const rounds = game.build();
      expect(rounds.length).toBeGreaterThan(0);
      rounds.forEach(r => {
        if (r.kind === "mcq") {
          expect(allowedPrompts.has(r.prompt)).toBe(true);
          r.options.forEach(o => expect(allowedOptions.has(o)).toBe(true));
          // התשובה קיימת ומופיעה פעם אחת בלבד
          expect(r.options[r.answer]).toBeDefined();
          expect(new Set(r.options).size).toBe(r.options.length);
        } else {
          r.answer.forEach(w => expect(verseWords.has(w)).toBe(true));
          // אותם אסימונים בדיוק, רק בסדר אחר
          expect([...r.tokens].sort()).toEqual([...r.answer].sort());
          if (r.answer.length > 1) expect(r.tokens.join(" ")).not.toBe(r.answer.join(" "));
        }
      });
    });
  });

  it("each unit is mapped to its own arc in the arc game", () => {
    const arcGame = ARENA_GAMES.find(g => g.id === "arc")!;
    const rounds = arcGame.build();
    expect(rounds).toHaveLength(TANAKH_UNITS.length);
    rounds.forEach(r => {
      if (r.kind !== "mcq") throw new Error("arc game must be multiple choice");
      const unit = TANAKH_UNITS.find(u => u.title === r.prompt)!;
      expect(r.options[r.answer]).toBe(ARCS[unit.arc].name);
    });
  });
});

describe("medals and device-only scoring", () => {
  it("awards medals by threshold, and nothing below 60%", () => {
    expect(medalFor(100)).toBe("gold");
    expect(medalFor(80)).toBe("silver");
    expect(medalFor(60)).toBe("bronze");
    expect(medalFor(59)).toBeNull();
    expect(medalFor(0)).toBeNull();
  });

  it("keeps the best result and counts plays, in localStorage only", () => {
    saveArenaResult("glossary", 80);
    saveArenaResult("glossary", 40); // תוצאה חלשה יותר לא מורידה את השיא
    const scores = loadArenaScores();
    expect(scores.glossary).toEqual({ best: 80, plays: 2 });
    expect(localStorage.getItem(ARENA_SCORES_KEY)).toContain("glossary");
    expect(medalCount(scores)).toBe(1);
  });

  it("ignores corrupted stored data instead of crashing", () => {
    localStorage.setItem(ARENA_SCORES_KEY, "{ not json");
    expect(loadArenaScores()).toEqual({});
    localStorage.setItem(ARENA_SCORES_KEY, JSON.stringify({ glossary: { best: "nope" } }));
    expect(loadArenaScores()).toEqual({});
  });
});

describe("arena page", () => {
  it("lists all games with an honest prototype notice and no fake progress", () => {
    render(<MemoryRouter><TanakhArenaPage /></MemoryRouter>);
    expect(screen.getByText(/זירת המשחקים/)).toBeTruthy();
    expect(screen.getByText(/גרסת הדגמה/)).toBeTruthy();
    expect(screen.getByText(/נשמרות במכשיר בלבד/)).toBeTruthy();
    ARENA_GAMES.forEach(g => expect(screen.getByText(g.title)).toBeTruthy());
    // ללא היסטוריה — אין שיאים מומצאים
    expect(screen.getAllByText("עוד לא שיחקת")).toHaveLength(ARENA_GAMES.length);
    expect(screen.getByText(/מדליות מתוך/).textContent).toContain(`0 מדליות מתוך ${ARENA_GAMES.length}`);
  });

  it("plays a full glossary round and records the result on the device", () => {
    render(<MemoryRouter><TanakhArenaPage /></MemoryRouter>);
    fireEvent.click(screen.getByText("מילון בזק"));

    const total = UNIT1.glossary.length;
    for (let i = 0; i < total; i++) {
      expect(screen.getByText(`שאלה ${i + 1} מתוך ${total}`)).toBeTruthy();
      // התשובה הנכונה למונח המוצג, לפי המילון האמיתי
      const term = UNIT1.glossary.find(g => screen.queryByText(g.term))!;
      fireEvent.click(screen.getByText(term.def));
      fireEvent.click(screen.getByText(i + 1 < total ? "לשאלה הבאה" : "לסיכום"));
    }

    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText(`${total} מתוך ${total} תשובות נכונות`)).toBeTruthy();
    expect(loadArenaScores().glossary).toEqual({ best: 100, plays: 1 });

    fireEvent.click(screen.getByText("חזרה לזירה"));
    expect(screen.getByText(/שיא: 100%/)).toBeTruthy();
  });

  it("shows the correct verse order after a wrong answer instead of hiding it", () => {
    render(<MemoryRouter><TanakhArenaPage /></MemoryRouter>);
    fireEvent.click(screen.getByText("סדר את הפסוק"));

    // בונים את הפסוק לפי סדר ההצגה המעורבב — בהכרח שגוי
    const pool = screen.getByText("כאן ייבנה הפסוק").parentElement!.nextElementSibling as HTMLElement;
    const wordButtons = within(pool).getAllByRole("button");
    wordButtons.forEach(b => fireEvent.click(b));

    fireEvent.click(screen.getByText("בדיקה"));
    expect(screen.getByText("הסדר הנכון")).toBeTruthy();
  });
});

describe("roadmap entry point", () => {
  it("offers the arena without replacing the learning path", () => {
    render(<MemoryRouter><TanakhRoadmapPage /></MemoryRouter>);
    expect(screen.getByText("זירת המשחקים")).toBeTruthy();
    expect(screen.getByText(/להתחלת המסע · יחידה 1/)).toBeTruthy();
  });
});
