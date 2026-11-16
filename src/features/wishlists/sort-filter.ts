import { minorToPounds, parsePoundsToMinor } from "@/lib/money";
import { PRIORITIES, type Priority } from "./schemas";

// Guest-side view of a list. Pure functions: nothing here touches the database or the owner's stored order.

export const SORTS = ["priority", "price_asc", "price_desc", "newest"] as const;
export type SortKey = (typeof SORTS)[number];

export type Filters = {
  priorities: Priority[]; // empty = all
  minMinor: number | null;
  maxMinor: number | null;
  availableOnly: boolean;
};

export const NO_FILTERS: Filters = { priorities: [], minMinor: null, maxMinor: null, availableOnly: false };

type Sortable = { priority: Priority; sortOrder: number; priceMinor: number | null; createdAt: string; id: string };
type Filterable = Sortable & { state: { state: string } };

const rank = (p: Priority) => PRIORITIES.indexOf(p);
// Same tie-break as the server query (priority, sort_order, created_at), so a tied list looks identical to everyone.
const byOwnerOrder = (a: Sortable, b: Sortable) =>
  rank(a.priority) - rank(b.priority) || a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

/** Returns a new array; the input (the owner's order) is never changed. Items with no price go last in both price sorts. */
export function sortItems<T extends Sortable>(items: T[], sort: SortKey): T[] {
  const copy = [...items];
  const price = (dir: 1 | -1) => (a: T, b: T) => {
    if (a.priceMinor === null || b.priceMinor === null) return a.priceMinor === b.priceMinor ? byOwnerOrder(a, b) : a.priceMinor === null ? 1 : -1;
    return (a.priceMinor - b.priceMinor) * dir || byOwnerOrder(a, b);
  };
  switch (sort) {
    case "price_asc": return copy.sort(price(1));
    case "price_desc": return copy.sort(price(-1));
    case "newest": return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || byOwnerOrder(a, b));
    default: return copy.sort(byOwnerOrder);
  }
}

/** The price range is inclusive; with a range set, gifts with no price are left out because they cannot match it. */
export function filterItems<T extends Filterable>(items: T[], f: Filters): T[] {
  return items.filter((i) => {
    if (f.priorities.length && !f.priorities.includes(i.priority)) return false;
    if ((f.minMinor !== null || f.maxMinor !== null) && i.priceMinor === null) return false;
    if (f.minMinor !== null && i.priceMinor! < f.minMinor) return false;
    if (f.maxMinor !== null && i.priceMinor! > f.maxMinor) return false;
    if (f.availableOnly && i.state.state.endsWith("_by_other")) return false;
    return true;
  });
}

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Reads the view from URL search params; anything invalid is ignored. */
export function parseViewParams(params: Params): { sort: SortKey; filters: Filters } {
  const sort = SORTS.find((s) => s === first(params.sort)) ?? "priority";
  const priorities = (first(params.priority) ?? "").split(",").filter((p): p is Priority => (PRIORITIES as readonly string[]).includes(p));
  const money = (v: string | string[] | undefined) => {
    const s = first(v);
    return s ? parsePoundsToMinor(s) : null;
  };
  return { sort, filters: { priorities, minMinor: money(params.min), maxMinor: money(params.max), availableOnly: first(params.avail) === "1" } };
}

/** The inverse of parseViewParams, leaving out defaults so a plain list keeps a plain URL. */
export function toSearchParams(sort: SortKey, f: Filters): URLSearchParams {
  const q = new URLSearchParams();
  if (sort !== "priority") q.set("sort", sort);
  if (f.priorities.length) q.set("priority", f.priorities.join(","));
  if (f.minMinor !== null) q.set("min", minorToPounds(f.minMinor));
  if (f.maxMinor !== null) q.set("max", minorToPounds(f.maxMinor));
  if (f.availableOnly) q.set("avail", "1");
  return q;
}
