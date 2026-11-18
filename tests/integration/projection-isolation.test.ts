import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieJar, resetRequest } from "./request-context";
import { db } from "./db-harness";
import { guest, guestPlanner, household, itemClaim, itemInterest, member, plannerItem, recoveryToken, wishlist, wishlistItem } from "@/db/schema";
import { COOKIE_NAMES } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";
import { getHousehold, getMemberForAdmin, listAllListsForAdmin, listListsForAdmin, listLoginMembers, listMembersForAdmin } from "@/features/family/queries";
import { getEarlierYears, getFamilyDashboard } from "@/features/wishlists/public-queries";
import { getOwnList, listOwnLists } from "@/features/wishlists/owner-queries";

vi.mock("next/headers", async () => (await import("./request-context")).nextHeadersMock);

beforeEach(resetRequest);

const FORBIDDEN_KEY = /claim|interest|guest|planner|recovery|token|hash|reserved|purchased/i;
const SECRETS = ["Zelda-Claimant", "secret-note-123", "raw-recovery-token", "7777"];

function keys(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => keys(v, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) {
      out.push(k);
      keys(v, out);
    }
  return out;
}

describe("owner and admin responses never carry private data", () => {
  it("has no claim-like keys and none of the seeded secrets", async () => {
    const [h] = await db.insert(household).values({ name: "F" }).returning();
    const [alex] = await db.insert(member).values({ householdId: h.id, displayName: "Alex", pinHash: "$argon2id$x" }).returning();
    const [l] = await db.insert(wishlist).values({ memberId: alex.id, title: "x", occasion: "Christmas", year: 2026, slug: "listslug001" }).returning();
    await db.insert(wishlist).values({ memberId: alex.id, title: "old", occasion: "Christmas", year: 2025, slug: "oldslug0001", archivedAt: new Date() });
    const [item] = await db.insert(wishlistItem).values({ wishlistId: l.id, title: "Book" }).returning();
    const [g] = await db.insert(guest).values({ householdId: h.id, displayName: "Zelda-Claimant" }).returning();
    await db.insert(itemInterest).values({ guestId: g.id, itemId: item.id });
    await db.insert(itemClaim).values({ itemId: item.id, guestId: g.id, status: "purchased" });
    const [p] = await db.insert(guestPlanner).values({ guestId: g.id, occasion: "Christmas", year: 2026, budgetMinor: 7777 }).returning();
    await db.insert(plannerItem).values({ plannerId: p.id, itemId: item.id, privateNote: "secret-note-123", actualPriceMinor: 7777 });
    await db.insert(recoveryToken).values({ guestId: g.id, tokenHash: "raw-recovery-token" });

    cookieJar.set(COOKIE_NAMES.admin, (await createSession("admin", h.id)).token);
    cookieJar.set(COOKIE_NAMES.owner, (await createSession("owner", alex.id)).token);

    const outputs = {
      household: await getHousehold(),
      loginMembers: await listLoginMembers(),
      adminMembers: await listMembersForAdmin(),
      adminMember: await getMemberForAdmin(alex.id),
      adminLists: await listListsForAdmin(alex.id),
      adminAllLists: await listAllListsForAdmin(),
      dashboard: await getFamilyDashboard(),
      earlierYears: await getEarlierYears(),
      ownLists: await listOwnLists(),
      ownList: await getOwnList(l.id),
    };
    expect(outputs.ownList!.items).toHaveLength(1); // the data really is there to leak
    expect(outputs.dashboard.members[0].lists[0].giftCount).toBe(1); // and the new count fields are in what is checked
    expect(outputs.earlierYears).toHaveLength(1);
    const bad = keys(outputs).filter((k) => FORBIDDEN_KEY.test(k));
    expect(bad).toEqual([]);
    const json = JSON.stringify(outputs);
    for (const s of SECRETS) expect(json).not.toContain(s);
    expect(json).not.toContain("argon2");
  });
});
