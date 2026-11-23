import { expect, test } from "@playwright/test";
import { createList, createMemberWithPin, guestPage, listSlug, openAccountMenu, ownerSignIn, resetAndSeed } from "./helpers";

let householdId: string;
test.beforeEach(async () => {
  householdId = await resetAndSeed();
});

test("owner adds a gift and a guest sees it read-only, then the owner removes it", async ({ page, browser }) => {
  const alex = await createMemberWithPin(householdId, "Alex", "123456");
  const list = await createList(alex);
  await ownerSignIn(page);
  await page.getByRole("link", { name: "Christmas 2026" }).click();

  await page.getByRole("link", { name: "+ Add a gift" }).click();
  await page.getByLabel("What is it?").fill("Noise-cancelling headphones");
  await page.getByLabel("Product link (optional)").fill("https://shop.example/headphones");
  await page.getByLabel("Price", { exact: true }).fill("129.99");
  await page.getByRole("button", { name: "Most Wanted" }).click();
  await page.getByRole("button", { name: "Save gift" }).click();
  await expect(page.getByRole("heading", { level: 2, name: /MOST WANTED/ })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Noise-cancelling headphones" })).toBeVisible();

  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(`/l/${list.slug}`);
  await expect(guestPage.getByText("Noise-cancelling headphones")).toBeVisible();
  await expect(guestPage.getByText("£129.99")).toBeVisible();
  await expect(guestPage.getByRole("button", { name: /add gift|edit|remove/i })).toHaveCount(0);

  await page.getByRole("link", { name: "Edit Noise-cancelling headphones" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Remove this gift" }).click();
  await expect(page.getByText("No gifts yet")).toBeVisible();
  await guestPage.reload();
  await expect(guestPage.getByText("Nothing on this list yet.")).toBeVisible();
  await guest.close();
});

test("a bad link is rejected next to its field and nothing is saved", async ({ page }) => {
  const alex = await createMemberWithPin(householdId, "Alex", "123456");
  await createList(alex);
  await ownerSignIn(page);
  await page.getByRole("link", { name: "Christmas 2026" }).click();
  await page.getByRole("link", { name: "+ Add a gift" }).click();
  await page.getByLabel("What is it?").fill("Book");
  await page.getByLabel("Product link (optional)").fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Save gift" }).click();
  await expect(page.getByText("Enter a web address starting with http:// or https://")).toBeVisible();
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page.getByText("No gifts yet")).toBeVisible();
});

test("an owner cannot open someone else's list", async ({ page }) => {
  const alex = await createMemberWithPin(householdId, "Alex", "123456");
  const sarah = await createMemberWithPin(householdId, "Sarah", "654321");
  await createList(alex);
  const sarahs = await createList(sarah, "Sarah's list");
  await ownerSignIn(page); // Alex is first in the picker
  await page.goto(`/owner/lists/${sarahs.id}`);
  await expect(page.getByText("This page could not be found")).toBeVisible();
});

test("signed-out visitors are sent to sign in, and sign-out ends the session", async ({ page }) => {
  const alex = await createMemberWithPin(householdId, "Alex", "123456");
  const list = await createList(alex);
  await page.goto(`/owner/lists/${list.id}`);
  await expect(page).toHaveURL(/\/owner\/login$/);
  await ownerSignIn(page);
  await openAccountMenu(page, "Alex");
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/); // a member signing out goes to the family home
  await page.goto("/owner");
  await expect(page).toHaveURL(/\/owner\/login$/);
});

test("family page, archived banner, unknown link and robots", async ({ page }) => {
  const alex = await createMemberWithPin(householdId, "Alex", "123456");
  const sarah = await createMemberWithPin(householdId, "Sarah", "654321");
  const active = await createList(alex, "Alex's Christmas");
  const archived = await createList(sarah, "Sarah's old list", true);

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Open Alex's list" })).toHaveAttribute("href", `/l/${active.slug}`);
  await expect(page.getByText("Sarah's old list")).toHaveCount(0);

  await page.goto(`/l/${archived.slug}`);
  await expect(page.getByText(/Archived: this list is no longer being updated/)).toBeVisible();

  await page.goto("/l/doesnotexist");
  await expect(page.getByText("We couldn't find that list")).toBeVisible();
  await expect(page.getByText(/Alex|Sarah/)).toHaveCount(0);

  const robots = await page.request.get("/robots.txt");
  expect(await robots.text()).toMatch(/Disallow: \//);
  await page.goto(`/l/${active.slug}`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("a member makes a draft, only they see it, then publishes it", async ({ page, browser }) => {
  await createMemberWithPin(householdId, "Alex", "123456");
  const sarahs = await createList(await createMemberWithPin(householdId, "Sarah", "654321"), "Sarah's Christmas");
  await ownerSignIn(page);

  await page.getByRole("link", { name: "+ New list" }).click();
  await page.getByLabel("Title").fill("Birthday wishes");
  await page.getByLabel("Occasion").fill("Birthday");
  await page.getByLabel("Title").press("Enter"); // Enter must never publish: it saves the draft
  await expect(page).toHaveURL(/\/owner\/lists\/[0-9a-f-]+$/);
  await expect(page.getByRole("region", { name: "Publish your list" })).toContainText("Only you can see this");
  await expect(page.getByRole("region", { name: "Share your list" })).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByRole("region", { name: "Your drafts" })).toContainText("Birthday wishes");
  await page.goto("/owner");
  await expect(page.getByText("Draft · only you")).toBeVisible();

  const slug = await listSlug("Birthday wishes");
  const sarah = await guestPage(browser, sarahs.slug, "Sam");
  await expect(sarah.page.getByText("Birthday wishes")).toHaveCount(0);
  await sarah.page.goto("/");
  await expect(sarah.page.getByText("Birthday wishes")).toHaveCount(0);
  await sarah.page.goto(`/l/${slug}`);
  await expect(sarah.page.getByText("We couldn't find that list")).toBeVisible();

  // The admin sees the draft marked, with no share link to copy.
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await admin.goto("/admin/login");
  await admin.getByLabel("Admin secret").fill(process.env.ADMIN_SECRET!);
  await admin.getByRole("button", { name: "Sign in" }).click();
  await expect(admin.getByRole("heading", { name: "Family admin" })).toBeVisible();
  await admin.goto("/admin/lists");
  const draftCard = admin.getByRole("article", { name: "Alex, Birthday wishes" });
  await expect(draftCard.getByText("Draft", { exact: true })).toBeVisible();
  await expect(draftCard.getByRole("button", { name: /Copy link/ })).toHaveCount(0);
  await adminCtx.close();

  await page.getByRole("link", { name: "Open Birthday wishes" }).click();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("region", { name: "Share your list" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Publish your list" })).toHaveCount(0);

  await sarah.page.goto("/");
  await expect(sarah.page.getByRole("link", { name: /Open Alex's/ })).toHaveAttribute("href", `/l/${slug}`);
  await sarah.page.goto(`/l/${slug}`);
  await expect(sarah.page.getByRole("heading", { level: 1 })).toContainText("Birthday");
  await expect(sarah.page.getByText("We couldn't find that list")).toHaveCount(0);
  await sarah.context.close();
});

test("a member can publish a new list at once, and the form checks the year", async ({ page }) => {
  await createMemberWithPin(householdId, "Alex", "123456");
  await ownerSignIn(page);
  await openAccountMenu(page, "Alex");
  await page.getByRole("menuitem", { name: "New list" }).click();
  await page.getByLabel("Title").fill("Summer");
  await page.getByLabel("Year").fill("1999");
  await page.getByRole("button", { name: "Create and publish" }).click();
  await expect(page.getByText("Enter a year like 2026")).toBeVisible();
  await page.getByLabel("Year").fill("2026");
  await page.getByRole("button", { name: "Create and publish" }).click();
  await expect(page.getByRole("region", { name: "Share your list" })).toBeVisible();
});

test("the account menu marks the page you are on", async ({ page }) => {
  const alex = await createMemberWithPin(householdId, "Alex", "123456");
  const list = await createList(alex);
  await ownerSignIn(page);
  const current = async () => {
    await openAccountMenu(page, "Alex");
    const items = page.getByRole("menu", { name: "Account" }).locator('[aria-current="page"]');
    const names = await items.allTextContents();
    await page.keyboard.press("Escape");
    return names;
  };
  expect(await current()).toEqual(["All my lists"]);
  await page.goto(`/owner/lists/${list.id}`);
  expect(await current()).toEqual(["My list"]);
  await page.goto("/owner/lists/new");
  expect(await current()).toEqual(["New list"]);
  await page.goto("/");
  expect(await current()).toEqual(["Browse family lists"]);
  await page.goto("/planner");
  expect(await current()).toEqual(["My planner"]);
});
