import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { guest, household, itemClaim, itemInterest, member, plannerItem, recipientBudget, wishlist, wishlistItem } from "@/db/schema";
import { saveBudgets, setEntryDetails } from "@/features/planner/actions";
import { getPlanner, getPlannerSummary } from "@/features/planner/queries";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/result";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(resetRequest);

async function world() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [alex, sarah] = await db.insert(member).values([{ householdId: h.id, displayName: "Alex" }, { householdId: h.id, displayName: "Sarah" }]).returning();
  const [la] = await db.insert(wishlist).values({ memberId: alex.id, title: "A", occasion: "Christmas", year: 2026, slug: "alexslug001" }).returning();
  const [ls] = await db.insert(wishlist).values({ memberId: sarah.id, title: "S", occasion: "Christmas", year: 2026, slug: "sarahslug01" }).returning();
  const [lb] = await db.insert(wishlist).values({ memberId: sarah.id, title: "B", occasion: "Birthday", year: 2026, slug: "sarahbday01" }).returning();
  const mk = async (listId: string, title: string, priceMinor: number | null) => (await db.insert(wishlistItem).values({ wishlistId: listId, title, priceMinor }).returning())[0];
  const [ann, bob] = await db.insert(guest).values([{ householdId: h.id, displayName: "Ann" }, { householdId: h.id, displayName: "Bob" }]).returning();
  const signIn = async (g: { id: string }) => {
    cookieJar.clear();
    cookieJar.set(COOKIE_NAMES.guest, (await createSession("guest", g.id)).token);
  };
  return { alex, sarah, la, ls, lb, mk, ann, bob, signIn };
}

describe("getPlanner", () => {
  it("groups the guest's interests and claims by recipient with states and totals", async () => {
    const { la, ls, mk, ann, signIn } = await world();
    const headphones = await mk(la.id, "Headphones", 12999);
    const novel = await mk(la.id, "Novel", 1499);
    const cookbook = await mk(ls.id, "Cookbook", 2499);
    await db.insert(itemClaim).values([{ itemId: headphones.id, guestId: ann.id, status: "reserved" }, { itemId: cookbook.id, guestId: ann.id, status: "purchased" }]);
    await db.insert(itemInterest).values([{ guestId: ann.id, itemId: novel.id }, { guestId: ann.id, itemId: headphones.id }]);
    await signIn(ann);

    const p = await getPlanner();
    expect(p.selected).toEqual({ occasion: "Christmas", year: 2026 });
    expect(p.groups.map((g) => g.memberName)).toEqual(["Alex", "Sarah"]);
    expect(p.groups[0].entries.map((e) => [e.title, e.state])).toEqual([["Headphones", "reserved"], ["Novel", "interested"]]); // claim wins over interest
    expect(p.groups[1].entries.map((e) => [e.title, e.state])).toEqual([["Cookbook", "purchased"]]);
    expect(p.totals).toMatchObject({ plannedMinor: 12999 + 2499, spentMinor: 2499, potentialMinor: 1499, remainingMinor: null });
  });

  it("never shows another guest's entries, claims or notes", async () => {
    const { la, mk, ann, bob, signIn } = await world();
    const item = await mk(la.id, "Headphones", 12999);
    await db.insert(itemClaim).values({ itemId: item.id, guestId: ann.id, status: "reserved" });
    await signIn(ann);
    expect((await setEntryDetails({ itemId: item.id, note: "secret", actualPrice: "99.00", included: true })).ok).toBe(true);
    await signIn(bob);
    const p = await getPlanner();
    expect(p.groups).toEqual([]);
    expect(JSON.stringify(p)).not.toMatch(/secret|Headphones/);
  });

  it("needs a guest session; owner and admin cookies do not count", async () => {
    const { alex } = await world();
    await expect(getPlanner()).rejects.toBeInstanceOf(UnauthorizedError);
    cookieJar.set(COOKIE_NAMES.owner, (await createSession("owner", alex.id)).token);
    cookieJar.set(COOKIE_NAMES.admin, (await createSession("admin", alex.id)).token);
    await expect(getPlanner()).rejects.toBeInstanceOf(UnauthorizedError);
    expect(await saveBudgets({ occasion: "Christmas", year: 2026, total: "100", recipients: [] })).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    expect(await setEntryDetails({ itemId: "00000000-0000-0000-0000-000000000000", note: "", actualPrice: "", included: true })).toMatchObject({ error: { code: "UNAUTHORIZED" } });
  });

  it("still shows a claimed gift the owner deleted, counts it, and drops deleted interest-only gifts", async () => {
    const { la, mk, ann, signIn } = await world();
    const held = await mk(la.id, "Held", 5000);
    const wanted = await mk(la.id, "Wanted", 1000);
    await db.insert(itemClaim).values({ itemId: held.id, guestId: ann.id, status: "reserved" });
    await db.insert(itemInterest).values({ guestId: ann.id, itemId: wanted.id });
    await db.update(wishlistItem).set({ deletedAt: new Date() });
    await signIn(ann);
    const p = await getPlanner();
    expect(p.groups[0].entries).toHaveLength(1);
    expect(p.groups[0].entries[0]).toMatchObject({ title: "Held", removed: true });
    expect(p.totals.plannedMinor).toBe(5000);
  });

  it("picks the newest period by default, honours a valid request and ignores an invalid one", async () => {
    const { la, lb, mk, ann, signIn } = await world();
    await db.insert(itemInterest).values([{ guestId: ann.id, itemId: (await mk(la.id, "X", 100)).id }, { guestId: ann.id, itemId: (await mk(lb.id, "Y", 200)).id }]);
    await signIn(ann);
    expect((await getPlanner()).selected).toEqual({ occasion: "Birthday", year: 2026 }); // same year: occasions sorted by name
    expect((await getPlanner({ occasion: "Christmas", year: 2026 })).groups[0].entries[0].title).toBe("X");
    expect((await getPlanner({ occasion: "Nope", year: 1999 })).selected).toEqual({ occasion: "Birthday", year: 2026 });
    expect((await getPlanner()).periods).toHaveLength(2);
  });

  it("gives the family page's summary the same planned, spent and budget numbers as the planner page", async () => {
    const { la, ls, mk, ann, signIn } = await world();
    const headphones = await mk(la.id, "Headphones", 12999);
    const cookbook = await mk(ls.id, "Cookbook", 2499);
    await db.insert(itemClaim).values([{ itemId: headphones.id, guestId: ann.id, status: "reserved" }, { itemId: cookbook.id, guestId: ann.id, status: "purchased" }]);
    await signIn(ann);
    expect(await getPlannerSummary()).toEqual({ plannedMinor: 15498, spentMinor: 2499, budgetMinor: null });
    await saveBudgets({ occasion: "Christmas", year: 2026, total: "300", recipients: [] });
    const p = await getPlanner();
    expect(await getPlannerSummary()).toEqual({ plannedMinor: p.totals.plannedMinor, spentMinor: p.totals.spentMinor, budgetMinor: 30000 });
  });

  it("gives the summary for the period asked for, even one with nothing in it, not the newest period with entries", async () => {
    const { alex, mk, ann, signIn } = await world();
    const [old] = await db.insert(wishlist).values({ memberId: alex.id, title: "Old", occasion: "Christmas", year: 2025, slug: "alexold2025" }).returning();
    const oldGift = await mk(old.id, "Old gift", 1000);
    await db.insert(itemClaim).values({ itemId: oldGift.id, guestId: ann.id, status: "reserved" });
    await signIn(ann);
    expect(await getPlannerSummary()).toEqual({ plannedMinor: 1000, spentMinor: 0, budgetMinor: null }); // no period: the newest with entries
    expect(await getPlannerSummary({ occasion: "Christmas", year: 2025 })).toEqual({ plannedMinor: 1000, spentMinor: 0, budgetMinor: null });
    // 2026 has no entries yet: it reads as empty, not as 2025.
    expect(await getPlannerSummary({ occasion: "Christmas", year: 2026 })).toEqual({ plannedMinor: 0, spentMinor: 0, budgetMinor: null });
    // A budget set for an empty period still shows.
    await saveBudgets({ occasion: "Christmas", year: 2026, total: "80", recipients: [] });
    expect(await getPlannerSummary({ occasion: "Christmas", year: 2026 })).toEqual({ plannedMinor: 0, spentMinor: 0, budgetMinor: 8000 });
    // The planner page itself still falls back to a period that has entries when asked for one that does not exist.
    expect((await getPlanner({ occasion: "Nope", year: 1999 })).selected).toEqual({ occasion: "Christmas", year: 2025 });
  });

  it("has an empty default planner for a guest with nothing yet", async () => {
    const { ann, signIn } = await world();
    await signIn(ann);
    const p = await getPlanner();
    expect(p.groups).toEqual([]);
    expect(p.totals).toEqual({ plannedMinor: 0, spentMinor: 0, potentialMinor: 0, remainingMinor: null, unpricedCount: 0 });
  });
});

describe("planner actions", () => {
  it("saves nothing when one of the people is unknown: the total and the other budgets are left as they were", async () => {
    const { sarah, ann, signIn } = await world();
    await signIn(ann);
    expect((await saveBudgets({ occasion: "Christmas", year: 2026, total: "100", recipients: [{ memberId: sarah.id, budget: "10" }] })).ok).toBe(true);

    const r = await saveBudgets({
      occasion: "Christmas",
      year: 2026,
      total: "999",
      recipients: [{ memberId: sarah.id, budget: "77" }, { memberId: "00000000-0000-4000-8000-000000000000", budget: "5" }],
    });

    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const p = await getPlanner();
    expect(p.budgetMinor).toBe(10000);
    expect((await db.select().from(recipientBudget)).map((b) => b.budgetMinor)).toEqual([1000]);
  });

  it("saves budgets, notes, actual prices and exclusions, and they show up in the totals", async () => {
    const { sarah, la, ls, mk, ann, signIn } = await world();
    const a = await mk(la.id, "Headphones", 12999);
    const b = await mk(ls.id, "Cookbook", 2499);
    await db.insert(itemClaim).values([{ itemId: a.id, guestId: ann.id, status: "reserved" }, { itemId: b.id, guestId: ann.id, status: "purchased" }]);
    await signIn(ann);
    expect((await saveBudgets({ occasion: "Christmas", year: 2026, total: "250", recipients: [{ memberId: sarah.id, budget: "30.00" }] })).ok).toBe(true);
    expect((await setEntryDetails({ itemId: b.id, note: "  gift wrap please ", actualPrice: "19.50", included: true })).ok).toBe(true);
    const p = await getPlanner();
    expect(p.budgetMinor).toBe(25000);
    const sarahGroup = p.groups.find((g) => g.memberName === "Sarah")!;
    expect(sarahGroup).toMatchObject({ budgetMinor: 3000, totals: { plannedMinor: 1950, remainingMinor: 1050 } });
    expect(sarahGroup.entries[0]).toMatchObject({ note: "gift wrap please", actualPriceMinor: 1950 });
    expect(p.totals).toMatchObject({ plannedMinor: 12999 + 1950, spentMinor: 1950, remainingMinor: 25000 - 12999 - 1950 });

    await setEntryDetails({ itemId: a.id, note: "", actualPrice: "", included: false });
    expect((await getPlanner()).totals.plannedMinor).toBe(1950);
    await saveBudgets({ occasion: "Christmas", year: 2026, total: "", recipients: [{ memberId: sarah.id, budget: "" }] });
    const cleared = await getPlanner();
    expect(cleared.budgetMinor).toBeNull();
    expect(cleared.groups.find((g) => g.memberName === "Sarah")!.budgetMinor).toBeNull();
  });

  it("never changes the owner's listed price", async () => {
    const { la, mk, ann, signIn } = await world();
    const item = await mk(la.id, "Headphones", 12999);
    await db.insert(itemClaim).values({ itemId: item.id, guestId: ann.id, status: "purchased" });
    await signIn(ann);
    await setEntryDetails({ itemId: item.id, note: "", actualPrice: "1.00", included: true });
    expect((await db.select().from(wishlistItem))[0].priceMinor).toBe(12999);
  });

  it("refuses gifts that are not in the caller's planner, so another guest cannot touch them", async () => {
    const { la, mk, ann, bob, signIn } = await world();
    const item = await mk(la.id, "Headphones", 12999);
    await db.insert(itemClaim).values({ itemId: item.id, guestId: ann.id, status: "reserved" });
    await signIn(bob);
    expect(await setEntryDetails({ itemId: item.id, note: "mine now", actualPrice: "5", included: true })).toMatchObject({ error: { code: "NOT_FOUND" } });
    expect(await db.select().from(plannerItem)).toHaveLength(0);
    // Bob's budget write lands in Bob's own planner only.
    await saveBudgets({ occasion: "Christmas", year: 2026, total: "10", recipients: [] });
    await signIn(ann);
    expect((await getPlanner()).budgetMinor).toBeNull();
  });

  it("answers an unknown recipient id with an error, not a crash", async () => {
    const { ann, signIn } = await world();
    await signIn(ann);
    const ghost = "00000000-0000-0000-0000-000000000000";
    expect(await saveBudgets({ occasion: "Christmas", year: 2026, total: "50", recipients: [{ memberId: ghost, budget: "10" }] })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("validates input", async () => {
    const { la, mk, ann, signIn } = await world();
    const item = await mk(la.id, "Headphones", 12999);
    await db.insert(itemInterest).values({ guestId: ann.id, itemId: item.id });
    await signIn(ann);
    expect(await setEntryDetails({ itemId: item.id, note: "x".repeat(501), actualPrice: "", included: true })).toMatchObject({ error: { code: "INVALID" } });
    expect(await setEntryDetails({ itemId: item.id, note: "", actualPrice: "-3", included: true })).toMatchObject({ error: { code: "INVALID" } });
    expect(await setEntryDetails({ itemId: "nope", note: "", actualPrice: "", included: true })).toMatchObject({ error: { code: "INVALID" } });
    expect(await saveBudgets({ occasion: "Christmas", year: 2026, total: "abc", recipients: [] })).toMatchObject({ error: { code: "INVALID" } });
    expect(await saveBudgets({ occasion: "", year: 2026, total: "", recipients: [] })).toMatchObject({ error: { code: "INVALID" } });
  });
});
