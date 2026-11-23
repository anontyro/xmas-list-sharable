import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { guest, household, member, wishlist } from "@/db/schema";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
// Claim state is read only through this module: spy on it to prove an own-list request never reaches it.
const getItemStates = vi.hoisted(() => vi.fn(async () => new Map()));
vi.mock("@/features/reservations/guest-claim-view", () => ({ getItemStates }));

beforeEach(() => {
  resetRequest();
  getItemStates.mockClear();
});

async function world() {
  const [h] = await db.insert(household).values({ name: "F" }).returning();
  const [alex, sarah] = await db.insert(member).values([{ householdId: h.id, displayName: "Alex", approvedAt: new Date() }, { householdId: h.id, displayName: "Sarah", approvedAt: new Date() }]).returning();
  const [list] = await db.insert(wishlist).values({ publishedAt: new Date(), memberId: alex.id, title: "Xmas", occasion: "Christmas", year: 2026, slug: "alexslug001" }).returning();
  const [g] = await db.insert(guest).values({ householdId: h.id, displayName: "Alex", memberId: alex.id }).returning();
  return { alex, sarah, list, g };
}

const visit = async (slug: string) => {
  const { default: ListPage } = await import("@/app/(public)/l/[slug]/page");
  return ListPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) }).then(() => "RENDERED", (e: Error) => e.message);
};

describe("a member's own list at /l/{slug}", () => {
  it("redirects to the editor with a valid editor session, reading no claim state", async () => {
    const { alex, list, g } = await world();
    cookieJar.set(COOKIE_NAMES.guest, (await createSession("guest", g.id)).token);
    cookieJar.set(COOKIE_NAMES.owner, (await createSession("owner", alex.id)).token);
    expect(await visit("alexslug001")).toBe(`REDIRECT /owner/lists/${list.id}`);
    expect(getItemStates).not.toHaveBeenCalled();
  });

  it("redirects to sign-in when the editor session has lapsed, still reading no claim state", async () => {
    const { g } = await world();
    cookieJar.set(COOKIE_NAMES.guest, (await createSession("guest", g.id)).token);
    expect(await visit("alexslug001")).toBe("REDIRECT /owner/login");
    expect(getItemStates).not.toHaveBeenCalled();
  });

  it("is the normal family view for another member's guest, who does read claim state", async () => {
    const { sarah, h } = await world().then(async (w) => ({ ...w, h: w.alex.householdId }));
    const [sg] = await db.insert(guest).values({ householdId: h, displayName: "Sarah", memberId: sarah.id }).returning();
    cookieJar.set(COOKIE_NAMES.guest, (await createSession("guest", sg.id)).token);
    expect(await visit("alexslug001")).toBe("RENDERED");
    expect(getItemStates).toHaveBeenCalled();
  });
});
