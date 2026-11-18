import { describe, expect, it } from "vitest";
import { plannerStripText } from "@/features/planner/components/PlannerStrip";

describe("plannerStripText", () => {
  it("says what is left of the budget", () => expect(plannerStripText({ plannedMinor: 14949, budgetMinor: 25000 })).toBe("£100.51 left to plan of £250.00"));
  it("says what is planned when there is no budget", () => expect(plannerStripText({ plannedMinor: 4250, budgetMinor: null })).toBe("£42.50 planned so far"));
  it("invites a start when nothing is planned and there is no budget", () => expect(plannerStripText({ plannedMinor: 0, budgetMinor: null })).toBe("Start planning"));
  it("says so when over budget instead of showing a negative amount", () => expect(plannerStripText({ plannedMinor: 30000, budgetMinor: 25000 })).toBe("£50.00 over your £250.00 budget"));
});
