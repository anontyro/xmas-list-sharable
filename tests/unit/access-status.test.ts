import { describe, expect, it } from "vitest";
import { statusLabel } from "@/features/authentication/components/AccessPanel";

const now = new Date("2026-11-18T12:00:00Z");

describe("statusLabel", () => {
  it("says there is no link when none is active", () => {
    expect(statusLabel({ active: false, createdAt: null }, now)).toBe("No link yet");
    expect(statusLabel({ active: false, createdAt: "2026-11-18T09:00:00Z" }, now)).toBe("No link yet");
  });
  it("says made today for a link made on the same London day, and the date for an older one", () => {
    expect(statusLabel({ active: true, createdAt: "2026-11-18T00:05:00Z" }, now)).toBe("Active · made today");
    expect(statusLabel({ active: true, createdAt: "2026-11-03T09:00:00Z" }, now)).toBe("Active · made 3 Nov");
  });
  it("compares London days, not UTC days, in summer time", () => {
    // 23:30 UTC on 30 June is 00:30 on 1 July in London.
    expect(statusLabel({ active: true, createdAt: "2026-06-30T23:30:00Z" }, new Date("2026-07-01T10:00:00Z"))).toBe("Active · made today");
    expect(statusLabel({ active: true, createdAt: "2026-06-30T22:30:00Z" }, new Date("2026-07-01T10:00:00Z"))).toBe("Active · made 30 Jun");
  });
});
