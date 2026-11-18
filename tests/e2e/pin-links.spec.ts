import { expect, test, type Page } from "@playwright/test";
import { ADMIN_SECRET, createMemberWithPin, resetAndSeed } from "./helpers";

test.beforeEach(async () => {
  const household = await resetAndSeed();
  await createMemberWithPin(household, "Alex", "123456");
  await createMemberWithPin(household, "Sarah", "654321");
});

async function adminSignIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Admin secret").fill(ADMIN_SECRET);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Family admin" })).toBeVisible();
}

test("a sign-in link fills in the name and PIN, then leaves the address bar clean", async ({ page }) => {
  await page.goto("/owner/login?name=sarah&pin=654321");
  await expect(page.getByRole("radio", { name: "Sarah" })).toBeChecked();
  await expect(page.getByLabel("PIN")).toHaveValue("654321");
  await expect(page).toHaveURL(/\/owner\/login$/);
  await page.getByRole("button", { name: "Open my list" }).click();
  await expect(page).toHaveURL(/\/owner$/);
});

test("a name-only link, an unknown name and a junk PIN fall back to the normal form", async ({ page }) => {
  await page.goto("/owner/login?name=Sarah");
  await expect(page.getByRole("radio", { name: "Sarah" })).toBeChecked();
  await expect(page.getByLabel("PIN")).toHaveValue("");
  await page.goto("/owner/login?name=nobody&pin=abc");
  await expect(page.getByRole("radio", { name: "Alex" })).toBeChecked();
  await expect(page.getByLabel("PIN")).toHaveValue("");
});

test("the admin copies a link that carries the PIN just set, the owner changes it, and the admin can still reset it", async ({ page, browser }) => {
  await adminSignIn(page);
  await page.getByRole("button", { name: "Reset PIN: Alex" }).click();
  await expect(page.getByText("/owner/login?name=Alex", { exact: true })).toBeVisible();
  await expect(page.getByText("&pin=")).toHaveCount(0); // no PIN link until the admin sets one
  await page.getByLabel("New PIN").fill("222222");
  await page.getByRole("button", { name: "Reset PIN" }).click();
  await expect(page.getByText("PIN saved")).toBeVisible();
  await expect(page.getByText("/owner/login?name=Alex&pin=222222", { exact: true })).toBeVisible();

  const ctx = await browser.newContext();
  const owner = await ctx.newPage();
  await owner.goto("/owner/login?name=Alex&pin=222222");
  await owner.getByRole("button", { name: "Open my list" }).click();
  await expect(owner).toHaveURL(/\/owner$/);

  await owner.goto("/owner/pin");
  const form = owner.getByRole("form", { name: "Change my PIN" });
  await form.getByLabel("Current PIN").fill("999999");
  await form.getByLabel(/^New PIN\s*\*?$/).fill("333333");
  await form.getByLabel("New PIN again").fill("333333");
  await form.getByRole("button", { name: "Change PIN" }).click();
  await expect(form.getByText("Your current PIN isn't right.")).toBeVisible();

  await form.getByLabel("Current PIN").fill("222222");
  await form.getByLabel("New PIN again").fill("444444");
  await form.getByRole("button", { name: "Change PIN" }).click();
  await expect(form.getByText("The new PINs don't match.")).toBeVisible();

  await form.getByLabel("New PIN again").fill("333333");
  await form.getByRole("button", { name: "Change PIN" }).click();
  await expect(form.getByText("PIN changed")).toBeVisible();
  await owner.reload();
  await expect(owner).toHaveURL(/\/owner\/pin$/); // still signed in

  // The admin resets it again later, and the owner's own PIN no longer works.
  await page.getByLabel("New PIN").fill("555555");
  await page.getByRole("button", { name: "Reset PIN" }).click();
  await expect(page.getByText("PIN saved")).toBeVisible();
  await owner.reload();
  await expect(owner).toHaveURL(/\/owner\/login/); // the reset ended the owner's session
  await owner.getByLabel("PIN").fill("333333");
  await owner.getByRole("button", { name: "Open my list" }).click();
  await expect(owner.getByText("Incorrect details or too many attempts")).toBeVisible();
  await owner.getByLabel("PIN").fill("555555");
  await owner.getByRole("button", { name: "Open my list" }).click();
  await expect(owner).toHaveURL(/\/owner$/);
  await ctx.close();
});

test("changing the PIN ends the owner's other sessions, keeps this one, and only the new PIN works", async ({ browser }) => {
  const signIn = async (pin: string) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/owner/login");
    await page.getByLabel("PIN").fill(pin);
    await page.getByRole("button", { name: "Open my list" }).click();
    return { ctx, page };
  };
  const phone = await signIn("123456");
  await expect(phone.page).toHaveURL(/\/owner$/);
  const laptop = await signIn("123456");
  await expect(laptop.page).toHaveURL(/\/owner$/);

  await laptop.page.goto("/owner/pin");
  const form = laptop.page.getByRole("form", { name: "Change my PIN" });
  await form.getByLabel("Current PIN").fill("123456");
  await form.getByLabel(/^New PIN\s*\*?$/).fill("987654");
  await form.getByLabel("New PIN again").fill("987654");
  await form.getByRole("button", { name: "Change PIN" }).click();
  await expect(form.getByText("PIN changed")).toBeVisible();

  await laptop.page.goto("/owner"); // this device stays signed in
  await expect(laptop.page).toHaveURL(/\/owner$/);
  await phone.page.goto("/owner"); // the other one is signed out
  await expect(phone.page).toHaveURL(/\/owner\/login/);

  const old = await signIn("123456");
  await expect(old.page.getByText("Incorrect details or too many attempts")).toBeVisible();
  const fresh = await signIn("987654");
  await expect(fresh.page).toHaveURL(/\/owner$/);
  for (const c of [phone, laptop, old, fresh]) await c.ctx.close();
});
