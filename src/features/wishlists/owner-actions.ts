"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { wishlistItem } from "@/db/schema";
import { requireOwner } from "@/lib/auth/require";
import { action, fail, ok } from "@/lib/result";
import { fieldErrors, itemInput, type OwnerItemInput } from "./schemas";
import { getItemAccess, getListAccess, nextSortOrder } from "./owner-queries";

const uuid = z.string().uuid();
const NOT_FOUND = fail("NOT_FOUND", "That gift or list no longer exists");
const ARCHIVED = fail("LIST_ARCHIVED", "This list is archived and can't be changed");

function refresh() {
  revalidatePath("/owner", "layout");
  revalidatePath("/l/[slug]", "page");
}

export async function createItem(listId: string, input: OwnerItemInput) {
  return action(async () => {
    const list = uuid.safeParse(listId).success ? await getListAccess(listId) : null;
    if (!list) return NOT_FOUND;
    await requireOwner(list.memberId);
    if (list.archivedAt) return ARCHIVED;
    const parsed = itemInput.safeParse(input);
    if (!parsed.success) return fail("INVALID", "Please fix the highlighted fields", fieldErrors(parsed.error));
    // An unranked list has no priority: new gifts take the default and go last in the whole list (decision 0030).
    const priority = list.ranked ? parsed.data.priority : "would_love";
    const sortOrder = await nextSortOrder(listId, list.ranked ? priority : null);
    const [row] = await getDb().insert(wishlistItem).values({ ...parsed.data, priority, wishlistId: listId, sortOrder }).returning({ id: wishlistItem.id });
    refresh();
    return ok({ id: row.id });
  });
}

export async function updateItem(itemId: string, input: OwnerItemInput) {
  return action(async () => {
    const item = uuid.safeParse(itemId).success ? await getItemAccess(itemId) : null;
    if (!item) return NOT_FOUND;
    await requireOwner(item.memberId);
    if (item.archivedAt) return ARCHIVED;
    const parsed = itemInput.safeParse(input);
    if (!parsed.success) return fail("INVALID", "Please fix the highlighted fields", fieldErrors(parsed.error));
    // Moving to another priority group puts the item last in it.
    // On an unranked list the stored priority is left alone, so switching back to ranked restores the old groups.
    const { priority, ...rest } = parsed.data;
    const moved = item.ranked && priority !== item.priority;
    const sortOrder = moved ? await nextSortOrder(item.wishlistId, priority) : undefined;
    await getDb().update(wishlistItem).set({ ...rest, ...(item.ranked && { priority }), ...(moved && { sortOrder }) }).where(eq(wishlistItem.id, itemId));
    refresh();
    return ok(null);
  });
}

/** Soft delete: guests' saved plans keep a label for the item (decision 0007). */
export async function deleteItem(itemId: string) {
  return action(async () => {
    const item = uuid.safeParse(itemId).success ? await getItemAccess(itemId) : null;
    if (!item) return NOT_FOUND;
    await requireOwner(item.memberId);
    if (item.archivedAt) return ARCHIVED;
    await getDb().update(wishlistItem).set({ deletedAt: new Date() }).where(eq(wishlistItem.id, itemId));
    refresh();
    return ok(null);
  });
}
