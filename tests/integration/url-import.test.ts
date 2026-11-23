import http, { type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { authLimit, household, member, wishlist, wishlistItem } from "@/db/schema";
import { previewUrlImport } from "@/features/imports/url-actions";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const page = readFileSync("tests/fixtures/product-jsonld.html", "utf8");
let server: Server;
let base: string;
const env = process.env as Record<string, string | undefined>;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    if (req.url === "/p/headphones") return void res.writeHead(200, { "Content-Type": "text/html" }).end(page);
    if (req.url === "/blocked") return void res.writeHead(403, { "Content-Type": "text/html" }).end("bot check");
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));
beforeEach(() => {
  resetRequest();
  env.FG_ALLOW_TEST_HOSTS = "1";
});
afterEach(() => {
  delete env.FG_ALLOW_TEST_HOSTS;
});

async function world() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [a, b] = await db.insert(member).values([{ householdId: h.id, displayName: "Alex" }, { householdId: h.id, displayName: "Sarah" }]).returning();
  const [la] = await db.insert(wishlist).values({ publishedAt: new Date(), memberId: a.id, title: "A", occasion: "Christmas", year: 2026, slug: "alexslug001" }).returning();
  const signIn = async (m: { id: string }) => cookieJar.set(COOKIE_NAMES.owner, (await createSession("owner", m.id)).token);
  return { a, b, la, signIn };
}

describe("previewUrlImport", () => {
  it("returns an editable draft and writes nothing", async () => {
    const { a, la, signIn } = await world();
    await signIn(a);
    const r = await previewUrlImport(la.id, `${base}/p/headphones`);
    expect(r).toMatchObject({
      ok: true,
      data: { duplicateOf: null, draft: { title: "Noise-Cancelling Headphones", priceMinor: 12999, currency: "GBP", warnings: [] } },
    });
    expect(await db.select().from(wishlistItem)).toHaveLength(0);
  });

  it("reports a duplicate of a link already on the list, tracking parameters aside, without blocking", async () => {
    const { a, la, signIn } = await world();
    await db.insert(wishlistItem).values({ wishlistId: la.id, title: "Already here", productUrl: `${base}/p/headphones?utm_source=mail` });
    await signIn(a);
    const r = await previewUrlImport(la.id, `${base}/p/headphones`);
    expect(r).toMatchObject({ ok: true, data: { duplicateOf: "Already here" } });
    expect(await db.select().from(wishlistItem)).toHaveLength(1);
  });

  it("ignores a deleted item when looking for duplicates", async () => {
    const { a, la, signIn } = await world();
    await db.insert(wishlistItem).values({ wishlistId: la.id, title: "Gone", productUrl: `${base}/p/headphones`, deletedAt: new Date() });
    await signIn(a);
    expect(await previewUrlImport(la.id, `${base}/p/headphones`)).toMatchObject({ ok: true, data: { duplicateOf: null } });
  });

  it("needs the list's own owner, and refuses archived lists", async () => {
    const { a, b, la, signIn } = await world();
    expect(await previewUrlImport(la.id, `${base}/p/headphones`)).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    await signIn(b);
    expect(await previewUrlImport(la.id, `${base}/p/headphones`)).toMatchObject({ error: { code: "UNAUTHORIZED" } });
    resetRequest();
    await signIn(a);
    await db.update(wishlist).set({ archivedAt: new Date() });
    expect(await previewUrlImport(la.id, `${base}/p/headphones`)).toMatchObject({ error: { code: "LIST_ARCHIVED" } });
    expect(await previewUrlImport("not-a-uuid", "x")).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  it("turns every failure into a friendly message that offers manual entry, and still writes nothing", async () => {
    const { a, la, signIn } = await world();
    await signIn(a);
    const cases: [string, string][] = [
      [`${base}/blocked`, "HTTP_ERROR"],
      [`${base}/nothing`, "HTTP_ERROR"],
      ["not a url", "INVALID_URL"],
      ["ftp://example.com/x", "INVALID_URL"],
      ["http://169.254.169.254/latest/meta-data/", "BLOCKED_ADDRESS"],
      ["", "INVALID_URL"],
    ];
    for (const [url, code] of cases) {
      const r = await previewUrlImport(la.id, url);
      expect(r, url).toMatchObject({ ok: false, error: { code } });
      expect(r.ok === false && r.error.message).toMatch(/You can still add it by hand\.$/);
    }
    expect(await db.select().from(wishlistItem)).toHaveLength(0);
  });

  it("allows 20 lookups per owner in a window and throttles the 21st", async () => {
    const { a, la, signIn } = await world();
    await signIn(a);
    for (let i = 0; i < 20; i++) expect((await previewUrlImport(la.id, `${base}/p/headphones`)).ok).toBe(true);
    const r = await previewUrlImport(la.id, `${base}/p/headphones`);
    expect(r).toMatchObject({ ok: false, error: { code: "RATE_LIMITED" } });
    expect((await db.select().from(authLimit))[0].subjectKey).toBe(`import:${a.id}`);
  });
});
