import { eq } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { getDb } from "@/db/client";
import { guest } from "@/db/schema";
import { currentGuest } from "@/lib/auth/require";

export const guestName = z.string().trim().min(1, "Enter a name").max(40, "Keep it under 40 characters");

/** The guest behind this browser's cookie, with their current display name. Null if there is none. */
export const getGuestIdentity = cache(async () => {
  const principal = await currentGuest();
  if (!principal) return null;
  const [row] = await getDb().select({ id: guest.id, displayName: guest.displayName }).from(guest).where(eq(guest.id, principal.guestId));
  return row ? { guestId: row.id, displayName: row.displayName } : null;
});
