import { describe, expect, it } from "vitest";
import { stickerForGift } from "@/components/sticker/gift-sticker";
import { hashId, TINTS, tintFor } from "@/components/sticker/tint";

const ID = "11111111-1111-4111-8111-111111111111";

describe("stickerForGift", () => {
  it.each([
    ["Wool hiking socks, 2 pack", "stocking"],
    ["Merino wool scarf", "stocking"],
    ["Nordic Winters cookbook", "parcel"],
    ["Fantasy novel", "parcel"],
    ["Scented candle set", "sparkles"],
    ["Cast-iron casserole dish", "box"],
    ["Stoneware mug set, 4 pieces", "box"],
    ["Noise-cancelling headphones", "box"],
    ["Jigsaw puzzle, 1000 pieces", "presentgreen"],
    ["LEGO Botanical Bouquet", "presentgreen"],
    ["Bookshop voucher", "gifttag"],
  ] as const)("picks the keyword sticker for %j", (title, sticker) => {
    expect(stickerForGift(title, ID)).toBe(sticker);
  });

  it("ignores case, and short words only match as whole words", () => {
    expect(stickerForGift("WOOL GLOVES", ID)).toBe("stocking");
    expect(stickerForGift("Woolly HAT", ID)).toBe("stocking");
    // "what", "cardigan" and "pantry" are not a hat, a card or a pan.
    for (const title of ["What a lovely thing", "Cardigan", "Pantry shelf"]) {
      expect(["stocking", "gifttag", "box"]).not.toContain(stickerForGift(title, ID));
    }
  });

  it("gives an unknown title the same sticker every time, and spreads different ids over the fallback set", () => {
    expect(stickerForGift("Zxqv", ID)).toBe(stickerForGift("Zxqv", ID));
    const seen = new Set(Array.from({ length: 200 }, (_, i) => stickerForGift("Zxqv", `gift-${i}`)));
    expect(seen).toEqual(new Set(["presentred", "presentgreen", "presentgold", "parcel", "box", "gifttag"]));
  });
});

describe("tintFor", () => {
  it("is stable for an id and uses all four tints across many ids", () => {
    expect(tintFor(ID)).toBe(tintFor(ID));
    const seen = new Set(Array.from({ length: 100 }, (_, i) => tintFor(`member-${i}`)));
    expect(seen).toEqual(new Set(TINTS));
  });

  it("hashes to a non-negative integer", () => {
    for (const s of ["", "a", ID]) expect(Number.isInteger(hashId(s)) && hashId(s) >= 0).toBe(true);
  });
});
