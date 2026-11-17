"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { wishlistItem } from "@/db/schema";
import { requireOwner } from "@/lib/auth/require";
import { action, fail, ok } from "@/lib/result";
import { getListAccess, nextSortOrder, SORT_GAP } from "@/features/wishlists/owner-queries";
import { itemInput, type OwnerItemInput } from "@/features/wishlists/schemas";
import { parseAmazon } from "./amazon";
import { MAX_DRAFTS } from "./amazon/shared";
import { asinFrom } from "./amazon/asin";
import { findDuplicate } from "./duplicates";

const uuid = z.string().uuid();

async function ownList(listId: string) {
  const list = uuid.safeParse(listId).success ? await getListAccess(listId) : null;
  if (!list) return { error: fail("NOT_FOUND", "That list no longer exists. You can still add gifts by hand.") };
  await requireOwner(list.memberId);
  if (list.archivedAt) return { error: fail("LIST_ARCHIVED", "This list is archived and can't be changed") };
  return { list };
}

/** Parses pasted Amazon content into drafts. Saves nothing; duplicates of links already on the list are flagged. */
export async function previewAmazonImport(listId: string, input: string) {
  return action(async () => {
    const { error } = await ownList(listId);
    if (error) return error;
    const parsed = parseAmazon(typeof input === "string" ? input : "");
    if (!parsed.ok) return parsed;
    const items = await getDb()
      .select({ title: wishlistItem.title, productUrl: wishlistItem.productUrl })
      .from(wishlistItem)
      .where(and(eq(wishlistItem.wishlistId, listId), isNull(wishlistItem.deletedAt)));
    // Amazon links vary in their query strings, so the same product is recognised by its ASIN as well as by its link.
    const duplicateOf = (url: string) => {
      const asin = asinFrom(url);
      return (findDuplicate(url, items) ?? items.find((i) => asin && i.productUrl && asinFrom(i.productUrl) === asin))?.title ?? null;
    };
    return ok(parsed.data.map((draft) => ({ draft, duplicateOf: duplicateOf(draft.canonicalUrl ?? draft.sourceUrl) })));
  });
}

/** Adds the confirmed rows to the end of "Would Love", all or none. Blank titles are skipped; any invalid row adds nothing. */
export async function commitBulkImport(listId: string, rows: Omit<OwnerItemInput, "priority">[]) {
  return action(async () => {
    const { error } = await ownList(listId);
    if (error) return error;
    if (!Array.isArray(rows) || rows.length > MAX_DRAFTS) return fail("INVALID", `Add up to ${MAX_DRAFTS} gifts at a time.`);

    const wanted = rows.filter((r) => typeof r?.title === "string" && r.title.trim() !== "");
    const values = [];
    const problems: string[] = [];
    for (const row of wanted) {
      const parsed = itemInput.safeParse({ ...row, priority: "would_love" });
      if (parsed.success) values.push(parsed.data);
      else problems.push(`"${String(row.title).slice(0, 40)}": ${parsed.error.issues[0].message}`);
    }
    if (problems.length) return fail("INVALID", `Nothing was added. Please fix: ${problems.join("; ")}`);
    if (!values.length) return ok({ added: 0, skipped: rows.length });

    const start = await nextSortOrder(listId, "would_love");
    await getDb()
      .insert(wishlistItem)
      .values(values.map((v, i) => ({ ...v, wishlistId: listId, sortOrder: start + i * SORT_GAP })));
    revalidatePath("/owner", "layout");
    revalidatePath("/l/[slug]", "page");
    return ok({ added: values.length, skipped: rows.length - values.length });
  });
}
