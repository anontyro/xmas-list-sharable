export type PlanEntry = {
  /** What the guest has done with the gift: only looked (interested), reserved it, or bought it. */
  state: "interested" | "reserved" | "purchased";
  listedPriceMinor: number | null;
  actualPriceMinor: number | null;
  /** False when the guest has left this entry out of their totals. */
  included: boolean;
};

export type PlanTotals = {
  plannedMinor: number; // reserved + purchased, at actual price if known, else listed
  spentMinor: number; // purchased only
  potentialMinor: number; // interested-only, at listed price (not committed)
  remainingMinor: number | null; // budget - planned; negative when over budget; null with no budget
  unpricedCount: number; // included entries with no price at all
};

/**
 * Planner money rules (decision 0011). All amounts are whole pence. An entry is counted once, in exactly one
 * bucket for its state, so moving it from interested to reserved to purchased never double counts.
 */
export function computePlan(entries: PlanEntry[], budgetMinor: number | null): PlanTotals {
  let planned = 0;
  let spent = 0;
  let potential = 0;
  let unpriced = 0;

  for (const e of entries) {
    if (!e.included) continue;
    const unit = e.actualPriceMinor ?? e.listedPriceMinor;
    if (unit === null) {
      unpriced++;
      continue;
    }
    if (e.state === "interested") potential += e.listedPriceMinor ?? 0;
    else planned += unit;
    if (e.state === "purchased") spent += unit;
  }

  return { plannedMinor: planned, spentMinor: spent, potentialMinor: potential, remainingMinor: budgetMinor === null ? null : budgetMinor - planned, unpricedCount: unpriced };
}
