import * as cheerio from "cheerio";
import { clean, clip, parsePriceString } from "../extract-metadata";
import type { AmazonDraft } from "../types";
import { asinFrom, productUrl } from "./asin";
import { flag, PRICE, TITLE_MAX } from "./shared";

// The pasted page is parsed as data. Nothing in it is executed, and every value comes out as plain text.

export function parseAmazonHtml(html: string): AmazonDraft[] {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const byAsin = new Map<string, AmazonDraft>();

  $("a[href]").each((_, a) => {
    const asin = asinFrom($(a).attr("href") ?? "");
    if (!asin) return;
    const row = $(a).closest("li, [data-asin]");
    const scope = row.length ? row : $(a).parent();
    const title = clean($(a).attr("title")) ?? clean($(a).text());
    const existing = byAsin.get(asin);
    if (existing) {
      // The picture link comes first and has no text, so a later link in the same row can supply the title.
      if (!existing.title && title) existing.title = clip(title, TITLE_MAX);
      return;
    }
    const price = clean(scope.find(".a-offscreen").first().text()) ?? PRICE.exec(scope.text())?.[0] ?? null;
    const img = clean(scope.find("img").first().attr("src"));
    const draft: AmazonDraft = {
      title: title ? clip(title, TITLE_MAX) : "",
      description: null,
      imageUrl: img && /^https?:\/\//i.test(img) ? img : null,
      priceMinor: price ? parsePriceString(price) : null,
      currency: "GBP",
      canonicalUrl: productUrl(asin),
      sourceUrl: productUrl(asin),
      warnings: [],
      uncertain: false,
    };
    byAsin.set(asin, draft);
  });

  return [...byAsin.values()].map(flag);
}
