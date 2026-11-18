import { expect, test, type Page } from "@playwright/test";
import { createItem, createList, createMemberWithPin, gotoPlanner, guestPage, ownerSignIn, resetAndSeed, setGiftDetails, setTotalBudget } from "./helpers";

let alexSlug: string;
let sarahSlug: string;
let alexListId: string;
test.beforeEach(async () => {
  const household = await resetAndSeed();
  const alex = await createMemberWithPin(household, "Alex", "123456");
  const sarah = await createMemberWithPin(household, "Sarah", "654321");
  const al = await createList(alex);
  const sl = await createList(sarah, "Sarah's Christmas");
  alexSlug = al.slug;
  alexListId = al.id;
  sarahSlug = sl.slug;
  await createItem(al.id, "Headphones", 12999);
  await createItem(al.id, "Novel", 1499);
  await createItem(sl.id, "Cookbook", 2499);
  await createItem(sl.id, "Scarf", null);
});

const press = (page: Page, name: RegExp) => page.getByRole("button", { name }).click();

async function openPlanner(page: Page) {
  await gotoPlanner(page);
  await expect(page.getByRole("heading", { name: "My Planner" })).toBeVisible();
}

test("a guest plans across two recipients, sets a budget, and the totals add up", async ({ browser }) => {
  const { context, page } = await guestPage(browser, alexSlug, "Ann");
  await press(page, /^Reserve: Headphones/);
  await expect(page.getByText("Reserved by you")).toBeVisible();
  await press(page, /^Interested: Novel/);
  await expect(page.getByText("Interested", { exact: true })).toBeVisible();

  await page.goto(`/l/${sarahSlug}`);
  await press(page, /^Reserve: Cookbook/);
  await press(page, /^Mark purchased: Cookbook/);
  await press(page, /^Reserve: Scarf/);
  await expect(page.getByText("Purchased by you")).toBeVisible();

  await openPlanner(page);
  await setTotalBudget(page, "250");
  await setGiftDetails(page, "Cookbook", { price: "19.50", note: "gift wrap please" });

  const totals = page.getByRole("region", { name: "My Christmas 2026 plan" });
  await expect(totals).toContainText("£149.49"); // 129.99 reserved + 19.50 paid; the scarf has no price
  await expect(totals).toContainText("£19.50"); // spent
  await expect(totals).toContainText("£14.99"); // might spend (Novel)
  await expect(totals).toContainText("£100.51"); // remaining of £250
  await expect(totals).toContainText("1 item without a price");
  await expect(page.getByText("paid £19.50")).toBeVisible();

  // The same guest on another device (same cookie) sees the same plan after a reload.
  const second = await browser.newContext({ storageState: await context.storageState() });
  const p2 = await second.newPage();
  await p2.goto("/planner");
  await expect(p2.getByRole("region", { name: "My Christmas 2026 plan" })).toContainText("£100.51");
  await second.close();
  await context.close();
});

test("notes and prices paid are private: not to another guest, the owner, or a visitor", async ({ browser, page }) => {
  const ann = await guestPage(browser, sarahSlug, "Ann");
  await press(ann.page, /^Reserve: Cookbook/);
  await openPlanner(ann.page);
  await setGiftDetails(ann.page, "Cookbook", { note: "topsecretnote", price: "17.77" });
  expect(await ann.page.content()).toContain("topsecretnote"); // the data is there for Ann

  const bob = await guestPage(browser, sarahSlug, "Bob");
  await bob.page.goto("/planner");
  await expect(bob.page.getByText("Nothing in your planner yet")).toBeVisible();
  const bobHtml = await bob.page.content();
  expect(bobHtml).not.toMatch(/topsecretnote|17\.77|Cookbook/);
  await bob.page.goto(`/l/${sarahSlug}`);
  expect(await bob.page.content()).not.toMatch(/topsecretnote|17\.77/);

  await ownerSignIn(page); // Alex
  await page.goto(`/owner/lists/${alexListId}`);
  expect(await page.content()).not.toMatch(/topsecretnote|17\.77/);

  const visitor = await browser.newContext();
  const vp = await visitor.newPage();
  await vp.goto("/planner");
  await expect(vp.getByText("Pick a name on someone's list first")).toBeVisible();
  await expect(vp.getByRole("link", { name: /^(My planner|Planner)$/ })).toHaveCount(0); // no name, no planner link
  expect(await vp.content()).not.toMatch(/topsecretnote|17\.77/);
  await visitor.close();
  await ann.context.close();
  await bob.context.close();
});

test("releasing from the planner removes the entry from the plan", async ({ browser }) => {
  const { context, page } = await guestPage(browser, alexSlug, "Ann");
  await press(page, /^Reserve: Headphones/);
  await openPlanner(page);
  await expect(page.getByRole("region", { name: "My Christmas 2026 plan" })).toContainText("£129.99");
  await press(page, /^Release: Headphones/);
  await expect(page.getByText("Nothing in your planner yet")).toBeVisible();
  await context.close();
});
