import { expect, test } from "@playwright/test";
import { ADMIN_SECRET, createItem, createList, createMemberWithPin, guestPage, ownerSignIn, resetAndSeed } from "./helpers";

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

test("the planner card is about this year's Christmas, not the newest year the guest planned", async ({ browser }) => {
  const year = new Date().getFullYear();
  const household = await resetAndSeed();
  const dan = await createMemberWithPin(household, "Dan", "111111");
  const thisYear = await createList(dan, `Christmas ${year}`, false, year);
  const lastYear = await createList(dan, `Christmas ${year - 1}`, false, year - 1);
  await createItem(thisYear.id, "New gift", 2000);
  await createItem(lastYear.id, "Old gift", 1000);

  const { context, page } = await guestPage(browser, lastYear.slug, "Ann");
  await page.getByRole("button", { name: /^Reserve: Old gift/ }).click();
  await expect(page.getByText("Reserved by you")).toBeVisible();
  await expect(page.getByText("£10.00 planned so far")).toBeVisible(); // this list's own year

  await page.goto(`/l/${thisYear.slug}`);
  await expect(page.getByText("Start planning")).toBeVisible(); // nothing planned for this year yet
  await page.goto("/");
  await expect(page.getByText("Start planning")).toBeVisible();
  await expect(page.getByText("planned so far")).toHaveCount(0);
  await context.close();
});

test("after PIN sign-in the home page shows the member signed in, with their own list first, marked and editable", async ({ page }) => {
  await ownerSignIn(page); // Alex
  await page.goto("/");
  await expect(page.getByText("Hi Alex! Pick a list to browse.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Pick your name" })).toHaveCount(0);

  const cards = page.getByRole("article");
  await expect(cards.first().getByRole("heading", { name: "Alex" })).toBeVisible(); // mine first
  await expect(cards.first().getByText("Your list")).toBeVisible();
  await expect(cards.nth(1).getByText("Your list")).toHaveCount(0);
  const edit = page.getByRole("link", { name: /^Edit your/ });
  await expect(edit).toHaveText("Edit");
  await expect(edit).toHaveAttribute("href", `/l/${alexList.slug}`);
  await expect(page.getByRole("link", { name: "Open Sarah's list" })).toHaveAttribute("href", `/l/${sarahList.slug}`); // others unchanged

  await edit.click();
  await expect(page).toHaveURL(new RegExp(`/owner/lists/${alexList.id}$`)); // the family link for your own list is the editor
});

test("your own list link opens the editor with a valid editor session and sign-in without one, and never shows claim controls", async ({ page, context }) => {
  await ownerSignIn(page);
  await page.goto(`/l/${alexList.slug}`);
  await expect(page).toHaveURL(new RegExp(`/owner/lists/${alexList.id}$`));

  await context.clearCookies({ name: "fg_owner" }); // the editor session lapses; the viewer one stays
  await page.goto(`/l/${alexList.slug}`);
  await expect(page).toHaveURL(/\/owner\/login$/);
  await expect(page.getByRole("button", { name: /Reserve|Interested/ })).toHaveCount(0);

  await page.goto(`/l/${sarahList.slug}`); // still a named viewer of other lists
  await expect(page.getByRole("button", { name: /^Reserve: Cookbook/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Alex", exact: true })).toBeVisible();
});

test("the admin sees who is waiting for approval, approves them, and they sign in to edit", async ({ browser, page }) => {
  const zed = await browser.newContext();
  const zp = await zed.newPage();
  await zp.goto("/welcome");
  await zp.getByLabel("Your name").fill("Zed");
  await zp.getByLabel("PIN (optional)").fill("246810");
  await zp.getByRole("button", { name: "Let's go" }).click();
  await expect(zp).toHaveURL(/\/$/);

  await page.goto("/admin/login");
  await page.getByLabel("Admin secret").fill(ADMIN_SECRET);
  await page.getByRole("button", { name: "Sign in" }).click();
  const zedCard = page.getByRole("article", { name: "Zed" });
  await expect(zedCard.getByText("Waiting for approval")).toBeVisible();
  await expect(page.getByRole("article", { name: "Alex" }).getByText("Waiting for approval")).toHaveCount(0);
  await expect(page.getByRole("article", { name: "Alex" }).getByRole("button", { name: "Approve Alex" })).toHaveCount(0);
  await zedCard.getByRole("button", { name: "Approve Zed" }).click();
  await expect(zedCard.getByText("Waiting for approval")).toHaveCount(0);
  await expect(zedCard.getByRole("button", { name: "Approve Zed" })).toHaveCount(0);

  // Zed is still signed in as a viewer; the menu offers a way to the editor, and the PIN completes it.
  await zp.reload();
  await zp.getByRole("button", { name: "Zed", exact: true }).click();
  await zp.getByRole("menuitem", { name: "Sign in to edit" }).click();
  await expect(zp).toHaveURL(/\/owner\/login$/);
  await zp.getByRole("radio", { name: "Zed" }).check(); // the name on the sign-in screen
  await zp.getByLabel("PIN").fill("246810");
  await zp.getByRole("button", { name: "Open my list" }).click();
  await expect(zp).toHaveURL(/\/owner$/);
  await zed.close();
});
