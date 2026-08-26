import { describe, it, expect } from "vitest";
import { project, finalValue, compareStartAges, feeCost } from "./simulator";

describe("project", () => {
  it("with 0% rate equals sum of deposits", () => {
    const pts = project({
      initialShekels: 100,
      monthlyDepositShekels: 50,
      annualRatePct: 0,
      years: 2,
    });
    const last = pts[pts.length - 1];
    expect(last.month).toBe(24);
    expect(last.value).toBeCloseTo(100 + 50 * 24, 6);
    expect(last.deposited).toBeCloseTo(100 + 50 * 24, 6);
  });

  it("positive rate grows above deposits", () => {
    const v = finalValue({
      initialShekels: 0,
      monthlyDepositShekels: 100,
      annualRatePct: 7,
      years: 10,
    });
    expect(v).toBeGreaterThan(100 * 120);
  });

  it("negative scenario loses money — no profit promise", () => {
    const v = finalValue({
      initialShekels: 1000,
      monthlyDepositShekels: 0,
      annualRatePct: -10,
      years: 3,
    });
    expect(v).toBeLessThan(1000);
    expect(v).toBeGreaterThanOrEqual(0);
  });

  it("shock applies a one-time drop", () => {
    const base = finalValue({
      initialShekels: 1000,
      monthlyDepositShekels: 0,
      annualRatePct: 0,
      years: 1,
    });
    const shocked = finalValue({
      initialShekels: 1000,
      monthlyDepositShekels: 0,
      annualRatePct: 0,
      years: 1,
      shock: { month: 6, changePct: -30 },
    });
    expect(base).toBeCloseTo(1000, 6);
    expect(shocked).toBeCloseTo(700, 6);
  });

  it("stopping deposits freezes contributions but keeps compounding", () => {
    const stopped = project({
      initialShekels: 0,
      monthlyDepositShekels: 100,
      annualRatePct: 0,
      years: 2,
      stopDepositsAtMonth: 13,
    });
    const last = stopped[stopped.length - 1];
    expect(last.deposited).toBeCloseTo(100 * 12, 6);
  });
});

describe("compareStartAges", () => {
  it("earlier start always ends with at least as much", () => {
    const rows = compareStartAges([14, 18, 25], 30, 200, 6);
    expect(rows[0].final).toBeGreaterThan(rows[1].final);
    expect(rows[1].final).toBeGreaterThan(rows[2].final);
    expect(rows[0].years).toBe(16);
  });
});

describe("feeCost", () => {
  it("fees reduce the final value", () => {
    const { withoutFee, withFee, cost } = feeCost(
      { initialShekels: 0, monthlyDepositShekels: 200, annualRatePct: 6, years: 20 },
      1
    );
    expect(withFee).toBeLessThan(withoutFee);
    expect(cost).toBeGreaterThan(0);
  });
});
