import { fail, ok, type Result } from "@/lib/result";
import type { AmazonDraft } from "../types";
import { parseAmazonHtml } from "./parse-html";
import { parseAmazonText } from "./parse-text";
import { MAX_DRAFTS, MAX_INPUT_BYTES } from "./shared";

export { MAX_DRAFTS, MAX_INPUT_BYTES };

export { parseAmazonHtml, parseAmazonText };

export const MANUAL_ENTRY = "We couldn't find any gifts in that. You can still add them by hand.";

const looksLikeHtml = (s: string) => /<(?:a|li|ul|div|html|body|span)[\s>]/i.test(s);

/** Parses pasted Amazon wishlist HTML or copied text. Never throws, never fetches, never saves. */
export function parseAmazon(input: string): Result<AmazonDraft[]> {
  if (Buffer.byteLength(input) > MAX_INPUT_BYTES) return fail("INPUT_TOO_LARGE", "That's too much to read at once. Paste a smaller part of the list, or add gifts by hand.");
  let drafts: AmazonDraft[] = [];
  try {
    drafts = looksLikeHtml(input) ? parseAmazonHtml(input) : parseAmazonText(input);
    if (!drafts.length && looksLikeHtml(input)) drafts = parseAmazonText(input);
  } catch {
    // Malformed input is "nothing found", never an error page.
  }
  return drafts.length ? ok(drafts.slice(0, MAX_DRAFTS)) : fail("NOTHING_FOUND", MANUAL_ENTRY);
}
