import type { AmazonDraft } from "../types";

// Kept free of server-only imports so the dialog can use the limits without pulling in the parser.
export const MAX_INPUT_BYTES = 500 * 1024;
export const MAX_DRAFTS = 100;
export const TITLE_MAX = 120;
export const PRICE = /£\s?[\d,]+(?:\.\d{1,2})?/;

/** Marks what's missing so the preview can point the owner at it. */
export function flag(d: AmazonDraft): AmazonDraft {
  if (!d.title) d.warnings.push("No title found. Type one in.");
  if (d.priceMinor === null) d.warnings.push("No price found.");
  d.uncertain = d.warnings.length > 0;
  return d;
}
