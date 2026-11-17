import { expect, type Browser, type Page } from "@playwright/test";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, getTableName, isTable, sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../../src/db/schema";
import { generateSlug } from "../../src/features/wishlists/slug";
import { hashPin } from "../../src/lib/security/password";

const client = postgres(process.env.DATABASE_URL!, { max: 2 });
const db = drizzle(client, { schema });
const tables = Object.values(schema).filter(isTable).map((t) => `"${getTableName(t)}"`).join(", ");

export const ADMIN_SECRET = process.env.ADMIN_SECRET!;

/** Empties the database and leaves just the household, as `pnpm db:seed` would. */
export async function resetAndSeed() {
  await db.execute(sql.raw(`truncate ${tables} restart identity cascade`));
  const [h] = await db.insert(schema.household).values({ name: "Family" }).returning();
  return h.id;
}

export async function createMemberWithPin(householdId: string, displayName: string, pin: string) {
  const [m] = await db.insert(schema.member).values({ householdId, displayName, pinHash: await hashPin(pin) }).returning();
  return m.id;
}

export async function createList(memberId: string, title = "Christmas 2026", archived = false) {
  const slug = generateSlug();
  const [l] = await db
    .insert(schema.wishlist)
    .values({ memberId, title, occasion: "Christmas", year: 2026, slug, archivedAt: archived ? new Date() : null })
    .returning();
  return { id: l.id, slug };
}

export async function archiveList(listId: string) {
  await db.update(schema.wishlist).set({ archivedAt: new Date() }).where(eq(schema.wishlist.id, listId));
}

export async function createItem(listId: string, title: string, priceMinor: number | null = null) {
  const [i] = await db.insert(schema.wishlistItem).values({ wishlistId: listId, title, priceMinor }).returning();
  return i.id;
}

/** Signs in through the owner form (the first member in the picker, so create that member first). */
export async function ownerSignIn(page: Page, pin = "123456") {
  await page.goto("/owner/login");
  await page.getByLabel("PIN").fill(pin);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/owner$/);
}

/** A fresh browser context that has opened a list and picked a display name. */
export async function guestPage(browser: Browser, slug: string, name: string, options: Parameters<Browser["newContext"]>[0] = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto(`/l/${slug}`);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Shopping as")).toContainText(name);
  return { context, page };
}

export const PRIVATE = { guest: "Zelda-Claimant", note: "secret-note-123", price: "77.77", token: "recovery-token-hash-abc" };

/** A guest who has an interest, a purchase, budgets, a private note and a recovery token on `itemId`. */
export async function seedGuestActivity(householdId: string, itemId: string) {
  const [g] = await db.insert(schema.guest).values({ householdId, displayName: PRIVATE.guest }).returning();
  await db.insert(schema.itemInterest).values({ guestId: g.id, itemId });
  await db.insert(schema.itemClaim).values({ itemId, guestId: g.id, status: "purchased" });
  const [p] = await db.insert(schema.guestPlanner).values({ guestId: g.id, occasion: "Christmas", year: 2026, budgetMinor: 7777 }).returning();
  await db.insert(schema.plannerItem).values({ plannerId: p.id, itemId, privateNote: PRIVATE.note, actualPriceMinor: 7777 });
  await db.insert(schema.recoveryToken).values({ guestId: g.id, tokenHash: PRIVATE.token });
  return g.id;
}
