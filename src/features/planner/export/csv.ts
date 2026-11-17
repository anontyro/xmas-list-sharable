import { minorToPounds } from "@/lib/money";
import { STATUS_LABELS, type ExportInput } from "./types";

/** A spreadsheet would run a cell that starts with one of these as a formula, so such cells get a leading quote. */
const FORMULA_START = /^[=+\-@\t\r]/;

/** RFC 4180 quoting for one cell, after the formula guard. */
function cell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function formatCsv({ entries, includeNotes }: ExportInput): string {
  const header = ["Recipient", "Occasion", "Item", "Status", "Listed price", "Actual price", "URL", ...(includeNotes ? ["Note"] : [])];
  const rows = entries.map((e) => [
    e.recipient,
    e.occasion,
    e.title,
    STATUS_LABELS[e.state],
    minorToPounds(e.listedPriceMinor), // plain numbers (12.50), so spreadsheets treat them as numbers
    minorToPounds(e.actualPriceMinor),
    e.url ?? "",
    ...(includeNotes ? [e.note] : []),
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
