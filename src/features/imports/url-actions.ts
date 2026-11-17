"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { wishlistItem } from "@/db/schema";
import { requireOwner } from "@/lib/auth/require";
import { action, fail, ok } from "@/lib/result";
import { safeFetchHtml } from "@/lib/security/safe-fetch";
import { isBlocked, recordFailure } from "@/lib/security/rate-limit";
import { getListAccess } from "@/features/wishlists/owner-queries";
import { findDuplicate } from "./duplicates";
import { extractMetadata } from "./extract-metadata";
import type { ImportDraft } from "./types";

const BY_HAND = " You can still add it by hand.";
const LOOKUPS_PER_WINDOW = 20; // per owner, per 15 minutes

/**
 * Looks up a product page and returns an editable draft. It never saves anything: the owner reviews the draft in the
 * item form and saves it as usual. A duplicate of a link already on the list is reported, not blocked.
 */
export async function previewUrlImport(listId: string, url: string) {
  return action(async () => {
    const list = z.string().uuid().safeParse(listId).success ? await getListAccess(listId) : null;
    if (!list) return fail("NOT_FOUND", `That list no longer exists.${BY_HAND}`);
    await requireOwner(list.memberId);
    if (list.archivedAt) return fail("LIST_ARCHIVED", "This list is archived and can't be changed");

    const link = z.string().trim().min(1).max(2000).safeParse(url);
    if (!link.success) return fail("INVALID_URL", `Paste a product link first.${BY_HAND}`);

    const key = `import:${list.memberId}`;
    if (await isBlocked(key)) return fail("RATE_LIMITED", `That's a lot of lookups. Try again in a few minutes.${BY_HAND}`);
    await recordFailure(key, LOOKUPS_PER_WINDOW);

    const page = await safeFetchHtml(link.data);
    if (!page.ok) return fail(page.error.code, `${page.error.message}.${BY_HAND}`);

    const draft: ImportDraft = extractMetadata(page.data.html, page.data.finalUrl);
    const items = await getDb()
      .select({ title: wishlistItem.title, productUrl: wishlistItem.productUrl })
      .from(wishlistItem)
      .where(and(eq(wishlistItem.wishlistId, listId), isNull(wishlistItem.deletedAt)));
    const duplicate = findDuplicate(link.data, items) ?? (draft.canonicalUrl ? findDuplicate(draft.canonicalUrl, items) : null);

    return ok({ draft, duplicateOf: duplicate?.title ?? null });
  });
}
