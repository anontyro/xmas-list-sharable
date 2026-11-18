import { expect, test, type Page } from "@playwright/test";
import { createItem, createList, createMemberWithPin, ownerSignIn, PRIVATE, resetAndSeed, seedGuestActivity } from "./helpers";

let householdId: string;
let listId: string;
let slug: string;
test.beforeEach(async () => {
  householdId = await resetAndSeed();
  const alex = await createMemberWithPin(householdId, "Alex", "123456");
  const list = await createList(alex);
  listId = list.id;
  slug = list.slug;
});

/** What a guest sees on the list: ribbons and gift titles, in order. */
async function guestView(page: Page) {
  await page.goto(`/l/${slug}`);
  const nodes = page.locator("main h2, main h3");
  return (await nodes.allInnerTexts()).map((t) => t.replace("★ ", "").trim()).filter((t) => !/^Sort and filter$|^My planner$/.test(t));
}

async function addGift(page: Page, title: string, price: string, priority: string) {
  await page.getByRole("link", { name: "+ Add a gift" }).click();
  await page.getByLabel("What is it?").fill(title);
  await page.getByLabel("Price", { exact: true }).fill(price);
  await page.getByRole("button", { name: priority }).click();
  await page.getByRole("button", { name: "Save gift" }).click();
  await expect(page).toHaveURL(new RegExp(`/owner/lists/${listId}$`));
  await expect(page.getByRole("heading", { level: 3, name: title })).toBeVisible();
}

test("an owner types gifts in, changes one's price and priority, reorders by keyboard and removes one, and a guest sees each change", async ({ page, browser }) => {
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}`);
  await addGift(page, "Kettle", "30", "Nice to Have");
  await addGift(page, "Toaster", "20", "Nice to Have");

  const guest = await browser.newContext();
  const gp = await guest.newPage();
  expect(await guestView(gp)).toEqual(["NICE TO HAVE", "Kettle", "Toaster"]);
  await expect(gp.getByText("£30.00")).toBeVisible();

  // Edit: a higher priority moves the gift into the Most Wanted group, and the price changes.
  await page.getByRole("link", { name: "Edit Toaster" }).click();
  await expect(page.getByLabel("What is it?")).toHaveValue("Toaster");
  await page.getByLabel("Price", { exact: true }).fill("25");
  await page.getByRole("button", { name: "Most Wanted" }).click();
  await page.getByRole("button", { name: "Save gift" }).click();
  await expect(page).toHaveURL(new RegExp(`/owner/lists/${listId}$`));
  expect(await guestView(gp)).toEqual(["MOST WANTED", "Toaster", "NICE TO HAVE", "Kettle"]);
  await expect(gp.getByText("£25.00")).toBeVisible();

  // Reorder by keyboard inside a group: a new Most Wanted gift goes last, then moves up past the Toaster.
  await addGift(page, "Mixer", "40", "Most Wanted");
  expect(await guestView(gp)).toEqual(["MOST WANTED", "Toaster", "Mixer", "NICE TO HAVE", "Kettle"]);
  const up = page.getByRole("button", { name: "Move up: Mixer" });
  await up.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.getByRole("heading", { level: 3 }).allInnerTexts()).toEqual(["Mixer", "Toaster", "Kettle"]);
  expect(await guestView(gp)).toEqual(["MOST WANTED", "Mixer", "Toaster", "NICE TO HAVE", "Kettle"]);
  await expect(page.getByRole("button", { name: "Move up: Mixer" })).toBeDisabled(); // top of its group
  await expect(page.getByRole("button", { name: "Move down: Kettle" })).toBeDisabled(); // only gift in its group

  // Remove after confirming: it is gone for the guest too.
  await page.getByRole("link", { name: "Edit Kettle" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Remove this gift" }).click();
  await expect(page).toHaveURL(new RegExp(`/owner/lists/${listId}$`));
  await expect(page.getByRole("heading", { level: 3, name: "Kettle" })).toHaveCount(0);
  expect(await guestView(gp)).toEqual(["MOST WANTED", "Mixer", "Toaster"]);
  await guest.close();
});

test("declining the remove confirmation keeps the gift", async ({ page }) => {
  await createItem(listId, "Kettle", 3000);
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}`);
  await page.getByRole("link", { name: "Edit Kettle" }).click();
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Remove this gift" }).click();
  await expect(page).toHaveURL(/\/gifts\//);
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Kettle" })).toBeVisible();
});

test("an owner's pages never show reservations, interest, buyers or planner data", async ({ page }) => {
  const itemId = await createItem(listId, "Headphones", 12999);
  await seedGuestActivity(householdId, itemId); // a guest who has an interest, a purchase, a budget and a private note on it
  await ownerSignIn(page);
  for (const path of [`/owner/lists/${listId}`, `/owner/lists/${listId}/add`, `/owner/lists/${listId}/gifts/${itemId}`]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    const html = await page.content();
    expect(html, path).not.toContain(PRIVATE.guest);
    expect(html, path).not.toContain(PRIVATE.note);
    expect(html, path).not.toContain("77.77");
    expect(html, path).not.toMatch(/reserved_by|purchased_by|claimedBy|itemClaim|interest/i);
    const text = await page.locator("body").innerText();
    expect(text.replace(/never see who has reserved or bought anything/, ""), path).not.toMatch(/reserved|purchased|interested|Zelda/i);
  }
});

test("an owner cannot open another owner's editor, add page or edit page", async ({ page }) => {
  const sarah = await createMemberWithPin(householdId, "Sarah", "654321");
  const sarahs = await createList(sarah, "Sarah's list");
  const sarahItem = await createItem(sarahs.id, "Sarah's secret gift", 1000);
  await ownerSignIn(page); // Alex is first in the picker
  for (const path of [`/owner/lists/${sarahs.id}`, `/owner/lists/${sarahs.id}/add`, `/owner/lists/${sarahs.id}/gifts/${sarahItem}`]) {
    await page.goto(path);
    await expect(page.getByText("This page could not be found"), path).toBeVisible();
    expect(await page.content(), path).not.toContain("Sarah's secret gift");
  }
  // Alex's own gift id under Sarah's list, and a made-up id under his own, are also not found.
  const own = await createItem(listId, "Alex's gift", 500);
  await page.goto(`/owner/lists/${sarahs.id}/gifts/${own}`);
  await expect(page.getByText("This page could not be found")).toBeVisible();
  await page.goto(`/owner/lists/${listId}/gifts/11111111-1111-4111-8111-111111111111`);
  await expect(page.getByText("This page could not be found")).toBeVisible();
});

test("signed-out visitors are sent to sign in from the add and edit pages", async ({ page }) => {
  const itemId = await createItem(listId, "Kettle", 3000);
  for (const path of [`/owner/lists/${listId}/add`, `/owner/lists/${listId}/gifts/${itemId}`]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/owner\/login$/);
  }
});
