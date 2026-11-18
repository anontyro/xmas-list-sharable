import { expect, test } from "@playwright/test";
import { createItem, createList, createMemberWithPin, guestPage, resetAndSeed } from "./helpers";

let alexList: { id: string; slug: string };
let sarahList: { id: string; slug: string };
let oldList: { id: string; slug: string };
test.beforeEach(async () => {
  const household = await resetAndSeed();
  const alex = await createMemberWithPin(household, "Alex", "123456");
  const sarah = await createMemberWithPin(household, "Sarah", "654321");
  alexList = await createList(alex);
  sarahList = await createList(sarah, "Sarah's Christmas");
  oldList = await createList(sarah, "Sarah's old list", true);
  await createItem(alexList.id, "Headphones", 12999);
  await createItem(alexList.id, "Novel", 1499);
  await createItem(sarahList.id, "Cookbook", 2499);
  await createItem(oldList.id, "Old gift", 500);
});

test("a visitor sees each member's name, gift count and Open link, and no planner card", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  const alexCard = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Alex" }) });
  await expect(alexCard.getByText("Christmas 2026 · 2 gifts")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Alex's list" })).toHaveAttribute("href", `/l/${alexList.slug}`);
  await expect(page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Sarah" }) }).getByText("Christmas 2026 · 1 gift")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Sarah's list" })).toHaveAttribute("href", `/l/${sarahList.slug}`);
  await expect(page.getByRole("heading", { name: "My planner" })).toHaveCount(0); // planner card needs a name
  await context.close();
});

test("an archived list is only under Earlier years, read-only", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(`a[href="/l/${oldList.slug}"]`)).toHaveCount(0); // not among the member cards
  await expect(page.getByText("Earlier years")).toBeVisible();
  await page.getByRole("link", { name: "View Christmas 2026 lists" }).click();
  await expect(page).toHaveURL(/\/earlier\/2026$/);
  await expect(page.getByText("Archived · read-only")).toBeVisible();
  await page.getByRole("link", { name: /^Open Sarah's/ }).click();
  await expect(page).toHaveURL(new RegExp(`/l/${oldList.slug}$`));
  await expect(page.getByText(/Archived: this list is no longer being updated/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Reserve|Interested/ })).toHaveCount(0);

  await page.goto("/earlier/1999");
  await expect(page.getByText("We couldn't find that year")).toBeVisible();
  await page.goto("/earlier/abc");
  await expect(page.getByText("We couldn't find that year")).toBeVisible();
  await context.close();
});

test("a named guest gets a greeting and the planner card, which follows what they plan", async ({ browser }) => {
  const { context, page } = await guestPage(browser, alexList.slug, "Ann");
  await page.goto("/");
  await expect(page.getByText("Hi Ann! Pick a list to browse.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "My planner" })).toBeVisible();
  await expect(page.getByText("Start planning")).toBeVisible();

  await page.goto(`/l/${alexList.slug}`);
  await page.getByRole("button", { name: /^Reserve: Novel/ }).click();
  await expect(page.getByText("Reserved by you")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("£14.99 planned so far")).toBeVisible();
  await page.getByRole("link", { name: "Open planner" }).click();
  await expect(page).toHaveURL(/\/planner/);
  await context.close();
});
