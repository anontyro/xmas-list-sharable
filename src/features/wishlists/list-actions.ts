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

const ownListInput = listInput.omit({ memberId: true }).extend({ draft: z.boolean().optional() });
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
