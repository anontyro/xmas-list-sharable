import { describe, expect, it } from "vitest";
import { formatGBP, minorToPounds, parsePoundsToMinor } from "@/lib/money";

describe("parsePoundsToMinor", () => {
  it.each([["12", 1200], ["12.5", 1250], ["12.50", 1250], ["0.07", 7], ["999999.99", 99999999]])("%s -> %i", (input, minor) => {
    expect(parsePoundsToMinor(input)).toBe(minor);
  });
  it.each(["-1", "1.234", "abc", "1000000", "1e3", "", "£5", "5."])("rejects %j", (input) => {
    expect(parsePoundsToMinor(input)).toBeNull();
  });
});

describe("minorToPounds", () => {
  it("round-trips with parsePoundsToMinor and leaves null empty", () => {
    expect(minorToPounds(1250)).toBe("12.50");
    expect(minorToPounds(7)).toBe("0.07");
    expect(minorToPounds(null)).toBe("");
    for (const m of [0, 1, 99, 100, 12999, 99999999]) expect(parsePoundsToMinor(minorToPounds(m))).toBe(m);
  });
});

describe("formatGBP", () => {
  it("formats pence as pounds", () => {
    expect(formatGBP(12999)).toBe("£129.99");
    expect(formatGBP(7)).toBe("£0.07");
    expect(formatGBP(100000)).toBe("£1,000.00");
  });
});
