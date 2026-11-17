# 0009 · Other guests see the claimant's current name; owners and admin see no claims

**Status:** Agreed · **Work items:** FG-201 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D28, D29

A guest who has chosen a name sees the current display name of whoever reserved or bought a gift ("Reserved by Bob"). A visitor with no name yet sees only "Reserved" or "Purchased". Owners and the admin never receive claim, interest or buyer data.

- **Where it lives.** All claim state is built in `src/features/reservations/guest-claim-view.ts`. Owner and admin code cannot import it: an ESLint rule fails the lint, and a unit test proves the rule fires.
- **Proof.** An integration test serialises every owner and admin query after claims, interests, planner notes and recovery tokens exist, and requires no claim-like key and none of the seeded secrets.
- **Renaming.** Claims point at the guest id, so a rename changes what others see without touching any claim.
- **Limit.** An owner who opens their own list in a browser without an owner cookie is simply a guest and sees guest state (the PRD's trusted-family limit).

## Why

Naming who is buying avoids two relatives both assuming the other has it. Keeping the code in one folder that owner code cannot import turns a privacy promise into a build failure.

## Consequences

- Making buyers anonymous later means removing `claimedBy` from one mapper.
- Names are not unique, so two guests called Sam look identical to others.
