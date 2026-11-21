# Family Gifts decisions

The rules Family Gifts is built on, one per file. Each file says what the code does and why. For how it does it, read
the code.

**Specs:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` (0001–0015) and `Docs/FamilyGifts/Specs/2026-11-17-FG-002-sticker-book-design.md` (0016–0024) and `Docs/FamilyGifts/Specs/2026-11-20-FG-003-unified-accounts-and-own-lists.md` (0025–0030) · **Manual testing:** `../Testing/MANUAL-TESTING-FG-001-family-gifts.md`, `../Testing/MANUAL-TESTING-FG-002-sticker-book-design.md`, `../Testing/MANUAL-TESTING-FG-003-unified-accounts-and-own-lists.md` · **Work items:** FG-001, FG-002, FG-003

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

## R5a · Theme (FG-501)

| # | Decision |
|---|---|
| [0016](0016-sticker-theme-on-mui.md) | The Sticker Book look is an MUI theme built from design tokens, with an ink focus ring that passes contrast |

## R5b · Stickers and components (FG-502)

| # | Decision |
|---|---|
| [0017](0017-stickers-and-gift-pictures.md) | Gifts show their product picture or an automatically chosen sticker; people get a stable colour |

## R5c · Shells and navigation (FG-503)

| # | Decision |
|---|---|
| [0018](0018-role-shells-and-navigation.md) | Each role has its own shell, a guest can sign out of a device without losing their data, and the last list is remembered |

## R5d · Welcome and sign-in (FG-504)

| # | Decision |
|---|---|
| [0019](0019-guest-entry-and-welcome.md) | New visitors enter a name on a welcome screen, return paths are validated, and a pasted recovery link signs a browser in |

## R5e · Family and wishlist (FG-505)

| # | Decision |
|---|---|
| [0020](0020-family-dashboard-and-countdown.md) | The family page shows counts, a countdown, the guest's planner and earlier years from data that carries no claim information |

## R5f · Planner and access (FG-506)

| # | Decision |
|---|---|
| [0021](0021-planner-budget-and-access-pages.md) | Budgets and notes have their own page, and the recovery link is shown once because only a hash is stored |

## R6a · Owner editor and gift form (FG-601)

| # | Decision |
|---|---|
| [0022](0022-owner-pages.md) | Owners edit on one page and add or change a gift on another, and owner pages still never touch claim or planner code |

## R6b · Amazon import and owner account (FG-602)

| # | Decision |
|---|---|
| [0023](0023-bulk-import-selection.md) | Imported gifts are ticked, given a priority and a price on a page, and added all or nothing |

## R6c · Admin (FG-603)

| # | Decision |
|---|---|
| [0024](0024-admin-one-screen-and-avatars.md) | The admin manages members and lists on one screen, and a member's optional picture is validated in code |

## R8a · Linked accounts (FG-801)

| # | Decision |
|---|---|
| [0025](0025-member-is-a-linked-guest.md) | A member is a guest with a link, so one PIN sign-in is both an editor and a viewer, and claims and planners stay on guest ids |
| [0026](0026-sign-up-with-a-pin.md) | Choosing a name and a PIN makes a member who can view at once and edit once the admin approves them |
| [0027](0027-no-reserving-on-your-own-list.md) | The server refuses reservations on the caller's own list, so the surprise holds even for a signed-in member |

## R8b · Navigation and home (FG-802)

| # | Decision |
|---|---|
| [0028](0028-members-browse-and-edit-from-one-place.md) | The brand goes home, one account menu serves members, and a member's own list opens in the editor, never the family view |

## R8c · Own lists and drafts (FG-803)

| # | Decision |
|---|---|
| [0029](0029-own-lists-and-drafts.md) | Members create their own lists; a draft is `published_at is null` and invisible to everyone else until published |

## R8d · Unordered lists (FG-804)

| # | Decision |
|---|---|
| [0030](0030-unordered-lists.md) | A list can be unranked: flat, no priority groups, sort or filter, and stored priorities are kept |

## Open questions

Not decided yet. Each one becomes a numbered file once it is.

- None.
