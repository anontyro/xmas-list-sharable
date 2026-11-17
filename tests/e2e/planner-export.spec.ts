import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { createItem, createList, createMemberWithPin, guestPage, resetAndSeed } from "./helpers";

let alexSlug: string;
let sarahSlug: string;
test.beforeEach(async () => {
  const household = await resetAndSeed();
  const alex = await createMemberWithPin(household, "Alex", "123456");
  const sarah = await createMemberWithPin(household, "Sarah", "654321");
  const al = await createList(alex);
  const sl = await createList(sarah, "Sarah's Christmas");
  alexSlug = al.slug;
  sarahSlug = sl.slug;
  await createItem(al.id, "Headphones", 12999);
  await createItem(al.id, "Novel", 1499);
  await createItem(al.id, "=SUM(1+1)", 500);
  await createItem(sl.id, "Cookbook", 2499);
});

const press = (page: Page, name: RegExp) => page.getByRole("button", { name }).click();
const tick = (page: Page, title: string) => page.getByLabel(`Include in export: ${title}`).check();

async function openNav(page: Page) {
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible()) await menu.click();
}

/** Ann holds Headphones and a formula-looking gift, likes Novel, and has bought the Cookbook with a note. */
async function plannedGuest(browser: Parameters<typeof guestPage>[0]) {
  const g = await guestPage(browser, alexSlug, "Ann", { permissions: ["clipboard-read", "clipboard-write"] });
  await press(g.page, /^Reserve: Headphones/);
  await press(g.page, /^Reserve: =SUM/);
  await press(g.page, /^Interested: Novel/);
  await g.page.goto(`/l/${sarahSlug}`);
  await press(g.page, /^Reserve: Cookbook/);
  await press(g.page, /^Mark purchased: Cookbook/);
  await openNav(g.page);
  await g.page.getByRole("link", { name: "My Planner", exact: true }).or(g.page.getByRole("menuitem", { name: "My Planner" })).click();
  await g.page.getByRole("button", { name: "Set budgets" }).click();
  await g.page.getByLabel("Total budget (£)").fill("250");
  await g.page.getByRole("button", { name: "Save budgets" }).click();
  const card = g.page.locator(".MuiPaper-root").filter({ has: g.page.getByRole("heading", { name: "Cookbook" }) }).first();
  await card.getByRole("button", { name: /Notes and price paid/ }).click();
  await card.getByLabel("Private note", { exact: true }).fill("gift wrap please");
  await card.getByLabel("Price you paid (£)").fill("19.50");
  await card.getByRole("button", { name: "Save", exact: true }).click();
  await expect(card.getByText("Saved")).toBeVisible();
  return g;
}

test("copies a selected subset as a readable list, with notes only when asked", async ({ browser }) => {
  const { page, context } = await plannedGuest(browser);
  await tick(page, "Headphones");
  await tick(page, "Cookbook");
  await expect(page.getByText("2 selected")).toBeVisible();
  await press(page, /^Copy list$/);
  await expect(page.getByText("Copied", { exact: true })).toBeVisible();

  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain("Christmas 2026 — My Gift Planner");
  expect(text).toContain("Alex\n- Headphones — Reserved — £129.99\n");
  expect(text).toContain("Sarah\n- Cookbook — Purchased — £24.99 (paid £19.50)\n");
  expect(text).toContain("Estimated committed: £149.49");
  expect(text).toContain("Remaining committed budget: £100.51");
  expect(text).not.toContain("Novel");
  expect(text).not.toContain("gift wrap");

  await page.getByLabel("Include my private notes").check();
  await press(page, /^Copy list$/);
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("Note: gift wrap please");
  await context.close();
});

test("downloads Markdown and a CSV that spreadsheets cannot run as formulas", async ({ browser }) => {
  const { page, context } = await plannedGuest(browser);
  await press(page, /^Select all$/);
  await expect(page.getByText("4 selected")).toBeVisible();

  const [csvDownload] = await Promise.all([page.waitForEvent("download"), press(page, /^Download CSV$/)]);
  expect(csvDownload.suggestedFilename()).toBe("gift-planner-christmas-2026.csv");
  const csv = (await readFile((await csvDownload.path())!, "utf8")).replace(/^﻿/, "");
  const lines = csv.split("\r\n");
  expect(lines[0]).toBe("Recipient,Occasion,Item,Status,Listed price,Actual price,URL");
  expect(lines.filter(Boolean)).toHaveLength(5); // header + 4 gifts
  expect(csv).toContain("'=SUM(1+1)"); // neutralised
  expect(csv).toContain("Sarah,Christmas 2026,Cookbook,Purchased,24.99,19.50,");
  expect(csv).not.toContain("gift wrap");

  const [mdDownload] = await Promise.all([page.waitForEvent("download"), press(page, /^Download Markdown$/)]);
  expect(mdDownload.suggestedFilename()).toBe("gift-planner-christmas-2026.md");
  const md = await readFile((await mdDownload.path())!, "utf8");
  expect(md).toContain("# Christmas 2026 — My Gift Planner");
  expect(md).toContain("## Alex");
  expect(md).toContain("## Totals");
  await context.close();
});

test("a gift that leaves the planner no longer counts as selected", async ({ browser }) => {
  const { page, context } = await plannedGuest(browser);
  await tick(page, "Headphones");
  await expect(page.getByText("1 selected")).toBeVisible();
  await press(page, /^Release: Headphones/);
  await expect(page.getByText("0 selected")).toBeVisible();
  await press(page, /^Copy list$/);
  await expect(page.getByText("Choose at least one gift")).toBeVisible();
  await context.close();
});

test("asks for a selection first and Clear empties it", async ({ browser }) => {
  const { page, context } = await plannedGuest(browser);
  let downloaded = false;
  page.on("download", () => (downloaded = true));
  await press(page, /^Copy list$/);
  await expect(page.getByText("Choose at least one gift")).toBeVisible();
  await press(page, /^Download CSV$/);
  await expect(page.getByText("Choose at least one gift")).toBeVisible();
  expect(downloaded).toBe(false);

  await press(page, /^Select all$/);
  await press(page, /^Clear$/);
  await expect(page.getByText("0 selected")).toBeVisible();
  await context.close();
});
