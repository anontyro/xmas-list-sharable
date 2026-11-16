"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/require";
import { action, fail, ok } from "@/lib/result";
import { getItemAccess } from "./owner-queries";
import { moveItem } from "./reorder";

export async function moveItemAction(itemId: string, direction: "up" | "down") {
  return action(async () => {
    const item = z.string().uuid().safeParse(itemId).success && (direction === "up" || direction === "down") ? await getItemAccess(itemId) : null;
    if (!item) return fail("NOT_FOUND", "That gift no longer exists");
    await requireOwner(item.memberId);
    if (item.archivedAt) return fail("LIST_ARCHIVED", "This list is archived and can't be changed");
    await moveItem(itemId, direction);
    revalidatePath("/owner", "layout");
    revalidatePath("/l/[slug]", "page");
    return ok(null);
  });
}
