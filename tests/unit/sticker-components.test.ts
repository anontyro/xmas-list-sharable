import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync } from "node:fs";
import { ThemeProvider } from "@mui/material/styles";
import { describe, expect, it } from "vitest";
import { GiftThumbView } from "@/components/sticker/GiftThumb";
import Hero from "@/components/sticker/Hero";
import MemberAvatar from "@/components/sticker/MemberAvatar";
import Meter from "@/components/sticker/Meter";
import Note from "@/components/sticker/Note";
import PageWrap from "@/components/sticker/PageWrap";
import Pill from "@/components/sticker/Pill";
import Ribbon from "@/components/sticker/Ribbon";
import SplitLayout from "@/components/sticker/SplitLayout";
import Stat from "@/components/sticker/Stat";
import StickerCard from "@/components/sticker/StickerCard";
import Thumb from "@/components/sticker/Thumb";
import TwoColumn from "@/components/sticker/TwoColumn";
import { theme } from "@/theme/theme";

const render = (el: React.ReactElement) => renderToStaticMarkup(h(ThemeProvider, { theme }, el));

describe("Pill, Ribbon, Note, Stat", () => {
  it("carry their meaning in text", () => {
    expect(render(h(Pill, { tone: "yellow", children: "Reserved by Sam" }))).toContain("Reserved by Sam");
    expect(render(h(Ribbon, { tone: "red", children: "MOST WANTED" }))).toContain("MOST WANTED");
    const stat = render(h(Stat, { label: "Spent", value: "£19.50", tint: "mint" }));
    expect(stat).toContain("Spent");
    expect(stat).toContain("£19.50");
  });

  it("Note shows its sticker decoratively and only announces itself when asked", () => {
    const quiet = render(h(Note, { sticker: "sparkles", tint: "mint", children: "Found the title" }));
    expect(quiet).toContain('alt=""');
    expect(quiet).not.toContain("role=");
    expect(render(h(Note, { role: "alert", children: "Could not fetch" }))).toContain('role="alert"');
  });
});

describe("Hero", () => {
  it("renders the title as the page's h1, and a back link as a real link with a spoken label", () => {
    const html = render(h(Hero, { title: "Sarah's Christmas", subtitle: "2026 · 5 gifts", back: { label: "Family", href: "/" }, sticker: { name: "tree", width: 84, rotate: 7 } }));
    expect(html).toMatch(/<h1[^>]*>Sarah&#x27;s Christmas<\/h1>/);
    expect(html).toContain("2026 · 5 gifts");
    expect(html).toMatch(/<a [^>]*aria-label="Back to Family"[^>]*href="\/"/);
    expect(html).toContain("rotate(7deg)");
  });
});

describe("Meter", () => {
  const widths = (html: string) => [...html.matchAll(/data-meter-segment[^>]*style="width:([\d.]+)%/g)].map((m) => Number(m[1]));

  it("is an image with the caller's words", () => {
    const html = render(h(Meter, { label: "£19.50 spent and £129.99 more planned out of £250.00", segments: [{ percent: 8, tone: "green" }, { percent: 52, tone: "red" }] }));
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="£19.50 spent and £129.99 more planned out of £250.00"');
    expect(widths(html)).toEqual([8, 52]);
  });

  it("never adds up past 100%, and ignores negative or non-numeric shares", () => {
    expect(widths(render(h(Meter, { label: "x", segments: [{ percent: 70, tone: "green" }, { percent: 70, tone: "red" }] })))).toEqual([70, 30]);
    expect(widths(render(h(Meter, { label: "x", segments: [{ percent: -5, tone: "green" }, { percent: NaN, tone: "red" }] })))).toEqual([0, 0]);
  });
});

describe("Thumb, GiftThumbView, MemberAvatar", () => {
  const gift = { id: "g1", title: "Wool hiking socks", imageUrl: "https://shop.example/img/socks.jpg" };

  it("shows the product picture, decoratively and without a referrer", () => {
    const html = render(h(GiftThumbView, { ...gift, failed: false }));
    expect(html).toContain('src="https://shop.example/img/socks.jpg"');
    expect(html).toContain('alt=""');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain("/stickers/");
  });

  it("shows the title's sticker when there is no picture, and again when the picture failed", () => {
    expect(render(h(GiftThumbView, { ...gift, imageUrl: null, failed: false }))).toContain("stickers%2Fstocking.png");
    const failed = render(h(GiftThumbView, { ...gift, failed: true }));
    expect(failed).toContain("stickers%2Fstocking.png");
    expect(failed).not.toContain("shop.example");
  });

  it("MemberAvatar shows the picture sticker when set, else the initial, hidden from screen readers", () => {
    const withPicture = render(h(MemberAvatar, { id: "m1", name: "Mia", avatar: "child" }));
    expect(withPicture).toContain("stickers%2Fchild.png");
    expect(withPicture).toContain('aria-hidden="true"');
    const initial = render(h(MemberAvatar, { id: "m1", name: " sarah" }));
    expect(initial).toContain(">S<");
    expect(initial).not.toContain("stickers");
    expect(render(h(MemberAvatar, { id: "m1", name: "" }))).toContain(">?<");
    expect(render(h(Thumb, { tint: "mint", children: "x" }))).toContain("x");
  });
});

describe("layout pieces", () => {
  it("StickerCard renders its content with the chosen element", () => {
    expect(render(h(StickerCard, { tint: "cream", component: "article", children: "hello" }))).toMatch(/<article[^>]*>hello<\/article>/);
  });

  it("TwoColumn renders the sidebar as an aside after the content", () => {
    const html = render(h(TwoColumn, { main: h("p", null, "main"), side: h("p", null, "side"), sideLast: true }));
    expect(html.indexOf("main")).toBeLessThan(html.indexOf("side"));
    expect(html).toMatch(/<aside[^>]*><p>side<\/p><\/aside>/);
  });

  it("SplitLayout has the brand panel, the badge and the form, and PageWrap wraps its children", () => {
    const html = render(h(SplitLayout, { badge: "Christmas 2026", children: h("form", null, "the form") }));
    expect(html).toContain("Christmas 2026");
    expect(html).toContain("the form");
    expect(html).toContain("stickers%2Fgingerbread.png");
    expect(render(h(PageWrap, { children: "inside" }))).toContain("inside");
  });
});

describe("theme tokens only", () => {
  it("no source file outside tokens.ts writes a raw colour", () => {
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
    for (const file of walk("src").filter((f) => /\.tsx?$/.test(f) && !f.endsWith("src/theme/tokens.ts"))) {
      const src = readFileSync(file, "utf8").replace(/\/\/.*$/gm, "");
      expect(src.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g), file).toBeNull();
    }
  });
});
