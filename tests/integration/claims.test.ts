import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { guest, household, itemClaim, itemInterest, member, wishlist, wishlistItem } from "@/db/schema";
import { markPurchased, release, reserve } from "@/features/reservations/claims";
import { clearInterest, setInterest } from "@/features/reservations/interest";
import { purchaseItem, releaseItem, reserveItem, showInterest, withdrawInterest } from "@/features/reservations/actions";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(resetRequest);

async function world() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [m] = await db.insert(member).values({ householdId: h.id, displayName: "Alex" }).returning();
  const [l] = await db.insert(wishlist).values({ publishedAt: new Date(), memberId: m.id, title: "x", occasion: "Christmas", year: 2026, slug: "listslug001" }).returning();
  const [item] = await db.insert(wishlistItem).values({ wishlistId: l.id, title: "Book" }).returning();
  const [a, b] = await db.insert(guest).values([{ householdId: h.id, displayName: "Ann" }, { householdId: h.id, displayName: "Bob" }]).returning();
  return { m, l, item, a, b };
}

const state = (r: { ok: boolean; data?: { state: string } }) => (r.ok ? r.data!.state : "error");

describe("claim lifecycle", () => {
  it("reserve, purchase, then release with confirmation, as the claimant", async () => {
    const { item, a } = await world();
    expect(state(await reserve(a.id, item.id))).toBe("reserved_by_you");
    expect(state(await markPurchased(a.id, item.id))).toBe("purchased_by_you");
    expect(await release(a.id, item.id)).toMatchObject({ ok: false, error: { code: "CONFIRM_REQUIRED" } });
    expect(state(await release(a.id, item.id, true))).toBe("available");
  });

  it("treats pressing Reserve twice as success for the same guest, not a conflict", async () => {
    const { item, a, b } = await world();
    await reserve(a.id, item.id);
    expect(state(await reserve(a.id, item.id))).toBe("reserved_by_you");
    await markPurchased(a.id, item.id);
    expect(state(await reserve(a.id, item.id))).toBe("purchased_by_you");
    expect(await reserve(b.id, item.id)).toMatchObject({ error: { code: "CLAIM_CONFLICT" } });
    expect(await db.select().from(itemClaim)).toHaveLength(1);
  });

  it("lets a reserved claim be released without confirmation", async () => {
    const { item, a } = await world();
    await reserve(a.id, item.id);
    expect(state(await release(a.id, item.id))).toBe("available");
  });

  it("refuses another guest's purchase and release with NOT_CLAIMANT", async () => {
    const { item, a, b } = await world();
    await reserve(a.id, item.id);
    expect(await markPurchased(b.id, item.id)).toMatchObject({ error: { code: "NOT_CLAIMANT" } });
    expect(await release(b.id, item.id, true)).toMatchObject({ error: { code: "NOT_CLAIMANT" } });
    expect((await db.select().from(itemClaim))[0]).toMatchObject({ guestId: a.id, status: "reserved", releasedAt: null });
  });

  it("returns CLAIM_CONFLICT for a second reservation, and lets someone else reserve after a release", async () => {
    const { item, a, b } = await world();
    await reserve(a.id, item.id);
    expect(await reserve(b.id, item.id)).toMatchObject({ error: { code: "CLAIM_CONFLICT" } });
    await release(a.id, item.id);
    expect(state(await reserve(b.id, item.id))).toBe("reserved_by_you");
    const rows = await db.select().from(itemClaim);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.guestId === a.id)!.releasedAt).not.toBeNull();
  });

  it("returns ITEM_UNAVAILABLE for a deleted item, an archived list and an unknown item", async () => {
    const { item, a } = await world();
    await db.update(wishlist).set({ archivedAt: new Date() });
    expect(await reserve(a.id, item.id)).toMatchObject({ error: { code: "ITEM_UNAVAILABLE" } });
    expect(await setInterest(a.id, item.id)).toMatchObject({ error: { code: "ITEM_UNAVAILABLE" } });
    await db.update(wishlist).set({ archivedAt: null });
    await db.update(wishlistItem).set({ deletedAt: new Date() });
    expect(await reserve(a.id, item.id)).toMatchObject({ error: { code: "ITEM_UNAVAILABLE" } });
    expect(await reserve(a.id, "00000000-0000-0000-0000-000000000000")).toMatchObject({ error: { code: "ITEM_UNAVAILABLE" } });
    expect(await db.select().from(itemClaim)).toHaveLength(0);
  });

  it("refuses to mark a gift purchased once its list is archived, but still lets a guest buy a held gift the owner deleted", async () => {
    const { item, a } = await world();
    await reserve(a.id, item.id);

    await db.update(wishlist).set({ archivedAt: new Date() });
    expect(await markPurchased(a.id, item.id)).toMatchObject({ error: { code: "ITEM_UNAVAILABLE" } });
    expect((await db.select().from(itemClaim))[0].status).toBe("reserved"); // unchanged

    await db.update(wishlist).set({ archivedAt: null });
    await db.update(wishlistItem).set({ deletedAt: new Date() }); // decision 0007: the guest still holds it
    expect(state(await markPurchased(a.id, item.id))).toBe("purchased_by_you");
  });
});

describe("interest", () => {
  it("is idempotent, can be cleared, and never blocks another guest's reservation", async () => {
    const { item, a, b } = await world();
    await setInterest(a.id, item.id);
    expect(state(await setInterest(a.id, item.id))).toBe("interested");
    expect(await db.select().from(itemInterest)).toHaveLength(1);
    await setInterest(b.id, item.id);
    expect(state(await reserve(b.id, item.id))).toBe("reserved_by_you");
    expect(state(await clearInterest(a.id, item.id))).toBe("reserved_by_other");
    expect(await db.select().from(itemInterest)).toHaveLength(1); // Bob's row kept for history
  });
});

describe("guest actions", () => {
  it("need a guest session and act only as that guest", async () => {
    const { item, a, b } = await world();
    expect(await reserveItem(item.id)).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(await showInterest(item.id)).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    cookieJar.set(COOKIE_NAMES.guest, (await createSession("guest", a.id)).token);
    expect(state(await reserveItem(item.id))).toBe("reserved_by_you");
    resetRequest();
    cookieJar.set(COOKIE_NAMES.guest, (await createSession("guest", b.id)).token);
    expect(await purchaseItem(item.id)).toMatchObject({ error: { code: "NOT_CLAIMANT" } });
    expect(await releaseItem(item.id, true)).toMatchObject({ error: { code: "NOT_CLAIMANT" } });
    expect(await reserveItem("not-a-uuid")).toMatchObject({ error: { code: "ITEM_UNAVAILABLE" } });
  });

  it("do not accept an owner or admin session", async () => {
    const { item, m } = await world();
    cookieJar.set(COOKIE_NAMES.owner, (await createSession("owner", m.id)).token);
    cookieJar.set(COOKIE_NAMES.admin, (await createSession("admin", m.id)).token);
    expect(await reserveItem(item.id)).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });
});

describe("a member never reserves on their own list", () => {
  const actions = [
    ["reserveItem", (id: string) => reserveItem(id)],
    ["purchaseItem", (id: string) => purchaseItem(id)],
    ["releaseItem", (id: string) => releaseItem(id, true)],
    ["showInterest", (id: string) => showInterest(id)],
    ["withdrawInterest", (id: string) => withdrawInterest(id)],
  ] as const;

  async function signedInAs(memberId: string | null, h: string, name: string) {
    const [g] = await db.insert(guest).values({ householdId: h, displayName: name, memberId }).returning();
    cookieJar.set(COOKIE_NAMES.guest, (await createSession("guest", g.id)).token);
    return g;
  }

  it.each(actions)("%s is refused with OWN_LIST and writes nothing", async (_name, run) => {
    const { m, item } = await world();
    await signedInAs(m.id, m.householdId, "Alex");
    expect(await run(item.id)).toMatchObject({ ok: false, error: { code: "OWN_LIST", message: "This is your own list" } });
    expect(await db.select().from(itemClaim)).toHaveLength(0);
    expect(await db.select().from(itemInterest)).toHaveLength(0);
  });

  it("still works on someone else's list for a linked guest", async () => {
    const { m, item } = await world();
    const [sarah] = await db.insert(member).values({ householdId: m.householdId, displayName: "Sarah", approvedAt: new Date() }).returning();
    const g = await signedInAs(sarah.id, m.householdId, "Sarah");
    expect(await reserveItem(item.id)).toMatchObject({ ok: true, data: { state: "reserved_by_you" } });
    expect(await db.select().from(itemClaim)).toMatchObject([{ guestId: g.id }]);
  });

  it("still works for an unlinked guest", async () => {
    const { m, item } = await world();
    await signedInAs(null, m.householdId, "Pat");
    expect(await showInterest(item.id)).toMatchObject({ ok: true });
  });
});
