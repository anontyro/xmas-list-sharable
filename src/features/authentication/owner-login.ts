"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { member } from "@/db/schema";
import { currentOwner } from "@/lib/auth/require";
import { endSession, setSessionCookie } from "@/lib/auth/cookies";
import { createSession, revokeSessionsFor } from "@/lib/auth/session";
import { ensureLinkedGuest } from "./linked-guest";
import { fail, ok } from "@/lib/result";
import { clientIp } from "@/lib/security/client-ip";
import { hashPin, isValidPin, verifyPin, verifyPinOrDummy } from "@/lib/security/password";
import { clearFailures, isBlocked, LOGIN_FAILED_MESSAGE, recordFailure } from "@/lib/security/rate-limit";

const failed = () => fail("LOGIN_FAILED", LOGIN_FAILED_MESSAGE);

export async function ownerLogin(memberId: string, pin: string) {
  if (!z.string().uuid().safeParse(memberId).success) return failed();
  const key = `owner:${memberId}:${await clientIp()}`;
  if (await isBlocked(key)) return failed();
  const [m] = await getDb()
    .select({ pinHash: member.pinHash, approvedAt: member.approvedAt })
    .from(member)
    .where(and(eq(member.id, memberId), eq(member.active, true)));
  if (!(await verifyPinOrDummy(pin, m?.pinHash))) {
    await recordFailure(key);
    return failed();
  }
  await clearFailures(key);
  // A member is also a viewer (decision 0025): the same PIN signs this browser in as their linked guest.
  const viewer = await createSession("guest", await ensureLinkedGuest(memberId));
  await setSessionCookie("guest", viewer.token, viewer.expiresAt);
  // Until the admin approves them they can browse and reserve but not edit (decision 0026).
  if (!m.approvedAt) return fail("PENDING_APPROVAL", "You're signed in to browse. The admin will approve you before you can make a list.");
  const { token, expiresAt } = await createSession("owner", memberId);
  await setSessionCookie("owner", token, expiresAt);
  return ok(null);
}

/**
 * An owner changes their own PIN. The current PIN is required (so a borrowed, signed-in browser can't lock the owner out)
 * and wrong guesses count against the same throttle as signing in. Every owner session is ended and this browser gets a
 * fresh one. The admin can still reset the PIN to a new value at any time.
 */
export async function changeOwnPin(currentPin: string, newPin: string) {
  const owner = await currentOwner();
  if (!owner) return fail("UNAUTHORIZED", "Please sign in again.");
  if (!isValidPin(newPin)) return fail("INVALID", "PIN must be 6 to 12 digits");
  const key = `owner:${owner.memberId}:${await clientIp()}`;
  if (await isBlocked(key)) return fail("LOGIN_FAILED", "Too many attempts. Try again later.");
  const [m] = await getDb().select({ pinHash: member.pinHash }).from(member).where(and(eq(member.id, owner.memberId), eq(member.active, true)));
  if (!m?.pinHash || !(await verifyPin(currentPin, m.pinHash))) {
    await recordFailure(key);
    return fail("LOGIN_FAILED", "Your current PIN isn't right.");
  }
  await clearFailures(key);
  await getDb().update(member).set({ pinHash: await hashPin(newPin) }).where(eq(member.id, owner.memberId));
  await revokeSessionsFor("owner", owner.memberId);
  const { token, expiresAt } = await createSession("owner", owner.memberId);
  await setSessionCookie("owner", token, expiresAt);
  return ok(null);
}

export async function ownerLogout() {
  await endSession("owner");
}
