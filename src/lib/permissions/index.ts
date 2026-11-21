export type Principal =
  | { type: "admin" }
  | { type: "owner"; memberId: string }
  | { type: "guest"; guestId: string; memberId: string | null } // memberId: the member this guest is the viewer side of
  | null; // anonymous visitor

export type Action =
  | "member.manage" // create/deactivate member, set/reset PIN
  | "list.manage" // create/archive list
  | "item.write" // add/edit/remove/reorder items (ctx.ownerMemberId = list owner)
  | "item.read" // published items
  | "claim.read" // guest-visible claim state
  | "claim.write" // interest, reserve, purchase, release
  | "planner.read" // budgets, notes, actual price, export (ctx.guestId = planner owner)
  | "planner.write";

/** PRD §3.1 permission matrix. Pure: callers resolve the principal from a session first. */
export function can(p: Principal, action: Action, ctx: { ownerMemberId?: string; guestId?: string } = {}): boolean {
  switch (action) {
    case "item.read":
      return true;
    case "member.manage":
    case "list.manage":
      return p?.type === "admin";
    case "item.write":
      return p?.type === "owner" && p.memberId === ctx.ownerMemberId;
    case "claim.read":
    case "claim.write":
      return p?.type === "guest";
    case "planner.read":
    case "planner.write":
      return p?.type === "guest" && p.guestId === ctx.guestId;
  }
}
