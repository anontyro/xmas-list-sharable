import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "./db-harness";
import { guest, household, itemClaim, member, recoveryToken, wishlist, wishlistItem } from "@/db/schema";

async function world() {
  const [h] = await db.insert(household).values({ name: "Family" }).returning();
  const [m] = await db.insert(member).values({ householdId: h.id, displayName: "Alex" }).returning();
  const [l] = await db.insert(wishlist).values({ memberId: m.id, title: "Xmas", occasion: "Christmas", year: 2026, slug: "abc1234567" }).returning();
  const [item] = await db.insert(wishlistItem).values({ wishlistId: l.id, title: "Book" }).returning();
  const guests = await db.insert(guest).values([{ householdId: h.id, displayName: "Sam" }, { householdId: h.id, displayName: "Sam" }]).returning();
  return { h, m, l, item, g1: guests[0], g2: guests[1] };
}

const rejects = async (p: Promise<unknown>, code: string) => {
  const err = await p.then(() => null, (e) => e);
  expect(err?.cause?.code ?? err?.code).toBe(code);
};

describe("schema invariants", () => {
  it("allows only one active claim per item", async () => {
    const { item, g1, g2 } = await world();
    await db.insert(itemClaim).values({ itemId: item.id, guestId: g1.id, status: "reserved" });
    await rejects(db.insert(itemClaim).values({ itemId: item.id, guestId: g2.id, status: "reserved" }), "23505");
  });

  it("treats a purchased claim as still active", async () => {
    const { item, g1, g2 } = await world();
    await db.insert(itemClaim).values({ itemId: item.id, guestId: g1.id, status: "purchased" });
    await rejects(db.insert(itemClaim).values({ itemId: item.id, guestId: g2.id, status: "reserved" }), "23505");
  });

  it("lets a released claim be replaced", async () => {
    const { item, g1, g2 } = await world();
    await db.insert(itemClaim).values({ itemId: item.id, guestId: g1.id, status: "reserved", releasedAt: new Date() });
    await db.insert(itemClaim).values({ itemId: item.id, guestId: g2.id, status: "reserved" });
    expect(await db.select().from(itemClaim)).toHaveLength(2);
  });

  it("rejects bad enum-like values", async () => {
    const { item, g1, l } = await world();
    await rejects(db.insert(itemClaim).values({ itemId: item.id, guestId: g1.id, status: "bogus" }), "23514");
    await rejects(db.insert(wishlistItem).values({ wishlistId: l.id, title: "x", priority: "urgent" }), "23514");
  });

  it("rejects a duplicate slug", async () => {
    const { m } = await world();
    await rejects(db.insert(wishlist).values({ memberId: m.id, title: "Other", occasion: "Christmas", year: 2026, slug: "abc1234567" }), "23505");
  });

  it("allows one active recovery link per guest, and a new one after revoking", async () => {
    const { g1 } = await world();
    await db.insert(recoveryToken).values({ guestId: g1.id, tokenHash: "a" });
    await rejects(db.insert(recoveryToken).values({ guestId: g1.id, tokenHash: "b" }), "23505");
    await db.update(recoveryToken).set({ revokedAt: new Date() });
    await db.insert(recoveryToken).values({ guestId: g1.id, tokenHash: "b" });
  });

  it("keeps active member names unique but lets an inactive name be reused", async () => {
    const { h } = await world();
    await rejects(db.insert(member).values({ householdId: h.id, displayName: "Alex" }), "23505");
    await db.update(member).set({ active: false });
    await db.insert(member).values({ householdId: h.id, displayName: "Alex" });
  });
});

describe("member picture", () => {
  it("is a nullable text column", async () => {
    const rows = await db.execute<{ data_type: string; is_nullable: string }>(
      sql`select data_type, is_nullable from information_schema.columns where table_name = 'member' and column_name = 'avatar'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ data_type: "text", is_nullable: "YES" });
  });

  it("reads null for a member made without one, and keeps one that is given", async () => {
    const { h, m } = await world();
    expect(m.avatar).toBeNull();
    const [mia] = await db.insert(member).values({ householdId: h.id, displayName: "Mia", avatar: "child" }).returning();
    expect(mia.avatar).toBe("child");
  });

  it("is not policed by the database, so the list of allowed pictures can change without a migration", async () => {
    const constraints = await db.execute<{ def: string }>(
      sql`select pg_get_constraintdef(c.oid) as def from pg_constraint c join pg_class t on t.oid = c.conrelid where t.relname = 'member' and c.contype = 'c'`,
    );
    expect(constraints.map((c) => c.def).join(" ")).not.toContain("avatar");
  });
});
