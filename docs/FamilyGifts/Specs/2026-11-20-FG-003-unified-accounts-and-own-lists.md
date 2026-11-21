# Family Gifts: one account for viewing and editing, own lists, drafts and unordered lists

Work item: FG-003. Releases map to these tasks:

| Release | Task |
|---|---|
| R8a · Linked accounts | FG-801 |
| R8b · Navigation and home | FG-802 |
| R8c · Own lists and drafts | FG-803 |
| R8d · Unordered lists | FG-804 |

Branch: one branch per release, `feature/FG-80x-…`, each stacked on the last and each able to merge on its own.
Toggle: none (D1). The app is not live yet, as with FG-002 D46.
Design: none new. Every screen reuses the Sticker Book components from FG-002.
Status: **approved 2026-11-20**. No open questions.
Manual testing: `Docs/FamilyGifts/Testing/MANUAL-TESTING-FG-003-unified-accounts-and-own-lists.md`
Decisions: `Docs/FamilyGifts/Decisions/` (README lists every planned record, numbered from 0025, and the package that writes it).

## Goal

A signed-in family member can browse everyone else's lists (and reserve gifts) while still editing their own, without signing in twice. Anyone can make an account by choosing a name and a PIN; they can browse and reserve at once, and the admin approves them before they can create or edit lists. A member can create their own lists, keep them private as drafts until they publish, and mark a list as "no particular order" so nobody reads it as most-to-least wanted.

| Release | What ships |
|---|---|
| **R8a** | A member is also a viewer: PIN sign-in (or PIN sign-up) signs the browser in as a viewer, and as an editor once the admin has approved them; claims and planner work for them, and they can never reserve on their own list |
| **R8b** | The top-left brand goes home for everyone; the account menu has "Browse family lists"; home shows the member as signed in and shows their own list as editable; the admin sees who is waiting for approval and can approve them |
| **R8c** | Members create their own lists; a list can be a private draft until published |
| **R8d** | A list can be marked unordered: no priority groups, sort or filter, a flat list |

## Background (read 2026-11-20)

### Three separate identities today

- A visitor is a `guest` (name only), an owner is a `member` (name and PIN), and the admin is a single role. Each has its own session cookie, `fg_guest`, `fg_owner`, `fg_admin`, and a token only resolves under its own role (`src/lib/auth/cookies.ts`, `src/lib/auth/session.ts`, decision 0003).
- So an owner who opens a family page is a new, nameless visitor: `GuestShell` only asks `getGuestIdentity()` (`src/components/layout/GuestShell.tsx`), and the home page greets nobody signed in as an owner (`src/app/(public)/page.tsx`). This is the "disconnect" being fixed.
- The owner shell's brand link goes to `/owner` and its menu has only "My list", "All my lists", "Change my PIN" (`src/components/layout/OwnerShell.tsx`, `AccountMenu.tsx`).
- Claims, interest and planners all point at `guest.id` (`src/db/schema/claims.ts`, `planner.ts`). Reserving requires a guest session (`requireGuest`, `src/features/reservations/actions.ts`). Reusing this is far cheaper than moving them to member ids.

### Rules this must not break

- Owners and admin never see claims or planner data (decision 0006, 0009; eslint blocks owner and admin code importing `guest-claim-view`). A member who is also a viewer is the dangerous case: on their own list they must see no claim state at all.
- Member names are unique among active members; guest names are not (`member_active_name_idx`, `src/db/schema/identity.ts`).
- Lists are only created by the admin today (`createList`, `src/features/family/actions.ts`) and are always published and ordered by priority groups (`itemOrderBy`, `src/features/wishlists/views.ts`).
- Throttling and PIN rules already exist: `isBlocked` / `recordFailure`, `verifyPinOrDummy`, `hashPin`, `isValidPin` (`src/lib/security/`), and the sign-up cap in `createGuest`.

### Code to reuse

- `generateSlug` and the slug-collision retry loop in `createList`; extract the loop, do not copy it.
- `requireOwner`, `getListAccess`, `listOwnLists`, `newestOpenList` (`src/features/wishlists/owner-queries.ts`).
- `ActionButton`, `LinkButton`, `Pill`, `Note`, `StickerCard`, `MemberCard`, `ChangeNameDialog` (as the pattern for a PIN dialog).

## Decisions

### R8a · Linked accounts, plus decisions shared by every release

> **R8a · FG-801 · ~27 files: ~6 new, ~21 modified · packages P0–P4**
>
> Choosing a name and a PIN now makes an account, and signing in with a PIN signs the browser in as the member and as a viewer at once. Reserving, interest and the planner work for members. In the code, `guest` gains a link to `member`, and the guest principal carries it.

- **D1 · No feature flag.** The app is not live. An unfinished release is merged but not deployed.
- **D2 · Schema, all four releases in one migration `0002_unified_accounts`.** `guest.member_id uuid null unique references member(id)`; `member.approved_at timestamptz null`, backfilled to `created_at` for every existing member (null means waiting for the admin); `wishlist.published_at timestamptz null`, backfilled to `created_at` for every existing row (null means draft); `wishlist.ranked boolean not null default true`. The whole schema lands once, as FG-001 decision 0002 did. R8c and R8d only start using their columns.
- **D3 · A member is a guest with a link.** Every member who has signed in has exactly one linked guest (`guest.member_id`). `ensureLinkedGuest(memberId)` in `src/features/authentication/linked-guest.ts` returns it: the member's existing linked guest if there is one; else the browser's current guest if that guest is unlinked (adopted, so its reservations and planner stay); else a new guest with the member's display name. A member's current guest session for a different linked guest is replaced.
- **D4 · Sign-in sets both cookies.** `ownerLogin` still verifies the PIN with the same throttle, then creates the `owner` session and a `guest` session for the linked guest, setting `fg_owner` and `fg_guest`. Cookies and lifetimes (owner 12 hours, guest 180 days) are unchanged, so decision 0003 still holds. When the owner session has expired the person is still recognised by name (guest session) and is asked for their PIN only when they go to edit. A member who is not yet approved (D6) gets only the guest session, with the message "You're in. The admin will approve you before you can make a list."
- **D5 · The guest principal carries its member.** `Principal` guest becomes `{ type: "guest"; guestId: string; memberId: string | null }`, filled from `guest.member_id` in `principalFor`. A new `getViewer()` in `src/features/authentication/guest-session.ts` returns `{ guest: { guestId, displayName, memberId, pending } | null, owner: { memberId } | null }` (`pending` is true for a linked member with `approved_at` null) and is the only thing shells and pages use to ask "who is this?". `getGuestIdentity` stays for callers that need only the guest.
- **D6 · Sign up with a PIN.** The welcome form has an optional PIN field ("Add a PIN to make your own list"). `createGuest(name, pin?)`: with no PIN nothing changes. With a PIN (6 to 12 digits, `isValidPin`) it creates a member with `approved_at` null and `pin_hash`, and a linked guest with its guest session, under the same per-address cap as today. They are a full viewer straight away (browse, reserve, planner) but get no owner session and cannot create or edit lists until the admin approves them. `approveMember(memberId)` (admin only) sets `approved_at = now()`; the person then signs in with their PIN to get the owner session. Members the admin creates are approved on creation. A name already used by an active member returns `NAME_TAKEN` ("Someone with that name already exists. Pick another or sign in."); nothing is created. `addPin(pin)` does the same for a browser that is already an unlinked guest, using the guest's current name (also waiting for approval); it is a no-op error for an already linked guest.
- **D7 · One name.** For a linked guest, `renameGuest` also renames the member in one transaction (`NAME_TAKEN` on a clash), and the admin's `renameMember` also renames the linked guest, so reservation labels and list titles never disagree.
- **D8 · Deactivating disables the person.** `deactivateMember` revokes the member's owner sessions (as now) and the linked guest's sessions. They can still pick a new name as a fresh guest, but not sign in with the old one. A waiting member is rejected the same way: the admin deactivates them.
- **D9 · Never reserve on your own list.** The reservation actions (`reserveItem`, `purchaseItem`, `releaseItem`, `showInterest`, `withdrawInterest`) fail with a new error code `OWN_LIST` ("This is your own list") when the item's list belongs to the guest's `memberId`. Enforced on the server, so a hand-crafted request cannot get around the page.

### R8b · Navigation and home

> **R8b · FG-802 · ~14 files: ~2 new, ~12 modified · packages P5–P7**
>
> The top-left brand always goes to the family home, a member's menu gains "Browse family lists", and the home page shows a signed-in member as themselves with their own list marked as theirs and editable. The admin sees which members signed themselves up. In the code, both shells and the home page read `getViewer()`.

- **D10 · The brand goes home.** In `GuestShell` and `OwnerShell` the brand link is `/`. `AdminShell` keeps `/admin`.
- **D11 · One account menu.** `AccountMenu` takes `{ id, name, member: boolean, myListHref? }` instead of `kind`. For a member, in order: name and "Member"; My list; All my lists; **Browse family lists** (`/`); My planner; Change my name; Save access (recovery link); Change my PIN; Sign out. For a member waiting for approval it is a plain guest's menu without "I own a list" and "Set a PIN", plus the line "Waiting for admin approval"; once approved but without an owner session it shows **Sign in to edit** (to `/owner/login`) in place of the owner items. For a plain guest it is today's menu plus **Set a PIN** (a dialog calling `addPin`, same style as `ChangeNameDialog`). A member's Sign out ends both sessions on this device (`signOutMember`: `ownerLogout` plus `signOutGuest`) and goes to `/`; it never asks about a recovery link, because the PIN gets them back. The "Owner" pill is removed.
- **D12 · Shell links for a member.** `GuestShell`: Family, My list, Wishlist, My planner (4 tabs). `OwnerShell`: Family, My list, Add a gift, Import (4 tabs). "My list" is the newest open list's editor (`newestOpenList`), else `/owner`. A signed-out owner page still shows only the brand.
- **D13 · Home knows who you are.** The greeting uses the viewer's name whether they arrived as a guest or a member. A card whose `memberId` equals the viewer's member is shown first, in the mint tint, with a "Your list" pill and "Edit" in place of "Open", linking to `/owner/lists/{id}`. It carries no claim information (the dashboard data never did).
- **D14 · Your own list page is the editor.** `/l/{slug}` for a list owned by the viewer's linked member redirects to `/owner/lists/{id}` when the owner session is valid, and to `/owner/login` when it is not. Decided from `guest.member_id`, not the owner cookie, so an expired owner session can never fall through to the family view with claim state. No claim state is ever read for the viewer's own list.
- **D15 · Admin approves sign-ups.** A member with `approved_at` null shows a "Waiting for approval" pill and an **Approve** button (`approveMember`) on the admin card; Deactivate rejects them. Rename and PIN reset work as for any member.

### R8c · Own lists and drafts

> **R8c · FG-803 · ~20 files: ~6 new, ~14 modified · packages P8–P10**
>
> A signed-in member can create a list for themselves, choosing a title, occasion and year, and either save it as a private draft or publish it at once. A draft is invisible to everyone else until its owner publishes it. In the code, list creation moves out of the admin file into a shared helper and the family queries filter on `published_at`.

- **D16 · Own lists.** `createOwnList({ title, occasion, year, draft })` in `src/features/wishlists/list-actions.ts`: `requireOwner` for the signed-in member, then the shared `insertList(memberId, input)` (extracted from the admin `createList`, with the same slug retry). The member id comes from the session, never from the input. Validation reuses `listInput` minus `memberId`. Published immediately unless `draft`. The admin's `createList` keeps working through the same helper and always publishes.
- **D17 · Draft means `published_at is null`.** A draft is excluded from the family dashboard and earlier years (`giftCounts`), from `getListBySlug` (so `/l/{slug}` is not-found for everyone, the owner included, who edits at `/owner/lists/{id}`), and from the planner. The owner's own pages, `/owner` and the editor, show it with a "Draft" pill. The admin Lists page shows it with a "Draft" pill and no copy-link button.
- **D18 · Publish.** `publishList(listId)`: `requireOwner` of that list's member, sets `published_at = now()` once (idempotent), refreshes `/` and `/l/[slug]`. A draft's editor shows "Publish" and the note "Only you can see this until you publish" in place of the share card. There is no unpublish (follow-up).
- **D19 · Where to start one.** A "New list" button on `/owner`, a "New list" item in the account menu, and the page `/owner/lists/new`. The home page shows a member's drafts in a "Your drafts" section, visible only to them.

### R8d · Unordered lists

> **R8d · FG-804 · ~23 files: ~2 new, ~21 modified · packages P11–P13**
>
> A list owner can mark a list "in no particular order". Family then see one flat list with no Most wanted, Would love or Nice to have groups, so nobody reads it as ranked. In the code, `wishlist.ranked` (from D2) is carried through the views and the sort, filter and reorder code.

- **D20 · The setting.** `ranked` defaults to true. The new-list form offers "Most wanted first" or "No particular order"; the editor has a "List settings" dialog (title and ranked) behind `updateListSettings(listId, { title, ranked })`, `requireOwner`. Admin-created lists are ranked.
- **D21 · Unranked on the family page.** No priority ribbons, no "priority" sort option, no priority filter; items are one flat list ordered by `sort_order` then `created_at`; a note says "Gifts on this list are in no particular order." `GuestWishlistView` and `OwnerWishlistView` gain `ranked: boolean`.
- **D22 · Unranked in the editor.** No ribbons, no priority field on the gift form or in the import wizard, and the up/down controls move an item within the whole list. New gifts on an unranked list are saved with the default priority. Stored priorities are never rewritten, so switching back to ranked restores the old groups.

## Non-goals

- Passwords, email, "forgot PIN" self-service (the admin resets PINs, as now).
- Moving claims, interest or planners to member ids. The link is the whole change.
- Letting the admin see claims, or any role seeing claims on their own list.
- Unpublish, deleting a list, or per-list privacy beyond draft.
- Previewing your own list "as the family sees it" (follow-up).
- Changing session lifetimes, recovery links, or the admin sign-in.
- Merging two existing guests into one member.

## Lanes

| Lane | Touched | Checks |
|---|---|---|
| `app` | yes | `pnpm typecheck`, `pnpm lint`, `pnpm test` |
| `db` | yes (R8a) | `pnpm db:generate` shows no further diff, `pnpm test:integration` |
| `e2e` | yes | `pnpm test:e2e` (the files each package names) |

## Packages

Waves:

| Wave | Packages | Release | Note |
|---|---|---|---|
| 1 | P0 | R8a (FG-801) | schema for all releases |
| 2 | P1 | R8a (FG-801) | principal and viewer |
| 3 | P2, P3 | R8a (FG-801) | parallel |
| 4 | P4 | R8a (FG-801) | records |
| 5 | P5, P6 | R8b (FG-802) | parallel |
| 6 | P7 | R8b (FG-802) | records |
| 7 | P8 | R8c (FG-803) | |
| 8 | P9 | R8c (FG-803) | |
| 9 | P10 | R8c (FG-803) | records |
| 10 | P11 | R8d (FG-804) | |
| 11 | P12 | R8d (FG-804) | |
| 12 | P13 | R8d (FG-804) | records |

Packages that share a wave share no files.

Shared acceptance for every package:

- The lane checks pass for its files, measured against the baseline.
- No test is deleted or skipped to pass a check.
- The branch passes the pre-PR audit (spec-plan SKILL.md step 10) before a PR is raised: no unneeded changes, tests that exercise real cases, no DRY/SOLID defects.
- Shared resources (strings, config, schemas) only through the package that owns them. A package that finds one missing reports `blocked`.
- Owner and admin code still imports nothing from `reservations/guest-claim-view` or planner code (the eslint isolation test passes).

### P0 · db: unified accounts schema (R8a · FG-801, wave 1)
- Lane: `db`
- ownedFiles:
  - `src/db/schema/identity.ts`
  - `src/db/schema/wishlist.ts`
  - `src/db/migrations/0002_unified_accounts.sql` (new)
  - `src/db/migrations/meta/0002_snapshot.json` (new)
  - `src/db/migrations/meta/_journal.json`
  - `tests/integration/schema.test.ts`
- Acceptance criteria:
  1. `guest.member_id` is nullable, unique, and references `member(id)`; two guests cannot link to one member.
  2. `member.approved_at` is nullable and existing members are backfilled to `created_at`; `wishlist.ranked` defaults to true; `wishlist.published_at` is nullable.
  3. The migration applies to a database holding existing lists and backfills `published_at = created_at`, so no existing list becomes a draft.
  4. `pnpm db:generate` reports no further changes.

### P1 · app: guest principal carries its member, and `getViewer` (R8a · FG-801, wave 2)
- Lane: `app`
- ownedFiles:
  - `src/lib/permissions/index.ts`
  - `src/lib/auth/require.ts`
  - `src/features/authentication/guest-session.ts`
  - `src/features/authentication/linked-guest.ts` (new)
  - `tests/unit/permissions.test.ts`
  - `tests/integration/require.test.ts`
- Acceptance criteria:
  1. `currentGuest()` returns `memberId` (null for an unlinked guest); every existing `can()` result is unchanged.
  2. `getViewer()` returns the guest and owner independently: guest only, owner only (cannot occur after D4 but must not throw), both, or neither.
  3. `ensureLinkedGuest` returns the member's existing guest on a second call, adopts an unlinked current guest when the member has none, and creates a new guest otherwise; a test covers each of the three paths, and that a guest already linked to another member is never relinked.

### P2 · app: PIN sign-in and sign-up create both sessions (R8a · FG-801, wave 3)
- Lane: `app`
- ownedFiles:
  - `src/features/authentication/owner-login.ts`
  - `src/features/authentication/guest-actions.ts`
  - `src/features/family/actions.ts`
  - `src/features/authentication/components/GuestNameForm.tsx`
  - `tests/integration/authentication.test.ts`
  - `tests/integration/guest-session.test.ts`
  - `tests/integration/guest-signout.test.ts`
  - `tests/integration/family.test.ts`
  - `tests/e2e/welcome.spec.ts`
  - `tests/e2e/helpers.ts` (members made by the helper are approved)
  - `tests/e2e/budget.spec.ts` (an owner now has a planner of their own)
  - `tests/integration/change-pin.test.ts` (fixture member is approved)
  - `src/db/seed.ts` (seeded members are approved)
- Acceptance criteria:
  1. A correct PIN for an approved member sets `fg_owner` and `fg_guest`; for a waiting member only `fg_guest`, with the waiting message; a wrong PIN sets neither and counts against the existing throttle; a deactivated member cannot sign in.
  2. `createGuest(name)` with no PIN behaves exactly as before; `createGuest(name, pin)` creates an active member with `approved_at` null, a hashed PIN, a linked guest and the guest session only (no `fg_owner`); an invalid PIN creates nothing.
  3. A taken active member name returns `NAME_TAKEN` and creates neither a member nor a guest; the per-address cap still applies to PIN sign-ups.
  4. `approveMember` is admin only, sets `approved_at` once and is idempotent; `createMember` (admin) sets `approved_at`; a member approved after sign-up gets the owner session on their next PIN sign-in. `addPin` links an existing guest (keeping its reservations) and fails for an already linked guest.
  5. `renameGuest` renames the member too, and `renameMember` renames the linked guest; a clash rolls both back.
  6. `deactivateMember` revokes the owner and the linked-guest sessions.
  7. `signOutMember` ends both sessions; `signOutGuest` still ends only the guest session.
  8. The welcome form has the optional PIN field, with an error shown for `NAME_TAKEN`; the e2e covers sign-up with a PIN and lands signed in as a viewer who is waiting for approval.

### P3 · app: never reserve on your own list (R8a · FG-801, wave 3)
- Lane: `app`
- ownedFiles:
  - `src/features/reservations/actions.ts`
  - `src/features/reservations/errors.ts`
  - `tests/integration/claims.test.ts`
- Acceptance criteria:
  1. Each of the five reservation actions returns the `OWN_LIST` error for an item on a list owned by the caller's linked member, and writes no claim or interest row.
  2. The same actions still work on another member's list for a linked guest, and for an unlinked guest.
  3. `OWN_LIST` has a user-facing message in `errors.ts` and no other error code changes.

### P4 · docs: decision records for R8a (R8a · FG-801, wave 4)
- Lane: `app`
- ownedFiles:
  - `Docs/FamilyGifts/Decisions/0025-member-is-a-linked-guest.md` (new)
  - `Docs/FamilyGifts/Decisions/0026-sign-up-with-a-pin.md` (new)
  - `Docs/FamilyGifts/Decisions/0027-no-reserving-on-your-own-list.md` (new)
- Acceptance criteria:
  1. Each record has Status Agreed, the work item, the spec decisions it covers (0025: D2 to D5, D7; 0026: D6, D8, D15's approval rule; 0027: D9) and Why and Consequences sections.
  2. Where the built code differs from this spec, the record follows the code and says so.

### P5 · app: shells and account menu for members (R8b · FG-802, wave 5)
- Lane: `app`
- ownedFiles:
  - `src/components/layout/GuestShell.tsx`
  - `src/components/layout/OwnerShell.tsx`
  - `src/components/layout/AccountMenu.tsx`
  - `src/components/layout/SetPinDialog.tsx` (new)
  - `tests/e2e/navigation.spec.ts`
- Acceptance criteria:
  1. The brand link is `/` in both shells and `/admin` in the admin shell.
  2. An approved member sees the D11 menu items in that order on both a family page and an owner page; a plain guest sees today's items plus "Set a PIN"; setting a PIN turns the chip into the waiting-member menu without a second sign-in, and the menu has no "My list" or "Add a gift" until approved.
  3. A member's Sign out ends both sessions and shows no recovery-link prompt; a plain guest's sign-out prompt is unchanged.
  4. The shells show the D12 links, with exactly one "Main" navigation at every width, and "Browse family lists" from an owner page lands on `/` still signed in.

### P6 · app: home, own-list redirect and admin pill (R8b · FG-802, wave 5)
- Lane: `app`
- ownedFiles:
  - `src/app/(public)/page.tsx`
  - `src/features/wishlists/components/MemberCard.tsx`
  - `src/app/(public)/l/[slug]/page.tsx`
  - `src/features/wishlists/public-queries.ts`
  - `src/features/family/queries.ts`
  - `src/features/family/components/AdminMemberCard.tsx`
  - `tests/integration/public-views.test.ts`
  - `tests/e2e/family-page.spec.ts`
- Acceptance criteria:
  1. After PIN sign-in (approved or waiting), going to `/` shows "Hi {name}" and the member's chip, not "Pick your name".
  2. The member's own list card is first, has the "Your list" pill, and links to the editor; other cards are unchanged and still open `/l/{slug}`.
  3. `/l/{slug}` of the viewer's own list redirects to the editor with a valid owner session and to `/owner/login` without one; in both cases no claim query runs for that request (asserted in an integration test).
  4. The admin member card shows "Waiting for approval" with an Approve button only when `approved_at` is null, and Approve removes both.
  5. The dashboard data still contains no claim or guest fields (the existing projection test passes).

### P7 · docs: decision record for R8b (R8b · FG-802, wave 6)
- Lane: `app`
- ownedFiles:
  - `Docs/FamilyGifts/Decisions/0028-members-browse-and-edit-from-one-place.md` (new)
- Acceptance criteria:
  1. Status Agreed; covers D10 to D15; says the owner pill was removed and why the own-list redirect keys off `guest.member_id`.

### P8 · app: own lists, drafts and publishing, server side (R8c · FG-803, wave 7)
- Lane: `app`
- ownedFiles:
  - `src/features/wishlists/insert-list.ts` (new)
  - `src/features/wishlists/list-actions.ts` (new)
  - `src/features/family/actions.ts`
  - `src/features/family/schemas.ts`
  - `src/features/wishlists/owner-queries.ts`
  - `src/features/wishlists/views.ts`
  - `src/features/wishlists/public-queries.ts`
  - `src/features/family/queries.ts`
  - `tests/integration/own-lists.test.ts` (new)
  - `tests/integration/public-views.test.ts`
- Acceptance criteria:
  1. `createOwnList` creates a list for the signed-in, approved member only (a waiting member has no owner session, so is `UNAUTHORIZED`); passing another member's id in the input has no effect; signed out or admin-only callers get `UNAUTHORIZED`.
  2. `draft: true` leaves `published_at` null; otherwise it is set. The admin `createList` still works and publishes, through the same `insertList`; the slug retry loop exists once.
  3. A draft is absent from `getFamilyDashboard`, `getEarlierYears` and `getListBySlug` (null), present in `listOwnLists` and `getOwnList` with `published: false`, and present in `listAllListsForAdmin` flagged as a draft.
  4. `publishList` publishes the caller's own draft, is idempotent, and fails for another member's list with `UNAUTHORIZED`.
  5. Creating a list rejects an empty title and a year outside 2000 to 2100.

### P9 · app: new-list page, draft UI and publish button (R8c · FG-803, wave 8)
- Lane: `app`
- ownedFiles:
  - `src/app/(owner)/owner/lists/new/page.tsx` (new)
  - `src/features/wishlists/components/NewListForm.tsx` (new)
  - `src/app/(owner)/owner/page.tsx`
  - `src/app/(owner)/owner/lists/[listId]/page.tsx`
  - `src/app/(public)/page.tsx`
  - `src/components/layout/AccountMenu.tsx`
  - `src/app/(admin)/admin/lists/page.tsx`
  - `tests/e2e/owner-list.spec.ts`
- Acceptance criteria:
  1. A member can create a draft and a published list from `/owner/lists/new`, reached from `/owner` and the account menu.
  2. A draft shows a "Draft" pill on `/owner` and in the editor, with Publish and the "Only you can see this" note instead of the share card; after Publish the share card appears.
  3. A second browser as another member does not see the draft on `/`, and its `/l/{slug}` is not-found; after publishing it does see it.
  4. The member's home shows "Your drafts" only to them; the admin Lists page shows the Draft pill and no copy link.

### P10 · docs: decision record for R8c (R8c · FG-803, wave 9)
- Lane: `app`
- ownedFiles:
  - `Docs/FamilyGifts/Decisions/0029-own-lists-and-drafts.md` (new)
- Acceptance criteria:
  1. Status Agreed; covers D16 to D19 and states that unpublish was left out.

### P11 · app: ranked setting, server side (R8d · FG-804, wave 10)
- Lane: `app`
- ownedFiles:
  - `src/features/wishlists/schemas.ts`
  - `src/features/wishlists/views.ts`
  - `src/features/wishlists/owner-queries.ts`
  - `src/features/wishlists/public-queries.ts`
  - `src/features/wishlists/list-actions.ts`
  - `src/features/wishlists/reorder.ts`
  - `src/features/wishlists/reorder-actions.ts`
  - `src/features/wishlists/sort-filter.ts`
  - `tests/unit/wishlists/schemas.test.ts`
  - `tests/unit/wishlists/sort-filter.test.ts`
  - `tests/integration/reorder.test.ts`
  - `tests/integration/own-lists.test.ts`
- Acceptance criteria:
  1. Both list views carry `ranked`; `createOwnList` accepts it (default true) and `updateListSettings` changes title and `ranked` for the owner only.
  2. For an unranked list, items come back ordered by `sort_order` then `created_at` ignoring priority; for a ranked list the order is unchanged.
  3. `sort-filter` ignores a `priority` sort or filter in the address for an unranked list (it behaves as the default flat order).
  4. Moving an item up or down on an unranked list swaps it with its neighbour across the whole list; on a ranked list it still moves within its priority group.
  5. Switching ranked off then on leaves every stored `priority` and `sort_order` as it was.

### P12 · app: unordered list screens (R8d · FG-804, wave 11)
- Lane: `app`
- ownedFiles:
  - `src/app/(public)/l/[slug]/page.tsx`
  - `src/features/wishlists/components/ListFilters.tsx`
  - `src/features/wishlists/components/ListFilterDialog.tsx`
  - `src/app/(owner)/owner/lists/[listId]/page.tsx`
  - `src/features/wishlists/components/GiftForm.tsx`
  - `src/features/imports/components/ImportWizard.tsx`
  - `src/features/wishlists/components/NewListForm.tsx`
  - `src/features/wishlists/components/ListSettingsDialog.tsx` (new)
  - `tests/e2e/ordering.spec.ts`
- Acceptance criteria:
  1. The new-list form offers "Most wanted first" or "No particular order"; the editor's List settings dialog changes it.
  2. On an unranked list the family page shows one flat list, no priority ribbons, no priority sort option or filter, and the "no particular order" note, at phone and desktop widths.
  3. On an unranked list the editor shows no ribbons, the gift form and import wizard show no priority control, and reordering works across the list.
  4. A ranked list looks and behaves exactly as before.

### P13 · docs: decision record for R8d (R8d · FG-804, wave 12)
- Lane: `app`
- ownedFiles:
  - `Docs/FamilyGifts/Decisions/0030-unordered-lists.md` (new)
- Acceptance criteria:
  1. Status Agreed; covers D20 to D22 and says stored priorities are kept when a list is switched to unranked.

## Follow-ups

- "See my list as the family sees it" preview.
- Owner session is 12 hours; a member whose edit session lapsed is asked for their PIN only on edit. Revisit if that is annoying.
- Email or push notice to the admin about a waiting member, and to the member when approved.
- Merge an old anonymous guest into a member after sign-up, beyond the one-time adoption in D3.

## Resolved questions

- **Brand link for the member → D10.** Always `/`.
- **Own list in the family grid → D13.** Shown, marked and linked to the editor.
- **Q1 · Who can sign up → D6, D15.** Anyone, throttled per address; they browse and reserve at once, and the admin approves them before they can create or edit lists.
- **Q2 · Unpublish → Non-goals.** Not now.
- **Q3 · Your own list at `/l/{slug}` → D14.** Redirects to the editor.

## Open questions

- None.
