import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./db-harness";
import { household, member, wishlist, wishlistItem } from "@/db/schema";
import { getEarlierYears, getFamilyDashboard, getListBySlug } from "@/features/wishlists/public-queries";

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
  it("counts each list's gifts without the deleted ones, and gives 0 for an empty list", async () => {
    const { alex, sarah, mk } = await world();
    const full = await mk(alex.id, "alexslug001");
    await mk(sarah.id, "sarahslug01");
    await db.insert(wishlistItem).values([
      { wishlistId: full.id, title: "A" },
      { wishlistId: full.id, title: "B" },
      { wishlistId: full.id, title: "Gone", deletedAt: new Date() },
    ]);
    const dash = await getFamilyDashboard();
    expect(dash.members.map((m) => [m.displayName, m.lists[0].giftCount])).toEqual([["Alex", 2], ["Sarah", 0]]);
  });
  it("carries the member's picture, null when none or no longer allowed", async () => {
    const { alex, sarah, mk } = await world();
    await db.update(member).set({ avatar: "reindeer" }).where(eq(member.id, alex.id));
    await db.update(member).set({ avatar: "not-a-sticker" }).where(eq(member.id, sarah.id));
    await mk(alex.id, "alexslug001");
    await mk(sarah.id, "sarahslug01");
    expect(Object.fromEntries((await getFamilyDashboard()).members.map((m) => [m.displayName, m.avatar]))).toEqual({ Alex: "reindeer", Sarah: null });
  });
});

describe("getEarlierYears", () => {
  it("groups archived lists by occasion and year, newest first, with gift counts", async () => {
    const { alex, sarah, mk } = await world();
    const old = await mk(alex.id, "alexold2025", { year: 2025, title: "Christmas 2025", archivedAt: new Date() });
    await mk(sarah.id, "sarahold025", { year: 2025, title: "Christmas 2025", archivedAt: new Date() });
    await mk(alex.id, "alexold2024", { year: 2024, title: "Christmas 2024", archivedAt: new Date() });
    await mk(alex.id, "alexcurrent");
    await db.insert(wishlistItem).values([{ wishlistId: old.id, title: "A" }, { wishlistId: old.id, title: "Gone", deletedAt: new Date() }]);
    const years = await getEarlierYears();
    expect(years.map((g) => [g.occasion, g.year, g.lists.map((l) => [l.memberName, l.giftCount])])).toEqual([
      ["Christmas", 2025, [["Alex", 1], ["Sarah", 0]]],
      ["Christmas", 2024, [["Alex", 0]]],
    ]);
    expect(JSON.stringify(years)).not.toContain("alexcurrent");
  });
  it("leaves out an inactive member's archived list, and is empty with none", async () => {
    const { alex, mk } = await world();
    expect(await getEarlierYears()).toEqual([]);
    await mk(alex.id, "alexold2025", { year: 2025, archivedAt: new Date() });
    await db.update(member).set({ active: false }).where(eq(member.id, alex.id));
    expect(await getEarlierYears()).toEqual([]);
  });
});
