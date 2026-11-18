import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { household, member, wishlist, wishlistItem } from "@/db/schema";
import { commitBulkImport, previewAmazonImport } from "@/features/imports/bulk-actions";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";
import { asc, eq } from "drizzle-orm";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => resetRequest());

async function world() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [a, b] = await db.insert(member).values([{ householdId: h.id, displayName: "Alex" }, { householdId: h.id, displayName: "Sarah" }]).returning();
  const [la] = await db.insert(wishlist).values({ memberId: a.id, title: "A", occasion: "Christmas", year: 2026, slug: "alexslug001" }).returning();
  const signIn = async (m: { id: string }) => cookieJar.set(COOKIE_NAMES.owner, (await createSession("owner", m.id)).token);
  return { a, b, la, signIn };
}
const items = (listId: string) => db.select().from(wishlistItem).where(eq(wishlistItem.wishlistId, listId)).orderBy(asc(wishlistItem.sortOrder));
const row = (title: string, price = "") => ({ title, productUrl: `https://www.amazon.co.uk/dp/B0${title.length.toString().padStart(8, "0")}`, imageUrl: "", price });

describe("previewAmazonImport", () => {
  it("returns drafts, flags duplicates, and saves nothing", async () => {
    const { a, la, signIn } = await world();
    await db.insert(wishlistItem).values({ wishlistId: la.id, title: "Have it", productUrl: "https://www.amazon.co.uk/dp/B08N5WRWNW?tag=x" });
    await signIn(a);
    const r = await previewAmazonImport(la.id, "Headphones\n£12.00\nhttps://www.amazon.co.uk/dp/B08N5WRWNW\nBlanket\nhttps://www.amazon.co.uk/dp/B09G9FPHY6");
    expect(r).toMatchObject({ ok: true, data: [{ duplicateOf: "Have it", draft: { title: "Headphones", priceMinor: 1200 } }, { duplicateOf: null }] });
    expect(await items(la.id)).toHaveLength(1);
  });

  it("gives the manual-entry message for unreadable input, and refuses other owners and archived lists", async () => {
    const { a, b, la, signIn } = await world();
    expect(await previewAmazonImport(la.id, "x")).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    await signIn(b);
    expect(await previewAmazonImport(la.id, "x")).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    resetRequest();
    await signIn(a);
    expect(await previewAmazonImport(la.id, "just words")).toMatchObject({ error: { code: "NOTHING_FOUND", message: expect.stringContaining("by hand") } });
    expect(await previewAmazonImport("nope", "x")).toMatchObject({ error: { code: "NOT_FOUND" } });
    await db.update(wishlist).set({ archivedAt: new Date() }).where(eq(wishlist.id, la.id));
    expect(await previewAmazonImport(la.id, "x")).toMatchObject({ error: { code: "LIST_ARCHIVED" } });
  });
});

describe("commitBulkImport", () => {
  it("appends rows to the end of Would Love in preview order, skipping blank titles", async () => {
    const { a, la, signIn } = await world();
    await db.insert(wishlistItem).values([
      { wishlistId: la.id, title: "Existing love", priority: "would_love", sortOrder: 10 },
      { wishlistId: la.id, title: "Existing top", priority: "most_wanted", sortOrder: 500 },
    ]);
    await signIn(a);
    const r = await commitBulkImport(la.id, [row("First", "5.00"), row("   "), row("Second")]);
    expect(r).toMatchObject({ ok: true, data: { added: 2, skipped: 1 } });
    const love = (await items(la.id)).filter((i) => i.priority === "would_love");
    expect(love.map((i) => i.title)).toEqual(["Existing love", "First", "Second"]);
    expect(love[1]).toMatchObject({ priceMinor: 500, productUrl: expect.stringContaining("amazon.co.uk/dp/") });
  });

  it("puts each row in its own priority group, after the gifts already there and in the order given", async () => {
    const { a, la, signIn } = await world();
    await db.insert(wishlistItem).values([
      { wishlistId: la.id, title: "Old top", priority: "most_wanted", sortOrder: 40 },
      { wishlistId: la.id, title: "Old love", priority: "would_love", sortOrder: 30 },
      { wishlistId: la.id, title: "Old nice", priority: "nice_to_have", sortOrder: 20 },
    ]);
    await signIn(a);
    const r = await commitBulkImport(la.id, [
      { ...row("Nice one"), priority: "nice_to_have" },
      { ...row("Top one"), priority: "most_wanted" },
      row("Default one"), // no priority: Would Love
      { ...row("Top two"), priority: "most_wanted" },
      { ...row("Nice two"), priority: "nice_to_have" },
    ]);
    expect(r).toMatchObject({ ok: true, data: { added: 5, skipped: 0 } });
    const all = await items(la.id);
    const group = (p: string) => all.filter((i) => i.priority === p).map((i) => i.title);
    expect(group("most_wanted")).toEqual(["Old top", "Top one", "Top two"]);
    expect(group("would_love")).toEqual(["Old love", "Default one"]);
    expect(group("nice_to_have")).toEqual(["Old nice", "Nice one", "Nice two"]);
    // The gifts that were already there did not move.
    expect(all.filter((i) => i.title.startsWith("Old")).map((i) => [i.title, i.sortOrder])).toEqual(
      expect.arrayContaining([["Old top", 40], ["Old love", 30], ["Old nice", 20]]),
    );
  });

  it("refuses any other priority and adds nothing, even for the good rows", async () => {
    const { a, la, signIn } = await world();
    await signIn(a);
    for (const priority of ["urgent", "", null, 3, "MOST_WANTED"]) {
      const r = await commitBulkImport(la.id, [{ ...row("Good"), priority: "most_wanted" }, { ...row("Odd"), priority } as never]);
      expect(r, String(priority)).toMatchObject({ ok: false, error: { code: "INVALID", message: expect.stringContaining("Odd") } });
    }
    expect(await items(la.id)).toHaveLength(0);
  });

  it("adds nothing when any row is invalid", async () => {
    const { a, la, signIn } = await world();
    await signIn(a);
    const r = await commitBulkImport(la.id, [row("Good"), { ...row("Bad price"), price: "abc" }]);
    expect(r).toMatchObject({ ok: false, error: { code: "INVALID", message: expect.stringContaining("Bad price") } });
    expect(await items(la.id)).toHaveLength(0);
    const bad = await commitBulkImport(la.id, [{ ...row("Evil link"), productUrl: "javascript:alert(1)" }]);
    expect(bad).toMatchObject({ ok: false });
    expect(await items(la.id)).toHaveLength(0);
  });

  it("needs the list's own owner, refuses archived lists, and caps the batch at 100", async () => {
    const { a, b, la, signIn } = await world();
    expect(await commitBulkImport(la.id, [row("X")])).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    await signIn(b);
    expect(await commitBulkImport(la.id, [row("X")])).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    resetRequest();
    await signIn(a);
    expect(await commitBulkImport(la.id, Array.from({ length: 101 }, (_, i) => row(`G${i}`)))).toMatchObject({ ok: false, error: { code: "INVALID" } });
    await db.update(wishlist).set({ archivedAt: new Date() }).where(eq(wishlist.id, la.id));
    expect(await commitBulkImport(la.id, [row("X")])).toMatchObject({ error: { code: "LIST_ARCHIVED" } });
    expect(await items(la.id)).toHaveLength(0);
  });
});
