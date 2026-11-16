import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { household, member, session, wishlist } from "@/db/schema";
import { archiveList, createList, createMember, deactivateMember, renameMember, restoreList, setOwnerPin } from "@/features/family/actions";
import { getMemberForAdmin, listLoginMembers, listMembersForAdmin } from "@/features/family/queries";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { createSession, getSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/result";
import { verifyPin } from "@/lib/security/password";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(resetRequest);

async function setup(asAdmin: boolean) {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [m] = await db.insert(member).values({ householdId: h.id, displayName: "Alex" }).returning();
  if (asAdmin) cookieJar.set(COOKIE_NAMES.admin, (await createSession("admin", h.id)).token);
  return { h, m };
}

describe("without an admin session", () => {
  it("every action is unauthorized and changes nothing", async () => {
    const { m } = await setup(false);
    const [l] = await db.insert(wishlist).values({ memberId: m.id, title: "x", occasion: "Christmas", year: 2026, slug: "aaaaaaaaaa" }).returning();
    const results = [
      await createMember("Sam"),
      await renameMember(m.id, "Changed"),
      await deactivateMember(m.id),
      await setOwnerPin(m.id, "123456"),
      await createList({ memberId: m.id, title: "T", year: 2026 }),
      await archiveList(l.id),
      await restoreList(l.id),
    ];
    for (const r of results) expect(r).toEqual({ ok: false, error: { code: "UNAUTHORIZED", message: "Please sign in again." } });
    const [after] = await db.select().from(member);
    expect(after).toMatchObject({ displayName: "Alex", active: true, pinHash: null });
    expect(await db.select().from(wishlist)).toHaveLength(1);
    expect((await db.select().from(wishlist))[0].archivedAt).toBeNull();
  });

  it("admin queries throw", async () => {
    const { m } = await setup(false);
    await expect(listMembersForAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(getMemberForAdmin(m.id)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("as admin", () => {
  it("creates members, with unique names among active members", async () => {
    await setup(true);
    expect((await createMember("Sarah")).ok).toBe(true);
    expect(await createMember("Sarah")).toMatchObject({ ok: false, error: { code: "NAME_TAKEN" } });
    expect(await createMember("  ")).toMatchObject({ ok: false, error: { code: "INVALID" } });
    expect(await renameMember((await db.select().from(member))[0].id, "Sarah")).toMatchObject({ error: { code: "NAME_TAKEN" } });
  });

  it("hashes the PIN with Argon2id, revokes owner sessions, and never returns the hash", async () => {
    const { m } = await setup(true);
    const owner = await createSession("owner", m.id);
    expect((await setOwnerPin(m.id, "12345")).ok).toBe(false);
    expect((await setOwnerPin(m.id, "123456")).ok).toBe(true);
    const [row] = await db.select().from(member);
    expect(row.pinHash).toMatch(/^\$argon2id\$/);
    expect(await verifyPin("123456", row.pinHash!)).toBe(true);
    expect(await getSession("owner", owner.token)).toBeNull();
    const listed = await listMembersForAdmin();
    expect(listed[0]).toMatchObject({ displayName: "Alex", hasPin: true });
    expect(JSON.stringify(listed)).not.toContain("argon2");
    expect(await db.select().from(session)).toHaveLength(2); // admin + revoked owner
  });

  it("reports an unknown member instead of pretending it worked", async () => {
    await setup(true);
    const ghost = "00000000-0000-0000-0000-000000000000";
    expect(await setOwnerPin(ghost, "123456")).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await createList({ memberId: ghost, title: "T", year: 2026 })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await db.select().from(wishlist)).toHaveLength(0);
  });

  it("deactivating hides the member from sign-in and ends their sessions", async () => {
    const { m } = await setup(true);
    const owner = await createSession("owner", m.id);
    await deactivateMember(m.id);
    expect(await listLoginMembers()).toHaveLength(0);
    expect(await getSession("owner", owner.token)).toBeNull();
  });

  it("creates a list with a random slug, and archives and restores it", async () => {
    const { m } = await setup(true);
    const r = await createList({ memberId: m.id, title: "Christmas 2026", year: 2026 });
    expect(r.ok && r.data.slug).toMatch(/^[0-9A-Za-z]{10}$/);
    if (!r.ok) throw new Error("create failed");
    const [created] = await db.select().from(wishlist);
    expect(created).toMatchObject({ occasion: "Christmas", year: 2026, archivedAt: null });
    await archiveList(r.data.id);
    expect((await db.select().from(wishlist))[0].archivedAt).not.toBeNull();
    await restoreList(r.data.id);
    expect((await db.select().from(wishlist))[0].archivedAt).toBeNull();
    expect(await createList({ memberId: m.id, title: "", year: 2026 })).toMatchObject({ ok: false });
  });
});
