import { describe, expect, it } from "vitest";
import { filterItems, NO_FILTERS, parseViewParams, sortItems, toSearchParams } from "@/features/wishlists/sort-filter";
import type { Priority } from "@/features/wishlists/schemas";

let n = 0;
const item = (title: string, priority: Priority, sortOrder: number, priceMinor: number | null, state = "available", day = 1) => ({
  id: `id-${n++}-${title}`, title, priority, sortOrder, priceMinor, createdAt: `2026-11-0${day}T00:00:00.000Z`, state: { state },
});
const titles = (xs: { title: string }[]) => xs.map((x) => x.title);

const items = [
  item("nice-cheap", "nice_to_have", 10, 500, "available", 3),
  item("love-none", "would_love", 20, null, "available", 2),
  item("love-pricey", "would_love", 10, 9000, "reserved_by_other", 4),
  item("most-mid", "most_wanted", 10, 2500, "reserved_by_you", 1),
];

describe("sortItems", () => {
  it("defaults to priority then owner order", () => {
    expect(titles(sortItems(items, "priority"))).toEqual(["most-mid", "love-pricey", "love-none", "nice-cheap"]);
  });
  it("puts unpriced items last in both price directions", () => {
    expect(titles(sortItems(items, "price_asc"))).toEqual(["nice-cheap", "most-mid", "love-pricey", "love-none"]);
    expect(titles(sortItems(items, "price_desc"))).toEqual(["love-pricey", "most-mid", "nice-cheap", "love-none"]);
  });
  it("sorts newest first", () => {
    expect(titles(sortItems(items, "newest"))).toEqual(["love-pricey", "nice-cheap", "love-none", "most-mid"]);
  });
  it("breaks sort_order ties by created time, like the server does", () => {
    const tied = [item("late", "would_love", 0, null, "available", 3), item("early", "would_love", 0, null, "available", 1), item("mid", "would_love", 0, null, "available", 2)];
    expect(titles(sortItems(tied, "priority"))).toEqual(["early", "mid", "late"]);
    expect(titles(sortItems(tied, "price_asc"))).toEqual(["early", "mid", "late"]);
  });
  it("is stable on ties and never changes its input", () => {
    const tied = [item("b", "would_love", 20, 100), item("a", "would_love", 10, 100)];
    expect(titles(sortItems(tied, "price_asc"))).toEqual(["a", "b"]);
    const before = titles(items);
    sortItems(items, "price_desc");
    expect(titles(items)).toEqual(before);
  });
});

describe("filterItems", () => {
  it("filters by priority", () => {
    expect(titles(filterItems(items, { ...NO_FILTERS, priorities: ["would_love"] }))).toEqual(["love-none", "love-pricey"]);
  });
  it("treats the price range as inclusive and drops unpriced items when a range is set", () => {
    expect(titles(filterItems(items, { ...NO_FILTERS, minMinor: 500, maxMinor: 2500 }))).toEqual(["nice-cheap", "most-mid"]);
    expect(titles(filterItems(items, { ...NO_FILTERS, minMinor: 2501 }))).toEqual(["love-pricey"]);
    expect(titles(filterItems(items, NO_FILTERS))).toHaveLength(4);
  });
  it("hides items claimed by someone else when availableOnly is set, but keeps your own", () => {
    expect(titles(filterItems(items, { ...NO_FILTERS, availableOnly: true }))).toEqual(["nice-cheap", "love-none", "most-mid"]);
  });
});

describe("view params", () => {
  it("parses valid params and ignores bad ones", () => {
    expect(parseViewParams({ sort: "price_desc", priority: "most_wanted,bogus,nice_to_have", min: "5", max: "abc", avail: "1" })).toEqual({
      sort: "price_desc", filters: { priorities: ["most_wanted", "nice_to_have"], minMinor: 500, maxMinor: null, availableOnly: true },
    });
    expect(parseViewParams({ sort: "hack" })).toEqual({ sort: "priority", filters: NO_FILTERS });
    expect(parseViewParams({})).toEqual({ sort: "priority", filters: NO_FILTERS });
  });
  it("round-trips, and keeps a default view's URL empty", () => {
    const view = { sort: "newest" as const, filters: { priorities: ["would_love" as const], minMinor: 1050, maxMinor: 9900, availableOnly: true } };
    expect(parseViewParams(Object.fromEntries(toSearchParams(view.sort, view.filters)))).toEqual(view);
    expect(toSearchParams("priority", NO_FILTERS).toString()).toBe("");
  });
});
