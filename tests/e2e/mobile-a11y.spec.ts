import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { ADMIN_SECRET, createItem, createList, createMemberWithPin, guestPage, openAccountMenu, ownerSignIn, resetAndSeed } from "./helpers";

let slug: string;
let listId: string;
let alex: string;
let itemId: string;
test.beforeEach(async () => {
  const household = await resetAndSeed();
  alex = await createMemberWithPin(household, "Alex", "123456");
  const list = await createList(alex);
  slug = list.slug;
  listId = list.id;
  itemId = await createItem(list.id, "Headphones", 12999);
  await createItem(list.id, "Novel", 1499);
  await createList(alex, "Christmas 2025", true, 2025);
});

const noSideScroll = async (page: Page, where: string) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `horizontal scroll on ${where}`).toBe(true);

async function serious(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`), `axe on ${where}`).toEqual([]);
}

async function adminSignIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Admin secret").fill(ADMIN_SECRET);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Family admin" })).toBeVisible();
}

// Reduced motion keeps dialogs from being scanned halfway through their fade-in.
test.describe("pages", () => {
test.use({ reducedMotion: "reduce" });
test("every page fits the screen and has no serious accessibility violations", async ({ browser, page }) => {
  await adminSignIn(page);
  for (const path of ["/admin", "/admin/lists"]) {
    await page.goto(path);
    await noSideScroll(page, path);
    await serious(page, path);
  }
  await page.goto(`/admin/members/${alex}`); // the old member page now lands on /admin
  await expect(page).toHaveURL(/\/admin$/);
  for (const [button, dialog] of [["Reset PIN: Alex", "Reset PIN for Alex"], ["Rename Alex", "Rename Alex"]]) {
    await page.getByRole("button", { name: button }).click();
    await expect(page.getByRole("dialog", { name: dialog })).toBeVisible();
    await noSideScroll(page, `admin dialog: ${dialog}`);
    await serious(page, `admin dialog: ${dialog}`);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page.context().clearCookies();

  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}`);
  await noSideScroll(page, "owner list");
  await serious(page, "owner list");
  for (const [path, name] of [[`/owner/lists/${listId}/gifts/${itemId}`, "edit a gift"], [`/owner/lists/${listId}/add`, "add a gift (link)"], [`/owner/lists/${listId}/add?mode=manual`, "add a gift (typed)"], [`/owner/lists/${listId}/import`, "import page"], ["/owner", "owner lists"], ["/owner/pin", "change PIN"]]) {
    await page.goto(path);
    await noSideScroll(page, name);
    await serious(page, name);
  }
  await page.context().clearCookies();

  const { context, page: guest } = await guestPage(browser, slug, "Ann", { reducedMotion: "reduce" });
  await guest.getByRole("button", { name: /^Reserve: Headphones/ }).click();
  await expect(guest.getByText("Reserved by you")).toBeVisible();
  const visited: [string, string][] = [["/", "family page"], [`/l/${slug}`, "list"], ["/planner", "planner"], ["/planner/budget", "budget and notes"], ["/earlier/2025", "earlier years"], ["/earlier/1999", "earlier years not found"], ["/l/nosuchlistxx", "list not found"]];
  for (const [path, name] of visited) {
    await guest.goto(path);
    await noSideScroll(guest, name);
    await serious(guest, name);
  }
  await guest.goto(`/l/${slug}`);
  const more = guest.getByRole("button", { name: "More filters" }); // phones keep the sort and filters in a dialog
  if (await more.isVisible()) {
    await more.click();
    await expect(guest.getByRole("dialog", { name: "Sort and filter" })).toBeVisible();
    await noSideScroll(guest, "filter dialog");
    await serious(guest, "filter dialog");
    await guest.keyboard.press("Escape");
    await expect(guest.getByRole("dialog")).toHaveCount(0);
  }
  await openAccountMenu(guest, "Ann");
  await serious(guest, "account menu");
  await guest.getByRole("menuitem", { name: "Save access (recovery link)" }).click();
  await expect(guest).toHaveURL(/\/access$/);
  await noSideScroll(guest, "access page");
  await serious(guest, "access page");
  await guest.getByRole("button", { name: "Make a link" }).click();
  await expect(guest.getByRole("textbox", { name: "Your private link" })).toBeVisible();
  await noSideScroll(guest, "access page with a link");
  await serious(guest, "access page with a link");
  await context.close();

  for (const path of ["/welcome", "/owner/login", "/admin/login", "/recover"]) {
    await page.goto(path);
    await noSideScroll(page, path);
    await serious(page, path);
  }
});
});

/** Presses Tab until `target` has focus (at most `max` times). */
async function tabTo(page: Page, target: Locator, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("never reached the control by keyboard");
}

test("reserve, mark purchased and add a gift all work from the keyboard alone", async ({ browser, page }) => {
  const { context, page: guest } = await guestPage(browser, slug, "Ann");
  await tabTo(guest, guest.getByRole("button", { name: /^Reserve: Headphones/ }));
  await guest.keyboard.press("Enter");
  await expect(guest.getByText("Reserved by you")).toBeVisible();
  await tabTo(guest, guest.getByRole("button", { name: /^Mark purchased: Headphones/ }));
  await guest.keyboard.press("Enter");
  await expect(guest.getByText("Purchased by you")).toBeVisible();
  await context.close();

  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}/add?mode=manual`);
  await tabTo(page, page.getByLabel("What is it?"));
  await page.keyboard.type("Keyboard gift");
  await page.keyboard.press("Enter"); // submits the form
  await expect(page.getByRole("heading", { level: 3, name: "Keyboard gift" })).toBeVisible();

  // Import: paste, find, and add, using Tab and Enter/Space only.
  await page.goto(`/owner/lists/${listId}/import`);
  await tabTo(page, page.getByLabel("Paste your wishlist"));
  await page.keyboard.type("Wool scarf\n£35.00\nhttps://www.amazon.co.uk/dp/B0SCARF003");
  await tabTo(page, page.getByRole("button", { name: "Find gifts" }));
  await page.keyboard.press("Enter");
  const add = page.getByRole("button", { name: "Add 1 gift" });
  await tabTo(page, add);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 3, name: "Wool scarf" })).toBeVisible();
});

test("owner sign-in works from the keyboard alone", async ({ page }) => {
  await page.goto("/owner/login");
  await tabTo(page, page.getByLabel("PIN"));
  await page.keyboard.type("123456");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/owner$/);
});

test("with reduced motion on, nothing on the page transitions or animates", async ({ browser }) => {
  const { context, page } = await guestPage(browser, slug, "Ann", { reducedMotion: "reduce" });
  await page.getByRole("button", { name: /^Reserve: Headphones/ }).click();
  const moving = await page.evaluate(() =>
    [...document.querySelectorAll("button, a, input, [role=button]")]
      .filter((el) => {
        const s = getComputedStyle(el);
        const zero = (v: string) => v.split(",").every((d) => parseFloat(d) === 0);
        return !zero(s.transitionDuration) || !zero(s.animationDuration);
      })
      .map((el) => el.outerHTML.slice(0, 80)),
  );
  expect(moving).toEqual([]);
  await context.close();
});
