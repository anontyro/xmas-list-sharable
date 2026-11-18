import { expect, test, type Page } from "@playwright/test";
import { createItem, createList, createMemberWithPin, ownerSignIn, resetAndSeed, settled } from "./helpers";

let slug: string;
let listId: string;
test.beforeEach(async () => {
  const household = await resetAndSeed();
  const alex = await createMemberWithPin(household, "Alex", "123456");
  const list = await createList(alex);
  slug = list.slug;
  listId = list.id;
  await createItem(list.id, "Alpha", 1000);
  await createItem(list.id, "Beta", null);
  await createItem(list.id, "Gamma", 3000);
});

const guestOrder = async (page: Page) => {
  await settled(page);
  return (await page.getByRole("heading", { level: 3 }).allInnerTexts()).filter((t) => ["Alpha", "Beta", "Gamma"].includes(t));
};

const ownerOrder = async (page: Page) => {
  await settled(page);
  return page.locator('[aria-label^="Move up:"]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")!.replace("Move up: ", "")));
};

/** Picks a sort. Phones keep the controls in a dialog behind "More filters" (which hides the page while open, so close it); wide screens show them in the sidebar. */
async function chooseSort(page: Page, name: string) {
  const more = page.getByRole("button", { name: "More filters" });
  const onPhone = await more.isVisible();
  if (onPhone) await more.click();
  await page.getByRole("button", { name, exact: true }).click();
  if (onPhone) await page.keyboard.press("Escape");
}

test("the owner reorders by keyboard and guests see it; a guest's sort never changes the owner's order", async ({ page, browser }) => {
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}`);
  expect(await ownerOrder(page)).toEqual(["Alpha", "Beta", "Gamma"]);

  // Keyboard only: focus the button and press Enter.
  const moveUp = page.getByRole("button", { name: "Move up: Gamma" });
  await moveUp.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => ownerOrder(page)).toEqual(["Alpha", "Gamma", "Beta"]);
  await page.reload();
  expect(await ownerOrder(page)).toEqual(["Alpha", "Gamma", "Beta"]); // persisted

  await expect(page.getByRole("button", { name: "Move up: Alpha" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Move down: Beta" })).toBeDisabled();

  const guest = await browser.newContext();
  const gp = await guest.newPage();
  await gp.goto(`/l/${slug}`);
  expect(await guestOrder(gp)).toEqual(["Alpha", "Gamma", "Beta"]);

  await chooseSort(gp, "Price, high to low");
  await expect.poll(() => guestOrder(gp)).toEqual(["Gamma", "Alpha", "Beta"]); // unpriced last
  await expect(gp).toHaveURL(/sort=price_desc/);

  await chooseSort(gp, "Price, low to high");
  await expect.poll(() => guestOrder(gp)).toEqual(["Alpha", "Gamma", "Beta"]); // unpriced still last

  // A fresh visit with no params shows the owner's order again, and the owner's order is untouched.
  await gp.goto(`/l/${slug}`);
  expect(await guestOrder(gp)).toEqual(["Alpha", "Gamma", "Beta"]);
  await page.reload();
  expect(await ownerOrder(page)).toEqual(["Alpha", "Gamma", "Beta"]);
  await guest.close();
});

test("a copied filter link shows the same view, and filters can be cleared", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/l/${slug}?min=5&max=20`);
  expect(await guestOrder(page)).toEqual(["Alpha"]); // £10 only; Beta has no price, Gamma is over £20
  await page.goto(`/l/${slug}?min=100`);
  await expect(page.getByText("No gifts match these filters.")).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect.poll(() => guestOrder(page)).toEqual(["Alpha", "Beta", "Gamma"]);
  await context.close();
});

test("the owner page has no claim-based sort or filter", async ({ page }) => {
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}`);
  await expect(page.getByText(/Sort and filter|Reserved by|Available only/i)).toHaveCount(0);
});

test("the list shows ribbons for each priority in the owner's order", async ({ browser }) => {
  await createItem(listId, "Delta", 2000, "most_wanted");
  await createItem(listId, "Epsilon", 500, "nice_to_have");
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/l/${slug}`);
  await settled(page);
  const ribbons = (await page.getByRole("heading", { level: 2 }).allInnerTexts()).map((t) => t.replace("★ ", ""));
  expect(ribbons.filter((t) => t !== "Sort and filter")).toEqual(["MOST WANTED", "WOULD LOVE", "NICE TO HAVE"]);
  expect(await page.getByRole("heading", { level: 3 }).allInnerTexts()).toEqual(["Delta", "Alpha", "Beta", "Gamma", "Epsilon"]);
  await context.close();
});

test("the price control and chips change the visible gifts and the URL, and the phone dialog works by keyboard", async ({ browser }, info) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/l/${slug}`);
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Under £25" }).click();
    await expect(page).toHaveURL(/max=25\.00/);
    await expect.poll(() => guestOrder(page)).toEqual(["Alpha"]); // Beta has no price, Gamma is £30
    await page.getByRole("button", { name: "Under £25" }).click();
    await expect(page).not.toHaveURL(/max=/);
    await page.getByRole("button", { name: "Available only" }).click();
    await expect(page).toHaveURL(/avail=1/);

    const more = page.getByRole("button", { name: "More filters" });
    await more.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Sort and filter" });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true); // focus never leaves the dialog
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(more).toBeFocused();
  } else {
    const slider = page.getByRole("slider");
    await expect(slider).toHaveAttribute("aria-valuemax", "30"); // the dearest gift (£30) rounded up to £5
    await slider.focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(/max=25\.00/);
    await expect.poll(() => guestOrder(page)).toEqual(["Alpha"]);
    await page.keyboard.press("End"); // back at the top: the limit is off and `max` leaves the URL
    await expect(page).not.toHaveURL(/max=/);
    await expect.poll(() => guestOrder(page)).toEqual(["Alpha", "Beta", "Gamma"]);
    await page.getByRole("button", { name: "Most Wanted" }).click();
    await expect(page).toHaveURL(/priority=most_wanted/);
    await expect(page.getByRole("button", { name: "Most Wanted" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Clear filters" }).first().click();
    await expect(page).toHaveURL(new RegExp(`/l/${slug}$`));
  }
  await context.close();
});

test("a price limit at or above the dearest gift is no limit, and one with pence is cut to whole pounds", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Alpha £10, Beta no price, Gamma £30: the slider tops out at £30.
  await page.goto(`/l/${slug}?max=100`); // an old link from before the dearest gift was removed
  expect(await guestOrder(page)).toEqual(["Alpha", "Beta", "Gamma"]); // the unpriced gift is not hidden
  await page.goto(`/l/${slug}?max=25.50`);
  expect(await guestOrder(page)).toEqual(["Alpha"]);
  await context.close();
});
