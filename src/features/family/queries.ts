import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { household, member, wishlist } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/require";

// Explicit column lists: pin_hash never leaves this file.

export async function getHousehold() {
  const [h] = await getDb().select({ id: household.id, name: household.name }).from(household).limit(1);
  return h ?? null;
}

/** Active members, for the owner sign-in picker. Names are already public on the family page. */
export async function listLoginMembers() {
  return getDb()
    .select({ id: member.id, displayName: member.displayName })
    .from(member)
    .where(eq(member.active, true))
    .orderBy(asc(member.displayName));
}

export async function listMembersForAdmin() {
  await requireAdmin();
  const rows = await getDb()
    .select({ id: member.id, displayName: member.displayName, active: member.active, pinHash: member.pinHash })
    .from(member)
    .orderBy(asc(member.displayName));
  return rows.map(({ pinHash, ...m }) => ({ ...m, hasPin: pinHash !== null }));
}

export async function getMemberForAdmin(memberId: string) {
  await requireAdmin();
  const [m] = await getDb()
    .select({ id: member.id, displayName: member.displayName, active: member.active, pinHash: member.pinHash })
    .from(member)
    .where(eq(member.id, memberId));
  if (!m) return null;
  const { pinHash, ...rest } = m;
  return { ...rest, hasPin: pinHash !== null };
}

export async function listListsForAdmin(memberId: string) {
  await requireAdmin();
  return getDb()
    .select({
      id: wishlist.id,
      title: wishlist.title,
      occasion: wishlist.occasion,
      year: wishlist.year,
      slug: wishlist.slug,
      archivedAt: wishlist.archivedAt,
    })
    .from(wishlist)
    .where(eq(wishlist.memberId, memberId))
    .orderBy(desc(wishlist.year), asc(wishlist.title));
}
