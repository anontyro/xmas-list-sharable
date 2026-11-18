import { expect, test } from "@playwright/test";
import { ADMIN_SECRET, createList, createMemberWithPin, resetAndSeed } from "./helpers";

let householdId: string;
test.beforeEach(async () => {
  householdId = await resetAndSeed();
});

async function adminSignIn(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Admin secret").fill(ADMIN_SECRET);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Family admin" })).toBeVisible();
}

test("admin creates a member, sets a PIN and creates a list with a shareable link", async ({ page }) => {
  await adminSignIn(page);
  const add = page.getByRole("region", { name: "Add a member" });
  await add.getByLabel("Display name").fill("Alex");
  await add.getByRole("button", { name: "Add member" }).click();
  const card = page.getByRole("article", { name: "Alex" });
  await expect(card.getByText("PIN not set")).toBeVisible();

  await card.getByRole("button", { name: "Set PIN: Alex" }).click();
  await page.getByLabel(/^Set PIN\s*\*?$/).fill("123456");
  await page.getByRole("button", { name: "Save PIN" }).click();
  await expect(page.getByText("PIN saved")).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  const create = page.getByRole("region", { name: "Create a list" });
  await create.getByLabel("Member").click();
  await page.getByRole("option", { name: "Alex" }).click();
  await create.getByRole("button", { name: "Create list" }).click();
  await expect(card.getByText(/^\/l\/[0-9A-Za-z]{10}$/)).toBeVisible();
  await expect(card.getByRole("button", { name: "Copy link: Alex, Christmas 2026" })).toBeVisible();
});

test("archived lists are labelled and can be restored", async ({ page }) => {
  await adminSignIn(page);
  const add = page.getByRole("region", { name: "Add a member" });
  await add.getByLabel("Display name").fill("Sarah");
  await add.getByRole("button", { name: "Add member" }).click();
  const create = page.getByRole("region", { name: "Create a list" });
  await create.getByLabel("Member").click();
  await page.getByRole("option", { name: "Sarah" }).click();
  await create.getByRole("button", { name: "Create list" }).click();

  await page.getByRole("link", { name: "Lists" }).first().click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /^Archive: Sarah/ }).click();
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Restore: Sarah/ }).click();
  await expect(page.getByText("Archived", { exact: true })).toBeHidden();
});

test("admin pages need a session, and a wrong secret shows only the generic message", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel("Admin secret").fill("wrong-secret-value");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Incorrect details or too many attempts. Try again later.")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("owner sign-in shows the generic message for a wrong PIN and has a masked numeric PIN field", async ({ page }) => {
  await createMemberWithPin(householdId, "Alex", "123456");
  await page.goto("/owner/login");
  const pin = page.getByLabel("PIN");
  await expect(pin).toHaveAttribute("type", "password");
  await expect(pin).toHaveAttribute("inputmode", "numeric");
  await expect(pin).toHaveAttribute("autocomplete", "current-password");
  await pin.fill("654321");
  await page.getByRole("button", { name: "Open my list" }).click();
  await expect(page.getByText("Incorrect details or too many attempts. Try again later.")).toBeVisible();
});

test("the admin adds a member with a picture and a PIN, makes a list, copies its link, and the member signs in; a member with no PIN says so", async ({ page, context, browser }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await adminSignIn(page);
  const add = page.getByRole("region", { name: "Add a member" });
  await add.getByLabel("Display name").fill("Mia");
  await add.getByRole("radio", { name: "Reindeer picture" }).click();
  await expect(add.getByRole("radio", { name: "Reindeer picture" })).toBeChecked();
  await add.getByLabel("Owner PIN").fill("246810");
  await add.getByRole("button", { name: "Add member" }).click();
  const mia = page.getByRole("article", { name: "Mia" });
  await expect(mia.getByText("Active")).toBeVisible();
  await expect(mia.locator('img[src*="reindeer"]')).toBeVisible();
  await expect(add.getByLabel("Display name")).toHaveValue(""); // the form is ready for the next one

  await add.getByLabel("Display name").fill("Jo");
  await add.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByRole("article", { name: "Jo" }).getByText("PIN not set")).toBeVisible();
  await expect(page.getByRole("button", { name: "Set PIN: Jo" })).toBeVisible();

  const create = page.getByRole("region", { name: "Create a list" });
  await create.getByLabel("Member").click();
  await page.getByRole("option", { name: "Mia" }).click();
  await create.getByRole("button", { name: "Create list" }).click();
  const path = (await mia.getByText(/^\/l\/[0-9A-Za-z]{10}$/).innerText()).trim();
  await mia.getByRole("button", { name: "Copy link: Mia, Christmas 2026" }).click();
  await expect(mia.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL(path, page.url()).href);

  const owner = await (await browser.newContext()).newPage();
  await owner.goto("/owner/login");
  await owner.getByRole("radio", { name: "Mia" }).check();
  await owner.getByLabel("PIN").fill("246810");
  await owner.getByRole("button", { name: "Open my list" }).click();
  await expect(owner).toHaveURL(/\/owner$/);
  await owner.context().close();
});

test("Reset PIN, Rename with a new picture, Archive then Restore and Deactivate each work, and the family page follows", async ({ page, browser }) => {
  const alex = await createMemberWithPin(householdId, "Alex", "123456");
  const list = await createList(alex);
  await createMemberWithPin(householdId, "Sarah", "654321");
  await adminSignIn(page);
  const card = page.getByRole("article", { name: "Alex" });

  // Reset PIN: the sign-in links fill the owner form, and the old PIN stops working.
  await card.getByRole("button", { name: "Reset PIN: Alex" }).click();
  await page.getByLabel(/^New PIN/).fill("222222");
  await page.getByRole("button", { name: "Reset PIN", exact: true }).click();
  await expect(page.getByText("PIN saved")).toBeVisible();
  await expect(page.getByText("/owner/login?name=Alex&pin=222222", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  const guest = await (await browser.newContext()).newPage();
  await guest.goto("/owner/login?name=Alex&pin=222222");
  await expect(guest.getByLabel("PIN")).toHaveValue("222222");
  await guest.getByRole("button", { name: "Open my list" }).click();
  await expect(guest).toHaveURL(/\/owner$/);
  await guest.context().clearCookies();
  await guest.goto("/owner/login?name=Alex");
  await guest.getByLabel("PIN").fill("123456");
  await guest.getByRole("button", { name: "Open my list" }).click();
  await expect(guest.getByText("Incorrect details or too many attempts")).toBeVisible();

  // Rename with a picture; the family page shows both.
  await card.getByRole("button", { name: "Rename Alex" }).click();
  const rename = page.getByRole("dialog", { name: "Rename Alex" });
  await rename.getByLabel("Display name").fill("Alexander");
  await rename.getByRole("radio", { name: "Star picture" }).click();
  await rename.getByRole("button", { name: "Save" }).click();
  const renamed = page.getByRole("article", { name: "Alexander" });
  await expect(renamed.locator('img[src*="star"]')).toBeVisible();
  await guest.goto("/");
  await expect(guest.getByRole("heading", { name: "Alexander" })).toBeVisible();
  await expect(guest.getByRole("article").filter({ has: guest.getByRole("heading", { name: "Alexander" }) }).locator('img[src*="star"]')).toBeVisible();

  // Archive asks first, hides the list from the member card and the family page; Restore brings it back.
  const dialogs: string[] = [];
  page.on("dialog", (d) => { dialogs.push(d.message()); void d.accept(); });
  await renamed.getByRole("button", { name: /^Archive list: Alexander/ }).click();
  await expect(renamed.getByText("No open lists.")).toBeVisible();
  await guest.goto("/");
  await expect(guest.locator(`a[href="/l/${list.slug}"]`)).toHaveCount(0);
  await page.getByRole("link", { name: "Lists" }).first().click();
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Restore: Alexander/ }).click();
  await expect(page.getByText("Archived", { exact: true })).toBeHidden();
  await guest.goto("/");
  await expect(guest.locator(`a[href="/l/${list.slug}"]`).first()).toBeVisible();

  // Deactivate asks first, ends the owner's access and removes them from the family page and the sign-in picker.
  await page.getByRole("link", { name: "Members" }).first().click();
  await page.getByRole("button", { name: "Deactivate Alexander" }).click();
  await expect(page.getByRole("article", { name: "Alexander" }).getByText("Inactive")).toBeVisible();
  await expect(page.getByRole("button", { name: "Deactivate Alexander" })).toHaveCount(0);
  await guest.goto("/");
  await expect(guest.getByRole("heading", { name: "Alexander" })).toHaveCount(0);
  await guest.goto("/owner/login");
  await expect(guest.getByRole("radio", { name: "Alexander" })).toHaveCount(0);
  expect(dialogs).toHaveLength(2); // Archive, then Deactivate; Restore needs no confirmation
  expect(dialogs[0]).toContain("Archive this list?");
  expect(dialogs.at(-1)).toContain("Deactivate this member?");
});
