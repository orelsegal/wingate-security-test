import { describe, it, expect } from "vitest";
import {
  parseShekelInput,
  formatAgorot,
  splitAmount,
  isValidSplit,
  savingRatePct,
  goalMath,
  weeksUntil,
  weeklyStreak,
  DEFAULT_SPLIT,
} from "./money";

describe("parseShekelInput", () => {
  it("parses whole shekels", () => {
    expect(parseShekelInput("120")).toBe(12000);
  });
  it("parses agorot", () => {
    expect(parseShekelInput("26.07")).toBe(2607);
    expect(parseShekelInput("0.5")).toBe(50);
  });
  it("accepts currency symbols and commas", () => {
    expect(parseShekelInput("1,200 ₪")).toBe(120000);
  });
  it("rejects invalid input", () => {
    expect(parseShekelInput("")).toBeNull();
    expect(parseShekelInput("-5")).toBeNull();
    expect(parseShekelInput("12.345")).toBeNull();
    expect(parseShekelInput("abc")).toBeNull();
  });
});

describe("formatAgorot", () => {
  it("formats whole shekels without fraction", () => {
    expect(formatAgorot(35000)).toContain("350");
    expect(formatAgorot(35000)).toContain("₪");
  });
  it("formats agorot with fraction", () => {
    expect(formatAgorot(2607)).toContain("26.07");
  });
});

describe("splitAmount", () => {
  it("splits the demo income 120₪ into 60/36/24", () => {
    const r = splitAmount(12000, DEFAULT_SPLIT);
    expect(r).toEqual({ future: 6000, goals: 3600, fun: 2400 });
  });
  it("always sums exactly to the original amount", () => {
    for (const amount of [0, 1, 2, 3, 7, 99, 101, 12345, 999999]) {
      for (const p of [
        DEFAULT_SPLIT,
        { future: 33, goals: 33, fun: 34 },
        { future: 100, goals: 0, fun: 0 },
        { future: 1, goals: 1, fun: 98 },
      ]) {
        const r = splitAmount(amount, p);
        expect(r.future + r.goals + r.fun).toBe(amount);
        expect(r.future).toBeGreaterThanOrEqual(0);
        expect(r.goals).toBeGreaterThanOrEqual(0);
        expect(r.fun).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it("never produces negative buckets on tiny amounts", () => {
    const r = splitAmount(3, { future: 50, goals: 50, fun: 0 });
    expect(r.future + r.goals + r.fun).toBe(3);
    expect(Math.min(r.future, r.goals, r.fun)).toBeGreaterThanOrEqual(0);
  });
  it("rejects percents that do not sum to 100", () => {
    expect(() => splitAmount(100, { future: 50, goals: 30, fun: 30 })).toThrow();
    expect(isValidSplit({ future: 50, goals: 30, fun: 30 })).toBe(false);
    expect(isValidSplit({ future: 50, goals: 30, fun: 20 })).toBe(true);
  });
});

describe("savingRatePct", () => {
  it("returns null with no income (month without income state)", () => {
    expect(savingRatePct(0, 0)).toBeNull();
  });
  it("computes rounded percent", () => {
    expect(savingRatePct(6000, 12000)).toBe(50);
    expect(savingRatePct(1, 3)).toBe(33);
  });
});

describe("goalMath", () => {
  it("computes the demo goal: laptop 3200₪, saved 200₪", () => {
    const g = goalMath(320000, 20000, 3600, 10);
    expect(g.remaining).toBe(300000);
    expect(g.perPeriod).toBe(30000); // 300₪ לשבוע כדי להספיק ב-10 שבועות
    expect(g.etaPeriods).toBe(Math.ceil(300000 / 3600));
  });
  it("handles achieved goal", () => {
    const g = goalMath(10000, 12000, 1000, 5);
    expect(g.remaining).toBe(0);
    expect(g.etaPeriods).toBe(0);
  });
  it("returns null per-period when no date given", () => {
    const g = goalMath(10000, 0, 0, null);
    expect(g.perPeriod).toBeNull();
    expect(g.etaPeriods).toBeNull();
  });
});

describe("weeksUntil", () => {
  it("counts partial weeks up", () => {
    expect(weeksUntil("2026-08-05", "2026-08-06")).toBe(1);
    expect(weeksUntil("2026-08-05", "2026-08-19")).toBe(2);
  });
  it("never negative", () => {
    expect(weeksUntil("2026-08-05", "2026-08-01")).toBe(0);
  });
});

describe("weeklyStreak", () => {
  it("returns 0 with no activity", () => {
    expect(weeklyStreak([], "2026-08-05")).toBe(0);
  });
  it("counts consecutive weeks including current", () => {
    // 5.8.2026 יום רביעי; שבועות מתחילים ביום ראשון
    const streak = weeklyStreak(
      ["2026-08-03", "2026-07-28", "2026-07-20"],
      "2026-08-05"
    );
    expect(streak).toBe(3);
  });
  it("streak survives when current week has no activity yet", () => {
    const streak = weeklyStreak(["2026-07-28", "2026-07-20"], "2026-08-05");
    expect(streak).toBe(2);
  });
  it("breaks on a missed week", () => {
    const streak = weeklyStreak(["2026-08-03", "2026-07-13"], "2026-08-05");
    expect(streak).toBe(1);
  });
});
