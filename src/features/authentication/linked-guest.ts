import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { guest, member } from "@/db/schema";
import { currentGuest } from "@/lib/auth/require";

/**
 * The guest that is this member's viewer side (decision 0025). Returns, in order:
 * the member's existing linked guest; else this browser's current guest if it is not linked to anyone (adopted, so its
 * reservations and planner stay, and it takes the member's name); else a new guest. A guest linked to another member is never relinked.
 */
export async function ensureLinkedGuest(memberId: string): Promise<string> {
  const db = getDb();
  const find = async () => (await db.select({ id: guest.id }).from(guest).where(eq(guest.memberId, memberId)))[0]?.id;
  const existing = await find();
  if (existing) return existing;

  const [m] = await db.select({ householdId: member.householdId, displayName: member.displayName }).from(member).where(eq(member.id, memberId));
  if (!m) throw new Error("No such member");

  const current = await currentGuest();
  if (current && current.memberId === null) {
    const adopted = await db
      .update(guest)
      .set({ memberId, displayName: m.displayName })
      .where(and(eq(guest.id, current.guestId), isNull(guest.memberId)))
      .returning({ id: guest.id });
    if (adopted[0]) return adopted[0].id;
  }

  const [created] = await db.insert(guest).values({ householdId: m.householdId, displayName: m.displayName, memberId }).onConflictDoNothing().returning({ id: guest.id });
  return created?.id ?? (await find())!; // a concurrent sign-in made it first
}
