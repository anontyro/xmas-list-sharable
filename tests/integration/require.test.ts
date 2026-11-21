import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { eq } from "drizzle-orm";
import { guest, household, member } from "@/db/schema";
import { ensureLinkedGuest } from "@/features/authentication/linked-guest";
import { getViewer } from "@/features/authentication/guest-session";
import { currentGuest } from "@/lib/auth/require";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { requireAdmin, requireGuest, requireOwner } from "@/lib/auth/require";
import { createSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/result";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);

beforeEach(resetRequest);

describe("guards", () => {
  it("requireOwner accepts only the owner session of that member", async () => {
    const { token } = await createSession("owner", "11111111-1111-1111-1111-111111111111");
    cookieJar.set(COOKIE_NAMES.owner, token);
    await expect(requireOwner("11111111-1111-1111-1111-111111111111")).resolves.toBeTruthy();
    await expect(requireOwner("22222222-2222-2222-2222-222222222222")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("does not accept a guest or admin token in the owner cookie", async () => {
    const [h] = await db.insert(household).values({ name: "F" }).returning();
    for (const type of ["guest", "admin"] as const) {
      cookieJar.set(COOKIE_NAMES.owner, (await createSession(type, h.id)).token);
      await expect(requireOwner(h.id)).rejects.toBeInstanceOf(UnauthorizedError);
    }
  });

  it("requireAdmin and requireGuest throw with no session and pass with the right one", async () => {
    const [h] = await db.insert(household).values({ name: "F" }).returning();
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(requireGuest()).rejects.toBeInstanceOf(UnauthorizedError);
    cookieJar.set(COOKIE_NAMES.admin, (await createSession("admin", h.id)).token);
    await expect(requireAdmin()).resolves.toBeUndefined();
    cookieJar.set(COOKIE_NAMES.guest, (await createSession("guest", h.id)).token);
    await expect(requireGuest()).resolves.toMatchObject({ type: "guest" });
  });

  it("an admin cookie does not make someone a guest", async () => {
    const [h] = await db.insert(household).values({ name: "F" }).returning();
    cookieJar.set(COOKIE_NAMES.admin, (await createSession("admin", h.id)).token);
    await expect(requireGuest()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

async function family() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [sarah, alex] = await db.insert(member).values([{ householdId: h.id, displayName: "Sarah", approvedAt: new Date() }, { householdId: h.id, displayName: "Alex" }]).returning();
  return { h, sarah, alex };
}
const signInGuest = async (id: string) => cookieJar.set(COOKIE_NAMES.guest, (await createSession("guest", id)).token);

describe("guest principal and viewer", () => {
  it("carries the linked member, and null for an ordinary guest", async () => {
    const { h, sarah } = await family();
    const [plain] = await db.insert(guest).values({ householdId: h.id, displayName: "Pat" }).returning();
    const [linked] = await db.insert(guest).values({ householdId: h.id, displayName: "Sarah", memberId: sarah.id }).returning();
    await signInGuest(plain.id);
    expect(await currentGuest()).toMatchObject({ guestId: plain.id, memberId: null });
    await signInGuest(linked.id);
    expect(await currentGuest()).toMatchObject({ guestId: linked.id, memberId: sarah.id });
  });

  it("reports guest and owner independently, and pending only for an unapproved member", async () => {
    const { sarah, alex, h } = await family();
    expect(await getViewer()).toEqual({ guest: null, owner: null });
    const [gs] = await db.insert(guest).values({ householdId: h.id, displayName: "Sarah", memberId: sarah.id }).returning();
    await signInGuest(gs.id);
    expect(await getViewer()).toMatchObject({ guest: { guestId: gs.id, memberId: sarah.id, pending: false }, owner: null });
    cookieJar.set(COOKIE_NAMES.owner, (await createSession("owner", sarah.id)).token);
    expect(await getViewer()).toMatchObject({ owner: { memberId: sarah.id } });
    cookieJar.clear();
    const [ga] = await db.insert(guest).values({ householdId: h.id, displayName: "Alex", memberId: alex.id }).returning();
    await signInGuest(ga.id);
    expect((await getViewer()).guest?.pending).toBe(true);
    cookieJar.clear();
    cookieJar.set(COOKIE_NAMES.owner, (await createSession("owner", sarah.id)).token);
    expect(await getViewer()).toMatchObject({ guest: null, owner: { memberId: sarah.id } }); // an owner alone must not throw
  });
});

describe("ensureLinkedGuest", () => {
  it("returns the member's existing guest on a second call", async () => {
    const { sarah } = await family();
    const first = await ensureLinkedGuest(sarah.id);
    expect(await ensureLinkedGuest(sarah.id)).toBe(first);
    expect(await db.select().from(guest)).toHaveLength(1);
  });

  it("creates a guest with the member's name when the browser has none", async () => {
    const { sarah } = await family();
    const id = await ensureLinkedGuest(sarah.id);
    const [g] = await db.select().from(guest).where(eq(guest.id, id));
    expect(g).toMatchObject({ displayName: "Sarah", memberId: sarah.id });
  });

  it("adopts this browser's unlinked guest, keeping its id and taking the member's name", async () => {
    const { h, sarah } = await family();
    const [plain] = await db.insert(guest).values({ householdId: h.id, displayName: "sarah w" }).returning();
    await signInGuest(plain.id);
    expect(await ensureLinkedGuest(sarah.id)).toBe(plain.id);
    const [g] = await db.select().from(guest).where(eq(guest.id, plain.id));
    expect(g).toMatchObject({ memberId: sarah.id, displayName: "Sarah" });
  });

  it("never relinks a guest that belongs to another member", async () => {
    const { h, sarah, alex } = await family();
    const [alexGuest] = await db.insert(guest).values({ householdId: h.id, displayName: "Alex", memberId: alex.id }).returning();
    await signInGuest(alexGuest.id);
    const id = await ensureLinkedGuest(sarah.id);
    expect(id).not.toBe(alexGuest.id);
    const [still] = await db.select().from(guest).where(eq(guest.id, alexGuest.id));
    expect(still.memberId).toBe(alex.id);
  });

  it("prefers the member's own guest over adopting the browser's", async () => {
    const { h, sarah } = await family();
    const [own] = await db.insert(guest).values({ householdId: h.id, displayName: "Sarah", memberId: sarah.id }).returning();
    const [plain] = await db.insert(guest).values({ householdId: h.id, displayName: "Other" }).returning();
    await signInGuest(plain.id);
    expect(await ensureLinkedGuest(sarah.id)).toBe(own.id);
    expect((await db.select().from(guest).where(eq(guest.id, plain.id)))[0].memberId).toBeNull();
  });
});
