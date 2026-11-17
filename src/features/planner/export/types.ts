import { formatGBP } from "@/lib/money";
import type { PlanEntry, PlanTotals } from "../accounting";

/**
 * Everything an export may contain. There is deliberately no field for recovery links, sessions or other
 * guests' data, so a formatter cannot leak them. `note` is only written when `includeNotes` is set.
 */
export type ExportEntry = PlanEntry & {
  recipient: string;
  occasion: string; // e.g. "Christmas 2026"
  title: string;
  url: string | null;
  note: string;
};

export type ExportInput = {
  heading: string; // e.g. "Christmas 2026"
  entries: ExportEntry[];
  totals: PlanTotals; // computed over exactly these entries
  budgetMinor: number | null;
  includeNotes: boolean;
};

export const STATUS_LABELS: Record<ExportEntry["state"], string> = {
  reserved: "Reserved",
  interested: "Interested",
  purchased: "Purchased",
};

/** Entries grouped by recipient, in first-seen order. */
export function groupByRecipient(entries: ExportEntry[]): { recipient: string; entries: ExportEntry[] }[] {
  const groups = new Map<string, ExportEntry[]>();
  for (const e of entries) groups.set(e.recipient, [...(groups.get(e.recipient) ?? []), e]);
  return [...groups].map(([recipient, list]) => ({ recipient, entries: list }));
}

/** Collapses line breaks and runs of spaces, so a title can never break a one-line list entry. */
export const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

/** "£129.99", "No price", plus " (paid £19.50)" when the guest entered what they paid. */
export function priceText(e: ExportEntry): string {
  const listed = e.listedPriceMinor === null ? "No price" : formatGBP(e.listedPriceMinor);
  return e.actualPriceMinor === null ? listed : `${listed} (paid ${formatGBP(e.actualPriceMinor)})`;
}

const signed = (minor: number) => (minor < 0 ? `-${formatGBP(-minor)}` : formatGBP(minor));

/** The totals block shared by the text and Markdown formats, as [label, value] rows. */
export function totalsRows({ totals, budgetMinor }: Pick<ExportInput, "totals" | "budgetMinor">): [string, string][] {
  const rows: [string, string][] = [["Estimated committed", formatGBP(totals.plannedMinor)], ["Actual spent", formatGBP(totals.spentMinor)]];
  if (budgetMinor !== null) rows.push(["Budget", formatGBP(budgetMinor)]);
  if (totals.remainingMinor !== null) rows.push(["Remaining committed budget", signed(totals.remainingMinor)]);
  return rows;
}

export const unpricedNote = (n: number) => `${n} ${n === 1 ? "item" : "items"} without a price (not counted)`;
