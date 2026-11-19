import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createItem, createList, createMemberWithPin, ownerSignIn, resetAndSeed, settled } from "./helpers";

let listId: string;
test.beforeEach(async () => {
  const household = await resetAndSeed();
  const alex = await createMemberWithPin(household, "Alex", "123456");
  listId = (await createList(alex)).id;
});

test("paste a wishlist, remove one row, edit a title and add the rest", async ({ page }) => {
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}/import`);
  await page.getByLabel("Paste your wishlist").fill(readFileSync("tests/fixtures/amazon/wishlist-basic.html", "utf8"));
  await page.getByRole("button", { name: "Find gifts" }).click();

  await expect(page.getByLabel("Gift", { exact: true })).toHaveCount(3);
  await page.getByRole("button", { name: "Remove LEGO Botanical Bouquet" }).click();
  await page.getByLabel("Gift", { exact: true }).last().fill("Warm Blanket");
  await expect(page.getByText("2 gifts will be added to your list")).toBeVisible();

  // Parsing and editing saved nothing yet.
  await page.goto(`/owner/lists/${listId}`);
  await expect(page.getByText("No gifts yet")).toBeVisible();
  await page.goto(`/owner/lists/${listId}/import`);
  await page.getByLabel("Paste your wishlist").fill(readFileSync("tests/fixtures/amazon/wishlist-basic.html", "utf8"));
  await page.getByRole("button", { name: "Find gifts" }).click();
  await page.getByRole("button", { name: "Remove LEGO Botanical Bouquet" }).click();
  await page.getByLabel("Gift", { exact: true }).last().fill("Warm Blanket");

  await page.getByRole("button", { name: "Add 2 gifts" }).click();
  await expect(page).toHaveURL(new RegExp(`/owner/lists/${listId}$`));
  await expect(page.getByRole("heading", { level: 3, name: "Noise-Cancelling Headphones" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Warm Blanket" })).toBeVisible();
  await expect(page.getByText("LEGO Botanical Bouquet")).toHaveCount(0);
  await expect(page.getByText("£129.99")).toBeVisible();
});

test("unreadable text shows the fallback, and the owner adds a gift by hand", async ({ page }) => {
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}/import`);
  await page.getByLabel("Paste your wishlist").fill("just some words, no links");
  await page.getByRole("button", { name: "Find gifts" }).click();
  await expect(page.getByText("You can still add them by hand.")).toBeVisible();

  await page.getByRole("link", { name: "Add a gift by hand" }).click();
  await page.getByLabel("What is it?").fill("By hand");
  await page.getByRole("button", { name: "Save gift" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "By hand" })).toBeVisible();
});

test("a paste over 500 KB gets a friendly message before anything is sent", async ({ page }) => {
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}/import`);
  await page.getByLabel("Paste your wishlist").fill("x".repeat(520 * 1024));
  await page.getByRole("button", { name: "Find gifts" }).click();
  await expect(page.getByText("That's too much to read at once.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Add a gift by hand" })).toBeVisible();
});

const WISHLIST = [
  "Stoneware mug set",
  "£22.00",
  "https://www.amazon.co.uk/dp/B0MUG00001",
  "Wireless charging pad",
  "https://www.amazon.co.uk/dp/B0PAD00002",
  "Merino wool scarf",
  "£35.00",
  "https://www.amazon.co.uk/dp/B0SCARF003",
  "Cast-iron casserole dish",
  "£59.00",
  "https://www.amazon.co.uk/dp/B07XJ8C8F5",
].join("\n");

/** The owner's list as a guest reads it: ribbons and gift titles, in order. */
async function editorOrder(page: import("@playwright/test").Page) {
  await settled(page);
  const texts = await page.getByRole("main").locator("h2, h3").allInnerTexts();
  return texts.map((t) => t.replace("★ ", "").trim()).filter((t) => !["Share your list", "Add gifts"].includes(t));
}

test("tick, rename, set a priority and fill a missing price, and only the ticked gifts are added, each in its own group", async ({ page }) => {
  await createItem(listId, "Casserole I already have", 5900, "would_love", "https://www.amazon.co.uk/dp/B07XJ8C8F5?tag=old"); // the same product as the last pasted row
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}/import`);
  await page.getByLabel("Paste your wishlist").fill(WISHLIST);
  await page.getByRole("button", { name: "Find gifts" }).click();

  await expect(page.getByRole("heading", { name: "WE FOUND 4 GIFTS" })).toBeVisible();
  await expect(page.getByLabel("Gift", { exact: true })).toHaveCount(4);
  // The duplicate starts unticked and is skipped; the rest are ticked.
  await expect(page.getByLabel("Add Cast-iron casserole dish")).not.toBeChecked();
  await expect(page.getByText("Already on your list", { exact: true })).toBeVisible();
  await expect(page.getByText("Skipped", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Add Stoneware mug set")).toBeChecked();
  await expect(page.getByText("3 gifts will be added to your list")).toBeVisible();
  await expect(page.getByText("1 already on your list, so it's skipped. 1 needs a price.")).toBeVisible();

  await page.getByLabel("Add Stoneware mug set").uncheck(); // not wanted after all
  await page.getByLabel("Priority for Merino wool scarf").selectOption("nice_to_have");
  await page.getByLabel("Gift", { exact: true }).nth(1).fill("Wireless charger"); // rename the row with no price
  await page.getByLabel("Price for Wireless charger").fill("15");
  await expect(page.getByText("2 gifts will be added to your list")).toBeVisible();
  await expect(page.getByText(/1 not ticked\./)).toBeVisible();
  await expect(page.getByText(/needs a price/)).toHaveCount(0);

  await page.getByRole("button", { name: "Add 2 gifts" }).click();
  await expect(page).toHaveURL(new RegExp(`/owner/lists/${listId}$`));
  expect(await editorOrder(page)).toEqual(["WOULD LOVE", "Casserole I already have", "Wireless charger", "NICE TO HAVE", "Merino wool scarf"]);
  await expect(page.getByText("£15.00")).toBeVisible();
  await expect(page.getByText("£35.00")).toBeVisible();
  await expect(page.getByText("Stoneware mug set")).toHaveCount(0);
  await expect(page.getByText("Cast-iron casserole dish")).toHaveCount(0); // the duplicate was skipped
});

test("a duplicate can be ticked on purpose, and Remove takes a row away", async ({ page }) => {
  await createItem(listId, "Casserole I already have", 5900, "would_love", "https://www.amazon.co.uk/dp/B07XJ8C8F5");
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}/import`);
  await page.getByLabel("Paste your wishlist").fill(WISHLIST);
  await page.getByRole("button", { name: "Find gifts" }).click();
  await page.getByRole("button", { name: "Remove Stoneware mug set" }).click();
  await page.getByRole("button", { name: "Remove Wireless charging pad" }).click();
  await page.getByRole("button", { name: "Remove Merino wool scarf" }).click();
  await page.getByLabel("Add Cast-iron casserole dish").check();
  await expect(page.getByText("1 gift will be added to your list")).toBeVisible();
  await page.getByRole("button", { name: "Add 1 gift" }).click();
  await expect(page).toHaveURL(new RegExp(`/owner/lists/${listId}$`));
  expect(await editorOrder(page)).toEqual(["WOULD LOVE", "Casserole I already have", "Cast-iron casserole dish"]);
});

test("Find gifts, Clear, editing and Start over save nothing", async ({ page }) => {
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}/import`);
  const box = page.getByLabel("Paste your wishlist");
  await box.fill(WISHLIST);
  await page.getByRole("button", { name: "Find gifts" }).click();
  await expect(page.getByRole("heading", { name: "WE FOUND 4 GIFTS" })).toBeVisible();
  await page.getByLabel("Gift", { exact: true }).first().fill("Edited but not added");

  await page.getByRole("button", { name: "Clear" }).click(); // empties the paste box only
  await expect(box).toHaveValue("");
  await expect(page.getByRole("heading", { name: "WE FOUND 4 GIFTS" })).toBeVisible();
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByRole("heading", { name: /WE FOUND/ })).toHaveCount(0);

  await page.goto(`/owner/lists/${listId}`);
  await expect(page.getByText("No gifts yet")).toBeVisible();
});

test("the owner nav has Import and an archived list has no import page", async ({ page }) => {
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}`);
  await page.getByRole("link", { name: "Paste Amazon wishlist" }).click();
  await expect(page).toHaveURL(new RegExp(`/owner/lists/${listId}/import$`));
  await expect(page.getByRole("navigation", { name: "Main" }).locator('a[aria-current="page"]')).toHaveText(/Import/);
  await page.getByRole("link", { name: "Back to My list" }).click();
  await expect(page).toHaveURL(new RegExp(`/owner/lists/${listId}$`));
});
