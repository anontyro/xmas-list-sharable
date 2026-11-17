import { expect, test } from "@playwright/test";
import { ADMIN_SECRET, createItem, createList, createMemberWithPin, guestPage, openAccountMenu, ownerSignIn, resetAndSeed } from "./helpers";

let alexId: string;
let alexList: { id: string; slug: string };
let sarahList: { id: string; slug: string };
test.beforeEach(async () => {
  const household = await resetAndSeed();
  const alex = await createMemberWithPin(household, "Alex", "123456");
  alexId = alex;
  const sarah = await createMemberWithPin(household, "Sarah", "654321");
  alexList = await createList(alex);
  sarahList = await createList(sarah, "Sarah's Christmas");
  await createItem(alexList.id, "Headphones", 12999);
  await createItem(sarahList.id, "Cookbook", 2499);
});

const planner = /^(My planner|Planner)$/;

test("phones get tabs and desktops get top links, with the same places in both and the current one marked", async ({ browser }, info) => {
  const phone = info.project.name === "mobile";
  const { context, page } = await guestPage(browser, alexList.slug, "Ann");

  // Exactly one "Main" navigation is on screen, whichever width this is.
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(1);
  const names = await page.getByRole("navigation", { name: "Main" }).getByRole("link").allInnerTexts();
  expect(names.map((n) => n.trim())).toEqual(phone ? ["Family", "Wishlist", "Planner"] : ["Family", "Wishlist", "My planner"]);

  // The tab bar sits below the content on a phone; the top links are inside the red bar on a desktop.
  const inBar = await page.getByRole("banner").getByRole("link", { name: "Wishlist" }).isVisible();
  expect(inBar).toBe(!phone);

  const current = page.locator('a[aria-current="page"]:visible');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveText(/Wishlist/); // we are on a list
  await page.getByRole("link", { name: planner }).click();
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.locator('a[aria-current="page"]:visible')).toHaveText(planner);
  await page.getByRole("link", { name: "Family", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('a[aria-current="page"]:visible')).toHaveText("Family");
  await context.close();
});

test("a visitor with no name sees only Family and no account menu", async ({ page }) => {
  await page.goto(`/l/${alexList.slug}`);
  const links = await page.getByRole("banner").getByRole("link").allInnerTexts().catch(() => []);
  expect(links.join(" ")).not.toMatch(/Wishlist|planner/i);
  await expect(page.getByRole("button", { name: /^(Ann|Sam)/ })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: /Sign out/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^(My planner|Planner)$/ })).toHaveCount(0);
});

test("the Wishlist link goes back to the last list opened, and ignores a doctored cookie", async ({ browser }) => {
  const { context, page } = await guestPage(browser, alexList.slug, "Ann");
  await page.goto(`/l/${sarahList.slug}`);
  // The page writes the cookie once it has loaded, so wait for it rather than racing the next navigation.
  await expect.poll(async () => (await context.cookies()).find((c) => c.name === "fg_last_list")?.value).toBe(sarahList.slug);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Wishlist" })).toHaveAttribute("href", `/l/${sarahList.slug}`);
  await page.getByRole("link", { name: "Wishlist" }).click();
  await expect(page.getByText("Cookbook")).toBeVisible();

  await context.addCookies([{ name: "fg_last_list", value: "/admin", url: new URL(page.url()).origin }]);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Wishlist" })).toHaveAttribute("href", "/");
  await context.close();
});

test("a guest renames themselves from the menu and others see the new name beside the reservation", async ({ browser }) => {
  const ann = await guestPage(browser, alexList.slug, "Ann");
  await ann.page.getByRole("button", { name: /^Reserve: Headphones/ }).click();
  await expect(ann.page.getByText("Reserved by you")).toBeVisible();

  await openAccountMenu(ann.page, "Ann");
  await ann.page.getByRole("menuitem", { name: "Change my name" }).click();
  await ann.page.getByLabel("Your name").fill("Annie");
  await ann.page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(ann.page.getByRole("button", { name: "Annie", exact: true })).toBeVisible();

  const bob = await guestPage(browser, alexList.slug, "Bob");
  await expect(bob.page.getByText("Reserved by Annie")).toBeVisible();
  await ann.context.close();
  await bob.context.close();
});

test("sign-out without a recovery link asks first; with one it signs out at once, and the link brings the guest back", async ({ browser }) => {
  const { context, page } = await guestPage(browser, alexList.slug, "Ann");
  await page.getByRole("button", { name: /^Reserve: Headphones/ }).click();
  await expect(page.getByText("Reserved by you")).toBeVisible();

  // No link yet: the menu entry asks, and Cancel keeps the guest signed in.
  await openAccountMenu(page, "Ann");
  await expect(page.getByText("You'll need your recovery link to get back in.")).toBeVisible();
  await page.getByRole("menuitem", { name: "Sign out of this device" }).click();
  const ask = page.getByRole("dialog", { name: "Sign out without a recovery link?" });
  await expect(ask).toBeVisible();
  await ask.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Ann", exact: true })).toBeVisible();

  // Make a link, then sign out goes straight through to the family page, and the chip is gone.
  await openAccountMenu(page, "Ann");
  await page.getByRole("menuitem", { name: "Save access (recovery link)" }).click();
  await page.getByRole("button", { name: "Make a link" }).click();
  const link = await page.getByLabel("Your private link").inputValue();
  await page.getByRole("button", { name: "Close" }).click();
  await openAccountMenu(page, "Ann");
  await page.getByRole("menuitem", { name: "Sign out of this device" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Ann", exact: true })).toHaveCount(0);

  // The reservation was not lost: the recovery link signs the same guest back in.
  await page.goto(link);
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.getByRole("button", { name: "Ann", exact: true })).toBeVisible();
  await page.goto(`/l/${alexList.slug}`);
  await expect(page.getByText("Reserved by you")).toBeVisible();
  await context.close();
});

test("sign-out and the menu work by keyboard alone", async ({ browser }) => {
  const { context, page } = await guestPage(browser, alexList.slug, "Ann");
  await page.getByRole("button", { name: "Ann", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu", { name: "Account" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu", { name: "Account" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Ann", exact: true })).toBeFocused(); // focus returns to the chip

  await page.keyboard.press("Enter");
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("ArrowDown");
    if (await page.getByRole("menuitem", { name: "Sign out of this device" }).evaluate((el) => el === document.activeElement)) break;
  }
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Sign out without a recovery link?" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Ann", exact: true })).toHaveCount(0);
  await context.close();
});

test("an owner's menu has their own entries and no guest ones, and My list skips an archived list", async ({ page }) => {
  await createList(alexId, "Christmas 2025", true); // archived: "My list" must not point at it
  await ownerSignIn(page); // Alex is first in the picker

  await expect(page.getByText("Owner", { exact: true })).toBeVisible();
  await openAccountMenu(page, "Alex");
  await expect(page.getByRole("menuitem", { name: "My list", exact: true })).toHaveAttribute("href", `/owner/lists/${alexList.id}`);
  await expect(page.getByRole("menuitem", { name: "All my lists" })).toHaveAttribute("href", "/owner");
  for (const guestOnly of ["Change my name", "Save access (recovery link)", "My planner", "I own a list (PIN)", "Sign out of this device"]) {
    await expect(page.getByRole("menuitem", { name: guestOnly }), guestOnly).toHaveCount(0);
  }
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/owner\/login$/);
  await page.goto("/owner");
  await expect(page).toHaveURL(/\/owner\/login$/); // really signed out
});

test("the admin bar shows who this is and a Sign out button at every width, and no account menu", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Admin secret").fill(ADMIN_SECRET);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Family admin" })).toBeVisible();

  const bar = page.getByRole("banner");
  await expect(bar.getByText("Admin", { exact: true })).toBeVisible();
  await expect(bar.getByRole("button", { name: /^(Alex|Sarah)/ })).toHaveCount(0);
  await bar.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("the welcome and sign-in screens have no top bar or tabs", async ({ page }) => {
  for (const path of ["/welcome", "/owner/login", "/admin/login"]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("banner"), path).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Main" }), path).toHaveCount(0);
  }
});
