"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireGuest } from "@/lib/auth/require";
import { action, type Result } from "@/lib/result";
import { markPurchased, release, reserve } from "./claims";
import { claimError } from "./errors";
import { clearInterest, setInterest } from "./interest";
import type { GuestItemState } from "./guest-claim-view";

const uuid = z.string().uuid();

/** Every guest action: must be a signed-in guest, acts only as that guest, then refreshes list pages. */
function run(itemId: string, fn: (guestId: string) => Promise<Result<GuestItemState>>) {
  return action(async () => {
    const { guestId } = await requireGuest();
    if (!uuid.safeParse(itemId).success) return claimError("ITEM_UNAVAILABLE");
    const result = await fn(guestId);
    revalidatePath("/l/[slug]", "page");
    return result;
  });
}

export async function reserveItem(itemId: string) {
  return run(itemId, (g) => reserve(g, itemId));
}
export async function purchaseItem(itemId: string) {
  return run(itemId, (g) => markPurchased(g, itemId));
}
export async function releaseItem(itemId: string, confirm = false) {
  return run(itemId, (g) => release(g, itemId, confirm));
}
export async function showInterest(itemId: string) {
  return run(itemId, (g) => setInterest(g, itemId));
}
export async function withdrawInterest(itemId: string) {
  return run(itemId, (g) => clearInterest(g, itemId));
}
