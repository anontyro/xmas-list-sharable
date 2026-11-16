import { clip, parsePriceString } from "../extract-metadata";
import type { AmazonDraft } from "../types";
import { asinFrom, productUrl } from "./asin";
import { flag, PRICE, TITLE_MAX } from "./shared";

const URL_RE = /https?:\/\/\S+/g;
const PRICE_ONLY = /^£\s?[\d,.]+$/;

/**
 * Copied wishlist text: each Amazon link takes the nearest earlier non-empty line as its title, or the words in front of
 * it on the same line. A price line between the title and the link is picked up too.
 */
export function parseAmazonText(text: string): AmazonDraft[] {
  const byAsin = new Map<string, AmazonDraft>();
  let block: string[] = []; // lines since the previous link

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const link = line.match(URL_RE)?.map(asinFrom).find((a) => a !== null) ?? null;
    if (!line) continue;
    if (!link) {
      if (!/^https?:\/\/\S+$/.test(line)) block.push(line);
      continue;
    }
    const sameLine = line.replace(URL_RE, "").replace(/[\s\-–—:|]+$/, "").trim();
    const lines = sameLine ? [...block, sameLine] : block;
    const title = sameLine || [...block].reverse().find((l) => !PRICE_ONLY.test(l)) || "";
    const price = lines.map((l) => PRICE.exec(l)?.[0]).find(Boolean);
    block = [];
    if (byAsin.has(link!)) continue;
    byAsin.set(link!, {
      title: clip(title, TITLE_MAX),
      description: null,
      imageUrl: null,
      priceMinor: price ? parsePriceString(price) : null,
      currency: "GBP",
      canonicalUrl: productUrl(link!),
      sourceUrl: productUrl(link!),
      warnings: [],
      uncertain: false,
    });
  }
  return [...byAsin.values()].map(flag);
}
