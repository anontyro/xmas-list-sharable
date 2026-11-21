import { and, asc, count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { member, wishlist, wishlistItem } from "@/db/schema";
import { toAvatar } from "@/features/family/avatars";
import { getItemStates, type ClaimedGuestItem } from "@/features/reservations/guest-claim-view";
import { itemOrderBy, toGuestItem, type EarlierYearView, type FamilyDashboardView, type GuestWishlistView } from "./views";

/** Which list and member a slug belongs to, for the "this is your own list" redirect. Reads no items and no claims. */
export async function getListOwnerTarget(slug: string): Promise<{ id: string; memberId: string } | null> {
  const [row] = await getDb().select({ id: wishlist.id, memberId: wishlist.memberId }).from(wishlist).where(eq(wishlist.slug, slug));
  return row ?? null;
}

/** The shared list page. Null for an unknown slug or a deactivated member's list. */
export async function getListBySlug(slug: string): Promise<GuestWishlistView | null> {
  const db = getDb();
  const [list] = await db
    .select({
      id: wishlist.id,
      slug: wishlist.slug,
      title: wishlist.title,
      occasion: wishlist.occasion,
      year: wishlist.year,
      archivedAt: wishlist.archivedAt,
      memberName: member.displayName,
    })
    .from(wishlist)
    .innerJoin(member, eq(member.id, wishlist.memberId))
    .where(and(eq(wishlist.slug, slug), eq(member.active, true)));
  if (!list) return null;

  const items = await db
    .select()
    .from(wishlistItem)
    .where(and(eq(wishlistItem.wishlistId, list.id), isNull(wishlistItem.deletedAt)))
    .orderBy(...itemOrderBy);

  return {
    slug: list.slug,
    title: list.title,
    occasion: list.occasion,
    year: list.year,
    memberName: list.memberName,
    archived: list.archivedAt !== null,
    items: items.map(toGuestItem),
  };
}

/** Counts a list's gifts that have not been deleted (a left join, so an empty list still counts 0). */
const giftCounts = (db: ReturnType<typeof getDb>, archived: boolean) =>
  db
    .select({
      memberId: member.id,
      displayName: member.displayName,
      avatar: member.avatar,
      title: wishlist.title,
      occasion: wishlist.occasion,
      year: wishlist.year,
      slug: wishlist.slug,
      giftCount: count(wishlistItem.id),
    })
    .from(wishlist)
    .innerJoin(member, eq(member.id, wishlist.memberId))
    .leftJoin(wishlistItem, and(eq(wishlistItem.wishlistId, wishlist.id), isNull(wishlistItem.deletedAt)))
    .where(and(eq(member.active, true), archived ? isNotNull(wishlist.archivedAt) : isNull(wishlist.archivedAt)))
    .groupBy(member.id, wishlist.id);

/** Active members with their non-archived lists and gift counts. Members with no list are left out. */
export async function getFamilyDashboard(): Promise<FamilyDashboardView> {
  const rows = await giftCounts(getDb(), false).orderBy(asc(member.displayName), asc(wishlist.year), asc(wishlist.title));

  const byMember = new Map<string, FamilyDashboardView["members"][number]>();
  for (const r of rows) {
    const m = byMember.get(r.memberId) ?? { id: r.memberId, displayName: r.displayName, avatar: toAvatar(r.avatar), lists: [] };
    m.lists.push({ title: r.title, occasion: r.occasion, year: r.year, slug: r.slug, giftCount: r.giftCount });
    byMember.set(r.memberId, m);
  }
  return { members: [...byMember.values()] };
}

/** Archived lists of active members, newest year first, grouped by occasion and year. */
export async function getEarlierYears(): Promise<EarlierYearView[]> {
  const rows = await giftCounts(getDb(), true).orderBy(desc(wishlist.year), asc(wishlist.occasion), asc(member.displayName), asc(wishlist.title));
  const groups = new Map<string, EarlierYearView>();
  for (const r of rows) {
    const key = `${r.occasion}|${r.year}`;
    const g = groups.get(key) ?? { occasion: r.occasion, year: r.year, lists: [] };
    g.lists.push({ title: r.title, slug: r.slug, memberId: r.memberId, memberName: r.displayName, avatar: toAvatar(r.avatar), giftCount: r.giftCount });
    groups.set(key, g);
  }
  return [...groups.values()];
}

/** The list as one viewer sees it: every item carries its claim state (null viewer = no name given yet). */
export async function getListForViewer(slug: string, viewerId: string | null): Promise<(Omit<GuestWishlistView, "items"> & { items: ClaimedGuestItem[] }) | null> {
  const list = await getListBySlug(slug);
  if (!list) return null;
  const states = await getItemStates(viewerId, list.items.map((i) => i.id));
  return { ...list, items: list.items.map((i) => ({ ...i, state: states.get(i.id)! })) };
}
