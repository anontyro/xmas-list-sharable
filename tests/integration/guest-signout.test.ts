import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, requestHeaders, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { guest, household, itemClaim, member, recoveryToken, session, wishlist, wishlistItem } from "@/db/schema";
import { POST as exchange } from "@/app/api/recovery/exchange/route";
import { createGuest, signOutGuest } from "@/features/authentication/guest-actions";
import { getGuestIdentity } from "@/features/authentication/guest-session";
import { createRecoveryLink } from "@/features/authentication/recovery-actions";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { createSession, getSession } from "@/lib/auth/session";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  resetRequest();
  requestHeaders.set("x-forwarded-for", "5.6.7.8");
});

/** A household with one gift, and a guest named Sam who has reserved it. */
async function world() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [owner] = await db.insert(member).values({ householdId: h.id, displayName: "Alex" }).returning();
  const [list] = await db.insert(wishlist).values({ memberId: owner.id, title: "A", occasion: "Christmas", year: 2026, slug: "alexslug001" }).returning();
  const [item] = await db.insert(wishlistItem).values({ wishlistId: list.id, title: "Headphones" }).returning();
  const r = await createGuest("Sam");
  if (!r.ok) throw new Error("create failed");
  await db.insert(itemClaim).values({ itemId: item.id, guestId: r.data.id, status: "reserved" });
  return { guestId: r.data.id, itemId: item.id, owner };
}

describe("signOutGuest", () => {
  it("ends this browser's session and clears the cookie, and deletes nothing", async () => {
    const { guestId } = await world();
    const token = cookieJar.get(COOKIE_NAMES.guest)!;
    expect(await getSession("guest", token)).not.toBeNull();

    expect(await signOutGuest()).toEqual({ ok: true, data: null });

    expect(cookieJar.has(COOKIE_NAMES.guest)).toBe(false);
    expect(await getSession("guest", token)).toBeNull();
    expect(await getGuestIdentity()).toBeNull();
    expect(await db.select().from(guest).where(eq(guest.id, guestId))).toHaveLength(1);
    expect(await db.select().from(itemClaim)).toHaveLength(1);
  });

  it("leaves the guest's other devices signed in, and their recovery link working", async () => {
    const { guestId } = await world();
    const otherDevice = (await createSession("guest", guestId)).token;
    const link = await createRecoveryLink();
    if (!link.ok) throw new Error("no link");

    await signOutGuest();

    expect(await getSession("guest", otherDevice)).toEqual({ principalType: "guest", principalId: guestId });
    const [token] = await db.select().from(recoveryToken);
    expect(token.revokedAt).toBeNull();
    // Only this browser's session was revoked.
    const revoked = (await db.select().from(session)).filter((s) => s.revokedAt !== null);
    expect(revoked).toHaveLength(1);
  });

  it("lets the guest come back through the recovery link and see their reservation", async () => {
    const { guestId, itemId } = await world();
    const link = await createRecoveryLink();
    if (!link.ok) throw new Error("no link");
    await signOutGuest();
    expect(await getGuestIdentity()).toBeNull();

    const res = await exchange(new Request("http://x/api/recovery/exchange", { method: "POST", body: JSON.stringify({ token: link.data.path.split("#t=")[1] }) }));

    expect(res.status).toBe(204);
    expect(await getGuestIdentity()).toEqual({ guestId, displayName: "Sam" });
    expect(await db.select().from(itemClaim).where(eq(itemClaim.itemId, itemId))).toMatchObject([{ guestId, status: "reserved" }]);
  });

  it("is a harmless no-op with no session, and does not touch an owner or admin session", async () => {
    const { owner } = await world();
    resetRequest();
    cookieJar.set(COOKIE_NAMES.owner, (await createSession("owner", owner.id)).token);
    const before = await db.select().from(session);

    expect(await signOutGuest()).toEqual({ ok: true, data: null });

    expect(cookieJar.has(COOKIE_NAMES.owner)).toBe(true);
    expect(await db.select().from(session)).toEqual(before);
  });
});
