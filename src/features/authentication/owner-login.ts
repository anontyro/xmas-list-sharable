"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { member } from "@/db/schema";
import { endSession, setSessionCookie } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";
import { fail, ok } from "@/lib/result";
import { clientIp } from "@/lib/security/client-ip";
import { verifyPin } from "@/lib/security/password";
import { clearFailures, isBlocked, LOGIN_FAILED_MESSAGE, recordFailure } from "@/lib/security/rate-limit";

const failed = () => fail("LOGIN_FAILED", LOGIN_FAILED_MESSAGE);

export async function ownerLogin(memberId: string, pin: string) {
  if (!z.string().uuid().safeParse(memberId).success) return failed();
  const key = `owner:${memberId}:${await clientIp()}`;
  if (await isBlocked(key)) return failed();
  const [m] = await getDb()
    .select({ pinHash: member.pinHash })
    .from(member)
    .where(and(eq(member.id, memberId), eq(member.active, true)));
  if (!m?.pinHash || !(await verifyPin(pin, m.pinHash))) {
    await recordFailure(key);
    return failed();
  }
  await clearFailures(key);
  const { token, expiresAt } = await createSession("owner", memberId);
  await setSessionCookie("owner", token, expiresAt);
  return ok(null);
}

export async function ownerLogout() {
  await endSession("owner");
}
