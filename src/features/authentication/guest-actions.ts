"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { guest } from "@/db/schema";
import { setSessionCookie } from "@/lib/auth/cookies";
import { currentGuest, requireGuest } from "@/lib/auth/require";
import { createSession } from "@/lib/auth/session";
import { action, fail, ok } from "@/lib/result";
import { clientIp } from "@/lib/security/client-ip";
import { isBlocked, recordFailure } from "@/lib/security/rate-limit";
import { getHousehold } from "@/features/family/queries";
import { guestName } from "./guest-session";

/** First visit: makes a new guest (names need not be unique) and signs this browser in as them. */
export async function createGuest(displayName: string) {
  return action(async () => {
    const name = guestName.safeParse(displayName);
    if (!name.success) return fail("INVALID", name.error.issues[0].message);
    const existing = await currentGuest();
    if (existing) return ok({ id: existing.guestId }); // a double click must not make two guests
    const hh = await getHousehold();
    if (!hh) return fail("NO_HOUSEHOLD", "The family hasn't been set up yet");
    // Anyone with a list link can reach this, so cap how many guests one address can create.
    const key = `guest:${await clientIp()}`;
    if (await isBlocked(key)) return fail("RATE_LIMITED", "Too many new names from this connection. Try again later.");
    await recordFailure(key, 20);
    const [g] = await getDb().insert(guest).values({ householdId: hh.id, displayName: name.data }).returning({ id: guest.id });
    const { token, expiresAt } = await createSession("guest", g.id);
    await setSessionCookie("guest", token, expiresAt);
    revalidatePath("/l/[slug]", "page");
    return ok({ id: g.id });
  });
}

/** Changes the display name only; claims point at the guest id, so nothing else moves. */
export async function renameGuest(displayName: string) {
  return action(async () => {
    const { guestId } = await requireGuest();
    const name = guestName.safeParse(displayName);
    if (!name.success) return fail("INVALID", name.error.issues[0].message);
    await getDb().update(guest).set({ displayName: name.data }).where(eq(guest.id, guestId));
    revalidatePath("/l/[slug]", "page");
    return ok(null);
  });
}
