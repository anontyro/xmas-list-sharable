import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { guest, household, itemClaim, session, wishlist, wishlistItem, member } from "@/db/schema";
import { addPin, createGuest, renameGuest } from "@/features/authentication/guest-actions";
import { getGuestIdentity } from "@/features/authentication/guest-session";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { createSession, revokeSessionsFor } from "@/lib/auth/session";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(async () => {
  resetRequest();
});

async function seedHousehold() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  return h;
}

describe("guest identity", () => {
  it("two browsers with the same name get two different guests and sessions", async () => {
    await seedHousehold();
    const a = await createGuest("Sam");
    resetRequest(); // a second browser
    const b = await createGuest("Sam");
    if (!a.ok || !b.ok) throw new Error("create failed");
    expect(a.data.id).not.toBe(b.data.id);
    expect(await db.select().from(guest)).toHaveLength(2);
    expect(await db.select().from(session)).toHaveLength(2);
  });

  it("restores the same guest on later requests from the same browser", async () => {
    await seedHousehold();
    const r = await createGuest("Sam");
    if (!r.ok) throw new Error();
    expect(await getGuestIdentity()).toEqual({ guestId: r.data.id, displayName: "Sam", memberId: null, pending: false });
    expect((await createGuest("Other name")).ok && (await db.select().from(guest))).toHaveLength(1); // no second guest
  });

  it("resolves to nothing once the session is revoked or the cookie is missing", async () => {
    await seedHousehold();
    const r = await createGuest("Sam");
    if (!r.ok) throw new Error();
    await revokeSessionsFor("guest", r.data.id);
    expect(await getGuestIdentity()).toBeNull();
    resetRequest();
    expect(await getGuestIdentity()).toBeNull();
  });

  it("renaming changes the display name and leaves claims on the same guest", async () => {
    const h = await seedHousehold();
    const r = await createGuest("Sam");
    if (!r.ok) throw new Error();
    const [m] = await db.insert(member).values({ householdId: h.id, displayName: "Alex" }).returning();
    const [l] = await db.insert(wishlist).values({ memberId: m.id, title: "x", occasion: "Christmas", year: 2026, slug: "aaaaaaaaaa" }).returning();
    const [item] = await db.insert(wishlistItem).values({ wishlistId: l.id, title: "Book" }).returning();
    await db.insert(itemClaim).values({ itemId: item.id, guestId: r.data.id, status: "reserved" });
    expect((await renameGuest("  Samantha ")).ok).toBe(true);
    expect(await getGuestIdentity()).toEqual({ guestId: r.data.id, displayName: "Samantha", memberId: null, pending: false });
    expect((await db.select().from(itemClaim))[0].guestId).toBe(r.data.id);
  });

  it("trims names and rejects empty and 41-character ones", async () => {
    await seedHousehold();
    expect(await createGuest("   ")).toMatchObject({ ok: false, error: { code: "INVALID" } });
    expect(await createGuest("x".repeat(41))).toMatchObject({ ok: false, error: { code: "INVALID" } });
    expect((await createGuest("  Sam  ")).ok).toBe(true);
    expect((await db.select().from(guest))[0].displayName).toBe("Sam");
  });

  it("caps how many guests one address can create", async () => {
    await seedHousehold();
    for (let i = 0; i < 20; i++) {
      resetRequest();
      expect((await createGuest(`G${i}`)).ok).toBe(true);
    }
    resetRequest();
    expect(await createGuest("One too many")).toMatchObject({ ok: false, error: { code: "RATE_LIMITED" } });
    expect(await db.select().from(guest)).toHaveLength(20);
  });

  it("does not treat owner or admin sessions as a guest", async () => {
    const h = await seedHousehold();
    for (const type of ["owner", "admin"] as const) {
      cookieJar.set(COOKIE_NAMES[type], (await createSession(type, h.id)).token);
    }
    expect(await getGuestIdentity()).toBeNull();
    expect(await renameGuest("Sam")).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    const created = await createGuest("Sam"); // still makes a brand new guest
    expect(created.ok).toBe(true);
  });
});

describe("sign up with a PIN", () => {
  it("without a PIN makes an ordinary guest, as before", async () => {
    await seedHousehold();
    await createGuest("Sam", "");
    expect(await db.select().from(member)).toHaveLength(0);
    expect(await getGuestIdentity()).toMatchObject({ memberId: null, pending: false });
  });

  it("with a PIN makes a waiting member, a linked guest and only the guest session", async () => {
    await seedHousehold();
    const r = await createGuest("Zed", "123456");
    if (!r.ok) throw new Error(r.error.message);
    const [m] = await db.select().from(member);
    expect(m).toMatchObject({ displayName: "Zed", active: true, approvedAt: null });
    expect(m.pinHash).toMatch(/^\$argon2id\$/);
    expect(await db.select().from(guest)).toMatchObject([{ id: r.data.id, memberId: m.id }]);
    expect(cookieJar.has(COOKIE_NAMES.owner)).toBe(false);
    expect(await getGuestIdentity()).toMatchObject({ memberId: m.id, pending: true });
  });

  it("refuses a bad PIN and creates nothing", async () => {
    await seedHousehold();
    for (const pin of ["12345", "1234567890123", "abcdef"]) expect(await createGuest("Zed", pin)).toMatchObject({ ok: false, error: { code: "INVALID" } });
    expect(await db.select().from(member)).toHaveLength(0);
    expect(await db.select().from(guest)).toHaveLength(0);
  });

  it("refuses a name an active member already has, and creates neither a member nor a guest", async () => {
    const h = await seedHousehold();
    await db.insert(member).values({ householdId: h.id, displayName: "Sarah", approvedAt: new Date() });
    expect(await createGuest("Sarah", "123456")).toMatchObject({ ok: false, error: { code: "NAME_TAKEN" } });
    expect(await db.select().from(guest)).toHaveLength(0);
    expect(cookieJar.size).toBe(0);
    expect((await createGuest("Sarah", "")).ok).toBe(true); // a plain guest may share the name
  });

  it("still caps sign-ups per address", async () => {
    await seedHousehold();
    let last;
    for (let i = 0; i < 22; i++) {
      resetRequest();
      last = await createGuest(`Guest ${i}`, i % 2 ? "123456" : "");
    }
    expect(last).toMatchObject({ ok: false, error: { code: "RATE_LIMITED" } });
  });
});

describe("addPin", () => {
  it("makes the guest a waiting member and keeps their id and reservations", async () => {
    await seedHousehold();
    const r = await createGuest("Pat");
    if (!r.ok) throw new Error();
    expect((await addPin("12345")).ok).toBe(false);
    expect((await addPin("123456")).ok).toBe(true);
    const [m] = await db.select().from(member);
    expect(m).toMatchObject({ displayName: "Pat", approvedAt: null });
    expect(await db.select().from(guest)).toMatchObject([{ id: r.data.id, memberId: m.id }]);
    expect(await addPin("654321")).toMatchObject({ ok: false, error: { code: "ALREADY_MEMBER" } });
    expect(await db.select().from(member)).toHaveLength(1);
  });

  it("refuses a taken name and leaves the guest unlinked", async () => {
    const h = await seedHousehold();
    await createGuest("Pat");
    await db.insert(member).values({ householdId: h.id, displayName: "Pat", approvedAt: new Date() });
    expect(await addPin("123456")).toMatchObject({ ok: false, error: { code: "NAME_TAKEN" } });
    expect((await db.select().from(guest))[0].memberId).toBeNull();
  });

  it("needs a guest session", async () => {
    await seedHousehold();
    expect(await addPin("123456")).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
  });
});

describe("renaming a linked guest", () => {
  it("renames the member too", async () => {
    await seedHousehold();
    await createGuest("Zed", "123456");
    expect((await renameGuest("Zedd")).ok).toBe(true);
    expect((await db.select().from(member))[0].displayName).toBe("Zedd");
    expect((await db.select().from(guest))[0].displayName).toBe("Zedd");
  });

  it("rolls both back when the name is taken by another active member", async () => {
    const h = await seedHousehold();
    await db.insert(member).values({ householdId: h.id, displayName: "Sarah", approvedAt: new Date() });
    await createGuest("Zed", "123456");
    expect(await renameGuest("Sarah")).toMatchObject({ ok: false, error: { code: "NAME_TAKEN" } });
    expect((await db.select().from(guest))[0].displayName).toBe("Zed");
    expect((await db.select().from(member).where(eq(member.displayName, "Zed"))).length).toBe(1);
  });
});
