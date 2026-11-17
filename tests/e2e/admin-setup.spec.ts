import { expect, test } from "@playwright/test";
import { ADMIN_SECRET, createMemberWithPin, resetAndSeed } from "./helpers";

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
  await page.getByLabel("New member name").fill("Alex");
  await page.getByRole("button", { name: "Add member" }).click();
  await page.getByRole("link", { name: "Alex" }).click();

  await page.getByLabel("Set PIN").fill("123456");
  await page.getByRole("button", { name: "Save PIN" }).click();
  await expect(page.getByText("PIN saved")).toBeVisible();

  await page.getByLabel("List title").fill("Christmas 2026");
  await page.getByRole("button", { name: "Create list" }).click();
  await expect(page.getByText(/^\/l\/[0-9A-Za-z]{10}$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy link", exact: true })).toBeVisible();
});

test("archived lists are labelled and can be restored", async ({ page }) => {
  await adminSignIn(page);
  await page.getByLabel("New member name").fill("Sarah");
  await page.getByRole("button", { name: "Add member" }).click();
  await page.getByRole("link", { name: "Sarah" }).click();
  await page.getByRole("button", { name: "Create list" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Restore" }).click();
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
