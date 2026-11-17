import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, requestHeaders, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { guest, household, recoveryToken } from "@/db/schema";
import { POST } from "@/app/api/recovery/exchange/route";
import { createRecoveryLink, recoveryLinkStatus, revokeRecoveryLink } from "@/features/authentication/recovery-actions";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { createSession, getSession } from "@/lib/auth/session";
import { hashToken } from "@/lib/security/token";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => resetRequest());

async function world() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [a, b] = await db.insert(guest).values([{ householdId: h.id, displayName: "Ann" }, { householdId: h.id, displayName: "Bob" }]).returning();
  const signIn = async (g: { id: string }) => cookieJar.set(COOKIE_NAMES.guest, (await createSession("guest", g.id)).token);
  return { a, b, signIn };
}
const exchange = (token: unknown) => POST(new Request("http://x/api/recovery/exchange", { method: "POST", body: JSON.stringify({ token }) }));
const tokenOf = (path: string) => path.split("#t=")[1];

describe("recovery links", () => {
  it("stores only a hash of the token and returns the link once", async () => {
    const { a, signIn } = await world();
    await signIn(a);
    const r = await createRecoveryLink();
    if (!r.ok) throw new Error("expected ok");
    const token = tokenOf(r.data.path);
    expect(token).toHaveLength(43);
    const rows = await db.select().from(recoveryToken);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(rows)).not.toContain(token);
  });

  it("exchanges a valid token for a session of the original guest, with no-store headers", async () => {
    const { a, signIn } = await world();
    await signIn(a);
    const r = await createRecoveryLink();
    if (!r.ok) throw new Error("expected ok");
    resetRequest(); // a different browser
    const res = await exchange(tokenOf(r.data.path));
    expect(res.status).toBe(204);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(await getSession("guest", cookieJar.get(COOKIE_NAMES.guest)!)).toEqual({ principalType: "guest", principalId: a.id });
  });

  it("gives the same 404 for unknown, malformed, revoked and replaced tokens", async () => {
    const { a, signIn } = await world();
    await signIn(a);
    const first = await createRecoveryLink();
    const second = await createRecoveryLink();
    if (!first.ok || !second.ok) throw new Error("expected ok");
    const oldToken = tokenOf(first.data.path);
    const newToken = tokenOf(second.data.path);
    await revokeRecoveryLink();
    resetRequest();

    const bodies = [];
    for (const t of [oldToken, newToken, "a".repeat(43), "short", 42, null]) {
      const res = await exchange(t);
      expect(res.status).toBe(404);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      bodies.push(await res.text());
    }
    expect(new Set(bodies).size).toBe(1);
    expect((await POST(new Request("http://x", { method: "POST", body: "not json" }))).status).toBe(404);
    expect(cookieJar.has(COOKIE_NAMES.guest)).toBe(false);
  });

  it("a new link replaces the old one, and existing sessions keep working", async () => {
    const { a, signIn } = await world();
    await signIn(a);
    const sessionToken = cookieJar.get(COOKIE_NAMES.guest)!;
    const first = await createRecoveryLink();
    const second = await createRecoveryLink();
    if (!first.ok || !second.ok) throw new Error("expected ok");
    expect(await db.select().from(recoveryToken)).toHaveLength(2);
    expect((await exchange(tokenOf(first.data.path))).status).toBe(404);
    expect((await exchange(tokenOf(second.data.path))).status).toBe(204);
    expect(await getSession("guest", sessionToken)).not.toBeNull();
    expect(await recoveryLinkStatus()).toMatchObject({ ok: true, data: { active: true } });
  });

  it("ten simultaneous makes leave exactly one active link and no failures", async () => {
    const { a, signIn } = await world();
    await signIn(a);
    const results = await Promise.all(Array.from({ length: 10 }, () => createRecoveryLink()));
    expect(results.every((r) => r.ok)).toBe(true);
    const rows = await db.select().from(recoveryToken);
    expect(rows).toHaveLength(10);
    expect(rows.filter((r) => r.revokedAt === null)).toHaveLength(1);
  });

  it("only a signed-in guest can make, turn off or check a link, and only their own", async () => {
    const { a, b, signIn } = await world();
    expect(await createRecoveryLink()).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    expect(await revokeRecoveryLink()).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    await signIn(a);
    const r = await createRecoveryLink();
    if (!r.ok) throw new Error("expected ok");
    resetRequest();
    await signIn(b);
    await revokeRecoveryLink(); // Bob's revoke touches Bob's links only
    expect((await exchange(tokenOf(r.data.path))).status).toBe(204);
    expect(await getSession("guest", cookieJar.get(COOKIE_NAMES.guest)!)).toEqual({ principalType: "guest", principalId: a.id });
  });

  it("throttles the 11th attempt from one address", async () => {
    await world();
    requestHeaders.set("x-forwarded-for", "9.9.9.9");
    for (let i = 0; i < 10; i++) expect((await exchange("x".repeat(43))).status).toBe(404);
    const res = await exchange("x".repeat(43));
    expect(res.status).toBe(429);
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
    requestHeaders.set("x-forwarded-for", "8.8.8.8");
    expect((await exchange("x".repeat(43))).status).toBe(404);
  });
});
