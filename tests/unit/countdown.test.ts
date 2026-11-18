import { describe, expect, it } from "vitest";
import { daysUntilChristmas } from "@/features/wishlists/countdown";

const at = (iso: string) => daysUntilChristmas(new Date(iso));

describe("daysUntilChristmas", () => {
  it.each([
    ["2026-11-16T12:00:00Z", 39],
    ["2026-12-24T12:00:00Z", 1],
    ["2026-12-24T23:30:00Z", 1],
    ["2026-12-25T00:30:00Z", 0],
    ["2026-12-25T23:59:00Z", 0],
    ["2026-12-26T00:00:00Z", null],
    ["2026-12-31T12:00:00Z", null],
    ["2026-01-01T00:00:00Z", 358],
  ])("%s gives %s", (iso, days) => expect(at(iso)).toBe(days));

  it("uses the London date: in summer time, 23:30 UTC is already the next day", () => {
    expect(at("2026-06-30T23:30:00Z")).toBe(177); // London is 1 July
    expect(at("2026-06-30T22:30:00Z")).toBe(178); // London is still 30 June
  });

  it("counts whole days across the March and October clock changes", () => {
    expect(at("2026-03-28T12:00:00Z")).toBe(272);
    expect(at("2026-03-29T12:00:00Z")).toBe(271); // the day the clocks go forward
    expect(at("2026-10-24T23:30:00Z")).toBe(61); // London is already 25 October
    expect(at("2026-10-25T12:00:00Z")).toBe(61); // the day the clocks go back
    expect(at("2026-10-26T12:00:00Z")).toBe(60);
  });
});
