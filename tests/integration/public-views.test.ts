import { describe, expect, it } from "vitest";
import { db } from "./db-harness";
import { household, member, wishlist, wishlistItem } from "@/db/schema";
import { getFamilyDashboard, getListBySlug } from "@/features/wishlists/public-queries";

async function world() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [alex] = await db.insert(member).values({ householdId: h.id, displayName: "Alex" }).returning();
  const [sarah] = await db.insert(member).values({ householdId: h.id, displayName: "Sarah" }).returning();
  const mk = async (memberId: string, slug: string, extra: Partial<typeof wishlist.$inferInsert> = {}) =>
    (await db.insert(wishlist).values({ memberId, title: "Christmas 2026", occasion: "Christmas", year: 2026, slug, ...extra }).returning())[0];
  return { alex, sarah, mk };
}

describe("getListBySlug", () => {
  it("returns an active list, an archived list flagged as archived, and null for unknown slugs", async () => {
    const { alex, mk } = await world();
    await mk(alex.id, "activeslug1");
    await mk(alex.id, "archivedsl1", { archivedAt: new Date() });
    expect(await getListBySlug("activeslug1")).toMatchObject({ memberName: "Alex", archived: false });
    expect(await getListBySlug("archivedsl1")).toMatchObject({ archived: true });
    expect(await getListBySlug("nope")).toBeNull();
  });

  it("returns null for an inactive member's list", async () => {
    const { alex, mk } = await world();
    await mk(alex.id, "activeslug1");
    await db.update(member).set({ active: false });
    expect(await getListBySlug("activeslug1")).toBeNull();
  });

  it("orders by priority then owner order and hides deleted items", async () => {
    const { alex, mk } = await world();
    const l = await mk(alex.id, "activeslug1");
    const add = (title: string, priority: string, sortOrder: number, deletedAt?: Date) =>
      db.insert(wishlistItem).values({ wishlistId: l.id, title, priority, sortOrder, deletedAt });
    await add("nice", "nice_to_have", 10);
    await add("love-2", "would_love", 20);
    await add("most", "most_wanted", 10);
    await add("love-1", "would_love", 10);
    await add("gone", "most_wanted", 5, new Date());
    const view = await getListBySlug("activeslug1");
    expect(view!.items.map((i) => i.title)).toEqual(["most", "love-1", "love-2", "nice"]);
  });

  it("exposes exactly the guest-safe keys on an item", async () => {
    const { alex, mk } = await world();
    const l = await mk(alex.id, "activeslug1");
    await db.insert(wishlistItem).values({ wishlistId: l.id, title: "Book" });
    const view = await getListBySlug("activeslug1");
    expect(Object.keys(view!.items[0]).sort()).toEqual(
      ["createdAt", "currency", "description", "id", "imageUrl", "priceMinor", "priority", "productUrl", "sortOrder", "title"],
    );
    expect(Object.keys(view!).sort()).toEqual(["archived", "items", "memberName", "occasion", "slug", "title", "year"]);
  });
});

describe("getFamilyDashboard", () => {
  it("lists only active members' non-archived lists, grouped by member", async () => {
    const { alex, sarah, mk } = await world();
    await mk(alex.id, "alexslug001");
    await mk(alex.id, "alexslug002", { title: "Birthday", occasion: "Birthday" });
    await mk(sarah.id, "sarahold001", { archivedAt: new Date() });
    const dash = await getFamilyDashboard();
    expect(dash.members).toHaveLength(1);
    expect(dash.members[0].displayName).toBe("Alex");
    expect(dash.members[0].lists.map((l) => l.slug).sort()).toEqual(["alexslug001", "alexslug002"]);
    expect(JSON.stringify(dash)).not.toContain("sarahold001");
  });
  it("is empty when there are no lists", async () => {
    await world();
    expect(await getFamilyDashboard()).toEqual({ members: [] });
  });
});
