import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { cookieJar, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { household, member, wishlist, wishlistItem } from "@/db/schema";
import { createList } from "@/features/family/actions";
import { listAllListsForAdmin } from "@/features/family/queries";
import { createOwnList, publishList, updateListSettings } from "@/features/wishlists/list-actions";
import { getOwnList, listOwnLists } from "@/features/wishlists/owner-queries";
import { getEarlierYears, getFamilyDashboard, getListBySlug } from "@/features/wishlists/public-queries";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(resetRequest);

async function world() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [alex, sarah] = await db.insert(member).values([{ householdId: h.id, displayName: "Alex", approvedAt: new Date() }, { householdId: h.id, displayName: "Sarah", approvedAt: new Date() }]).returning();
  return { h, alex, sarah };
}
const signInOwner = async (memberId: string) => cookieJar.set(COOKIE_NAMES.owner, (await createSession("owner", memberId)).token);
const unauthorized = { ok: false, error: { code: "UNAUTHORIZED" } };

describe("createOwnList", () => {
  it("makes a published list for the signed-in member, ignoring a member id in the input", async () => {
    const { alex, sarah } = await world();
    await signInOwner(alex.id);
    const r = await createOwnList({ title: "Christmas 2026", year: 2026, memberId: sarah.id } as never);
    expect(r.ok).toBe(true);
    const [l] = await db.select().from(wishlist);
    expect(l).toMatchObject({ memberId: alex.id, title: "Christmas 2026", occasion: "Christmas" });
    expect(l.publishedAt).not.toBeNull();
  });

  it("makes a private draft when asked", async () => {
    const { alex } = await world();
    await signInOwner(alex.id);
    await createOwnList({ title: "Birthday", occasion: "Birthday", year: 2027, draft: true });
    expect((await db.select().from(wishlist))[0].publishedAt).toBeNull();
  });

  it("is unauthorized when signed out, as a viewer only, or as the admin, and creates nothing", async () => {
    const { h } = await world();
    expect(await createOwnList({ title: "x", year: 2026 })).toMatchObject(unauthorized);
    cookieJar.set(COOKIE_NAMES.admin, (await createSession("admin", h.id)).token);
    expect(await createOwnList({ title: "x", year: 2026 })).toMatchObject(unauthorized);
    expect(await db.select().from(wishlist)).toHaveLength(0);
  });

  it("rejects an empty title and a year outside 2000 to 2100", async () => {
    const { alex } = await world();
    await signInOwner(alex.id);
    for (const bad of [{ title: "  ", year: 2026 }, { title: "x", year: 1999 }, { title: "x", year: 2101 }, { title: "x", year: 2026.5 }]) {
      expect(await createOwnList(bad)).toMatchObject({ ok: false, error: { code: "INVALID" } });
    }
    expect(await db.select().from(wishlist)).toHaveLength(0);
  });
});

describe("the admin createList", () => {
  it("still publishes through the same helper", async () => {
    const { h, alex } = await world();
    cookieJar.set(COOKIE_NAMES.admin, (await createSession("admin", h.id)).token);
    expect((await createList({ memberId: alex.id, title: "T", year: 2026 })).ok).toBe(true);
    expect((await db.select().from(wishlist))[0].publishedAt).not.toBeNull();
  });
});

describe("a draft", () => {
  async function withDraft() {
    const w = await world();
    await signInOwner(w.alex.id);
    await createOwnList({ title: "Draft", year: 2026, draft: true });
    await createOwnList({ title: "Live", year: 2026 });
    const [draft] = await db.select().from(wishlist).where(eq(wishlist.title, "Draft"));
    return { ...w, draft };
  }

  it("is hidden from the family page, earlier years and its share link", async () => {
    const { draft } = await withDraft();
    await db.update(wishlist).set({ archivedAt: new Date() }).where(eq(wishlist.id, draft.id));
    expect(await getListBySlug(draft.slug)).toBeNull();
    expect((await getFamilyDashboard()).members.flatMap((m) => m.lists.map((l) => l.title))).toEqual(["Live"]);
    expect(await getEarlierYears()).toEqual([]);
  });

  it("is shown to its owner, flagged as not published, and to the admin as a draft", async () => {
    const { draft, h } = await withDraft();
    expect((await listOwnLists()).map((l) => [l.title, l.published]).sort()).toEqual([["Draft", false], ["Live", true]]);
    expect(await getOwnList(draft.id)).toMatchObject({ published: false });
    cookieJar.set(COOKIE_NAMES.admin, (await createSession("admin", h.id)).token);
    const rows = await listAllListsForAdmin();
    expect(rows.find((r) => r.title === "Draft")!.publishedAt).toBeNull();
    expect(rows.find((r) => r.title === "Live")!.publishedAt).not.toBeNull();
  });

  it("is published by its owner, once: publishing again keeps the first time", async () => {
    const { draft } = await withDraft();
    expect((await publishList(draft.id)).ok).toBe(true);
    const [first] = await db.select().from(wishlist).where(eq(wishlist.id, draft.id));
    expect(first.publishedAt).not.toBeNull();
    expect(await getListBySlug(draft.slug)).not.toBeNull();
    expect((await publishList(draft.id)).ok).toBe(true);
    const [again] = await db.select().from(wishlist).where(eq(wishlist.id, draft.id));
    expect(again.publishedAt).toEqual(first.publishedAt);
  });

  it("cannot be published by another member, signed-out visitors or for an unknown id", async () => {
    const { draft, sarah } = await withDraft();
    resetRequest();
    expect(await publishList(draft.id)).toMatchObject(unauthorized);
    await signInOwner(sarah.id);
    expect(await publishList(draft.id)).toMatchObject(unauthorized);
    expect(await publishList("not-a-uuid")).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect((await db.select().from(wishlist).where(eq(wishlist.id, draft.id)))[0].publishedAt).toBeNull();
  });
});

describe("the ranked setting", () => {
  it("defaults to ranked, can start unranked, and is shown on the owner and family views", async () => {
    const { alex } = await world();
    await signInOwner(alex.id);
    await createOwnList({ title: "Ranked", year: 2026 });
    await createOwnList({ title: "Flat", year: 2026, ranked: false });
    const rows = await db.select().from(wishlist);
    expect(rows.find((r) => r.title === "Ranked")!.ranked).toBe(true);
    const flat = rows.find((r) => r.title === "Flat")!;
    expect(flat.ranked).toBe(false);
    expect(await getOwnList(flat.id)).toMatchObject({ ranked: false });
    expect(await getListBySlug(flat.slug)).toMatchObject({ ranked: false });
  });

  it("is changed, with the title, by the owner only, and never rewrites a gift", async () => {
    const { alex, sarah } = await world();
    await signInOwner(alex.id);
    await createOwnList({ title: "Mine", year: 2026 });
    const [l] = await db.select().from(wishlist);
    const [g] = await db.insert(wishlistItem).values({ wishlistId: l.id, title: "Book", priority: "most_wanted", sortOrder: 30 }).returning();
    expect((await updateListSettings(l.id, { title: "Mine, flat", ranked: false })).ok).toBe(true);
    expect(await db.select().from(wishlist)).toMatchObject([{ title: "Mine, flat", ranked: false }]);
    await updateListSettings(l.id, { title: "Mine, flat", ranked: true });
    expect((await db.select().from(wishlistItem).where(eq(wishlistItem.id, g.id)))[0]).toMatchObject({ priority: "most_wanted", sortOrder: 30 });

    expect(await updateListSettings(l.id, { title: " ", ranked: true })).toMatchObject({ ok: false, error: { code: "INVALID" } });
    resetRequest();
    await signInOwner(sarah.id);
    expect(await updateListSettings(l.id, { title: "Hijack", ranked: false })).toMatchObject(unauthorized);
    expect((await db.select().from(wishlist))[0].title).toBe("Mine, flat");
  });
});
