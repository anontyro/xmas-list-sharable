import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { db } from "./db-harness";
import { authLimit, guest, household, recoveryToken, session } from "@/db/schema";

const hasPsql = spawnSync("psql", ["--version"]).status === 0;
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);

describe.skipIf(!hasPsql)("scripts/cleanup.sh", () => {
  it("removes old sessions, old revoked links and finished throttles, and keeps everything still in use", async () => {
    const [h] = await db.insert(household).values({ name: "F" }).returning();
    const [g] = await db.insert(guest).values({ householdId: h.id, displayName: "Ann" }).returning();
    const s = (hash: string, expiresAt: Date, revokedAt: Date | null = null) => ({ principalType: "guest", principalId: g.id, tokenHash: hash, expiresAt, revokedAt });
    await db.insert(session).values([
      s("expired-long-ago", daysAgo(40)),
      s("revoked-long-ago", daysAhead(100), daysAgo(40)),
      s("live", daysAhead(100)),
      s("expired-yesterday", daysAgo(1)), // kept for a while, in case it is looked at
      s("revoked-yesterday", daysAhead(100), daysAgo(1)),
    ]);
    await db.insert(recoveryToken).values([
      { guestId: g.id, tokenHash: "old-revoked", revokedAt: daysAgo(40) },
      { guestId: g.id, tokenHash: "active" },
    ]);
    await db.insert(authLimit).values([
      { subjectKey: "old", windowStart: daysAgo(3), attemptCount: 2, blockedUntil: null },
      { subjectKey: "old-block-over", windowStart: daysAgo(3), attemptCount: 5, blockedUntil: daysAgo(2) },
      { subjectKey: "still-blocked", windowStart: daysAgo(3), attemptCount: 5, blockedUntil: daysAhead(1) },
      { subjectKey: "recent", windowStart: new Date(), attemptCount: 1, blockedUntil: null },
    ]);

    const r = spawnSync("scripts/cleanup.sh", { env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);

    expect((await db.select().from(session)).map((x) => x.tokenHash).sort()).toEqual(["expired-yesterday", "live", "revoked-yesterday"]);
    expect((await db.select().from(recoveryToken)).map((x) => x.tokenHash)).toEqual(["active"]);
    expect((await db.select().from(authLimit)).map((x) => x.subjectKey).sort()).toEqual(["recent", "still-blocked"]);
  });
});
