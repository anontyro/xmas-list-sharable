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
  // The last request of the previous test can still be writing when this runs, and Postgres then picks one of the two as a deadlock victim: try again.
  for (let attempt = 1; ; attempt++) {
    try {
      await db.execute(sql.raw(`truncate ${tables} restart identity cascade`));
      break;
    } catch (e) {
      const code = (e as { cause?: { code?: string } }).cause?.code;
      if (code !== "40P01" || attempt === 3) throw e;
    }
  }
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

let created = 0;

/** Each gift gets a later `createdAt` than the one before, so gifts made in the same millisecond still keep the order they were made in. */
export async function createItem(listId: string, title: string, priceMinor: number | null = null, priority: "most_wanted" | "would_love" | "nice_to_have" = "would_love") {
  const createdAt = new Date(Date.now() + ++created);
  const [i] = await db.insert(schema.wishlistItem).values({ wishlistId: listId, title, priceMinor, priority, createdAt }).returning();
  return i.id;
}

/** Signs in through the owner form (the first member in the picker, so create that member first). */
export async function ownerSignIn(page: Page, pin = "123456") {
  await page.goto("/owner/login");
  await page.getByLabel("PIN").fill(pin);
  await page.getByRole("button", { name: "Open my list" }).click();
  await expect(page).toHaveURL(/\/owner$/);
}

/** Opens the name chip's menu in the top bar (the same chip at every width). */
export async function openAccountMenu(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("menu", { name: "Account" })).toBeVisible();
}

/** Goes to My planner: the top link on wide screens, the bottom tab on phones. */
export async function gotoPlanner(page: Page) {
  await page.getByRole("link", { name: /^(My planner|Planner)$/ }).click();
}

/** A fresh browser context that has gone through the welcome screen to a list with a display name. */
export async function guestPage(browser: Browser, slug: string, name: string, options: Parameters<Browser["newContext"]>[0] = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto(`/welcome?next=${encodeURIComponent(`/l/${slug}`)}`);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Let's go" }).click();
  await expect(page).toHaveURL(new RegExp(`/l/${slug}$`));
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible(); // the name chip in the top bar
  return { context, page };
}

/** From the planner: opens Budget and notes, sets the total budget and saves (back on the planner afterwards). */
export async function setTotalBudget(page: Page, amount: string) {
  await page.getByRole("link", { name: /^(Set|Edit) budget$/ }).click();
  await page.getByLabel("Total budget").fill(amount);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/planner\?/);
}

/** From the planner: opens Budget and notes for one gift, fills what was paid and/or the private note, and saves. */
export async function setGiftDetails(page: Page, title: string, { price, note }: { price?: string; note?: string }) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await page.getByRole("link", { name: new RegExp(`^(Edit note|Add note or price paid): ${escaped}$`) }).click();
  if (price !== undefined) await page.getByLabel("What you paid").fill(price);
  if (note !== undefined) await page.getByLabel("Private note", { exact: true }).fill(note);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/planner\?/);
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
