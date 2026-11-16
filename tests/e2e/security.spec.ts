import { expect, test, type Page } from "@playwright/test";
import { ADMIN_SECRET, createItem, createList, createMemberWithPin, ownerSignIn, PRIVATE, resetAndSeed, seedGuestActivity } from "./helpers";

let household: string;
let alex: string;
let list: { id: string; slug: string };
test.beforeEach(async () => {
  household = await resetAndSeed();
  alex = await createMemberWithPin(household, "Alex", "123456");
  list = await createList(alex);
  await seedGuestActivity(household, await createItem(list.id, "Headphones", 12999));
});

async function adminSignIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Admin secret").fill(ADMIN_SECRET);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Family admin" })).toBeVisible();
}

test("security headers are on pages, and recovery pages send no referrer", async ({ request }) => {
  for (const path of ["/", `/l/${list.slug}`, "/owner/login"]) {
    const h = (await request.get(path)).headers();
    expect(h["x-content-type-options"], path).toBe("nosniff");
    expect(h["x-frame-options"], path).toBe("DENY");
    expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
  }
  const recover = (await request.get("/recover")).headers();
  expect(recover["referrer-policy"]).toBe("no-referrer");
  expect(recover["x-frame-options"]).toBe("DENY");
  const exchange = await request.post("/api/recovery/exchange", { data: { token: "x".repeat(43) } });
  expect(exchange.headers()["referrer-policy"]).toBe("no-referrer");
  expect(exchange.headers()["x-content-type-options"]).toBe("nosniff");
});

test("owner and admin pages never contain guest activity, and no page or script holds a secret", async ({ page }) => {
  const pages: Record<string, string> = {};
  const grab = async (path: string) => (pages[path] = await (await page.request.get(path)).text());

  await ownerSignIn(page);
  for (const path of ["/owner", `/owner/lists/${list.id}`]) await grab(path);
  await page.context().clearCookies();
  await adminSignIn(page);
  for (const path of ["/admin", `/admin/members/${alex}`]) await grab(path);
  await page.context().clearCookies();
  for (const path of ["/", "/owner/login", "/admin/login", "/planner", "/recover"]) await grab(path);

  for (const [path, html] of Object.entries(pages)) {
    for (const secret of [PRIVATE.guest, PRIVATE.note, PRIVATE.price, "7777", PRIVATE.token]) expect(html, `${secret} in ${path}`).not.toContain(secret);
    if (path.startsWith("/owner") || path.startsWith("/admin")) expect(html, path).not.toMatch(/Reserved by|Purchased by|Interested/);
  }
  // The pages the owner and admin see are real pages, not empty ones.
  expect(pages[`/owner/lists/${list.id}`]).toContain("Headphones");
  expect(pages["/admin"]).toContain("Alex");

  // Every script the app serves, and every page, is free of server secrets.
  const scripts = new Set<string>();
  for (const html of Object.values(pages)) for (const m of html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)) scripts.add(m[1]);
  expect(scripts.size).toBeGreaterThan(0);
  const secrets = [ADMIN_SECRET, process.env.SESSION_SECRET, process.env.DATABASE_URL].filter((s): s is string => Boolean(s));
  const bodies = [...Object.values(pages), ...(await Promise.all([...scripts].map(async (u) => (await page.request.get(u)).text())))];
  for (const body of bodies) for (const s of secrets) expect(body).not.toContain(s);
});
