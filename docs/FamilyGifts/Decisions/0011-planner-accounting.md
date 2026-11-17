# 0011 · Planner totals come from one pure function over integer pence

**Status:** Agreed · **Work items:** FG-301 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D33, D34, D35, D36

`computePlan(entries, budget)` in `src/features/planner/accounting.ts` is the only place planner money is added up. The page, the recipient groups and (later) exports all show its output.

- **Buckets.** Each included entry goes in exactly one: *planned* (reserved or bought), *spent* (bought) or *might spend* (interested only, at the listed price). Moving a gift through interested, reserved and bought never counts it twice.
- **Price used.** Price paid if the guest entered one, otherwise the listed price. A gift with neither adds nothing and is counted as "without a price".
- **Remaining.** Budget minus planned. It can be negative ("over budget") and is empty when no budget is set.
- **Left out.** An entry the guest un-ticks ("Include in my totals") is ignored entirely.
- **Scope.** One planner per guest, occasion and year, created when the guest first saves a budget, note or price. The page shows the newest period and offers the others when there are several.
- **Privacy.** Planner queries and actions start with `requireGuest()` and use only the session guest. No call accepts a planner id, so another guest's rows cannot be named. Only gifts the guest holds or is interested in can be annotated.
- **Deleted gifts.** A gift the owner deleted after the guest claimed it stays, marked "Removed by the owner", with its price counted. Interest-only gifts the owner deleted disappear.
- **Price paid** never changes the owner's listed price.

## Why

Money bugs hide in scattered sums. One tested function, whole pence, and fixed bucket rules make the totals predictable and easy to explain.

## Consequences

- "Might spend" ignores any price paid on an interested gift; it is a rough guide only.
- Totals are GBP only for now.
