import { expect, test, type Page } from "@playwright/test";
import { ADMIN_SECRET, createItem, createList, createMemberWithPin, guestPage, openAccountMenu, resetAndSeed } from "./helpers";

let slug: string;
test.beforeEach(async () => {
  const household = await resetAndSeed();
  const alex = await createMemberWithPin(household, "Alex", "123456");
  await createMemberWithPin(household, "Sarah", "654321");
  const list = await createList(alex);
  slug = list.slug;
  await createItem(list.id, "Headphones", 12999);
});

const nameField = (page: Page) => page.getByLabel("Your name");
const letsGo = (page: Page) => page.getByRole("button", { name: "Let's go" });

/** Ann reserves Headphones and makes a recovery link; returns the link text. */
async function annWithLink(browser: Parameters<typeof guestPage>[0]) {
  const ann = await guestPage(browser, slug, "Ann");
  await ann.page.getByRole("button", { name: /^Reserve: Headphones/ }).click();
  await expect(ann.page.getByText("Reserved by you")).toBeVisible();
  await openAccountMenu(ann.page, "Ann");
  await ann.page.getByRole("menuitem", { name: "Save access (recovery link)" }).click();
  await ann.page.getByRole("button", { name: "Make a link" }).click();
  const link = await ann.page.getByLabel("Your private link").inputValue();
  return { ...ann, link };
}

test("a new visitor goes from a shared list to the welcome screen, picks a name, comes back and can reserve", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/l/${slug}`);
  await expect(page.getByText("Tell us your name to reserve or mark interest.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Reserve|Interested/ })).toHaveCount(0);

  await page.getByRole("link", { name: "Pick a name and start shopping" }).click();
  await expect(page.getByRole("heading", { name: "Welcome! What should we call you?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "I'm shopping" })).toHaveAttribute("href", `/welcome?next=%2Fl%2F${slug}`); // the way back is kept
  await nameField(page).fill("Ann");
  await letsGo(page).click();

  await expect(page).toHaveURL(new RegExp(`/l/${slug}$`));
  await page.getByRole("button", { name: /^Reserve: Headphones/ }).click();
  await expect(page.getByText("Reserved by you")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Ann", exact: true })).toBeVisible();
  await expect(page.getByText("Tell us your name to reserve or mark interest.")).toHaveCount(0);
  await context.close();
});

test("the top bar's Pick your name chip brings the visitor back to the page they were on", async ({ page }) => {
  await page.goto("/planner");
  await page.getByRole("link", { name: "Pick your name" }).click();
  await expect(page).toHaveURL(/\/welcome\?next=%2Fplanner$/);
  await nameField(page).fill("Bea");
  await letsGo(page).click();
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.getByRole("button", { name: "Bea", exact: true })).toBeVisible();
});

test("a made-up return address lands on the family page, a blank name is refused, and a named visitor skips the form", async ({ browser }) => {
  for (const next of ["https://evil.example/steal", "//evil.example", "/owner", "/l/short"]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`/welcome?next=${encodeURIComponent(next)}`);
    await nameField(page).fill("Cal");
    await letsGo(page).click();
    await expect(page, next).toHaveURL(/localhost:\d+\/$/);
    await context.close();
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/welcome");
  await nameField(page).fill("   ");
  await letsGo(page).click();
  await expect(page.getByText("Enter a name")).toBeVisible();
  await expect(page).toHaveURL(/\/welcome$/);

  await nameField(page).fill("Dee");
  await letsGo(page).click();
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await page.goto(`/welcome?next=${encodeURIComponent(`/l/${slug}`)}`);
  await expect(page).toHaveURL(new RegExp(`/l/${slug}$`)); // already named: no form
  await context.close();
});

test("pasting a recovery link brings a guest back on a fresh browser, and the token never shows up anywhere", async ({ browser }) => {
  const ann = await annWithLink(browser);
  const token = ann.link.split("#t=")[1];

  const context = await browser.newContext();
  const page = await context.newPage();
  const urls: string[] = [];
  const logs: string[] = [];
  page.on("request", (r) => urls.push(r.url()));
  page.on("console", (m) => logs.push(m.text()));
  await page.goto("/welcome");

  await page.getByRole("button", { name: "Use recovery link" }).click();
  const field = page.getByLabel("Your recovery link");
  await field.fill("this is not a link");
  await page.getByRole("button", { name: "Get my planner back" }).click();
  await expect(page.getByText("That doesn't look like a recovery link.")).toBeVisible();
  await expect(field).toHaveValue("");

  await field.fill("x".repeat(43)); // looks like a token but is not one
  await page.getByRole("button", { name: "Get my planner back" }).click();
  await expect(page.getByText("This link doesn't work. It may have been replaced or turned off.")).toBeVisible();

  await field.fill(` ${ann.link}\n`);
  await page.getByRole("button", { name: "Get my planner back" }).click();
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.getByRole("button", { name: "Ann", exact: true })).toBeVisible();
  await page.goto(`/l/${slug}`);
  await expect(page.getByText("Reserved by you")).toBeVisible(); // the same guest, with the same reservation

  expect(urls.filter((u) => u.includes(token))).toEqual([]);
  expect(logs.join("\n")).not.toContain(token);
  expect(await page.content()).not.toContain(token);
  await context.close();

  // The bare token is accepted too.
  const second = await browser.newContext();
  const p2 = await second.newPage();
  await p2.goto("/welcome");
  await p2.getByRole("button", { name: "Use recovery link" }).click();
  await p2.getByLabel("Your recovery link").fill(token);
  await p2.getByRole("button", { name: "Get my planner back" }).click();
  await expect(p2).toHaveURL(/\/planner$/);
  await second.close();
  await ann.context.close();
});

test("a turned-off recovery link fails on the welcome screen with the same message as any other bad link", async ({ browser }) => {
  const ann = await annWithLink(browser);
  await ann.page.getByRole("button", { name: "Turn off link" }).click();

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/welcome");
  await page.getByRole("button", { name: "Use recovery link" }).click();
  await page.getByLabel("Your recovery link").fill(ann.link);
  await page.getByRole("button", { name: "Get my planner back" }).click();
  await expect(page.getByText("This link doesn't work. It may have been replaced or turned off.")).toBeVisible();
  await expect(page).toHaveURL(/\/welcome$/);
  await context.close();
  await ann.context.close();
});

test("an owner taps their name, types the PIN and opens their list; a wrong PIN gets the generic message", async ({ page }) => {
  await page.goto("/owner/login");
  await expect(page.getByText("6 or more digits. Too many wrong tries pauses sign-in for a few minutes.")).toBeVisible();
  await expect(page.getByText("Lost your PIN? Ask the family admin.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Alex" })).toBeChecked(); // the first name is selected to start

  await page.getByRole("radio", { name: "Sarah" }).click(); // the radio covers the whole sticker button, so this is a tap on it
  await expect(page.getByRole("radio", { name: "Sarah" })).toBeChecked();
  await page.getByLabel("PIN").fill("111111");
  await page.getByRole("button", { name: "Open my list" }).click();
  await expect(page.getByText("Incorrect details or too many attempts. Try again later.")).toBeVisible();
  await expect(page).toHaveURL(/\/owner\/login$/);

  await page.getByLabel("PIN").fill("654321");
  await page.getByRole("button", { name: "Open my list" }).click();
  await expect(page).toHaveURL(/\/owner$/);
  await expect(page.getByRole("button", { name: "Sarah", exact: true })).toBeVisible(); // signed in as Sarah, not Alex
});

test("owner names can be chosen with the arrow keys, and the two doors link to each other", async ({ page }) => {
  await page.goto("/owner/login");
  await page.getByRole("radio", { name: "Alex" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Sarah" })).toBeChecked();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("radio", { name: "Alex" })).toBeChecked();

  await expect(page.getByRole("link", { name: "I own a list" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "I'm shopping" }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("link", { name: "I'm shopping" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "I own a list" }).click();
  await expect(page).toHaveURL(/\/owner\/login$/);
});

test("admin sign-in uses the same frame: a wrong secret gets the generic message, the right one opens the admin page", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "I own a list" })).toHaveCount(0); // no switch on the admin door
  await page.getByLabel("Admin secret").fill("not-the-secret-at-all");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Incorrect details or too many attempts. Try again later.")).toBeVisible();

  await page.getByLabel("Admin secret").fill(ADMIN_SECRET);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Family admin" })).toBeVisible();
});
