import { describe, expect, it } from "vitest";
import { tokens, type TokenName } from "@/theme/tokens";

const channel = (hex: string, i: number) => {
  const c = parseInt(hex.slice(i, i + 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
/** WCAG 2 contrast ratio between two #RRGGBB colours. */
const ratio = (a: TokenName, b: TokenName) => {
  const [hi, lo] = [luminance(tokens[a]), luminance(tokens[b])].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Every text-on-background pairing the Sticker Book uses (README "Contrast" plus the screens).
const TEXT: [TokenName, TokenName][] = [
  ["ink", "cream"], ["ink", "white"], ["white", "red"], ["white", "green"], ["ink", "yellow"], ["ink", "pink"], ["ink", "sky"], ["ink", "mint"],
  ["muted", "cream"], ["muted", "white"], ["muted", "yellow"], ["cream", "red"], ["danger", "white"], ["red", "cream"], ["red", "white"], ["green", "cream"],
];
// Focus rings and the borders that outline controls need 3:1 against what they sit on (WCAG 2.2 non-text contrast).
const NON_TEXT: [TokenName, TokenName][] = [
  ["ink", "cream"], ["ink", "white"], ["ink", "yellow"], ["ink", "pink"], ["ink", "sky"], ["ink", "mint"], ["cream", "red"],
];

describe("Sticker Book colour contrast", () => {
  it.each(TEXT)("text %s on %s is at least 4.5:1", (fg, bg) => {
    expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT)("focus ring and border %s against %s is at least 3:1", (fg, bg) => {
    expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
  });

  it("explains the focus ring choice: the README's sky ring fails, and ink fails on the red bar", () => {
    expect(ratio("sky", "white")).toBeLessThan(3);
    expect(ratio("sky", "cream")).toBeLessThan(3);
    expect(ratio("ink", "red")).toBeLessThan(3); // hence cream on the top bar
  });
});
