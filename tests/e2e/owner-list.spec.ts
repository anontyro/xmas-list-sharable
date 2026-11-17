import { expect, test } from "@playwright/test";
import { createList, createMemberWithPin, openAccountMenu, ownerSignIn, resetAndSeed } from "./helpers";

let householdId: string;
test.beforeEach(async () => {
  householdId = await resetAndSeed();
});

test("owner adds a gift and a guest sees it read-only, then the owner removes it", async ({ page, browser }) => {
  const alex = await createMemberWithPin(householdId, "Alex", "123456");
  const list = await createList(alex);
  await ownerSignIn(page);
  await page.getByRole("link", { name: "Christmas 2026" }).click();

  await page.getByRole("textbox", { name: /^Gift/ }).fill("Noise-cancelling headphones");
  await page.getByLabel("Link (optional)", { exact: true }).fill("https://shop.example/headphones");
  await page.getByLabel("Price in £ (optional)").fill("129.99");
  await page.getByLabel("How much do you want it?").click();
  await page.getByRole("option", { name: "Most Wanted" }).click();
  await page.getByRole("button", { name: "Add gift" }).click();
  await expect(page.getByRole("region", { name: "Most Wanted" }).getByText("Noise-cancelling headphones")).toBeVisible();

  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(`/l/${list.slug}`);
  await expect(guestPage.getByText("Noise-cancelling headphones")).toBeVisible();
  await expect(guestPage.getByText("£129.99")).toBeVisible();
  await expect(guestPage.getByRole("button", { name: /add gift|edit|remove/i })).toHaveCount(0);

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Remove" }).click();
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
  await page.getByRole("textbox", { name: /^Gift/ }).fill("Book");
  await page.getByLabel("Link (optional)", { exact: true }).fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Add gift" }).click();
  await expect(page.getByText("Enter a web address starting with http:// or https://")).toBeVisible();
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
  await expect(page).toHaveURL(/\/owner\/login$/); // the refresh after sign-out bounces the page
  await page.goto("/owner");
  await expect(page).toHaveURL(/\/owner\/login$/);
});

test("family page, archived banner, unknown link and robots", async ({ page }) => {
  const alex = await createMemberWithPin(householdId, "Alex", "123456");
  const sarah = await createMemberWithPin(householdId, "Sarah", "654321");
  const active = await createList(alex, "Alex's Christmas");
  const archived = await createList(sarah, "Sarah's old list", true);

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Alex's Christmas" })).toHaveAttribute("href", `/l/${active.slug}`);
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
