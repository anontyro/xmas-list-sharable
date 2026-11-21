import { describe, expect, it } from "vitest";
import { can, type Principal } from "@/lib/permissions";

const admin: Principal = { type: "admin" };
const owner: Principal = { type: "owner", memberId: "m1" };
const guest: Principal = { type: "guest", guestId: "g1", memberId: null };

// Rows follow the PRD §3.1 matrix: [action, admin, owner (own list), guest, anonymous]
describe("permission matrix", () => {
  it("member and list management is admin only", () => {
    for (const a of ["member.manage", "list.manage"] as const) {
      expect([can(admin, a), can(owner, a), can(guest, a), can(null, a)]).toEqual([true, false, false, false]);
    }
  });
  it("item writes are for the list's own owner only", () => {
    const ctx = { ownerMemberId: "m1" };
    expect([can(admin, "item.write", ctx), can(owner, "item.write", ctx), can(guest, "item.write", ctx), can(null, "item.write", ctx)]).toEqual([false, true, false, false]);
    expect(can(owner, "item.write", { ownerMemberId: "m2" })).toBe(false);
    expect(can(owner, "item.write")).toBe(false);
  });
  it("everyone can read published items", () => {
    expect([admin, owner, guest, null].map((p) => can(p, "item.read"))).toEqual([true, true, true, true]);
  });
  it("claim state is guest only", () => {
    for (const a of ["claim.read", "claim.write"] as const) {
      expect([admin, owner, guest, null].map((p) => can(p, a))).toEqual([false, false, true, false]);
    }
  });
  it("planner is the owning guest only", () => {
    for (const a of ["planner.read", "planner.write"] as const) {
      expect([admin, owner, null].map((p) => can(p, a, { guestId: "g1" }))).toEqual([false, false, false]);
      expect(can(guest, a, { guestId: "g1" })).toBe(true);
      expect(can(guest, a, { guestId: "g2" })).toBe(false);
    }
  });
});
