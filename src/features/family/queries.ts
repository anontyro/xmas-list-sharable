import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { household, member, wishlist } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/require";
import { toAvatar } from "./avatars";

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

const ADMIN_LIST_COLUMNS = {
  id: wishlist.id,
  title: wishlist.title,
  occasion: wishlist.occasion,
  year: wishlist.year,
  slug: wishlist.slug,
  archivedAt: wishlist.archivedAt,
};
const ADMIN_MEMBER_COLUMNS = { id: member.id, displayName: member.displayName, avatar: member.avatar, active: member.active, pinHash: member.pinHash };

type AdminMemberRow = { id: string; displayName: string; avatar: string | null; active: boolean; pinHash: string | null };
const toAdminMember = ({ pinHash, avatar, ...m }: AdminMemberRow) => ({ ...m, avatar: toAvatar(avatar), hasPin: pinHash !== null });

/** Every member with their picture, whether a PIN is set, and their lists (newest year first). */
export async function listMembersForAdmin() {
  await requireAdmin();
  const rows = await getDb().select(ADMIN_MEMBER_COLUMNS).from(member).orderBy(asc(member.displayName));
  const lists = await getDb().select({ memberId: wishlist.memberId, ...ADMIN_LIST_COLUMNS }).from(wishlist).orderBy(desc(wishlist.year), asc(wishlist.title));
  return rows.map((m) => ({ ...toAdminMember(m), lists: lists.filter((l) => l.memberId === m.id) }));
}

/** Every list, active and archived, with its member's name (the Lists tab). */
export async function listAllListsForAdmin() {
  await requireAdmin();
  return getDb()
    .select({ ...ADMIN_LIST_COLUMNS, memberId: wishlist.memberId, memberName: member.displayName })
    .from(wishlist)
    .innerJoin(member, eq(member.id, wishlist.memberId))
    .orderBy(desc(wishlist.year), asc(member.displayName), asc(wishlist.title));
}
