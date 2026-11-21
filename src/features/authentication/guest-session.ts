import { eq } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { getDb } from "@/db/client";
import { guest, member } from "@/db/schema";
import { currentGuest, currentOwner } from "@/lib/auth/require";

export const guestName = z.string().trim().min(1, "Enter a name").max(40, "Keep it under 40 characters");

/**
 * The guest behind this browser's cookie, with their current display name. Null if there is none.
 * `memberId` is set when the guest is a member's viewer side; `pending` while that member waits for the admin (decision 0026).
 */
export const getGuestIdentity = cache(async () => {
  const principal = await currentGuest();
  if (!principal) return null;
  const [row] = await getDb()
    .select({ id: guest.id, displayName: guest.displayName, memberId: guest.memberId, approvedAt: member.approvedAt })
    .from(guest)
    .leftJoin(member, eq(member.id, guest.memberId))
    .where(eq(guest.id, principal.guestId));
  return row ? { guestId: row.id, displayName: row.displayName, memberId: row.memberId, pending: row.memberId !== null && row.approvedAt === null } : null;
});

/** Who this browser is: the guest (viewer) and the owner (editor) sessions, each or neither. Shells and pages ask here, not the cookies. */
export const getViewer = cache(async () => {
  const [g, owner] = await Promise.all([getGuestIdentity(), currentOwner()]);
  return { guest: g, owner };
});
