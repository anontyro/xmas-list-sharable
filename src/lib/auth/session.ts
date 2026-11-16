import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { session } from "@/db/schema";
import { hashToken, newToken } from "@/lib/security/token";

export type PrincipalType = "admin" | "owner" | "guest";

const HOUR = 3_600_000;
export const SESSION_TTL_MS: Record<PrincipalType, number> = {
  admin: 8 * HOUR,
  owner: 12 * HOUR,
  guest: 180 * 24 * HOUR,
};

export async function createSession(type: PrincipalType, principalId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS[type]);
  await getDb().insert(session).values({ principalType: type, principalId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

/** Resolves a token for one role only: an owner token presented as a guest token finds nothing. */
export async function getSession(type: PrincipalType, token: string) {
  const [row] = await getDb()
    .select({ id: session.id, principalId: session.principalId })
    .from(session)
    .where(
      and(
        eq(session.tokenHash, hashToken(token)),
        eq(session.principalType, type),
        isNull(session.revokedAt),
        gt(session.expiresAt, new Date()),
      ),
    );
  return row ? { principalType: type, principalId: row.principalId } : null;
}

export async function revokeSession(token: string) {
  await getDb().update(session).set({ revokedAt: new Date() }).where(eq(session.tokenHash, hashToken(token)));
}

export async function revokeSessionsFor(type: PrincipalType, principalId: string) {
  await getDb()
    .update(session)
    .set({ revokedAt: new Date() })
    .where(and(eq(session.principalType, type), eq(session.principalId, principalId), isNull(session.revokedAt)));
}
