# 0027 · The server refuses reservations on the caller's own list

**Status:** Agreed · **Work items:** FG-801 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-20-FG-003-unified-accounts-and-own-lists.md` D9

`reserveItem`, `purchaseItem`, `releaseItem`, `showInterest` and `withdrawInterest` return `OWN_LIST` ("This is your own list") when the gift is on a list owned by the guest's linked member, and write nothing. The check uses the guest's `memberId` from the principal, so it does not depend on the owner cookie, and it runs for every gift, deleted or archived ones included.

## Why

A member is now also a viewer, and the viewer side reads claim state. Without this rule a member could reserve their own gifts or, through the claim state of the family view, learn what has been reserved for them. Enforcing it in the action (not only by hiding buttons) means a hand-made request cannot get round it. The page side of the same rule, never rendering claim state for your own list, lands with the navigation release (decision 0028).

## Consequences

- Every claim action does one more small query for linked guests; ordinary guests skip it.
- No other error code or claim rule changes.
