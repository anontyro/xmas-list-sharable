import { describe, expect, it } from "vitest";
import { meterSegments } from "@/features/planner/meter";

describe("meterSegments", () => {
  it("shares the budget between spent and planned-but-not-spent", () => {
    // £19.50 spent, £149.49 planned in all, out of £250: the picture reads "£19.50 spent and £129.99 more planned".
    const s = meterSegments({ budgetMinor: 25000, spentMinor: 1950, plannedMinor: 14949 })!;
    expect(s.spentPercent).toBeCloseTo(7.8);
    expect(s.plannedPercent).toBeCloseTo(51.996);
  });

  it("is null with no budget", () => expect(meterSegments({ budgetMinor: null, spentMinor: 100, plannedMinor: 100 })).toBeNull());

  it("is empty when nothing is spent or planned", () => expect(meterSegments({ budgetMinor: 10000, spentMinor: 0, plannedMinor: 0 })).toEqual({ spentPercent: 0, plannedPercent: 0 }));

  it("never goes past 100 in total when over budget", () => {
    const s = meterSegments({ budgetMinor: 10000, spentMinor: 6000, plannedMinor: 30000 })!;
    expect(s.spentPercent).toBe(60);
    expect(s.plannedPercent).toBe(40);
    expect(meterSegments({ budgetMinor: 10000, spentMinor: 25000, plannedMinor: 25000 })).toEqual({ spentPercent: 100, plannedPercent: 0 });
  });

  it("cannot go negative or not-a-number: planned below spent, negative figures, or a zero budget", () => {
    expect(meterSegments({ budgetMinor: 10000, spentMinor: 5000, plannedMinor: 2000 })).toEqual({ spentPercent: 50, plannedPercent: 0 });
    expect(meterSegments({ budgetMinor: 10000, spentMinor: -500, plannedMinor: -500 })).toEqual({ spentPercent: 0, plannedPercent: 0 });
    for (const budgetMinor of [0, -100, Number.NaN]) {
      const s = meterSegments({ budgetMinor, spentMinor: 500, plannedMinor: 900 })!;
      expect(s).toEqual({ spentPercent: 0, plannedPercent: 0 });
    }
  });
});
