# 0010 · The owner's order is stored; a guest's sort and filter only change what they see

**Status:** Agreed · **Work items:** FG-202 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D31, D32

Owners order gifts inside each priority group with Move up and Move down buttons (no drag and drop). Guests can sort and filter the list, but that never writes anything.

- **Moving.** `moveItem` locks the priority group, swaps the item with its neighbour and renumbers the group 10, 20, 30. Parallel moves queue behind the lock, and the renumbering also repairs gifts that share a `sort_order`. At either end nothing moves.
- **Priority change.** An item that changes priority goes to the end of its new group.
- **Guest sorts.** Priority (the owner's order, default), price low to high, price high to low, recently added. Gifts with no price go last in both price sorts.
- **Guest filters.** Priority, price range (inclusive; gifts with no price are left out once a range is set) and "only gifts nobody has reserved", which hides gifts claimed by someone else but keeps your own.
- **Where the view lives.** In the URL (`sort`, `priority`, `min`, `max`, `avail`), so a copied link shows the same list. Invalid values are ignored. A plain URL always shows the owner's order.
- **Owner pages.** They have no claim-based sort or filter.

## Why

Buttons work by touch and keyboard with no extra library. Locking and renumbering in one transaction is simpler than reasoning about gaps. Keeping the view in the URL means no state to save, and the owner's order cannot be disturbed by guests.

## Consequences

- Moving a gift a long way takes several presses.
- Sorting and filtering happen on the server render from the URL, so each change reloads the list.
