import { describe, expect, it } from "vitest";
import { db } from "./db-harness";
import { authLimit } from "@/db/schema";
import { clearFailures, isBlocked, recordFailure } from "@/lib/security/rate-limit";

describe("rate limit", () => {
  it("blocks on the 5th failure and not before", async () => {
    for (let i = 0; i < 4; i++) await recordFailure("owner:a");
    expect(await isBlocked("owner:a")).toBe(false);
    await recordFailure("owner:a");
    expect(await isBlocked("owner:a")).toBe(true);
  });

  it("stays blocked until cleared, and other keys are unaffected", async () => {
    for (let i = 0; i < 5; i++) await recordFailure("owner:a");
    expect(await isBlocked("owner:b")).toBe(false);
    await clearFailures("owner:a");
    expect(await isBlocked("owner:a")).toBe(false);
  });

  it("counts parallel failures without losing any", async () => {
    await Promise.all(Array.from({ length: 5 }, () => recordFailure("admin:ip")));
    expect(await isBlocked("admin:ip")).toBe(true);
    const [row] = await db.select().from(authLimit);
    expect(row.attemptCount).toBe(5);
  });

  it("starts a fresh count once the window has passed", async () => {
    await recordFailure("owner:c");
    await db.update(authLimit).set({ windowStart: new Date(Date.now() - 16 * 60_000) });
    await recordFailure("owner:c");
    const [row] = await db.select().from(authLimit);
    expect(row.attemptCount).toBe(1);
  });

  it("honours a custom limit", async () => {
    for (let i = 0; i < 20; i++) await recordFailure("import:m", 21);
    expect(await isBlocked("import:m")).toBe(false);
    await recordFailure("import:m", 21);
    expect(await isBlocked("import:m")).toBe(true);
  });
});
