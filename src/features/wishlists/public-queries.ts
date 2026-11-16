import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { member, wishlist, wishlistItem } from "@/db/schema";
import { getItemStates, type ClaimedGuestItem } from "@/features/reservations/guest-claim-view";
import { itemOrderBy, toGuestItem, type FamilyDashboardView, type GuestWishlistView } from "./views";

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

/** Active members with their non-archived lists. Members with no list are left out. */
export async function getFamilyDashboard(): Promise<FamilyDashboardView> {
  const rows = await getDb()
    .select({
      memberId: member.id,
      displayName: member.displayName,
      title: wishlist.title,
      occasion: wishlist.occasion,
      year: wishlist.year,
      slug: wishlist.slug,
    })
    .from(wishlist)
    .innerJoin(member, eq(member.id, wishlist.memberId))
    .where(and(eq(member.active, true), isNull(wishlist.archivedAt)))
    .orderBy(asc(member.displayName), asc(wishlist.year), asc(wishlist.title));

  const byMember = new Map<string, FamilyDashboardView["members"][number]>();
  for (const r of rows) {
    const m = byMember.get(r.memberId) ?? { id: r.memberId, displayName: r.displayName, lists: [] };
    m.lists.push({ title: r.title, occasion: r.occasion, year: r.year, slug: r.slug });
    byMember.set(r.memberId, m);
  }
  return { members: [...byMember.values()] };
}

/** The list as one viewer sees it: every item carries its claim state (null viewer = no name given yet). */
export async function getListForViewer(slug: string, viewerId: string | null): Promise<(Omit<GuestWishlistView, "items"> & { items: ClaimedGuestItem[] }) | null> {
  const list = await getListBySlug(slug);
  if (!list) return null;
  const states = await getItemStates(viewerId, list.items.map((i) => i.id));
  return { ...list, items: list.items.map((i) => ({ ...i, state: states.get(i.id)! })) };
}
