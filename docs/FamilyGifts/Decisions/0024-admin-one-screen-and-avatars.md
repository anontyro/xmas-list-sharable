# 0024 · The admin manages members and lists on one screen, and a member's optional picture is validated in code

**Status:** Agreed · **Work items:** FG-603 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-17-FG-002-sticker-book-design.md` D82, D83, D84

The admin no longer opens a page per member. Everything a member needs is on one card, and adding a member can set a picture and a first PIN. The admin still never sees claims, interest, guests, planner data or recovery links (decision 0006).

- **Members screen (D82).** `/admin` has a sky hero "Family admin" ("Members, lists and owner PINs. Gift plans stay private.") and a card per member: picture (or first initial), name, a pill (Active, Inactive, or PIN not set), each non-archived list with its link in monospace, Copy link and Archive list, and the buttons Reset PIN, Rename and Deactivate. Reset PIN is a red "Set PIN" when no PIN is set. Reset PIN and Rename open dialogs; Archive list and Deactivate ask for confirmation first, and an inactive member has no Deactivate. Every button has the member's name in its accessible name, so the copies can be told apart.
  The Reset PIN dialog is the existing form (decision 0004). After saving it shows the sign-in link with the name and the link with the PIN just set, and the PIN is forgotten when the dialog closes. `/admin/members/[memberId]` redirects to `/admin`.
- **Lists tab (D83).** `/admin/lists` shows every list, active and archived, grouped by year (newest first) with the member, the link, Copy link and Archive or Restore. The admin nav is Members and Lists.
- **Adding members and lists (D84).** The sidebar has "Add a member" (display name, "Picture (optional)" as eight sticker buttons in a radio group plus "No picture", "Owner PIN" with its help text) and "Create a list" (member, occasion, year; the title is "<occasion> <year>").
  `createMember` takes `{ displayName, avatar?, pin? }`. The name rule is unchanged, the avatar must be one of `AVATAR_STICKERS`, the PIN must be 6 to 12 digits and is stored only as an Argon2id hash. With no PIN it stays unset and the member cannot sign in until the admin sets one. `renameMember(memberId, displayName, avatar?)` leaves the picture alone when `avatar` is left out and clears it when it is `null`. Both keep the admin-only check.
  The admin queries return the picture, whether a PIN is set (never the hash) and each member's lists with slug and archived state; a lists query returns every list with its member's name.

## Why

The admin is one person doing small jobs for a handful of relatives. One screen shows who has a PIN and a link, and lets each job be done where it is seen. The picture is a plain text column checked in code (decision 0020), so the choice of stickers can change without a migration, and an old value that is no longer in the list simply shows as an initial.

## Consequences

- The PIN is never returned or shown again. After the dialog closes only a reset will give a link that carries one.
- Archive is per list, not per member: a member with several open lists has an Archive list button on each, which is a small change from the one-per-card drawing.
- The phone tab bar has Members and Lists but not Sign out, which stays in the top bar at every width.
- List titles cannot be edited and a deactivated member cannot be reactivated (both are non-goals).
- A copied link needs the browser to allow clipboard writes; if it does not, the button says "Couldn't copy".
- Rename and Deactivate report "That member no longer exists" for an unknown member, like Set PIN does. The owner sign-in checks a member with no PIN against a dummy hash, so its timing matches a wrong PIN.
