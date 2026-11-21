"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { guest, member } from "@/db/schema";
import { endSession, setSessionCookie } from "@/lib/auth/cookies";
import { currentGuest, requireGuest } from "@/lib/auth/require";
import { createSession } from "@/lib/auth/session";
import { action, fail, ok } from "@/lib/result";
import { clientIp } from "@/lib/security/client-ip";
import { hashPin, isValidPin } from "@/lib/security/password";
import { isBlocked, recordFailure } from "@/lib/security/rate-limit";
import { getHousehold } from "@/features/family/queries";
import { guestName } from "./guest-session";

const PIN_ERROR = "PIN must be 6 to 12 digits";
const NAME_TAKEN = fail("NAME_TAKEN", "Someone with that name already exists. Pick another or sign in.");
const isUniqueViolation = (e: unknown) => {
  const err = e as { code?: string; cause?: { code?: string } };
  return (err?.cause?.code ?? err?.code) === "23505";
};

/**
 * First visit: makes a new guest (names need not be unique) and signs this browser in as them.
 * With a PIN it also makes a member, waiting for the admin's approval, that this guest is the viewer side of (decisions 0025, 0026).
 */
export async function createGuest(displayName: string, pin?: string) {
  return action(async () => {
    const name = guestName.safeParse(displayName);
    if (!name.success) return fail("INVALID", name.error.issues[0].message);
    const withPin = pin !== undefined && pin !== "";
    if (withPin && !isValidPin(pin)) return fail("INVALID", PIN_ERROR);
    const existing = await currentGuest();
    if (existing) return ok({ id: existing.guestId }); // a double click must not make two guests
    const hh = await getHousehold();
    if (!hh) return fail("NO_HOUSEHOLD", "The family hasn't been set up yet");
    // Anyone with a list link can reach this, so cap how many guests one address can create.
    const key = `guest:${await clientIp()}`;
    if (await isBlocked(key)) return fail("RATE_LIMITED", "Too many new names from this connection. Try again later.");
    await recordFailure(key, 20);
    const pinHash = withPin ? await hashPin(pin) : null;
    let id: string;
    try {
      id = await getDb().transaction(async (tx) => {
        const [m] = pinHash ? await tx.insert(member).values({ householdId: hh.id, displayName: name.data, pinHash }).returning({ id: member.id }) : [];
        const [g] = await tx.insert(guest).values({ householdId: hh.id, displayName: name.data, memberId: m?.id }).returning({ id: guest.id });
        return g.id;
      });
    } catch (e) {
      if (isUniqueViolation(e)) return NAME_TAKEN;
      throw e;
    }
    const { token, expiresAt } = await createSession("guest", id);
    await setSessionCookie("guest", token, expiresAt);
    revalidatePath("/", "layout");
    return ok({ id });
  });
}

/** An ordinary guest adds a PIN and becomes a member (waiting for approval), keeping their reservations and planner. */
export async function addPin(pin: string) {
  return action(async () => {
    const { guestId, memberId } = await requireGuest();
    if (memberId) return fail("ALREADY_MEMBER", "You already have a PIN");
    if (!isValidPin(pin)) return fail("INVALID", PIN_ERROR);
    const pinHash = await hashPin(pin);
    try {
      await getDb().transaction(async (tx) => {
        const [g] = await tx.select({ householdId: guest.householdId, displayName: guest.displayName }).from(guest).where(eq(guest.id, guestId));
        const [m] = await tx.insert(member).values({ householdId: g.householdId, displayName: g.displayName, pinHash }).returning({ id: member.id });
        await tx.update(guest).set({ memberId: m.id }).where(eq(guest.id, guestId));
      });
    } catch (e) {
      if (isUniqueViolation(e)) return NAME_TAKEN;
      throw e;
    }
    revalidatePath("/", "layout");
    return ok(null);
  });
}

/** Changes the display name; claims point at the guest id, so nothing else moves. A linked guest renames their member too, so the two never disagree. */
export async function renameGuest(displayName: string) {
  return action(async () => {
    const { guestId, memberId } = await requireGuest();
    const name = guestName.safeParse(displayName);
    if (!name.success) return fail("INVALID", name.error.issues[0].message);
    try {
      await getDb().transaction(async (tx) => {
        if (memberId) await tx.update(member).set({ displayName: name.data }).where(eq(member.id, memberId));
        await tx.update(guest).set({ displayName: name.data }).where(eq(guest.id, guestId));
      });
    } catch (e) {
      if (isUniqueViolation(e)) return NAME_TAKEN;
      throw e;
    }
    revalidatePath("/", "layout");
    return ok(null);
  });
}

/**
 * Signs this browser out of its guest identity. Nothing is deleted: the guest, their claims, planner and recovery link stay,
 * and other devices stay signed in. With no session it does nothing.
 */
export async function signOutGuest() {
  return action(async () => {
    await endSession("guest");
    revalidatePath("/", "layout");
    return ok(null);
  });
}

/** A member signing out of this device: ends the editor and viewer sessions together. Their PIN gets them back, so no recovery link is needed. */
export async function signOutMember() {
  return action(async () => {
    await endSession("owner");
    await endSession("guest");
    revalidatePath("/", "layout");
    return ok(null);
  });
}
