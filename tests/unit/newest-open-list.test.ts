import { describe, expect, it } from "vitest";
import { newestOpenList } from "@/features/wishlists/owner-queries";

const list = (title: string, year: number, created: string, archived = false) => ({ title, year, archived, createdAt: new Date(created) });

describe("newestOpenList", () => {
  it("takes the latest year, then the most recently created, not the alphabetical first", () => {
    const lists = [list("Birthday 2026", 2026, "2026-03-01"), list("Christmas 2026", 2026, "2026-11-01"), list("Christmas 2025", 2025, "2025-11-01")];
    expect(newestOpenList(lists)?.title).toBe("Christmas 2026");
  });

  it("skips archived lists, even newer ones, and gives null when none is open", () => {
    expect(newestOpenList([list("New", 2026, "2026-11-01", true), list("Old", 2025, "2025-11-01")])?.title).toBe("Old");
    expect(newestOpenList([list("Only", 2026, "2026-11-01", true)])).toBeNull();
    expect(newestOpenList([])).toBeNull();
  });

  it("does not reorder the list it is given", () => {
    const lists = [list("B", 2025, "2025-01-01"), list("A", 2026, "2026-01-01")];
    newestOpenList(lists);
    expect(lists.map((l) => l.title)).toEqual(["B", "A"]);
  });
});
