import { describe, expect, it } from "vitest";
import { db } from "./db-harness";
import { household, session } from "@/db/schema";
import { cookieOptions } from "@/lib/auth/cookies";
import { createSession, getSession, revokeSession, revokeSessionsFor, SESSION_TTL_MS } from "@/lib/auth/session";
import { hashToken } from "@/lib/security/token";

async function principal() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  return h.id;
}

describe("sessions", () => {
  it("resolves a fresh token for its own role only", async () => {
    const id = await principal();
    const { token } = await createSession("owner", id);
    expect(await getSession("owner", token)).toEqual({ principalType: "owner", principalId: id });
    expect(await getSession("guest", token)).toBeNull();
    expect(await getSession("admin", token)).toBeNull();
  });

  it("returns nothing for unknown, revoked and expired tokens", async () => {
    const id = await principal();
    expect(await getSession("guest", "nope")).toBeNull();
    const a = await createSession("guest", id);
    await revokeSession(a.token);
    expect(await getSession("guest", a.token)).toBeNull();
    const b = await createSession("guest", id);
    await db.update(session).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await getSession("guest", b.token)).toBeNull();
  });

  it("stores only the hash of the token", async () => {
    const id = await principal();
    const { token } = await createSession("admin", id);
    const rows = await db.select().from(session);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it("revokes every session of one principal", async () => {
    const id = await principal();
    const a = await createSession("owner", id);
    const b = await createSession("owner", id);
    await revokeSessionsFor("owner", id);
    expect(await getSession("owner", a.token)).toBeNull();
    expect(await getSession("owner", b.token)).toBeNull();
  });

  it("uses the TTLs from the spec", async () => {
    const id = await principal();
    for (const [type, hours] of [["admin", 8], ["owner", 12], ["guest", 180 * 24]] as const) {
      const { expiresAt } = await createSession(type, id);
      expect(Math.abs(expiresAt.getTime() - Date.now() - hours * 3_600_000)).toBeLessThan(5000);
      expect(SESSION_TTL_MS[type]).toBe(hours * 3_600_000);
    }
  });
});

describe("cookie options", () => {
  it("are HttpOnly, SameSite=Lax, site-wide, and Secure only in production", () => {
    const env = process.env as Record<string, string | undefined>;
    const before = env.NODE_ENV;
    try {
      env.NODE_ENV = "production";
      expect(cookieOptions("owner", new Date())).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", secure: true, maxAge: 43200 });
      env.NODE_ENV = "development";
      expect(cookieOptions("guest", new Date()).secure).toBe(false);
    } finally {
      env.NODE_ENV = before;
    }
  });
});
