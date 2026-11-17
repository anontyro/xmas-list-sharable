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
  await page.goto(`/owner/lists/${listId}`);
  await page.getByRole("button", { name: "Import from an Amazon wishlist" }).click();
  await page.getByLabel("Pasted wishlist").fill(readFileSync("tests/fixtures/amazon/wishlist-basic.html", "utf8"));
  await page.getByRole("button", { name: "Parse", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Gift", { exact: true })).toHaveCount(3);
  await dialog.getByRole("button", { name: "Remove LEGO Botanical Bouquet" }).click();
  await dialog.getByLabel("Gift", { exact: true }).last().fill("Warm Blanket");
  await expect(page.getByText("No gifts yet")).toBeVisible(); // parsing and editing saved nothing

  await dialog.getByRole("button", { name: "Add selected items" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Noise-Cancelling Headphones")).toBeVisible();
  await expect(page.getByText("Warm Blanket")).toBeVisible();
  await expect(page.getByText("LEGO Botanical Bouquet")).toHaveCount(0);
  await expect(page.getByText("£129.99")).toBeVisible();
});

test("unreadable text shows the fallback, and the owner adds a gift by hand", async ({ page }) => {
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}`);
  await page.getByRole("button", { name: "Import from an Amazon wishlist" }).click();
  await page.getByLabel("Pasted wishlist").fill("just some words, no links");
  await page.getByRole("button", { name: "Parse", exact: true }).click();
  await expect(page.getByText("You can still add them by hand.")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("textbox", { name: /^Gift/ }).fill("By hand");
  await page.getByRole("button", { name: "Add gift" }).click();
  await expect(page.getByText("By hand")).toBeVisible();
});

test("a paste over 500 KB gets a friendly message before anything is sent", async ({ page }) => {
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}`);
  await page.getByRole("button", { name: "Import from an Amazon wishlist" }).click();
  await page.getByLabel("Pasted wishlist").fill("x".repeat(520 * 1024));
  await page.getByRole("button", { name: "Parse", exact: true }).click();
  await expect(page.getByText("That's too much to read at once.")).toBeVisible();
});
