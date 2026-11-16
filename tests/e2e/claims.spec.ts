import { expect, test, type Browser, type Page } from "@playwright/test";
import { archiveList, createItem, createList, createMemberWithPin, ownerSignIn, resetAndSeed } from "./helpers";

let slug: string;
let listId: string;
test.beforeEach(async () => {
  const household = await resetAndSeed();
  const alex = await createMemberWithPin(household, "Alex", "123456");
  const list = await createList(alex);
  listId = list.id;
  slug = list.slug;
  await createItem(list.id, "Headphones", 12999);
});

async function guestPage(browser: Browser, name: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/l/${slug}`);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(`Shopping as`)).toContainText(name);
  return { context, page };
}

const youHave = (page: Page, status: RegExp) => page.getByText(status).count();

test("a visitor must pick a name before any action, and is remembered", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/l/${slug}`);
  await expect(page.getByRole("button", { name: /Reserve/ })).toHaveCount(0);
  await expect(page.getByText("Who's shopping?")).toBeVisible();
  await page.getByLabel("Your name").fill("Ann");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("button", { name: /Reserve: Headphones/ })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Who's shopping?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Reserve: Headphones/ })).toBeVisible();
  await context.close();
});

test("two guests reserve at once: exactly one wins and the other is told", async ({ browser }) => {
  const a = await guestPage(browser, "Ann");
  const b = await guestPage(browser, "Bob");
  await Promise.all([
    a.page.getByRole("button", { name: /Reserve: Headphones/ }).click(),
    b.page.getByRole("button", { name: /Reserve: Headphones/ }).click(),
  ]);

  await expect.poll(async () => (await youHave(a.page, /Reserved by you/)) + (await youHave(b.page, /Reserved by you/))).toBe(1);
  const [winner, loser, winnerName] = (await youHave(a.page, /Reserved by you/)) === 1 ? [a, b, "Ann"] : [b, a, "Bob"];
  await expect(loser.page.getByText(`Reserved by ${winnerName}`)).toBeVisible();
  await expect(loser.page.getByRole("button", { name: /Reserve|Interested|Mark purchased/ })).toHaveCount(0);

  // The winner buys it; the other guest sees it as purchased with no buttons.
  await winner.page.getByRole("button", { name: /Mark purchased: Headphones/ }).click();
  await expect(winner.page.getByText("Purchased by you")).toBeVisible();
  await loser.page.reload();
  await expect(loser.page.getByText(`Purchased by ${winnerName}`)).toBeVisible();
  await expect(loser.page.getByRole("button", { name: /Reserve|Interested|Mark purchased|Release/ })).toHaveCount(0);

  await a.context.close();
  await b.context.close();
});

test("undoing a purchase asks first, then frees the gift for others", async ({ browser }) => {
  const a = await guestPage(browser, "Ann");
  const b = await guestPage(browser, "Bob");
  await a.page.getByRole("button", { name: /Reserve: Headphones/ }).click();
  await a.page.getByRole("button", { name: /Mark purchased: Headphones/ }).click();
  await a.page.getByRole("button", { name: /Undo purchase: Headphones/ }).click();
  await expect(a.page.getByText("Undo this purchase?")).toBeVisible();
  await a.page.getByRole("button", { name: "Keep it" }).click();
  await expect(a.page.getByText("Purchased by you")).toBeVisible();

  await a.page.getByRole("button", { name: /Undo purchase: Headphones/ }).click();
  await a.page.getByRole("dialog").getByRole("button", { name: "Undo purchase" }).click();
  await expect(a.page.getByText("Available")).toBeVisible();
  await b.page.reload();
  await expect(b.page.getByRole("button", { name: /Reserve: Headphones/ })).toBeVisible();
  await a.context.close();
  await b.context.close();
});

test("owner never sees reservations, interest or buyer names", async ({ browser, page }) => {
  const a = await guestPage(browser, "Ann");
  await a.page.getByRole("button", { name: /Interested: Headphones/ }).click();
  await a.page.getByRole("button", { name: /Reserve: Headphones/ }).click();
  await expect(a.page.getByText("Reserved by you")).toBeVisible();

  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}`);
  await expect(page.getByText("Headphones")).toBeVisible();
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/reserved|purchased|interested|available|Ann/i);
  const html = await page.content();
  expect(html).not.toMatch(/reserved_by|purchased_by|claimedBy|Ann/);
  await a.context.close();
});

test("an archived list still shows claims but offers no buttons", async ({ browser }) => {
  const a = await guestPage(browser, "Ann");
  await a.page.getByRole("button", { name: /Reserve: Headphones/ }).click();
  await expect(a.page.getByText("Reserved by you")).toBeVisible();
  await archiveList(listId);
  await a.page.reload();
  await expect(a.page.getByText("Reserved by you")).toBeVisible();
  await expect(a.page.getByText(/Archived:/)).toBeVisible();
  await expect(a.page.getByRole("button", { name: /Release|Mark purchased|Reserve/ })).toHaveCount(0);
  await a.context.close();
});
