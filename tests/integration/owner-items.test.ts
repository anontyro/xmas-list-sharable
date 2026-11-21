import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { household, member, wishlist, wishlistItem } from "@/db/schema";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";
import { createItem, deleteItem, updateItem } from "@/features/wishlists/owner-actions";
import { getOwnList, listOwnLists } from "@/features/wishlists/owner-queries";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(resetRequest);

async function world() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [a] = await db.insert(member).values({ householdId: h.id, displayName: "Alex" }).returning();
  const [b] = await db.insert(member).values({ householdId: h.id, displayName: "Sarah" }).returning();
  const [la] = await db.insert(wishlist).values({ publishedAt: new Date(), memberId: a.id, title: "A", occasion: "Christmas", year: 2026, slug: "alexslug001" }).returning();
  const [lb] = await db.insert(wishlist).values({ publishedAt: new Date(), memberId: b.id, title: "B", occasion: "Christmas", year: 2026, slug: "sarahslug01" }).returning();
  const signIn = async (m: { id: string }) => cookieJar.set(COOKIE_NAMES.owner, (await createSession("owner", m.id)).token);
  return { a, b, la, lb, signIn };
}

const UNAUTH = { ok: false, error: { code: "UNAUTHORIZED" } };

describe("owner item actions", () => {
  it("lets the owner create, edit and delete on their own list", async () => {
    const { a, la, signIn } = await world();
    await signIn(a);
    const created = await createItem(la.id, { title: "Book", price: "9.99" });
    if (!created.ok) throw new Error("create failed");
    expect((await getOwnList(la.id))!.items[0]).toMatchObject({ title: "Book", priceMinor: 999, priority: "would_love" });
    expect((await updateItem(created.data.id, { title: "Better book", priority: "most_wanted" })).ok).toBe(true);
    expect((await getOwnList(la.id))!.items[0]).toMatchObject({ title: "Better book", priority: "most_wanted", priceMinor: null });
    expect((await deleteItem(created.data.id)).ok).toBe(true);
    expect((await getOwnList(la.id))!.items).toHaveLength(0);
  });

  it("refuses another owner, a guest-less visitor and changes nothing", async () => {
    const { a, la, lb, signIn } = await world();
    await signIn(a);
    const [item] = await db.insert(wishlistItem).values({ wishlistId: lb.id, title: "Sarah's" }).returning();
    expect(await createItem(lb.id, { title: "Sneaky" })).toMatchObject(UNAUTH);
    expect(await updateItem(item.id, { title: "Hijacked" })).toMatchObject(UNAUTH);
    expect(await deleteItem(item.id)).toMatchObject(UNAUTH);
    resetRequest();
    expect(await createItem(la.id, { title: "x" })).toMatchObject(UNAUTH);
    const rows = await db.select().from(wishlistItem);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: "Sarah's", deletedAt: null });
  });

  it("soft deletes: the row stays, the owner view drops it", async () => {
    const { a, la, signIn } = await world();
    await signIn(a);
    const created = await createItem(la.id, { title: "Book" });
    if (!created.ok) throw new Error();
    await deleteItem(created.data.id);
    const rows = await db.select().from(wishlistItem);
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();
    expect(await updateItem(created.data.id, { title: "Back" })).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  it("refuses changes on an archived list", async () => {
    const { a, la, signIn } = await world();
    await signIn(a);
    const created = await createItem(la.id, { title: "Book" });
    if (!created.ok) throw new Error();
    await db.update(wishlist).set({ archivedAt: new Date() });
    expect(await createItem(la.id, { title: "x" })).toMatchObject({ error: { code: "LIST_ARCHIVED" } });
    expect(await updateItem(created.data.id, { title: "x" })).toMatchObject({ error: { code: "LIST_ARCHIVED" } });
    expect(await deleteItem(created.data.id)).toMatchObject({ error: { code: "LIST_ARCHIVED" } });
  });

  it("appends to the end of the priority group, in steps of 10", async () => {
    const { a, la, signIn } = await world();
    await signIn(a);
    await createItem(la.id, { title: "w1" });
    await createItem(la.id, { title: "w2" });
    await createItem(la.id, { title: "m1", priority: "most_wanted" });
    const items = (await getOwnList(la.id))!.items;
    expect(items.map((i) => [i.title, i.sortOrder])).toEqual([["m1", 10], ["w1", 10], ["w2", 20]]);
    const w1 = items.find((i) => i.title === "w1")!;
    await updateItem(w1.id, { title: "w1", priority: "most_wanted" });
    expect((await getOwnList(la.id))!.items.map((i) => [i.title, i.sortOrder])).toEqual([["m1", 10], ["w1", 20], ["w2", 20]]);
  });

  it("returns field errors for bad input and ids that are not uuids", async () => {
    const { a, la, signIn } = await world();
    await signIn(a);
    const r = await createItem(la.id, { title: "", productUrl: "javascript:alert(1)" });
    expect(r).toMatchObject({ ok: false, error: { code: "INVALID", fields: { title: expect.any(String), productUrl: expect.any(String) } } });
    expect(await createItem("nope", { title: "x" })).toMatchObject({ error: { code: "NOT_FOUND" } });
    expect(await db.select().from(wishlistItem)).toHaveLength(0);
  });
});

describe("owner queries", () => {
  it("show only the signed-in owner's lists and items, with no claim-like keys", async () => {
    const { a, la, lb, signIn } = await world();
    await db.insert(wishlistItem).values({ wishlistId: la.id, title: "Mine" });
    await signIn(a);
    expect(await getOwnList(lb.id)).toBeNull();
    expect(await getOwnList("not-a-uuid")).toBeNull();
    expect((await listOwnLists()).map((l) => l.id)).toEqual([la.id]);
    const view = await getOwnList(la.id);
    expect(JSON.stringify(view)).not.toMatch(/claim|interest|guest|planner|reserved|purchased/i);
    resetRequest();
    expect(await getOwnList(la.id)).toBeNull();
    expect(await listOwnLists()).toEqual([]);
  });
});
