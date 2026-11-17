import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import Sticker from "@/components/ui/Sticker";
import { STICKER_NAMES, STICKERS } from "@/components/ui/sticker-names";

describe("Sticker", () => {
  it("is decorative by default and uses the given alt otherwise", () => {
    expect(renderToStaticMarkup(createElement(Sticker, { name: "holly" }))).toContain('alt=""');
    expect(renderToStaticMarkup(createElement(Sticker, { name: "holly", alt: "Holly" }))).toContain('alt="Holly"');
  });

  it("keeps the sticker's own shape: height follows width", () => {
    const [w, h] = STICKERS.tree;
    const html = renderToStaticMarkup(createElement(Sticker, { name: "tree", width: 64 }));
    expect(html).toContain('width="64"');
    expect(html).toContain(`height="${Math.round((64 * h) / w)}"`);
  });

  it("draws the white outline and soft shadow as a filter", () => {
    expect(renderToStaticMarkup(createElement(Sticker, { name: "star" }))).toContain("drop-shadow(2px 0 0 #fff)");
  });

  it("only accepts names in the pack", () => {
    // @ts-expect-error not a sticker in the pack
    createElement(Sticker, { name: "nope" });
  });
});

describe("sticker pack", () => {
  it("has exactly 36 stickers, each with a file, and no stray files", () => {
    expect(STICKER_NAMES).toHaveLength(36);
    const files = readdirSync("public/stickers").filter((f) => f.endsWith(".png")).map((f) => f.slice(0, -4)).sort();
    expect(files).toEqual([...STICKER_NAMES].sort());
    for (const n of STICKER_NAMES) expect(existsSync(`public/stickers/${n}.png`), n).toBe(true);
  });

  it("records each file's real width and height (PNG header)", () => {
    for (const n of STICKER_NAMES) {
      const png = readFileSync(`public/stickers/${n}.png`);
      expect(png.subarray(1, 4).toString(), n).toBe("PNG");
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], n).toEqual([...STICKERS[n]]);
    }
  });

  it("is byte-for-byte the design pack", () => {
    for (const n of STICKER_NAMES) {
      expect(readFileSync(`public/stickers/${n}.png`).equals(readFileSync(`docs/family-gifts-design/icons/${n}.png`)), n).toBe(true);
    }
  });
});
