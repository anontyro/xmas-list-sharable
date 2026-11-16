# 0006 · Owner and guest responses come from separate explicit serializers

**Status:** Agreed · **Work items:** FG-104 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D20, D24

`views.ts` declares `OwnerWishlistView`, `GuestWishlistView` and `FamilyDashboardView`, each with an explicit mapper. Queries select named columns; no query joins claim, interest, planner or guest tables for an owner or admin route.

- **Owner view.** Items plus the list's own slug and title. Owner pages import nothing from the reservations or planner features.
- **Guest view.** The same item fields plus `createdAt`, the member's name and the archived flag. Later releases add claim state in a separate module, not here.
- **Tests.** One test asserts the exact key set of a guest item; another checks the owner view contains no claim-like words.

## Why

A single "get everything" query makes it easy to leak a field to the wrong role. Naming each shape means adding a field is a visible, reviewed change.

## Consequences

- Some fields are mapped twice (owner and guest). That duplication is deliberate.
