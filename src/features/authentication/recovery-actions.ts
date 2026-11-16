"use server";

import { requireGuest } from "@/lib/auth/require";
import { action, ok } from "@/lib/result";
import { createRecoveryToken, hasActiveRecovery, revokeRecoveryTokens } from "./recovery";

/** Makes this guest's private link (replacing any earlier one). The link path is returned once and never stored. */
export async function createRecoveryLink() {
  return action(async () => {
    const { guestId } = await requireGuest();
    return ok({ path: `/recover#t=${await createRecoveryToken(guestId)}` });
  });
}

export async function revokeRecoveryLink() {
  return action(async () => {
    const { guestId } = await requireGuest();
    await revokeRecoveryTokens(guestId);
    return ok(null);
  });
}

export async function recoveryLinkStatus() {
  return action(async () => {
    const { guestId } = await requireGuest();
    return ok({ active: await hasActiveRecovery(guestId) });
  });
}
