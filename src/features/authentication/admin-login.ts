"use server";

import { getEnv } from "@/lib/env";
import { endSession, setSessionCookie } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";
import { fail, ok } from "@/lib/result";
import { clientIp } from "@/lib/security/client-ip";
import { clearFailures, isBlocked, LOGIN_FAILED_MESSAGE, recordFailure } from "@/lib/security/rate-limit";
import { safeEqual } from "@/lib/security/token";
import { getHousehold } from "@/features/family/queries";

const failed = () => fail("LOGIN_FAILED", LOGIN_FAILED_MESSAGE);

export async function adminLogin(secret: string) {
  const key = `admin:${await clientIp()}`;
  if (await isBlocked(key)) return failed();
  if (!safeEqual(secret, getEnv().ADMIN_SECRET)) {
    await recordFailure(key);
    return failed();
  }
  const hh = await getHousehold();
  if (!hh) return fail("NO_HOUSEHOLD", "Run pnpm db:seed first");
  await clearFailures(key);
  const { token, expiresAt } = await createSession("admin", hh.id);
  await setSessionCookie("admin", token, expiresAt);
  return ok(null);
}

export async function adminLogout() {
  await endSession("admin");
}
