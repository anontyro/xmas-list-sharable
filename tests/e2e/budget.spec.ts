import { expect, test, type Page } from "@playwright/test";
import { createItem, createList, createMemberWithPin, gotoPlanner, guestPage, ownerSignIn, resetAndSeed, setTotalBudget } from "./helpers";

let alexSlug: string;
let sarahSlug: string;
let sarahItemId: string;
let unplannedItemId: string;
test.beforeEach(async () => {
  const household = await resetAndSeed();
  const alex = await createMemberWithPin(household, "Alex", "123456");
  const sarah = await createMemberWithPin(household, "Sarah", "654321");
  await createMemberWithPin(household, "Nana", "111111");
  const al = await createList(alex);
  const sl = await createList(sarah, "Sarah's Christmas");
  alexSlug = al.slug;
  sarahSlug = sl.slug;
  await createItem(al.id, "Headphones", 12999);
  unplannedItemId = await createItem(al.id, "Novel", 1499); // never reserved: not in Ann's planner
  sarahItemId = await createItem(sl.id, "Cookbook", 2499);
});

const press = (page: Page, name: RegExp) => page.getByRole("button", { name }).click();

/** Ann reserves Headphones and buys the Cookbook, then is on her planner. */
async function annWithPlan(browser: Parameters<typeof guestPage>[0]) {
  const g = await guestPage(browser, alexSlug, "Ann");
  await press(g.page, /^Reserve: Headphones/);
  await expect(g.page.getByText("Reserved by you")).toBeVisible();
  await g.page.goto(`/l/${sarahSlug}`);
  await press(g.page, /^Reserve: Cookbook/);
  await press(g.page, /^Mark purchased: Cookbook/);
  await expect(g.page.getByText("Purchased by you")).toBeVisible();
  await gotoPlanner(g.page);
  return g;
}

test("a total and per-person budgets are saved and the planner shows them", async ({ browser }) => {
  const { page, context } = await annWithPlan(browser);
  await page.getByRole("link", { name: "Set budget" }).click();
  await page.getByLabel("Total budget").fill("250");
  await page.getByLabel("Budget for Alex").fill("150");
  await page.getByLabel("Budget for Sarah").fill("100");
  await expect(page.getByText("Per-person budgets add up to £250.00, your whole budget.")).toBeVisible();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/planner\?/);

  await expect(page.getByText("Budget £150.00")).toBeVisible();
  await expect(page.getByText("Budget £100.00")).toBeVisible();
  const totals = page.getByRole("region", { name: "My Christmas 2026 plan" });
  await expect(totals).toContainText("£250.00");
  await expect(totals).toContainText("£154.98"); // planned: 129.99 reserved + 24.99 bought
  await expect(totals).toContainText("£24.99"); // spent
  await expect(totals).toContainText("£95.02"); // left of 250
  await expect(page.getByRole("img", { name: "£24.99 spent and £129.99 more planned out of £250.00" })).toBeVisible();

  // Still there after a reload, and the same budgets are in the form.
  await page.reload();
  await page.getByRole("link", { name: "Edit budget" }).click();
  await expect(page.getByLabel("Total budget")).toHaveValue("250.00");
  await expect(page.getByLabel("Budget for Alex")).toHaveValue("150.00");
  await expect(page.getByLabel("Budget for Sarah")).toHaveValue("100.00");
  await context.close();
});

test("a person with no gifts yet can be added, and keeps their budget", async ({ browser }) => {
  const { page, context } = await annWithPlan(browser);
  await page.getByRole("link", { name: "Set budget" }).click();
  await expect(page.getByLabel("Budget for Nana")).toHaveCount(0);
  await page.getByRole("button", { name: "+ Add a person" }).click();
  await page.getByRole("menuitem", { name: "Nana" }).click();
  await page.getByLabel("Budget for Nana").fill("30");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/planner\?/);

  await page.getByRole("link", { name: /^(Set|Edit) budget$/ }).click(); // no total was set, only Nana's budget
  await expect(page.getByLabel("Budget for Nana")).toHaveValue("30.00");
  await context.close();
});

test("the price paid and private note for one gift are edited on their own page, and the planner updates", async ({ browser }) => {
  const { page, context } = await annWithPlan(browser);
  await page.getByRole("link", { name: "Add note or price paid: Cookbook" }).click();
  const details = page.getByRole("region", { name: "Gift details" });
  await expect(details).toContainText("For Sarah");
  await expect(details).toContainText("Sarah's list shows £24.99");
  await page.getByLabel("What you paid").fill("19.50");
  await page.getByLabel("Private note", { exact: true }).fill("used the bookshop voucher");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/planner\?/);

  await expect(page.getByText("paid £19.50")).toBeVisible();
  await expect(page.getByText("used the bookshop voucher")).toBeVisible();
  // The owner's list price is untouched, and the plan counts the price actually paid.
  await expect(page.getByRole("region", { name: "My Christmas 2026 plan" })).toContainText("£149.49"); // 129.99 + 19.50
  await page.goto(`/l/${sarahSlug}`);
  await expect(page.getByText("£24.99")).toBeVisible();

  // Editing again starts from what was saved.
  await gotoPlanner(page);
  await page.getByRole("link", { name: "Edit note: Cookbook" }).click();
  await expect(page.getByLabel("What you paid")).toHaveValue("19.50");
  await expect(page.getByLabel("Private note", { exact: true })).toHaveValue("used the bookshop voucher");
  await context.close();
});

test("Cancel changes nothing", async ({ browser }) => {
  const { page, context } = await annWithPlan(browser);
  await setTotalBudget(page, "250");
  await page.getByRole("link", { name: "Edit budget" }).click();
  await page.getByLabel("Total budget").fill("999");
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/planner\?/);
  await expect(page.getByRole("region", { name: "My Christmas 2026 plan" })).toContainText("£250.00");
  await expect(page.getByRole("region", { name: "My Christmas 2026 plan" })).not.toContainText("£999.00");

  await page.getByRole("link", { name: "Add note or price paid: Cookbook" }).click();
  await page.getByLabel("Private note", { exact: true }).fill("should not be saved");
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page.getByText("should not be saved")).toHaveCount(0);
  await context.close();
});

test("a wrong amount is shown and nothing is saved or left behind", async ({ browser }) => {
  const { page, context } = await annWithPlan(browser);
  await setTotalBudget(page, "250");
  await page.getByRole("link", { name: "Edit budget" }).click();
  await page.getByLabel("Total budget").fill("abc");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Enter an amount like 19.99" })).toBeVisible();
  await expect(page).toHaveURL(/\/planner\/budget/);
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page.getByRole("region", { name: "My Christmas 2026 plan" })).toContainText("£250.00");
  await context.close();
});

test("a gift that is malformed, not in this planner or someone else's is ignored", async ({ browser }) => {
  const { page, context } = await annWithPlan(browser);
  const details = page.getByRole("region", { name: "Gift details" });
  await page.goto("/planner/budget?gift=nope");
  await expect(page.getByRole("heading", { name: "Budget & notes" })).toBeVisible();
  await expect(details).toHaveCount(0);
  await page.goto(`/planner/budget?gift=${unplannedItemId}`); // a real gift, but Ann has not reserved or marked it
  await expect(details).toHaveCount(0);
  await page.goto(`/planner/budget?gift=${sarahItemId}`);
  await expect(details).toBeVisible(); // her own, for contrast

  // Bob has not planned anything, so Ann's gift id shows him nothing and saving it is refused.
  const bob = await guestPage(browser, alexSlug, "Bob");
  await bob.page.goto(`/planner/budget?gift=${sarahItemId}`);
  await expect(bob.page.getByRole("region", { name: "Gift details" })).toHaveCount(0);
  expect(await bob.page.content()).not.toContain("Cookbook");
  await bob.context.close();
  await context.close();
});

test("visitors without a name and owners are shown the pick-a-name page on both routes", async ({ browser, page }) => {
  const visitor = await browser.newContext();
  const vp = await visitor.newPage();
  for (const path of ["/planner", "/planner/budget"]) {
    await vp.goto(path);
    await expect(vp.getByText("Pick a name on someone's list first")).toBeVisible();
  }
  await visitor.close();

  await ownerSignIn(page); // Alex: an owner has no planner
  for (const path of ["/planner", "/planner/budget"]) {
    await page.goto(path);
    await expect(page.getByText("Pick a name on someone's list first")).toBeVisible();
    expect(await page.content()).not.toMatch(/Cookbook|Headphones/);
  }
});
