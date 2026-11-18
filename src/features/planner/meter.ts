export type MeterShares = { spentPercent: number; plannedPercent: number };

/**
 * The budget meter's two bars as shares of the total budget (decision 0021): spent, then planned but not yet spent.
 * Together they never pass 100, and nothing is negative or not a number. Null when there is no budget to measure against.
 */
export function meterSegments({ budgetMinor, spentMinor, plannedMinor }: { budgetMinor: number | null; spentMinor: number; plannedMinor: number }): MeterShares | null {
  if (budgetMinor === null) return null;
  if (!(budgetMinor > 0)) return { spentPercent: 0, plannedPercent: 0 }; // a £0 budget has nothing to share out
  const spent = Math.max(0, spentMinor);
  const plannedNotSpent = Math.max(0, plannedMinor - spent);
  const spentPercent = Math.min(100, (spent / budgetMinor) * 100);
  const plannedPercent = Math.min(100 - spentPercent, (plannedNotSpent / budgetMinor) * 100);
  return { spentPercent, plannedPercent };
}
