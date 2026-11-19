import { expect, test } from "@playwright/test";
import { createList, createMemberWithPin, ownerSignIn, resetAndSeed } from "./helpers";

// The app under test is a production build, which (correctly) refuses local addresses, so the live "success" path is
// covered by integration tests against a local server. These tests cover what an owner sees when a link can't be used.
let listId: string;
test.beforeEach(async () => {
  const household = await resetAndSeed();
  const alex = await createMemberWithPin(household, "Alex", "123456");
  listId = (await createList(alex)).id;
});

const fallback = "You can still add it by hand.";

test("a link that can't be fetched shows a friendly message and the form still works", async ({ page }) => {
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}/add`);

  for (const link of ["http://127.0.0.1/product", "http://169.254.169.254/latest/meta-data/", "ftp://example.com/gift"]) {
    await page.getByLabel("Product link").fill(link);
    await page.getByRole("button", { name: "Fetch details" }).click();
    await expect(page.getByText(fallback, { exact: false }).first()).toBeVisible();
  }

  // The form is still usable after the failures: the link that failed is still in its field (and would be refused on save), so clear it and type the gift in.
  await page.getByLabel("Product link").fill("");
  await page.getByLabel("What is it?").fill("Hand-typed gift");
  await page.getByLabel("Price", { exact: true }).fill("12.50");
  await page.getByRole("button", { name: "Save gift" }).click();
  await expect(page).toHaveURL(new RegExp(`/owner/lists/${listId}$`));
  await expect(page.getByRole("heading", { level: 3, name: "Hand-typed gift" })).toBeVisible();
  await expect(page.getByText("£12.50")).toBeVisible();
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(1); // the failed lookups saved nothing
});

test("the link box needs something to fetch, and the form works without ever using it", async ({ page }) => {
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}/add`);
  await expect(page.getByRole("button", { name: "Fetch details" })).toBeDisabled();
  await page.getByLabel("What is it?").fill("No link needed");
  await page.getByRole("button", { name: "Save gift" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "No link needed" })).toBeVisible();
});

test("twenty-one lookups in a row end with a polite throttle message", async ({ page }) => {
  await ownerSignIn(page);
  await page.goto(`/owner/lists/${listId}/add`);
  const link = page.getByLabel("Product link");
  for (let i = 0; i < 21; i++) {
    await link.fill(`ftp://example.com/${i}`);
    await page.getByRole("button", { name: "Fetch details" }).click();
    await expect(page.getByRole("button", { name: "Fetch details" })).toBeEnabled();
  }
  await expect(page.getByText("That's a lot of lookups")).toBeVisible();
});
