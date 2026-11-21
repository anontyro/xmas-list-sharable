import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { wishlist, wishlistItem } from "@/db/schema";

const GAP = 10;

/**
 * Swaps an item with its neighbour inside its priority group (or across the whole list when it is unranked), then renumbers the group 10, 20, 30...
 * The group's rows are locked first, so parallel moves queue up instead of colliding, and the renumbering
 * also repairs ties (two near-simultaneous adds can leave two items with the same sort_order).
 * Returns false when the item is not found or already at that end.
 */
export async function moveItem(itemId: string, direction: "up" | "down"): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const [item] = await tx
      .select({ wishlistId: wishlistItem.wishlistId, priority: wishlistItem.priority, ranked: wishlist.ranked })
      .from(wishlistItem)
      .innerJoin(wishlist, eq(wishlist.id, wishlistItem.wishlistId))
      .where(and(eq(wishlistItem.id, itemId), isNull(wishlistItem.deletedAt)));
    if (!item) return false;

    const group = await tx
      .select({ id: wishlistItem.id, sortOrder: wishlistItem.sortOrder })
      .from(wishlistItem)
      .where(and(eq(wishlistItem.wishlistId, item.wishlistId), item.ranked ? eq(wishlistItem.priority, item.priority) : undefined, isNull(wishlistItem.deletedAt)))
      .orderBy(asc(wishlistItem.sortOrder), asc(wishlistItem.createdAt), asc(wishlistItem.id))
      .for("update");

    const from = group.findIndex((g) => g.id === itemId);
    if (from === -1) return false; // its priority changed while we waited for the lock
    const to = direction === "up" ? from - 1 : from + 1;
    const moved = to >= 0 && to < group.length;
    if (moved) [group[from], group[to]] = [group[to], group[from]];

    for (const [i, row] of group.entries()) {
      const sortOrder = (i + 1) * GAP;
      if (row.sortOrder !== sortOrder) await tx.update(wishlistItem).set({ sortOrder }).where(eq(wishlistItem.id, row.id));
    }
    return moved;
  });
}
