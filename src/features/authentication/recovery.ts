import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { guest, recoveryToken } from "@/db/schema";
import { hashToken, newToken } from "@/lib/security/token";

/** Makes a new recovery token for the guest and revokes any earlier one. Only the hash is stored; the raw token is returned once. */
export async function createRecoveryToken(guestId: string): Promise<string> {
  const token = newToken();
  await getDb().transaction(async (tx) => {
    // Serialises concurrent makes for one guest; otherwise both would race on the one-active-link index.
    await tx.select({ id: guest.id }).from(guest).where(eq(guest.id, guestId)).for("update");
    await tx.update(recoveryToken).set({ revokedAt: new Date() }).where(and(eq(recoveryToken.guestId, guestId), isNull(recoveryToken.revokedAt)));
    await tx.insert(recoveryToken).values({ guestId, tokenHash: hashToken(token) });
  });
  return token;
}

export async function revokeRecoveryTokens(guestId: string): Promise<void> {
  await getDb().update(recoveryToken).set({ revokedAt: new Date() }).where(and(eq(recoveryToken.guestId, guestId), isNull(recoveryToken.revokedAt)));
}

export async function hasActiveRecovery(guestId: string): Promise<boolean> {
  const rows = await getDb().select({ id: recoveryToken.id }).from(recoveryToken).where(and(eq(recoveryToken.guestId, guestId), isNull(recoveryToken.revokedAt)));
  return rows.length > 0;
}

/** The guest an active token belongs to, or null for an unknown or revoked token. */
export async function guestForRecoveryToken(token: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ guestId: recoveryToken.guestId })
    .from(recoveryToken)
    .where(and(eq(recoveryToken.tokenHash, hashToken(token)), isNull(recoveryToken.revokedAt)));
  return row?.guestId ?? null;
}
