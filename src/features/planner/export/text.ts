import { groupByRecipient, oneLine, priceText, STATUS_LABELS, totalsRows, unpricedNote, type ExportInput } from "./types";

/** The readable shopping list (PRD Appendix B): grouped by recipient, with totals at the end. */
export function formatText(input: ExportInput): string {
  const { heading, entries, totals, includeNotes } = input;
  const lines = [`${oneLine(heading)} — My Gift Planner`, ""];
  for (const g of groupByRecipient(entries)) {
    lines.push(oneLine(g.recipient));
    for (const e of g.entries) {
      lines.push(`- ${oneLine(e.title)} — ${STATUS_LABELS[e.state]} — ${priceText(e)}`);
      if (e.url) lines.push(`  ${e.url}`);
      if (includeNotes && e.note) lines.push(`  Note: ${oneLine(e.note)}`);
    }
    lines.push("");
  }
  for (const [label, value] of totalsRows(input)) lines.push(`${label}: ${value}`);
  if (totals.unpricedCount > 0) lines.push(unpricedNote(totals.unpricedCount));
  return lines.join("\n") + "\n";
}
