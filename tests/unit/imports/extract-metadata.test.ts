import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findDuplicate, normalizeUrl } from "@/features/imports/duplicates";
import { extractMetadata, parsePriceString } from "@/features/imports/extract-metadata";

const fixture = (name: string) => readFileSync(`tests/fixtures/${name}`, "utf8");

describe("extractMetadata", () => {
  it("reads a JSON-LD Product (inside @graph) ahead of Open Graph tags", () => {
    const d = extractMetadata(fixture("product-jsonld.html"), "https://shop.example/p/headphones");
    expect(d).toEqual({
      title: "Noise-Cancelling Headphones",
      description: "Over-ear, 30 hour battery.",
      imageUrl: "https://shop.example/img/headphones.jpg",
      priceMinor: 12999,
      currency: "GBP",
      canonicalUrl: "https://shop.example/p/headphones?ref=canonical",
      sourceUrl: "https://shop.example/p/headphones",
      warnings: [],
    });
  });

  it("falls back to Open Graph and product price tags", () => {
    const d = extractMetadata(fixture("product-opengraph.html"), "https://books.example/cookbook");
    expect(d).toMatchObject({ title: "The Family Cookbook", description: "200 recipes & stories.", imageUrl: "https://cdn.books.example/cookbook.png", priceMinor: 2499, currency: "GBP", canonicalUrl: "https://books.example/cookbook", warnings: [] });
  });

  it("falls back to the page title with extra spaces tidied, and has no price", () => {
    const d = extractMetadata(fixture("product-bare.html"), "https://corner.example/x");
    expect(d).toMatchObject({ title: "Plain Page | Corner Shop", description: "Just a page with a title.", priceMinor: null, currency: null, imageUrl: null, canonicalUrl: null, warnings: [] });
  });

  it("keeps hostile markup as inert text, drops unsafe links, and never runs scripts", () => {
    const d = extractMetadata(fixture("product-hostile.html"), "https://evil.example/");
    expect(d.title).toBe("<script>alert(1)</script> Cheap <img src=x onerror=alert(2)>");
    expect(d.description).toBe("<b onmouseover=alert(3)>bold</b>");
    expect(d.imageUrl).toBeNull(); // javascript: is not http(s)
    expect(d.canonicalUrl).toBeNull(); // nor is data:
    expect(typeof d.title).toBe("string");
    expect((globalThis as { pwned?: boolean }).pwned).toBeUndefined();
  });

  it("drops a price in another currency and says so", () => {
    const html = `<script type="application/ld+json">{"@type":"Product","name":"Hat","offers":{"price":"19.99","priceCurrency":"USD"}}</script>`;
    const d = extractMetadata(html, "https://x.example/");
    expect(d.priceMinor).toBeNull();
    expect(d.warnings).toEqual(["The price is in USD, so it wasn't filled in. Enter it in pounds."]);
  });

  it("keeps a price with no stated currency but asks the owner to check it", () => {
    const d = extractMetadata(`<meta property="product:price:amount" content="9.50"><title>X</title>`, "https://x.example/");
    expect(d).toMatchObject({ priceMinor: 950, currency: "GBP" });
    expect(d.warnings).toEqual(["The page doesn't say what currency the price is in. Please check it."]);
  });

  it("warns about an unreadable price and a missing title, and survives broken JSON-LD", () => {
    const d = extractMetadata(`<script type="application/ld+json">{ nope</script><meta property="product:price:amount" content="free">`, "https://x.example/");
    expect(d.title).toBe("");
    expect(d.warnings).toEqual(["We couldn't read the price. Please enter it.", "We couldn't find a title. Please enter one."]);
  });

  it("caps title and description to the lengths an item allows", () => {
    const d = extractMetadata(`<title>${"t".repeat(300)}</title><meta name="description" content="${"d".repeat(2000)}">`, "https://x.example/");
    expect(d.title).toHaveLength(120);
    expect(d.description).toHaveLength(1000);
  });

  it("copes with empty and non-HTML input", () => {
    expect(extractMetadata("", "https://x.example/").title).toBe("");
    expect(extractMetadata("just some text", "https://x.example/").title).toBe("");
  });
});

describe("parsePriceString", () => {
  it.each([["129.99", 12999], ["1,299.00", 129900], ["1.299,00", 129900], ["12,50", 1250], ["1,299", 129900], ["£24", 2400], [19.5, 1950], ["0.07", 7]])("%s -> %s", (raw, minor) => {
    expect(parsePriceString(raw)).toBe(minor);
  });
  it.each(["", "free", "n/a", "9999999"])("rejects %j", (raw) => {
    expect(parsePriceString(raw)).toBeNull();
  });
});

describe("duplicates", () => {
  it("treats case, fragments, tracking parameters, trailing slashes and parameter order as the same link", () => {
    const want = normalizeUrl("https://shop.example/p/1?a=1&b=2");
    expect(normalizeUrl("HTTPS://Shop.Example/p/1/?utm_source=x&b=2&a=1#top")).toBe(want);
    expect(normalizeUrl("https://shop.example/p/1?b=2&a=1&fbclid=abc")).toBe(want);
  });
  it("keeps genuinely different products apart", () => {
    expect(normalizeUrl("https://shop.example/p/1")).not.toBe(normalizeUrl("https://shop.example/p/2"));
    expect(normalizeUrl("https://shop.example/p?id=1")).not.toBe(normalizeUrl("https://shop.example/p?id=2"));
    expect(normalizeUrl("https://shop.example/")).toBe("https://shop.example/");
  });
  it("finds the matching existing item, and ignores items without a link", () => {
    const existing = [{ id: "a", productUrl: null }, { id: "b", productUrl: "https://shop.example/p/1/?utm_medium=mail" }];
    expect(findDuplicate("https://SHOP.example/p/1", existing)?.id).toBe("b");
    expect(findDuplicate("https://shop.example/p/9", existing)).toBeNull();
  });
});
