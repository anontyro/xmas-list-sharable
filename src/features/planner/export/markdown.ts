import { groupByRecipient, oneLine, priceText, STATUS_LABELS, totalsRows, unpricedNote, type ExportInput } from "./types";

/** Escapes characters Markdown would treat as formatting in free text. */
const esc = (s: string) => oneLine(s).replace(/[\\`*_{}[\]()#+!|<>~]/g, "\\$&");

/** Percent-encodes the few characters that would end a Markdown link early. */
// (encodeURIComponent leaves parentheses alone, so encode by hand.)
const safeUrl = (u: string) => u.replace(/[()\s<>]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);

export function formatMarkdown(input: ExportInput): string {
  const { heading, entries, totals, includeNotes } = input;
  const out = [`# ${esc(heading)} — My Gift Planner`, ""];
  for (const g of groupByRecipient(entries)) {
    out.push(`## ${esc(g.recipient)}`, "");
    for (const e of g.entries) {
      out.push(`- **${esc(e.title)}** — ${STATUS_LABELS[e.state]} — ${priceText(e)}`);
      if (e.url) out.push(`  - [Link](${safeUrl(e.url)})`);
      if (includeNotes && e.note) out.push(`  - Note: ${esc(e.note)}`);
    }
    out.push("");
  }
  out.push("## Totals", "");
  for (const [label, value] of totalsRows(input)) out.push(`- ${label}: ${value}`);
  if (totals.unpricedCount > 0) out.push(`- ${unpricedNote(totals.unpricedCount)}`);
  return out.join("\n") + "\n";
}
