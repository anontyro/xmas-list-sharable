"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { wishlist } from "@/db/schema";
import { listInput } from "@/features/family/schemas";
import { currentOwner, requireOwner } from "@/lib/auth/require";
import { action, fail, ok, UnauthorizedError } from "@/lib/result";
import { insertList } from "./insert-list";
import { getListAccess } from "./owner-queries";

const ownListInput = listInput.omit({ memberId: true }).extend({ draft: z.boolean().optional(), ranked: z.boolean().optional() });
export type OwnListInput = z.input<typeof ownListInput>;

const refresh = () => {
  revalidatePath("/owner", "layout");
  revalidatePath("/");
};

/** A member makes a list for themselves, as a private draft or published. Who it belongs to comes from the session, never the input. */
export async function createOwnList(input: OwnListInput) {
  return action(async () => {
    const owner = await currentOwner();
    if (!owner) throw new UnauthorizedError();
    const parsed = ownListInput.safeParse(input);
    if (!parsed.success) return fail("INVALID", parsed.error.issues[0].message);
    const { draft, ...fields } = parsed.data;
    const r = await insertList(owner.memberId, fields, !draft);
    if (r.ok) refresh();
    return r;
  });
}

/** Makes a draft visible to the family. Safe to repeat: the first publish time is kept. */
export async function publishList(listId: string) {
  return action(async () => {
    const list = z.string().uuid().safeParse(listId).success ? await getListAccess(listId) : null;
    if (!list) return fail("NOT_FOUND", "That list no longer exists");
    await requireOwner(list.memberId);
    await getDb().update(wishlist).set({ publishedAt: new Date() }).where(and(eq(wishlist.id, listId), isNull(wishlist.publishedAt)));
    refresh();
    revalidatePath("/l/[slug]", "page");
    return ok(null);
  });
}

const settingsInput = z.object({ title: ownListInput.shape.title, ranked: z.boolean() });

/** The list's title and whether it is ranked. Turning ranking off or on never touches a gift's stored priority. */
export async function updateListSettings(listId: string, input: z.input<typeof settingsInput>) {
  return action(async () => {
    const list = z.string().uuid().safeParse(listId).success ? await getListAccess(listId) : null;
    if (!list) return fail("NOT_FOUND", "That list no longer exists");
    await requireOwner(list.memberId);
    if (list.archivedAt) return fail("LIST_ARCHIVED", "This list is archived and can't be changed");
    const parsed = settingsInput.safeParse(input);
    if (!parsed.success) return fail("INVALID", parsed.error.issues[0].message);
    await getDb().update(wishlist).set(parsed.data).where(eq(wishlist.id, listId));
    refresh();
    revalidatePath("/l/[slug]", "page");
    return ok(null);
  });
}
