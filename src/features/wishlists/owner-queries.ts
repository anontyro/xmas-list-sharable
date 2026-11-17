import { and, desc, eq, isNull, max } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { wishlist, wishlistItem } from "@/db/schema";
import { currentOwner } from "@/lib/auth/require";
import { itemOrderBy, toOwnerItem, type OwnerWishlistView } from "./views";
import type { Priority } from "./schemas";

export const SORT_GAP = 10;

/** The signed-in owner's lists, newest year first. Empty when nobody is signed in. */
export async function listOwnLists() {
  const owner = await currentOwner();
  if (!owner) return [];
  const rows = await getDb()
    .select({ id: wishlist.id, title: wishlist.title, occasion: wishlist.occasion, year: wishlist.year, archivedAt: wishlist.archivedAt, createdAt: wishlist.createdAt })
    .from(wishlist)
    .where(eq(wishlist.memberId, owner.memberId))
    .orderBy(desc(wishlist.year), wishlist.title);
  return rows.map(({ archivedAt, ...l }) => ({ ...l, archived: archivedAt !== null }));
}

/** The list "My list" opens: the newest one that is not archived (latest year, then most recently created). Null when there is none. */
export function newestOpenList<T extends { archived: boolean; year: number; createdAt: Date }>(lists: T[]): T | null {
  return lists.filter((l) => !l.archived).sort((a, b) => b.year - a.year || b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

/** One of the owner's own lists with its items. Null if it is not theirs, so the page can show not-found. */
export async function getOwnList(listId: string): Promise<OwnerWishlistView | null> {
  const owner = await currentOwner();
  if (!owner || !z.string().uuid().safeParse(listId).success) return null;
  const db = getDb();
  const [list] = await db
    .select({ id: wishlist.id, slug: wishlist.slug, title: wishlist.title, occasion: wishlist.occasion, year: wishlist.year, archivedAt: wishlist.archivedAt })
    .from(wishlist)
    .where(and(eq(wishlist.id, listId), eq(wishlist.memberId, owner.memberId)));
  if (!list) return null;
  const items = await db
    .select()
    .from(wishlistItem)
    .where(and(eq(wishlistItem.wishlistId, list.id), isNull(wishlistItem.deletedAt)))
    .orderBy(...itemOrderBy);
  return { id: list.id, slug: list.slug, title: list.title, occasion: list.occasion, year: list.year, archived: list.archivedAt !== null, items: items.map(toOwnerItem) };
}

/** Owner and archive status of a list, for the actions' permission checks. */
export async function getListAccess(listId: string) {
  const [row] = await getDb().select({ memberId: wishlist.memberId, archivedAt: wishlist.archivedAt }).from(wishlist).where(eq(wishlist.id, listId));
  return row ?? null;
}

/** The list an item belongs to, with the item's current priority. Null for unknown or deleted items. */
export async function getItemAccess(itemId: string) {
  const [row] = await getDb()
    .select({ wishlistId: wishlistItem.wishlistId, priority: wishlistItem.priority, memberId: wishlist.memberId, archivedAt: wishlist.archivedAt })
    .from(wishlistItem)
    .innerJoin(wishlist, eq(wishlist.id, wishlistItem.wishlistId))
    .where(and(eq(wishlistItem.id, itemId), isNull(wishlistItem.deletedAt)));
  return row ? { ...row, priority: row.priority as Priority } : null;
}

/** sort_order that puts a new item last in its priority group. */
export async function nextSortOrder(wishlistId: string, priority: Priority): Promise<number> {
  const [row] = await getDb()
    .select({ top: max(wishlistItem.sortOrder) })
    .from(wishlistItem)
    .where(and(eq(wishlistItem.wishlistId, wishlistId), eq(wishlistItem.priority, priority), isNull(wishlistItem.deletedAt)));
  return (row?.top ?? 0) + SORT_GAP;
}
