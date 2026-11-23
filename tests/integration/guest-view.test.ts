import { describe, expect, it } from "vitest";
import { db } from "./db-harness";
import { guest, household, itemClaim, itemInterest, member, wishlist, wishlistItem } from "@/db/schema";
import { getItemState } from "@/features/reservations/guest-claim-view";
import { getListBySlug, getListForViewer } from "@/features/wishlists/public-queries";

async function world() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [m] = await db.insert(member).values({ householdId: h.id, displayName: "Alex" }).returning();
  const [l] = await db.insert(wishlist).values({ publishedAt: new Date(), memberId: m.id, title: "x", occasion: "Christmas", year: 2026, slug: "listslug001" }).returning();
  const items = await db.insert(wishlistItem).values(["free", "interest", "reserved", "bought"].map((title, i) => ({ wishlistId: l.id, title, sortOrder: i * 10 }))).returning();
  const [a, b] = await db.insert(guest).values([{ householdId: h.id, displayName: "Ann" }, { householdId: h.id, displayName: "Bob" }]).returning();
  const id = (t: string) => items.find((i) => i.title === t)!.id;
  await db.insert(itemInterest).values({ guestId: a.id, itemId: id("interest") });
  await db.insert(itemClaim).values([
    { itemId: id("reserved"), guestId: a.id, status: "reserved" },
    { itemId: id("bought"), guestId: b.id, status: "purchased" },
  ]);
  return { a, b, id };
}

const states = async (viewer: string | null) =>
  Object.fromEntries((await getListForViewer("listslug001", viewer))!.items.map((i) => [i.title, i.state]));

describe("guest claim view", () => {
  it("shows each guest their own states and the other guest's name", async () => {
    const { a, b } = await world();
    expect(await states(a.id)).toEqual({
      free: { state: "available" },
      interest: { state: "interested" },
      reserved: { state: "reserved_by_you" },
      bought: { state: "purchased_by_other", claimedBy: "Bob" },
    });
    expect(await states(b.id)).toEqual({
      free: { state: "available" },
      interest: { state: "available" }, // Ann's interest is private to Ann
      reserved: { state: "reserved_by_other", claimedBy: "Ann" },
      bought: { state: "purchased_by_you" },
    });
  });

  it("shows an anonymous visitor claims without any name", async () => {
    await world();
    expect(await states(null)).toEqual({
      free: { state: "available" },
      interest: { state: "available" },
      reserved: { state: "reserved_by_other" },
      bought: { state: "purchased_by_other" },
    });
  });

  it("lets an active claim win over interest, and a released claim stop counting", async () => {
    const { a, id } = await world();
    await db.insert(itemInterest).values({ guestId: a.id, itemId: id("reserved") });
    expect((await getItemState(a.id, id("reserved"))).state).toBe("reserved_by_you");
    await db.update(itemClaim).set({ releasedAt: new Date() });
    expect((await getItemState(a.id, id("reserved"))).state).toBe("interested");
    expect((await getItemState(a.id, id("bought"))).state).toBe("available");
  });

  it("leaves the claim-free R1d view untouched", async () => {
    await world();
    const plain = await getListBySlug("listslug001");
    expect(Object.keys(plain!.items[0]).sort()).toEqual(["createdAt", "currency", "description", "id", "imageUrl", "priceMinor", "priority", "productUrl", "sortOrder", "title"]);
  });

  it("handles a list with no items", async () => {
    const { a } = await world();
    await db.delete(itemClaim);
    await db.delete(itemInterest);
    await db.delete(wishlistItem);
    expect((await getListForViewer("listslug001", a.id))!.items).toEqual([]);
  });
});
