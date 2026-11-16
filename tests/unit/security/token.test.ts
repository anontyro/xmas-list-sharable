import { describe, expect, it } from "vitest";
import { hashToken, newToken, safeEqual } from "@/lib/security/token";

describe("tokens", () => {
  it("makes 43-character unique base64url tokens", () => {
    const seen = new Set(Array.from({ length: 1000 }, newToken));
    expect(seen.size).toBe(1000);
    for (const t of seen) expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  it("hashes to a stable 64-character hex string that is not the token", () => {
    const t = newToken();
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
  });
  it("compares strings safely, including different lengths", () => {
    expect(safeEqual("secret", "secret")).toBe(true);
    expect(safeEqual("secret", "secreT")).toBe(false);
    expect(safeEqual("secret", "secret-longer")).toBe(false);
  });
});
