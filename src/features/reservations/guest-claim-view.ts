import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { guest, itemClaim, itemInterest } from "@/db/schema";
import type { GuestItem } from "@/features/wishlists/views";

// Everything a guest may see about claims lives in this module. Owner and admin code must never import it (see eslint.config.mjs).

export type GuestItemStateName =
  | "available"
  | "interested"
  | "reserved_by_you"
  | "reserved_by_other"
  | "purchased_by_you"
  | "purchased_by_other";

/** `claimedBy` is the other guest's current display name, shown only to a signed-in guest (decision 0009). */
export type GuestItemState = { state: GuestItemStateName; claimedBy?: string };

export type ClaimedGuestItem = GuestItem & { state: GuestItemState };

/** States for several items as seen by `viewerId` (null = a visitor who has not given a name yet). An active claim wins over interest. */
export async function getItemStates(viewerId: string | null, itemIds: string[]): Promise<Map<string, GuestItemState>> {
  const states = new Map<string, GuestItemState>();
  if (itemIds.length === 0) return states;
  const db = getDb();

  const claims = await db
    .select({ itemId: itemClaim.itemId, guestId: itemClaim.guestId, status: itemClaim.status, name: guest.displayName })
    .from(itemClaim)
    .innerJoin(guest, eq(guest.id, itemClaim.guestId))
    .where(and(inArray(itemClaim.itemId, itemIds), isNull(itemClaim.releasedAt)));
  const interested = viewerId
    ? new Set((await db.select({ itemId: itemInterest.itemId }).from(itemInterest).where(and(eq(itemInterest.guestId, viewerId), inArray(itemInterest.itemId, itemIds)))).map((r) => r.itemId))
    : new Set<string>();
  const claimByItem = new Map(claims.map((c) => [c.itemId, c]));

  for (const id of itemIds) {
    const claim = claimByItem.get(id);
    if (!claim) states.set(id, { state: interested.has(id) ? "interested" : "available" });
    else if (claim.guestId === viewerId) states.set(id, { state: `${claim.status as "reserved" | "purchased"}_by_you` });
    else states.set(id, { state: `${claim.status as "reserved" | "purchased"}_by_other`, ...(viewerId && { claimedBy: claim.name }) });
  }
  return states;
}

export async function getItemState(viewerId: string | null, itemId: string): Promise<GuestItemState> {
  return (await getItemStates(viewerId, [itemId])).get(itemId)!;
}
