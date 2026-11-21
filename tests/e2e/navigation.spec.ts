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
  await expect(page).toHaveURL(/\/access$/);
  await page.getByRole("button", { name: "Make a link" }).click();
  const link = await page.getByLabel("Your private link").inputValue();
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

const MEMBER_MENU = ["My list", "All my lists", "Browse family lists", "My planner", "Change my name", "Save access (recovery link)", "Change my PIN", "Sign out"];

test("a member's menu is the member menu in order, My list skips an archived list, and Sign out ends both sessions", async ({ page }) => {
  await createList(alexId, "Christmas 2025", true); // archived: "My list" must not point at it
  await ownerSignIn(page); // Alex is first in the picker

  await expect(page.getByText("Owner", { exact: true })).toHaveCount(0); // the old pill is gone
  await openAccountMenu(page, "Alex");
  const items = await page.getByRole("menu", { name: "Account" }).getByRole("menuitem").allInnerTexts();
  expect(items.map((t) => t.trim())).toEqual(MEMBER_MENU);
  await expect(page.getByRole("menuitem", { name: "My list", exact: true })).toHaveAttribute("href", `/owner/lists/${alexList.id}`);
  await expect(page.getByRole("menuitem", { name: "All my lists" })).toHaveAttribute("href", "/owner");
  await expect(page.getByRole("menuitem", { name: "Browse family lists" })).toHaveAttribute("href", "/");
  for (const guestOnly of ["I own a list (PIN)", "Set a PIN", "Sign out of this device"]) {
    await expect(page.getByRole("menuitem", { name: guestOnly }), guestOnly).toHaveCount(0);
  }
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("dialog")).toHaveCount(0); // no recovery-link question: the PIN gets them back
  await expect(page.getByRole("button", { name: "Alex", exact: true })).toHaveCount(0); // the viewer session ended too
  await page.goto("/owner");
  await expect(page).toHaveURL(/\/owner\/login$/); // really signed out
});

test("the brand goes to the family home for a member, and a member stays signed in there", async ({ page }) => {
  await ownerSignIn(page);
  await page.getByRole("banner").getByRole("link", { name: "Family Gifts" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Alex", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pick your name" })).toHaveCount(0);
  await page.goto(`/l/${sarahList.slug}`);
  await page.getByRole("banner").getByRole("link", { name: "Family Gifts" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("Browse family lists takes a member from an owner page to the family home, still signed in, and they can reserve", async ({ page }) => {
  await ownerSignIn(page);
  await openAccountMenu(page, "Alex");
  await page.getByRole("menuitem", { name: "Browse family lists" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("link", { name: /Sarah/ }).click();
  await page.getByRole("button", { name: /^Reserve: Cookbook/ }).click();
  await expect(page.getByText("Reserved by you")).toBeVisible();
});

test("a member sees the right links on owner pages and on family pages, with one Main navigation", async ({ page }, info) => {
  const phone = info.project.name === "mobile";
  const links = async () => (await page.getByRole("navigation", { name: "Main" }).getByRole("link").allInnerTexts()).map((n) => n.trim());
  await ownerSignIn(page);
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(1);
  expect(await links()).toEqual(["Family", "My list", "Add a gift", "Import"]);
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(1);
  expect(await links()).toEqual(phone ? ["Family", "My list", "Wishlist", "Planner"] : ["Family", "My list", "Wishlist", "My planner"]);
});

test("a guest sets a PIN from the menu, keeps what they reserved, and then has the waiting member menu", async ({ browser }) => {
  const { context, page } = await guestPage(browser, alexList.slug, "Ann");
  await page.getByRole("button", { name: /^Reserve: Headphones/ }).click();
  await expect(page.getByText("Reserved by you")).toBeVisible();

  await openAccountMenu(page, "Ann");
  await page.getByRole("menuitem", { name: "Set a PIN" }).click();
  await page.getByRole("dialog").getByLabel(/^PIN/).fill("12345");
  await page.getByRole("button", { name: "Set PIN" }).click();
  await expect(page.getByText("PIN must be 6 to 12 digits")).toBeVisible();
  await page.getByRole("dialog").getByLabel(/^PIN/).fill("135790");
  await page.getByRole("button", { name: "Set PIN" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await openAccountMenu(page, "Ann");
  await expect(page.getByText("Waiting for admin approval")).toBeVisible();
  for (const hidden of ["My list", "All my lists", "Change my PIN", "Set a PIN", "I own a list (PIN)"]) {
    await expect(page.getByRole("menuitem", { name: hidden, exact: true }), hidden).toHaveCount(0);
  }
  await expect(page.getByRole("menuitem", { name: "Browse family lists" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByText("Reserved by you")).toBeVisible(); // nothing lost
  await context.close();
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
