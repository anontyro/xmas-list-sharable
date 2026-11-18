import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createList, createMemberWithPin, ownerSignIn, resetAndSeed } from "./helpers";

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
