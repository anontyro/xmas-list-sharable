"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { guestPlanner, itemClaim, itemInterest, plannerItem, recipientBudget, wishlist, wishlistItem } from "@/db/schema";
import { requireGuest } from "@/lib/auth/require";
import { action, fail, ok } from "@/lib/result";
import { budgetsInput, entryInput, toMinor, type BudgetsInput, type EntryInput } from "./schemas";

const NOT_FOUND = fail("NOT_FOUND", "That gift isn't in your planner");

/** Finds or creates the guest's planner for a period (created lazily on first write) and returns its id. */
async function ensurePlanner(guestId: string, occasion: string, year: number) {
  const db = getDb();
  await db.insert(guestPlanner).values({ guestId, occasion, year }).onConflictDoNothing();
  const [p] = await db
    .select({ id: guestPlanner.id })
    .from(guestPlanner)
    .where(and(eq(guestPlanner.guestId, guestId), eq(guestPlanner.occasion, occasion), eq(guestPlanner.year, year)));
  return p.id;
}

/** Sets the total budget and each recipient's budget for one occasion and year. An empty amount clears it. */
export async function saveBudgets(input: BudgetsInput) {
  return action(async () => {
    const { guestId } = await requireGuest();
    const parsed = budgetsInput.safeParse(input);
    if (!parsed.success) return fail("INVALID", parsed.error.issues[0].message);
    const { occasion, year, total, recipients } = parsed.data;
    const db = getDb();
    const plannerId = await ensurePlanner(guestId, occasion, year);
    await db.update(guestPlanner).set({ budgetMinor: toMinor(total) }).where(eq(guestPlanner.id, plannerId));
    try {
      for (const r of recipients) {
        const budget = toMinor(r.budget);
        if (budget === null) await db.delete(recipientBudget).where(and(eq(recipientBudget.plannerId, plannerId), eq(recipientBudget.memberId, r.memberId)));
        else await db.insert(recipientBudget).values({ plannerId, memberId: r.memberId, budgetMinor: budget }).onConflictDoUpdate({ target: [recipientBudget.plannerId, recipientBudget.memberId], set: { budgetMinor: budget } });
      }
    } catch (e) {
      const err = e as { code?: string; cause?: { code?: string } };
      if ((err.cause?.code ?? err.code) === "23503") return fail("NOT_FOUND", "One of those people no longer exists"); // a member id that is not real
      throw e;
    }
    revalidatePath("/planner");
    return ok(null);
  });
}

/** Saves the private note, the price actually paid and the include flag for one gift in the guest's own planner. */
export async function setEntryDetails(input: EntryInput) {
  return action(async () => {
    const { guestId } = await requireGuest();
    const parsed = entryInput.safeParse(input);
    if (!parsed.success) return fail("INVALID", parsed.error.issues[0].message);
    const { itemId, note, actualPrice, included } = parsed.data;
    const db = getDb();

    // Only gifts the guest holds (even if the owner has since deleted them) or is interested in can be annotated.
    // This is also what keeps other guests out: there is no planner id for a client to pass.
    const [item] = await db
      .select({ occasion: wishlist.occasion, year: wishlist.year, deletedAt: wishlistItem.deletedAt })
      .from(wishlistItem)
      .innerJoin(wishlist, eq(wishlist.id, wishlistItem.wishlistId))
      .where(eq(wishlistItem.id, itemId));
    if (!item) return NOT_FOUND;
    const [claim] = await db.select({ id: itemClaim.id }).from(itemClaim).where(and(eq(itemClaim.itemId, itemId), eq(itemClaim.guestId, guestId), isNull(itemClaim.releasedAt)));
    const [interest] = item.deletedAt
      ? []
      : await db.select({ id: itemInterest.itemId }).from(itemInterest).where(and(eq(itemInterest.itemId, itemId), eq(itemInterest.guestId, guestId)));
    if (!claim && !interest) return NOT_FOUND;

    const plannerId = await ensurePlanner(guestId, item.occasion, item.year);
    const values = { privateNote: note === "" ? null : note, actualPriceMinor: toMinor(actualPrice), included };
    await db.insert(plannerItem).values({ plannerId, itemId, ...values }).onConflictDoUpdate({ target: [plannerItem.plannerId, plannerItem.itemId], set: values });
    revalidatePath("/planner");
    return ok(null);
  });
}
