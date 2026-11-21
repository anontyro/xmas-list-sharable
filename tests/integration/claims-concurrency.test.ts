import { describe, expect, it } from "vitest";
import { db } from "./db-harness";
import { guest, household, itemClaim, member, wishlist, wishlistItem } from "@/db/schema";
import { reserve } from "@/features/reservations/claims";

describe("exclusive claim under concurrency", () => {
  it("20 guests reserving one item produce exactly one winner", async () => {
    const [h] = await db.insert(household).values({ name: "F" }).returning();
    const [m] = await db.insert(member).values({ householdId: h.id, displayName: "Alex" }).returning();
    const [l] = await db.insert(wishlist).values({ publishedAt: new Date(), memberId: m.id, title: "x", occasion: "Christmas", year: 2026, slug: "listslug001" }).returning();
    const [item] = await db.insert(wishlistItem).values({ wishlistId: l.id, title: "Book" }).returning();
    const guests = await db.insert(guest).values(Array.from({ length: 20 }, (_, i) => ({ householdId: h.id, displayName: `G${i}` }))).returning();

    const results = await Promise.all(guests.map((g) => reserve(g.id, item.id)));

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.error.code === "CLAIM_CONFLICT")).toHaveLength(19);
    const active = (await db.select().from(itemClaim)).filter((c) => c.releasedAt === null);
    expect(active).toHaveLength(1);
    const winner = results.findIndex((r) => r.ok);
    expect(active[0].guestId).toBe(guests[winner].id);
  });
});
