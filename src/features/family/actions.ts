"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { guest, member, wishlist } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/require";
import { revokeSessionsFor } from "@/lib/auth/session";
import { action, fail, ok } from "@/lib/result";
import { hashPin } from "@/lib/security/password";
import { insertList } from "@/features/wishlists/insert-list";
import { avatarSchema, type AvatarSticker } from "./avatars";
import { listInput, memberName, newMemberInput, pin, type ListInput, type NewMemberInput } from "./schemas";
import { getHousehold } from "./queries";

const pgCode = (e: unknown) => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.cause?.code ?? err?.code;
};
const isUniqueViolation = (e: unknown) => pgCode(e) === "23505";
const NOT_FOUND = fail("NOT_FOUND", "That member no longer exists");

const NAME_TAKEN = fail("NAME_TAKEN", "Someone with that name already exists");

export async function createMember(input: NewMemberInput) {
  return action(async () => {
    await requireAdmin();
    const parsed = newMemberInput.safeParse(input);
    if (!parsed.success) return fail("INVALID", parsed.error.issues[0].message);
    const hh = await getHousehold();
    if (!hh) return fail("NO_HOUSEHOLD", "Run pnpm db:seed first");
    const { displayName, avatar, pin: newPin } = parsed.data;
    try {
      const [m] = await getDb()
        .insert(member)
        .values({ householdId: hh.id, displayName, avatar: avatar ?? null, pinHash: newPin ? await hashPin(newPin) : null, approvedAt: new Date() })
        .returning({ id: member.id });
      revalidatePath("/admin");
      return ok({ id: m.id });
    } catch (e) {
      if (isUniqueViolation(e)) return NAME_TAKEN;
      throw e;
    }
  });
}

/** `avatar` undefined leaves the picture alone; null clears it. */
export async function renameMember(memberId: string, displayName: string, avatar?: AvatarSticker | null) {
  return action(async () => {
    await requireAdmin();
    const name = memberName.safeParse(displayName);
    if (!name.success) return fail("INVALID", name.error.issues[0].message);
    const picture = avatar === undefined || avatar === null ? { success: true as const, data: avatar } : avatarSchema.safeParse(avatar);
    if (!picture.success) return fail("INVALID", "Pick one of the pictures");
    try {
      // The linked guest is renamed in the same transaction, so reservation labels and list titles agree (decision 0025).
      const updated = await getDb().transaction(async (tx) => {
        const rows = await tx
          .update(member)
          .set({ displayName: name.data, ...(picture.data === undefined ? {} : { avatar: picture.data }) })
          .where(eq(member.id, memberId))
          .returning({ id: member.id });
        if (rows.length > 0) await tx.update(guest).set({ displayName: name.data }).where(eq(guest.memberId, memberId));
        return rows;
      });
      if (updated.length === 0) return NOT_FOUND;
      revalidatePath("/admin");
      return ok(null);
    } catch (e) {
      if (isUniqueViolation(e)) return NAME_TAKEN;
      throw e;
    }
  });
}

export async function deactivateMember(memberId: string) {
  return action(async () => {
    await requireAdmin();
    const updated = await getDb().update(member).set({ active: false }).where(eq(member.id, memberId)).returning({ id: member.id });
    if (updated.length === 0) return NOT_FOUND;
    await revokeSessionsFor("owner", memberId);
    const [linked] = await getDb().select({ id: guest.id }).from(guest).where(eq(guest.memberId, memberId));
    if (linked) await revokeSessionsFor("guest", linked.id); // disabling the person also ends their viewer sessions (decision 0026)
    revalidatePath("/admin");
    revalidatePath("/");
    return ok(null);
  });
}

/** Lets a member who signed themselves up create and edit lists. They sign in with their PIN again to get the editor session. Safe to repeat. */
export async function approveMember(memberId: string) {
  return action(async () => {
    await requireAdmin();
    const [m] = await getDb().select({ approvedAt: member.approvedAt, active: member.active }).from(member).where(eq(member.id, memberId));
    if (!m) return NOT_FOUND;
    if (!m.approvedAt) await getDb().update(member).set({ approvedAt: new Date() }).where(eq(member.id, memberId));
    revalidatePath("/admin");
    return ok(null);
  });
}

export async function setOwnerPin(memberId: string, newPin: string) {
  return action(async () => {
    await requireAdmin();
    const parsed = pin.safeParse(newPin);
    if (!parsed.success) return fail("INVALID", parsed.error.issues[0].message);
    const updated = await getDb().update(member).set({ pinHash: await hashPin(parsed.data) }).where(eq(member.id, memberId)).returning({ id: member.id });
    if (updated.length === 0) return NOT_FOUND;
    await revokeSessionsFor("owner", memberId);
    revalidatePath("/admin");
    return ok(null);
  });
}

export async function createList(input: ListInput) {
  return action(async () => {
    await requireAdmin();
    const parsed = listInput.safeParse(input);
    if (!parsed.success) return fail("INVALID", parsed.error.issues[0].message);
    const { memberId, ...fields } = parsed.data;
    const r = await insertList(memberId, fields, true);
    if (r.ok) {
      revalidatePath("/admin");
      revalidatePath("/");
    }
    return r;
  });
}

async function setArchived(listId: string, archivedAt: Date | null) {
  await getDb().update(wishlist).set({ archivedAt }).where(eq(wishlist.id, listId));
  revalidatePath("/admin");
  revalidatePath("/");
  return ok(null);
}

export async function archiveList(listId: string) {
  return action(async () => {
    await requireAdmin();
    return setArchived(listId, new Date());
  });
}

export async function restoreList(listId: string) {
  return action(async () => {
    await requireAdmin();
    return setArchived(listId, null);
  });
}
