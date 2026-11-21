import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { household, member, wishlist, wishlistItem } from "@/db/schema";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";
import { moveItem } from "@/features/wishlists/reorder";
import { moveItemAction } from "@/features/wishlists/reorder-actions";
import { createItem, updateItem } from "@/features/wishlists/owner-actions";
import { getOwnList } from "@/features/wishlists/owner-queries";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(resetRequest);

async function world() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [a] = await db.insert(member).values({ householdId: h.id, displayName: "Alex" }).returning();
  const [b] = await db.insert(member).values({ householdId: h.id, displayName: "Sarah" }).returning();
  const [l] = await db.insert(wishlist).values({ publishedAt: new Date(), memberId: a.id, title: "A", occasion: "Christmas", year: 2026, slug: "alexslug001" }).returning();
  const add = async (title: string, priority = "would_love", sortOrder = 0) =>
    (await db.insert(wishlistItem).values({ wishlistId: l.id, title, priority, sortOrder }).returning())[0];
  const signIn = async (m: { id: string }) => cookieJar.set(COOKIE_NAMES.owner, (await createSession("owner", m.id)).token);
  const order = async () => (await getOwnList(l.id))!.items.map((i) => i.title);
  return { a, b, l, add, signIn, order };
}

describe("moveItem", () => {
  it("swaps with the neighbour and persists; ends do nothing", async () => {
    const { a, add, signIn, order } = await world();
    const [x, y, z] = [await add("x", "would_love", 10), await add("y", "would_love", 20), await add("z", "would_love", 30)];
    await signIn(a);
    expect(await moveItem(y.id, "up")).toBe(true);
    expect(await order()).toEqual(["y", "x", "z"]);
    expect(await moveItem(y.id, "up")).toBe(false); // already first
    expect(await moveItem(z.id, "down")).toBe(false); // already last
    expect(await order()).toEqual(["y", "x", "z"]);
    expect(await moveItem(x.id, "down")).toBe(true);
    expect(await order()).toEqual(["y", "z", "x"]);
  });

  it("only reorders inside the priority group", async () => {
    const { a, add, signIn, order } = await world();
    await add("m", "most_wanted", 10);
    const w1 = await add("w1", "would_love", 10);
    await add("w2", "would_love", 20);
    await add("n", "nice_to_have", 10);
    await signIn(a);
    await moveItem(w1.id, "down");
    expect(await order()).toEqual(["m", "w2", "w1", "n"]);
    expect(await moveItem(w1.id, "down")).toBe(false); // last of would_love, not swapped into nice_to_have
  });

  it("heals ties left by near-simultaneous adds", async () => {
    const { add } = await world();
    const a = await add("a"); // all sort_order 0
    await add("b");
    await add("c");
    await moveItem(a.id, "down");
    const rows = (await db.select().from(wishlistItem)).sort((p, q) => p.sortOrder - q.sortOrder);
    expect(rows.map((r) => [r.title, r.sortOrder])).toEqual([["b", 10], ["a", 20], ["c", 30]]);
  });

  it("keeps sort_order unique when ten moves run at once", async () => {
    const { add } = await world();
    const items: Awaited<ReturnType<typeof add>>[] = [];
    for (let i = 0; i < 5; i++) items.push(await add(`i${i}`, "would_love", (i + 1) * 10));
    await Promise.all(Array.from({ length: 10 }, (_, i) => moveItem(items[i % 5].id, i % 2 ? "up" : "down")));
    const orders = (await db.select().from(wishlistItem)).map((r) => r.sortOrder).sort((p, q) => p - q);
    expect(orders).toEqual([10, 20, 30, 40, 50]);
  });

  it("ignores deleted and unknown items", async () => {
    const { add } = await world();
    const gone = await add("gone");
    await db.update(wishlistItem).set({ deletedAt: new Date() });
    expect(await moveItem(gone.id, "up")).toBe(false);
    expect(await moveItem("00000000-0000-0000-0000-000000000000", "up")).toBe(false);
  });

  it("puts an item last in its new group when its priority changes", async () => {
    const { a, l, signIn, order } = await world();
    await signIn(a);
    await createItem(l.id, { title: "w1" });
    await createItem(l.id, { title: "m1", priority: "most_wanted" });
    await createItem(l.id, { title: "m2", priority: "most_wanted" });
    const w1 = (await getOwnList(l.id))!.items.find((i) => i.title === "w1")!;
    await updateItem(w1.id, { title: "w1", priority: "most_wanted" });
    expect(await order()).toEqual(["m1", "m2", "w1"]);
  });
});

describe("moveItemAction", () => {
  it("is for the list's own owner only", async () => {
    const { a, b, add, signIn, order } = await world();
    const x = await add("x", "would_love", 10);
    await add("y", "would_love", 20);
    expect(await moveItemAction(x.id, "down")).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    await signIn(b);
    expect(await moveItemAction(x.id, "down")).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
    resetRequest();
    await signIn(a);
    expect((await moveItemAction(x.id, "down")).ok).toBe(true);
    expect(await order()).toEqual(["y", "x"]);
    expect(await moveItemAction("nope", "down")).toMatchObject({ error: { code: "NOT_FOUND" } });
    await db.update(wishlist).set({ archivedAt: new Date() });
    expect(await moveItemAction(x.id, "up")).toMatchObject({ error: { code: "LIST_ARCHIVED" } });
  });
});
