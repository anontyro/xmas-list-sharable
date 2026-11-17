import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { guest, guestPlanner, itemClaim, itemInterest, member, plannerItem, recipientBudget, wishlist, wishlistItem } from "@/db/schema";
import { requireGuest } from "@/lib/auth/require";
import { computePlan, type PlanEntry, type PlanTotals } from "./accounting";
import type { Period } from "./schemas";

export type PlannerEntry = PlanEntry & {
  itemId: string;
  title: string;
  productUrl: string | null;
  note: string;
  /** The owner deleted this gift after the guest claimed it; it still counts. */
  removed: boolean;
};

export type PlannerGroup = {
  memberId: string;
  memberName: string;
  budgetMinor: number | null;
  entries: PlannerEntry[];
  totals: PlanTotals;
};

export type PlannerView = {
  guestName: string;
  periods: Period[];
  selected: Period;
  budgetMinor: number | null;
  groups: PlannerGroup[];
  totals: PlanTotals;
};

const itemColumns = {
  itemId: wishlistItem.id,
  title: wishlistItem.title,
  productUrl: wishlistItem.productUrl,
  listedPriceMinor: wishlistItem.priceMinor,
  deletedAt: wishlistItem.deletedAt,
  memberId: member.id,
  memberName: member.displayName,
  occasion: wishlist.occasion,
  year: wishlist.year,
};

/** The signed-in guest's own planner. Every row is filtered by the session guest; nothing takes a planner id from the client. */
export async function getPlanner(requested?: Partial<Period>): Promise<PlannerView> {
  const { guestId } = await requireGuest();
  const db = getDb();

  const claims = await db
    .select({ ...itemColumns, status: itemClaim.status })
    .from(itemClaim)
    .innerJoin(wishlistItem, eq(wishlistItem.id, itemClaim.itemId))
    .innerJoin(wishlist, eq(wishlist.id, wishlistItem.wishlistId))
    .innerJoin(member, eq(member.id, wishlist.memberId))
    .where(and(eq(itemClaim.guestId, guestId), isNull(itemClaim.releasedAt)));
  const interests = await db
    .select(itemColumns)
    .from(itemInterest)
    .innerJoin(wishlistItem, eq(wishlistItem.id, itemInterest.itemId))
    .innerJoin(wishlist, eq(wishlist.id, wishlistItem.wishlistId))
    .innerJoin(member, eq(member.id, wishlist.memberId))
    .where(and(eq(itemInterest.guestId, guestId), isNull(wishlistItem.deletedAt)));

  // An active claim wins over interest, so each gift appears once.
  const rows = new Map<string, (typeof interests)[number] & { state: PlanEntry["state"] }>();
  for (const r of interests) rows.set(r.itemId, { ...r, state: "interested" });
  for (const { status, ...r } of claims) rows.set(r.itemId, { ...r, state: status as "reserved" | "purchased" });

  const periodKey = (p: Period) => `${p.occasion}|${p.year}`;
  const periods = [...new Map([...rows.values()].map((r) => [periodKey(r), { occasion: r.occasion, year: r.year }])).values()].sort(
    (a, b) => b.year - a.year || a.occasion.localeCompare(b.occasion),
  );
  const asked = requested?.occasion && requested.year ? periods.find((p) => p.occasion === requested.occasion && p.year === requested.year) : undefined;
  const selected = asked ?? periods[0] ?? { occasion: "Christmas", year: new Date().getFullYear() };

  const [planner] = await db
    .select({ id: guestPlanner.id, budgetMinor: guestPlanner.budgetMinor })
    .from(guestPlanner)
    .where(and(eq(guestPlanner.guestId, guestId), eq(guestPlanner.occasion, selected.occasion), eq(guestPlanner.year, selected.year)));
  const recipientBudgets = planner ? await db.select().from(recipientBudget).where(eq(recipientBudget.plannerId, planner.id)) : [];
  const details = planner ? await db.select().from(plannerItem).where(eq(plannerItem.plannerId, planner.id)) : [];
  const detailByItem = new Map(details.map((d) => [d.itemId, d]));
  const budgetByMember = new Map(recipientBudgets.map((b) => [b.memberId, b.budgetMinor]));

  const byMember = new Map<string, { memberName: string; entries: PlannerEntry[] }>();
  for (const r of [...rows.values()].filter((r) => periodKey(r) === periodKey(selected)).sort((a, b) => a.title.localeCompare(b.title))) {
    const d = detailByItem.get(r.itemId);
    const entry: PlannerEntry = {
      itemId: r.itemId,
      title: r.title,
      productUrl: r.productUrl,
      state: r.state,
      listedPriceMinor: r.listedPriceMinor,
      actualPriceMinor: d?.actualPriceMinor ?? null,
      included: d?.included ?? true,
      note: d?.privateNote ?? "",
      removed: r.deletedAt !== null,
    };
    const g = byMember.get(r.memberId) ?? { memberName: r.memberName, entries: [] };
    g.entries.push(entry);
    byMember.set(r.memberId, g);
  }
  const ordered: PlannerGroup[] = [...byMember.entries()]
    .map(([memberId, g]) => {
      const budgetMinor = budgetByMember.get(memberId) ?? null;
      return { memberId, memberName: g.memberName, budgetMinor, entries: g.entries, totals: computePlan(g.entries, budgetMinor) };
    })
    .sort((a, b) => a.memberName.localeCompare(b.memberName));

  const [me] = await db.select({ name: guest.displayName }).from(guest).where(eq(guest.id, guestId));
  return {
    guestName: me?.name ?? "",
    periods,
    selected,
    budgetMinor: planner?.budgetMinor ?? null,
    groups: ordered,
    totals: computePlan(ordered.flatMap((g) => g.entries), planner?.budgetMinor ?? null),
  };
}
