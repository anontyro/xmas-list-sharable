import * as cheerio from "cheerio";
import { parsePoundsToMinor } from "@/lib/money";
import type { ImportDraft } from "./types";

// The page is parsed as data. Nothing in it is executed, and every value comes out as plain text.

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 1000;

export const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
export const clean = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.replace(/\s+/g, " ").trim() : null);

/** Turns "129.99", "1,299.00", "12,50" or 129.99 into pence. Null when it can't be read or is out of range. */
export function parsePriceString(raw: string | number): number | null {
  let s = String(raw).replace(/[^\d.,]/g, "");
  if (!s) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? "." : ",";
    s = s.split(decimal === "." ? "," : ".").join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    // "12,50" is a decimal comma; "1,299" has a thousands comma.
    s = s.length - lastComma - 1 === 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  return parsePoundsToMinor(s);
}

function httpUrl(value: unknown, base: string): string | null {
  const v = clean(value);
  if (!v) return null;
  try {
    const u = new URL(v, base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

/** Every object in the page's JSON-LD blocks, including those inside arrays and @graph. */
function jsonLdNodes($: cheerio.CheerioAPI): Json[] {
  const nodes: Json[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (isObject(v)) {
      nodes.push(v);
      visit(v["@graph"]);
    }
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      visit(JSON.parse($(el).text()));
    } catch {
      // A broken block is simply skipped.
    }
  });
  return nodes;
}

const isProduct = (n: Json) => [n["@type"]].flat().some((t) => t === "Product");

function firstOffer(product: Json): Json | null {
  const offers = [product.offers].flat().filter(isObject);
  return offers.find((o) => o.price !== undefined || o.lowPrice !== undefined || isObject(o.priceSpecification)) ?? offers[0] ?? null;
}

function imageOf(v: unknown): unknown {
  const first = Array.isArray(v) ? v[0] : v;
  return isObject(first) ? first.url : first;
}

export function extractMetadata(html: string, sourceUrl: string): ImportDraft {
  const $ = cheerio.load(html);
  const meta = (key: string) => clean($(`meta[property="${key}"], meta[name="${key}"]`).first().attr("content"));
  const product = jsonLdNodes($).find(isProduct) ?? null;
  const offer = product ? firstOffer(product) : null;
  const spec = offer && isObject(offer.priceSpecification) ? offer.priceSpecification : null;

  const title = clean(product?.name) ?? meta("og:title") ?? clean($("title").first().text()) ?? "";
  const description = clean(product?.description) ?? meta("og:description") ?? meta("description");
  const image = httpUrl(imageOf(product?.image), sourceUrl) ?? httpUrl(meta("og:image"), sourceUrl);
  const canonical = httpUrl($('link[rel="canonical"]').first().attr("href"), sourceUrl) ?? httpUrl(meta("og:url"), sourceUrl);

  const rawPrice = offer?.price ?? offer?.lowPrice ?? spec?.price ?? meta("product:price:amount") ?? meta("og:price:amount");
  const currency = (clean(offer?.priceCurrency) ?? clean(spec?.priceCurrency) ?? meta("product:price:currency") ?? meta("og:price:currency"))?.toUpperCase() ?? null;

  const warnings: string[] = [];
  let priceMinor: number | null = null;
  if (rawPrice !== undefined && rawPrice !== null && rawPrice !== "") {
    if (currency && currency !== "GBP") warnings.push(`The price is in ${currency}, so it wasn't filled in. Enter it in pounds.`);
    else {
      priceMinor = typeof rawPrice === "string" || typeof rawPrice === "number" ? parsePriceString(rawPrice) : null;
      if (priceMinor === null) warnings.push("We couldn't read the price. Please enter it.");
      else if (!currency) warnings.push("The page doesn't say what currency the price is in. Please check it.");
    }
  }
  if (!title) warnings.push("We couldn't find a title. Please enter one.");

  return {
    title: clip(title, TITLE_MAX),
    description: description ? clip(description, DESCRIPTION_MAX) : null,
    imageUrl: image,
    priceMinor,
    currency: priceMinor === null ? null : (currency ?? "GBP"),
    canonicalUrl: canonical,
    sourceUrl,
    warnings,
  };
}
