import { expect, test, type Page } from "@playwright/test";
import { createItem, createList, createMemberWithPin, guestPage, openAccountMenu, resetAndSeed, setGiftDetails } from "./helpers";

let slug: string;
test.beforeEach(async () => {
  const household = await resetAndSeed();
  const alex = await createMemberWithPin(household, "Alex", "123456");
  const list = await createList(alex);
  slug = list.slug;
  await createItem(list.id, "Headphones", 12999);
});

/** Save access is an item in the name chip's menu, at every width, and opens its own page. */
async function openSaveAccess(page: Page) {
  await openAccountMenu(page, "Ann");
  await page.getByRole("menuitem", { name: "Save access (recovery link)" }).click();
  await expect(page).toHaveURL(/\/access$/);
  await expect(page.getByRole("heading", { name: "Save your access", level: 1 })).toBeVisible();
}

async function makeLink(page: Page) {
  await openSaveAccess(page);
  await page.getByRole("button", { name: /^Make a (new )?link$/ }).click();
  return page.getByLabel("Your private link").inputValue();
}

/** Ann reserves Headphones and writes a note on it. */
async function annWithPlan(browser: Parameters<typeof guestPage>[0]) {
  const ann = await guestPage(browser, slug, "Ann");
  await ann.page.getByRole("button", { name: /^Reserve: Headphones/ }).click();
  await expect(ann.page.getByText("Reserved by you")).toBeVisible();
  await ann.page.goto("/planner");
  await setGiftDetails(ann.page, "Headphones", { note: "wrap in blue" });
  return ann;
}

test("a link brings the same planner, reservation and note to a fresh browser, and the address bar is clean", async ({ browser }) => {
  const ann = await annWithPlan(browser);
  const link = await makeLink(ann.page);
  await expect(ann.page.getByText("Anyone with this link")).toBeVisible();

  const other = await browser.newContext();
  const page = await other.newPage();
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  const logs: string[] = [];
  page.on("console", (m) => logs.push(m.text()));
  await page.goto(link);
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.getByRole("heading", { name: "Headphones" })).toBeVisible();
  await expect(page.getByText("wrap in blue")).toBeVisible();
  const token = link.split("#t=")[1];
  expect(requests.filter((u) => u.includes(token))).toEqual([]); // fragments are never sent
  expect(logs.join("\n")).not.toContain(token);
  expect(await page.content()).not.toContain(token);
  await page.goto("/l/" + slug);
  await expect(page.getByText("Reserved by you")).toBeVisible();
  await other.close();
  await ann.context.close();
});

test("the address bar shows /recover with no fragment while the page loads", async ({ browser }) => {
  const ann = await annWithPlan(browser);
  const link = await makeLink(ann.page);
  const other = await browser.newContext();
  const page = await other.newPage();
  // Hold the exchange so the page is still on /recover when we look.
  await page.route("**/api/recovery/exchange", async (route) => {
    expect(new URL(page.url()).hash).toBe("");
    await route.continue();
  });
  await page.goto(link);
  await expect(page).toHaveURL(/\/planner$/);
  await other.close();
  await ann.context.close();
});

test("turning off or replacing a link makes the old one fail with the same message", async ({ browser }) => {
  const ann = await annWithPlan(browser);
  const first = await makeLink(ann.page);
  await ann.page.getByRole("button", { name: "Make a new link" }).click();
  await expect(ann.page.getByLabel("Your private link")).not.toHaveValue(first);
  const second = await ann.page.getByLabel("Your private link").inputValue();

  const fresh = await browser.newContext();
  const p1 = await fresh.newPage();
  await p1.goto(first);
  await expect(p1.getByText("This link doesn't work.")).toBeVisible();
  await expect(p1).toHaveURL(/\/recover$/);

  await ann.page.getByRole("button", { name: "Turn link off" }).click();
  const p2 = await fresh.newPage();
  await p2.goto(second);
  await expect(p2.getByText("This link doesn't work.")).toBeVisible();
  await p2.goto("/planner");
  await expect(p2.getByText("Pick a name on someone's list first")).toBeVisible(); // still not signed in
  await fresh.close();
  await ann.context.close();
});

test("another guest cannot reach Ann's plans without her link", async ({ browser }) => {
  const ann = await annWithPlan(browser);
  const bob = await guestPage(browser, slug, "Bob");
  await bob.page.goto("/planner");
  await expect(bob.page.getByRole("heading", { name: "Headphones" })).toHaveCount(0);
  await bob.context.close();
  await ann.context.close();
});

test("a visitor who has never picked a name has no Save access, and /access sends them to the welcome screen", async ({ page }) => {
  await page.goto(`/l/${slug}`);
  await expect(page.getByRole("menuitem", { name: /Save access/ })).toHaveCount(0);
  await page.goto("/access");
  await expect(page).toHaveURL(/\/welcome\?next=(%2F|\/)access$/);
});

test("the link is shown only right after it is made: a reload shows the status and no link", async ({ browser }) => {
  const ann = await annWithPlan(browser);
  await openSaveAccess(ann.page);
  await expect(ann.page.getByText("No link yet")).toBeVisible();
  await ann.page.getByRole("button", { name: "Make a link" }).click();
  const link = await ann.page.getByLabel("Your private link").inputValue();
  await expect(ann.page.getByText("Active · made today")).toBeVisible();
  await expect(ann.page.getByText("Copy it now")).toBeVisible();
  const token = link.split("#t=")[1];
  await ann.page.reload();
  await expect(ann.page.getByText("Active · made today")).toBeVisible();
  await expect(ann.page.getByRole("textbox", { name: "Your private link" })).toHaveCount(0); // no link field any more
  expect(await ann.page.content()).not.toContain(token);
  await expect(ann.page.getByText("can't show your link again")).toBeVisible();
  await ann.context.close();
});
