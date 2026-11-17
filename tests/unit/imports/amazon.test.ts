import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_INPUT_BYTES, parseAmazon, parseAmazonHtml, parseAmazonText } from "@/features/imports/amazon";

const count = (r: ReturnType<typeof parseAmazon>) => (r.ok ? r.data.length : -1);
const fx = (name: string) => readFileSync(`tests/fixtures/amazon/${name}`, "utf8");

describe("parseAmazonHtml", () => {
  it("reads title, canonical link, price and image for each product, once per ASIN", () => {
    const drafts = parseAmazonHtml(fx("wishlist-basic.html"));
    expect(drafts.map((d) => [d.title, d.canonicalUrl, d.priceMinor])).toEqual([
      ["Noise-Cancelling Headphones", "https://www.amazon.co.uk/dp/B08N5WRWNW", 12999],
      ["LEGO Botanical Bouquet", "https://www.amazon.co.uk/dp/B07XJ8C8F5", 104900],
      ["Cosy Fleece Blanket", "https://www.amazon.co.uk/dp/B09G9FPHY6", 2450],
    ]);
    expect(drafts[0]).toMatchObject({ imageUrl: "https://m.media-amazon.com/images/I/headphones.jpg", currency: "GBP", uncertain: false, warnings: [] });
  });

  it("marks drafts with missing fields as uncertain and ignores links that are not products", () => {
    const drafts = parseAmazonHtml(fx("wishlist-partial.html"));
    expect(drafts.map((d) => [d.title, d.priceMinor, d.uncertain])).toEqual([
      ["", null, true],
      ["Item with no price", null, true],
      ["Complete item", 500, false],
    ]);
    expect(drafts[0].imageUrl).toBeNull(); // javascript: is not an image link
    expect(drafts[0].warnings).toContain("No title found. Type one in.");
  });

  it("returns text only: no script, markup or event handlers survive", () => {
    const [d] = parseAmazonHtml(fx("wishlist-hostile.html"));
    expect(d.title).toBe("Mug");
    expect(JSON.stringify(d)).not.toMatch(/alert|onerror|<script|<img/i);
  });
});

describe("parseAmazonText", () => {
  it("pairs each link with the nearest earlier line, picks up prices, and handles same-line titles", () => {
    const drafts = parseAmazonText(fx("wishlist-copied.txt"));
    expect(drafts.map((d) => [d.title, d.canonicalUrl!.split("/dp/")[1], d.priceMinor, d.uncertain])).toEqual([
      ["Noise-Cancelling Headphones", "B08N5WRWNW", 12999, false],
      ["Cosy Fleece Blanket", "B09G9FPHY6", null, true],
      ["LEGO Botanical Bouquet", "B07XJ8C8F5", null, true],
      ["", "B00NOTITLE", null, true],
    ]);
  });
});

describe("parseAmazon", () => {
  it("chooses HTML or text by what was pasted", () => {
    expect(count(parseAmazon(fx("wishlist-basic.html")))).toBe(3);
    expect(count(parseAmazon(fx("wishlist-copied.txt")))).toBe(4);
  });

  it("falls back to link scanning when HTML has no product markup but the text has links", () => {
    expect(count(parseAmazon("<p>Nice mug</p> https://www.amazon.co.uk/dp/B00ZZZZZZZ"))).toBe(1);
  });

  it.each(["", "   ", "Just some words about gifts.", "<div><p>unclosed <b>tags", "<html><body>no links</body></html>", "https://example.com/dp/short"])(
    "gives the manual-entry message and never throws for %j",
    (input) => {
      expect(parseAmazon(input)).toMatchObject({ ok: false, error: { code: "NOTHING_FOUND", message: expect.stringContaining("add them by hand") } });
    },
  );

  it("refuses input over 500 KB", () => {
    expect(parseAmazon("x".repeat(MAX_INPUT_BYTES + 1))).toMatchObject({ ok: false, error: { code: "INPUT_TOO_LARGE" } });
    expect(parseAmazon(`${fx("wishlist-copied.txt")}${" ".repeat(MAX_INPUT_BYTES - 400)}`).ok).toBe(true);
  });

  it("returns at most 100 drafts", () => {
    const many = Array.from({ length: 150 }, (_, i) => `Gift ${i}\nhttps://www.amazon.co.uk/dp/B0${String(i).padStart(8, "0")}`).join("\n");
    expect(count(parseAmazon(many))).toBe(100);
  });
});
