import { describe, expect, it } from "vitest";
import { computePlan, type PlanEntry } from "@/features/planner/accounting";

const e = (state: PlanEntry["state"], listed: number | null, actual: number | null = null, included = true): PlanEntry => ({ state, listedPriceMinor: listed, actualPriceMinor: actual, included });

describe("computePlan", () => {
  it("matches the PRD Appendix B example", () => {
    const t = computePlan([e("reserved", 12999), e("interested", 1499), e("purchased", 2499, 1950)], 25000);
    expect(t).toEqual({ plannedMinor: 14949, spentMinor: 1950, potentialMinor: 1499, remainingMinor: 10051, unpricedCount: 0 });
  });

  it("handles zero, missing and overspent budgets", () => {
    const entries = [e("reserved", 5000)];
    expect(computePlan(entries, 0).remainingMinor).toBe(-5000);
    expect(computePlan(entries, null).remainingMinor).toBeNull();
    expect(computePlan(entries, 3000).remainingMinor).toBe(-2000);
    expect(computePlan([], 1000)).toEqual({ plannedMinor: 0, spentMinor: 0, potentialMinor: 0, remainingMinor: 1000, unpricedCount: 0 });
  });

  it("counts entries with no price as unpriced and adds nothing for them", () => {
    const t = computePlan([e("reserved", null), e("interested", null), e("purchased", 1000)], 5000);
    expect(t).toMatchObject({ plannedMinor: 1000, spentMinor: 1000, potentialMinor: 0, unpricedCount: 2 });
  });

  it("uses the actual price when the listed price is missing", () => {
    const t = computePlan([e("purchased", null, 700)], null);
    expect(t).toMatchObject({ plannedMinor: 700, spentMinor: 700, unpricedCount: 0 });
  });

  it("ignores excluded entries entirely, including unpriced ones", () => {
    const t = computePlan([e("reserved", 9999, null, false), e("reserved", null, null, false), e("purchased", 100)], 1000);
    expect(t).toEqual({ plannedMinor: 100, spentMinor: 100, potentialMinor: 0, remainingMinor: 900, unpricedCount: 0 });
  });

  it("never double counts one gift as it moves through the states", () => {
    const steps = (["interested", "reserved", "purchased"] as const).map((s) => computePlan([e(s, 1000)], 5000));
    expect(steps.map((t) => [t.potentialMinor, t.plannedMinor, t.spentMinor])).toEqual([[1000, 0, 0], [0, 1000, 0], [0, 1000, 1000]]);
  });

  it("returns whole numbers only", () => {
    const t = computePlan([e("reserved", 1999), e("purchased", 2001, 1), e("interested", 7)], 12345);
    for (const v of [t.plannedMinor, t.spentMinor, t.potentialMinor, t.remainingMinor!]) expect(Number.isInteger(v)).toBe(true);
  });
});
