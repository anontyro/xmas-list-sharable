import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { itemClaim, member, wishlist, wishlistItem } from "@/db/schema";
import { ok, type Result } from "@/lib/result";
import { claimError } from "./errors";
import { getItemState, type GuestItemState } from "./guest-claim-view";

type Outcome = Result<GuestItemState>;

/** A gift can be claimed while it is not deleted, its list is not archived and its owner is active. */
export async function isClaimable(itemId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: wishlistItem.id })
    .from(wishlistItem)
    .innerJoin(wishlist, eq(wishlist.id, wishlistItem.wishlistId))
    .innerJoin(member, eq(member.id, wishlist.memberId))
    .where(and(eq(wishlistItem.id, itemId), isNull(wishlistItem.deletedAt), isNull(wishlist.archivedAt), eq(member.active, true)));
  return Boolean(row);
}

const done = async (guestId: string, itemId: string): Promise<Outcome> => ok(await getItemState(guestId, itemId));

/** The database decides the winner: the partial unique index allows one active claim per item (decision 0008). */
export async function reserve(guestId: string, itemId: string): Promise<Outcome> {
  if (!(await isClaimable(itemId))) return claimError("ITEM_UNAVAILABLE");
  try {
    await getDb().insert(itemClaim).values({ itemId, guestId, status: "reserved" });
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    if ((err.cause?.code ?? err.code) !== "23505") throw e;
    // Pressed twice (a double click or a second tab): if the winner is this same guest, that is success, not a conflict.
    const state = await getItemState(guestId, itemId);
    return state.state === "reserved_by_you" || state.state === "purchased_by_you" ? ok(state) : claimError("CLAIM_CONFLICT");
  }
  return done(guestId, itemId);
}

export async function markPurchased(guestId: string, itemId: string): Promise<Outcome> {
  const updated = await getDb()
    .update(itemClaim)
    .set({ status: "purchased", updatedAt: new Date() })
    .where(and(eq(itemClaim.itemId, itemId), eq(itemClaim.guestId, guestId), isNull(itemClaim.releasedAt)))
    .returning({ id: itemClaim.id });
  if (updated.length === 0) return claimError("NOT_CLAIMANT");
  return done(guestId, itemId);
}

/** Releases the caller's own claim. Undoing a purchase needs `confirm: true`. */
export async function release(guestId: string, itemId: string, confirm = false): Promise<Outcome> {
  const [claim] = await getDb()
    .select({ id: itemClaim.id, status: itemClaim.status })
    .from(itemClaim)
    .where(and(eq(itemClaim.itemId, itemId), eq(itemClaim.guestId, guestId), isNull(itemClaim.releasedAt)));
  if (!claim) return claimError("NOT_CLAIMANT");
  if (claim.status === "purchased" && !confirm) return claimError("CONFIRM_REQUIRED");
  // Re-check the release marker so two quick releases cannot both "win".
  await getDb().update(itemClaim).set({ releasedAt: new Date(), updatedAt: new Date() }).where(and(eq(itemClaim.id, claim.id), isNull(itemClaim.releasedAt)));
  return done(guestId, itemId);
}
