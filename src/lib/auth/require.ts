import { eq } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db/client";
import { guest } from "@/db/schema";
import { readSessionToken } from "./cookies";
import { getSession, type PrincipalType } from "./session";
import { can, type Principal } from "@/lib/permissions";
import { UnauthorizedError } from "@/lib/result";

/** Cached per request, so a layout and its page asking "who is this?" cost one lookup between them. */
const principalFor = cache(async (type: PrincipalType): Promise<Principal> => {
  const token = await readSessionToken(type);
  const s = token ? await getSession(type, token) : null;
  if (!s) return null;
  if (type === "admin") return { type };
  if (type === "owner") return { type, memberId: s.principalId };
  const [g] = await getDb().select({ memberId: guest.memberId }).from(guest).where(eq(guest.id, s.principalId));
  return { type, guestId: s.principalId, memberId: g?.memberId ?? null };
});

/** The signed-in admin, or null. For pages that redirect instead of throwing. */
export const currentAdmin = () => principalFor("admin");
/** The signed-in owner (any member), or null. */
export const currentOwner = () => principalFor("owner") as Promise<Extract<Principal, { type: "owner" }> | null>;
/** The guest for this browser, or null. */
export const currentGuest = () => principalFor("guest") as Promise<Extract<Principal, { type: "guest" }> | null>;

export async function requireAdmin() {
  const p = await currentAdmin();
  if (!can(p, "member.manage")) throw new UnauthorizedError();
}

/** Throws unless the owner session belongs to `memberId`. */
export async function requireOwner(memberId: string) {
  const p = await currentOwner();
  if (!p || !can(p, "item.write", { ownerMemberId: memberId })) throw new UnauthorizedError();
  return p;
}

export async function requireGuest() {
  const p = await currentGuest();
  if (!p || !can(p, "claim.write")) throw new UnauthorizedError();
  return p;
}
