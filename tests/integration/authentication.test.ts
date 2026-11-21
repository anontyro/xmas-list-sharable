import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, requestHeaders, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { eq } from "drizzle-orm";
import { guest, household, member, session } from "@/db/schema";
import { adminLogin, adminLogout } from "@/features/authentication/admin-login";
import { ownerLogin } from "@/features/authentication/owner-login";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { hashPin } from "@/lib/security/password";
import { LOGIN_FAILED_MESSAGE } from "@/lib/security/rate-limit";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  resetRequest();
  requestHeaders.set("x-forwarded-for", "1.2.3.4, 10.0.0.1");
});

async function owner(active = true) {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [m] = await db.insert(member).values({ householdId: h.id, displayName: "Alex", pinHash: await hashPin("123456"), active, approvedAt: new Date() }).returning();
  return m.id;
}

describe("admin login", () => {
  it("rejects a wrong secret: no session, generic message", async () => {
    await db.insert(household).values({ name: "F" });
    const r = await adminLogin("wrong-secret");
    expect(r).toEqual({ ok: false, error: { code: "LOGIN_FAILED", message: LOGIN_FAILED_MESSAGE } });
    expect(await db.select().from(session)).toHaveLength(0);
    expect(cookieJar.has(COOKIE_NAMES.admin)).toBe(false);
  });

  it("accepts the right secret and sets the admin cookie, then logout revokes it", async () => {
    await db.insert(household).values({ name: "F" });
    expect((await adminLogin(process.env.ADMIN_SECRET!)).ok).toBe(true);
    expect(cookieJar.has(COOKIE_NAMES.admin)).toBe(true);
    await adminLogout();
    expect(cookieJar.has(COOKIE_NAMES.admin)).toBe(false);
    const [row] = await db.select().from(session);
    expect(row.revokedAt).not.toBeNull();
  });

  it("blocks after five failures even with the right secret", async () => {
    await db.insert(household).values({ name: "F" });
    for (let i = 0; i < 5; i++) await adminLogin("wrong");
    const r = await adminLogin(process.env.ADMIN_SECRET!);
    expect(r.ok).toBe(false);
    expect(cookieJar.has(COOKIE_NAMES.admin)).toBe(false);
  });
});

describe("owner login", () => {
  it("rejects a wrong PIN with no session and the generic message", async () => {
    const id = await owner();
    const r = await ownerLogin(id, "654321");
    expect(r).toEqual({ ok: false, error: { code: "LOGIN_FAILED", message: LOGIN_FAILED_MESSAGE } });
    expect(await db.select().from(session)).toHaveLength(0);
  });

  it("accepts the right PIN and signs in as the member and as their linked guest", async () => {
    const id = await owner();
    expect((await ownerLogin(id, "123456")).ok).toBe(true);
    expect(cookieJar.has(COOKIE_NAMES.owner)).toBe(true);
    expect(cookieJar.has(COOKIE_NAMES.guest)).toBe(true);
    expect(await db.select().from(guest)).toMatchObject([{ memberId: id, displayName: "Alex" }]);
    await ownerLogin(id, "123456"); // a second sign-in reuses the guest
    expect(await db.select().from(guest)).toHaveLength(1);
  });

  it("signs a member who is waiting for approval in as a viewer only", async () => {
    const id = await owner();
    await db.update(member).set({ approvedAt: null });
    expect(await ownerLogin(id, "123456")).toMatchObject({ ok: false, error: { code: "PENDING_APPROVAL" } });
    expect(cookieJar.has(COOKIE_NAMES.guest)).toBe(true);
    expect(cookieJar.has(COOKIE_NAMES.owner)).toBe(false);
    expect((await db.select().from(session)).map((s) => s.principalType)).toEqual(["guest"]);
  });

  it("a wrong PIN sets neither cookie and links nothing", async () => {
    const id = await owner();
    await ownerLogin(id, "000000");
    expect([...cookieJar.keys()]).toEqual([]);
    expect(await db.select().from(guest)).toHaveLength(0);
    expect(await db.select().from(member).where(eq(member.id, id))).toHaveLength(1);
  });

  it("blocks the 7th attempt after six wrong PINs, even with the right PIN", async () => {
    const id = await owner();
    for (let i = 0; i < 6; i++) await ownerLogin(id, "000000");
    expect((await ownerLogin(id, "123456")).ok).toBe(false);
    expect(await db.select().from(session)).toHaveLength(0);
  });

  it("refuses an inactive member, a member with no PIN and a bad id with the same message", async () => {
    const inactive = await owner(false);
    const [noPin] = await db.insert(member).values({ householdId: (await db.select().from(household))[0].id, displayName: "Sarah" }).returning();
    for (const [id, pin] of [[inactive, "123456"], [noPin.id, "123456"], ["not-a-uuid", "123456"]]) {
      expect(await ownerLogin(id, pin)).toEqual({ ok: false, error: { code: "LOGIN_FAILED", message: LOGIN_FAILED_MESSAGE } });
    }
  });

  it("does not let one member's failures lock another", async () => {
    const id = await owner();
    for (let i = 0; i < 5; i++) await ownerLogin("00000000-0000-0000-0000-000000000000", "1");
    expect((await ownerLogin(id, "123456")).ok).toBe(true);
  });
});
