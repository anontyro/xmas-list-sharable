import { expect, test, type Page } from "@playwright/test";
import { createItem, createList, createMemberWithPin, ownerSignIn, resetAndSeed } from "./helpers";

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

const guestOrder = async (page: Page) =>
  (await page.getByRole("heading", { level: 3 }).allInnerTexts()).filter((t) => ["Alpha", "Beta", "Gamma"].includes(t));

const ownerOrder = (page: Page) =>
  page.locator('[aria-label^="Move up:"]').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")!.replace("Move up: ", "")));

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
  await expect(page.getByText(/Sort and filter|reserved|available/i)).toHaveCount(0);
});
