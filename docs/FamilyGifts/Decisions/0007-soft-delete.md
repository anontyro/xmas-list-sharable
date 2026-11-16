# 0007 · Items are only ever soft deleted

**Status:** Agreed · **Work items:** FG-104 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D22

Removing a gift sets `deleted_at`; the row is never deleted. Owner and guest list queries skip deleted items, and editing or deleting a deleted item returns "not found".

- **Owner prompt.** The confirmation says only "Remove this gift from your list?" and never mentions reservations.
- **Archived lists.** Adding, editing and removing are refused with `LIST_ARCHIVED`.
- **Later.** The planner may still show a deleted item a guest holds (release R3a).

## Why

Guests' interests, claims and notes point at item rows. Hard deleting would erase their plans, and a warning that mentions claims would tell the owner what they are not supposed to know.

## Consequences

- Deleted rows accumulate. At family scale that is fine.
