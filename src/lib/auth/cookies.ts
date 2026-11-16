import { cookies } from "next/headers";
import { revokeSession, SESSION_TTL_MS, type PrincipalType } from "./session";

/** One cookie per role, so an owner or admin session is never mistaken for a guest one. */
export const COOKIE_NAMES: Record<PrincipalType, string> = {
  admin: "fg_admin",
  owner: "fg_owner",
  guest: "fg_guest",
};

export function cookieOptions(type: PrincipalType, expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    maxAge: Math.round(SESSION_TTL_MS[type] / 1000),
  };
}

export async function setSessionCookie(type: PrincipalType, token: string, expiresAt: Date) {
  (await cookies()).set(COOKIE_NAMES[type], token, cookieOptions(type, expiresAt));
}

export async function clearSessionCookie(type: PrincipalType) {
  (await cookies()).delete(COOKIE_NAMES[type]);
}

export async function readSessionToken(type: PrincipalType): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_NAMES[type])?.value;
}

/** Revokes the session behind this browser's cookie (if any) and clears the cookie. */
export async function endSession(type: PrincipalType) {
  const token = await readSessionToken(type);
  if (token) await revokeSession(token);
  await clearSessionCookie(type);
}
