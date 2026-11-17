import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { itemInterest } from "@/db/schema";
import { claimError } from "./errors";
import { isClaimable } from "./claims";
import { getItemState } from "./guest-claim-view";
import { ok, type Result } from "@/lib/result";
import type { GuestItemState } from "./guest-claim-view";

/** Interest never locks an item; several guests can be interested in the same one. */
export async function setInterest(guestId: string, itemId: string): Promise<Result<GuestItemState>> {
  if (!(await isClaimable(itemId))) return claimError("ITEM_UNAVAILABLE");
  await getDb().insert(itemInterest).values({ guestId, itemId }).onConflictDoNothing();
  return ok(await getItemState(guestId, itemId));
}

export async function clearInterest(guestId: string, itemId: string): Promise<Result<GuestItemState>> {
  await getDb().delete(itemInterest).where(and(eq(itemInterest.guestId, guestId), eq(itemInterest.itemId, itemId)));
  return ok(await getItemState(guestId, itemId));
}
