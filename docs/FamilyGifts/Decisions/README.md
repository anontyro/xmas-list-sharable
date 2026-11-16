# Family Gifts decisions

The rules Family Gifts is built on, one per file. Each file says what the code does and why. For how it does it, read
the code.

**Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` · **Manual testing:** `../Testing/MANUAL-TESTING-FG-001-family-gifts.md` · **Work item:** FG-001

## How to use this folder

- **Change a decision in the same PR as the code.** The review then checks the diff against the rule written here.
- **Edit the file in place when a decision changes.** Git keeps the history, so don't add dated amendments or
  "previously" notes.
- **Add a new decision under the next number** and list it below. Numbers are never reused. A dropped decision's file
  is deleted.
- **Cite decisions by number**, for example "Family Gifts decision 0003", in PRs, work items and reviews.

| Status | Means |
|---|---|
| Agreed | The contract is settled, but the code isn't in master yet |
| Accepted | Built and in master |

## R1a · Scaffold (FG-101)

| # | Decision |
|---|---|
| [0001](0001-stack-and-layout.md) | Next.js App Router + MUI + Drizzle on pnpm; every dependency is installed once, up front, by the scaffold package |

## R1b · Database (FG-102)

| # | Decision |
|---|---|
| [0002](0002-money-and-schema.md) | The whole PRD schema lands in one initial migration; money is integer pence |

## R1c · Auth and admin (FG-103)

| # | Decision |
|---|---|
| [0003](0003-session-model.md) | Opaque hashed session tokens, one HttpOnly cookie per role so contexts never inherit each other |
| [0004](0004-pin-and-throttling.md) | Owner PINs are 6+ digits hashed with Argon2id; logins are throttled in the database |

## R1d · Owner lists and sharing (FG-104)

| # | Decision |
|---|---|
| [0005](0005-slugs-and-archive.md) | Random 10-character slugs; archived lists stay readable with a notice |
| [0006](0006-role-scoped-views.md) | Owner and guest responses come from separate explicit serializers, never one shared "everything" query |
| [0007](0007-soft-delete.md) | Items are only ever soft deleted |

## R2a · Guests and claims (FG-201)

| # | Decision |
|---|---|
| [0008](0008-exclusive-claim.md) | One active claim per item, enforced by a partial unique index; losers get a conflict result |
| [0009](0009-buyer-names.md) | Other guests see the current display name of whoever holds a claim; owners and admin never see claims |

## R2b · Ordering and sorting (FG-202)

| # | Decision |
|---|---|
| [0010](0010-ordering-sorting.md) | Owner order is stored; guest sort and filter are client-side views that never write |

## R3a · Planner (FG-301)

| # | Decision |
|---|---|
| [0011](0011-planner-accounting.md) | Planned, spent, potential and remaining are computed by one pure function from integer pence |

## R3b · Exports (FG-302)

| # | Decision |
|---|---|
| [0012](0012-export-escaping.md) | Exports are built client-side from the planner payload; CSV is RFC 4180 with formula-injection guarding |

## R3c · URL import (FG-303)

| # | Decision |
|---|---|
| [0013](0013-url-import-ssrf.md) | Outbound fetches only reach public addresses, with the resolved IP pinned and every redirect re-checked |

## R3d · Amazon import (FG-304)

| # | Decision |
|---|---|
| [0014](0014-amazon-import.md) | Pasted Amazon content is parsed as inert data into drafts that need explicit confirmation |

## R4a · Recovery links (FG-401)

| # | Decision |
|---|---|
| [0015](0015-recovery-links.md) | Recovery tokens travel in the URL fragment and are stored only as a hash |

## Open questions

Not decided yet. Each one becomes a numbered file once it is.

- None.
