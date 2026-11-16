import { computePlan } from "../accounting";
import type { PlannerView } from "../queries";
import type { ExportInput } from "./types";

/** The selected entries of a planner, with totals computed over just those entries. */
export function buildExport(plan: PlannerView, selected: ReadonlySet<string>, includeNotes: boolean): ExportInput {
  const occasion = `${plan.selected.occasion} ${plan.selected.year}`;
  const entries = plan.groups.flatMap((g) =>
    g.entries
      .filter((e) => selected.has(e.itemId))
      .map((e) => ({
        recipient: g.memberName,
        occasion,
        title: e.title,
        url: e.productUrl,
        note: e.note,
        state: e.state,
        listedPriceMinor: e.listedPriceMinor,
        actualPriceMinor: e.actualPriceMinor,
        included: e.included,
      })),
  );
  return { heading: occasion, entries, totals: computePlan(entries, plan.budgetMinor), budgetMinor: plan.budgetMinor, includeNotes };
}
