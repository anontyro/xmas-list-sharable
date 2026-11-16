import { describe, expect, it } from "vitest";
import { generateSlug } from "@/features/wishlists/slug";

describe("generateSlug", () => {
  it("makes 10 base62 characters with no duplicates in 10,000 slugs", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const s = generateSlug();
      expect(s).toMatch(/^[0-9A-Za-z]{10}$/);
      seen.add(s);
    }
    expect(seen.size).toBe(10_000);
  });
  it("uses the whole alphabet roughly evenly", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 20_000; i++) for (const c of generateSlug()) counts.set(c, (counts.get(c) ?? 0) + 1);
    expect(counts.size).toBe(62);
    const values = [...counts.values()];
    expect(Math.max(...values) / Math.min(...values)).toBeLessThan(1.2); // ~3200 each, so 20% is >10 sigma
  });
});
