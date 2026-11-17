# 0008 · One active claim per item, decided by a database index

**Status:** Agreed · **Work items:** FG-201 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D10, D26, D27, D30

A gift can have at most one unreleased claim. The partial unique index `item_claim_one_active_per_item` decides who wins a reservation; the code never checks first and then writes.

- **Reserve.** Inserts a `reserved` claim. A unique violation becomes `CLAIM_CONFLICT` ("Someone else just reserved this").
- **Purchase and release.** Only the claimant can mark purchased or release. Anyone else gets `NOT_CLAIMANT`, which does not reveal who holds it. Undoing a purchase needs `confirm: true` (`CONFIRM_REQUIRED` otherwise).
- **Interest.** Any number of guests can be interested; it never blocks a reservation. A guest sees only their own interest.
- **State.** `available`, `interested`, `reserved_by_you`, `reserved_by_other`, `purchased_by_you`, `purchased_by_other`. An active claim wins over interest.
- **Unavailable.** Deleted items, archived lists and deactivated owners' items return `ITEM_UNAVAILABLE`.
- **Refresh.** Successful actions return the item's new state; the page refetches after every action, especially a conflict. There is no realtime.

## Why

Check-then-insert races under concurrent requests; an index cannot. A test fires 20 parallel reservations and requires exactly one winner.

## Consequences

- Released claims stay as history rows; interest rows are kept after a reservation.
- A conflict loser must refresh to see the winner, which the UI does automatically.
