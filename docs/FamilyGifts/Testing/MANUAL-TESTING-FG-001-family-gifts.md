# Manual testing: Family Gifts (FG-001)

**Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md`
**Branch / PR:** `feature/FG-001-family-gifts` (one PR per release)
**Work items:** FG-001 · tasks FG-101 to FG-402
**Environment:** Test (hosted Vercel preview with a Supabase Postgres, and a real phone browser for the 375 px cases).
**Covers:** all releases. Run the cases for a release when that release is deployed; cases for later releases are skipped until then.

## What changed

### R1a–R1b · Scaffold and database (FG-101, FG-102)

- **App shell.** A festive, mobile-friendly site with a pine green top bar and the Christmas icons.
- **Database.** Schema applied by migration; no visible change.

### R1c · Auth and admin (FG-103)

- **Admin area.** Sign in with the admin secret, add members, set or reset owner PINs, create, archive and restore lists.
- **Owner sign-in.** Members sign in with a 6+ digit PIN, with lock-out after repeated failures.

### R1d · Owner lists and sharing (FG-104)

- **Owner editor.** Owners add, edit, prioritise and delete gifts on their own lists.
- **Family dashboard and list pages.** Anyone with a link sees lists read-only; links are unguessable and not indexed.

### R2a · Guests and claims (FG-201)

- **Guest names.** Guests give a name once and keep it on that browser.
- **Interest and claims.** Interest, Reserve, Mark purchased and Release, with one winner per gift. Owners and admin never see any of it.

### R2b · Ordering and sorting (FG-202)

- **Owner order.** Move up and Move down within a priority group.
- **Guest sort and filter.** Sort by priority, price or newest, and filter, without changing the owner's order.

### R3a · Planner (FG-301)

- **My Planner.** Interests and claims grouped by recipient, with budgets, private notes, actual prices and totals.

### R3b · Exports (FG-302)

- **Copy and download.** A text shopping list, Markdown and CSV for selected entries.

### R3c · URL import (FG-303)

- **Paste a product link.** The owner gets an editable draft, or a fallback to manual entry.

### R3d · Amazon import (FG-304)

- **Paste an Amazon wishlist.** A preview table of drafts the owner can trim and add in one go.

### R4a · Recovery links (FG-401)

- **Save access.** A private link restores a guest's identity on another device; it can be revoked.

### R4b · Hardening (FG-402)

- **Security headers, backups and polish.** Headers, a backup and restore runbook, and mobile and accessibility fixes.

## Setup

- Environment variables set: `ADMIN_SECRET`, `SESSION_SECRET`, `DATABASE_URL`. Migration applied and `pnpm db:seed` run once.
- No feature flags.
- Test data:
  - Two members, "Alex" and "Sarah", each with a Christmas 2026 list of at least three gifts (one without a price).
  - One product URL that exposes JSON-LD (use a real shop page) and one that blocks bots.
  - A saved Amazon wishlist page (View source → copy) and a block of copied wishlist text.
- Users:
  - Admin (knows the secret).
  - Owner Alex, owner Sarah (6-digit PINs).
  - Guest 1 and guest 2 in two different browsers (or one normal and one private window), both named "Sam" in one case to check names need not be unique.
  - A phone with a different browser for recovery tests.

## Change checklist

| ✓ | Release | Work item | Change | Spec ref | Test case |
|---|---|---|---|---|---|
| ☐ | R1a | FG-101 | App shell, theme and icons | D4, D5 | 1 |
| ☐ | R1b | FG-102 | Schema and migration | D8–D11 | 2 |
| ☐ | R1c | FG-103 | Admin sign-in and setup | D12–D17 | 3, 4 |
| ☐ | R1c | FG-103 | Owner PIN sign-in and lock-out | D14, D15 | 5 |
| ☐ | R1d | FG-104 | Owner item CRUD | D21, D22, D24 | 6, 7 |
| ☐ | R1d | FG-104 | Dashboard, list page, archive, not-found | D18, D19, D23 | 8, 9 |
| ☐ | R2a | FG-201 | Guest name and session | D25 | 10 |
| ☐ | R2a | FG-201 | Interest, reserve, purchase, release | D26, D27 | 11, 12 |
| ☐ | R2a | FG-201 | Owner and admin isolation | D17, D29 | 13 |
| ☐ | R2b | FG-202 | Owner reorder | D31 | 14 |
| ☐ | R2b | FG-202 | Guest sort and filter | D32 | 15 |
| ☐ | R3a | FG-301 | Planner, budgets, notes, totals | D33–D36 | 16, 17, 18 |
| ☐ | R3b | FG-302 | Copy, Markdown, CSV | D37 | 19 |
| ☐ | R3c | FG-303 | URL import and fallback | D38–D40 | 20, 21 |
| ☐ | R3d | FG-304 | Amazon import | D41, D42 | 22 |
| ☐ | R4a | FG-401 | Recovery link and revoke | D43 | 23, 24 |
| ☐ | R4b | FG-402 | Headers, backup, mobile and accessibility | D44, D45 | 25, 26, 27 |

## Test cases

### R1a–R1b · Scaffold and database (FG-101, FG-102)

### 1. App shell
Open the site on a phone and on a desktop.
- Cream background, pine green top bar, rounded cards, a Christmas icon on the home page.
- At 375 px the navigation collapses into a labelled menu button and nothing scrolls sideways.
- Tab through the page: every link shows a focus ring.

### 2. Database
Check the deployed database after migration.
- Every table in the PRD exists and the household row exists exactly once.
- Re-running the migration changes nothing.

### R1c · Auth and admin (FG-103)

### 3. Admin sign-in
Go to `/admin` signed out, then sign in with a wrong secret, then the right one.
- `/admin` redirects to `/admin/login`.
- The wrong secret shows "Incorrect details or too many attempts. Try again later." and nothing else.
- The right secret opens the admin page; the session ends when you clear cookies.

### 4. Admin setup
Add members Alex and Sarah with PINs, create a Christmas 2026 list for each, rename one, deactivate a spare test member, archive and restore a list.
- Each list shows a `/l/<10 characters>` link with a working Copy button.
- Archived lists are labelled "Archived" in words and cannot be edited until restored.
- A deactivated member's lists disappear from the family page.
- No screen in the admin area shows a gift status, buyer or planner figure.

### 5. Owner PIN sign-in
At `/owner/login` pick Alex and try five wrong PINs, then the right PIN.
- Wrong PINs show the same generic message; the sixth attempt is refused even with the right PIN.
- After the block (about 15 minutes) the right PIN works.
- Resetting the PIN in admin signs out an existing owner session for that member.
- A PIN shorter than 6 digits is refused when set.

### 5a. Sign-in links and changing a PIN
In admin open a member, set a PIN and copy the sign-in link, then open it in a private window. Sign in, then use Change my PIN on the My lists page. Then reset the PIN again from admin.
- The member page shows a name-only link, and after saving a PIN a second link that includes it.
- Opening a link fills in the name (and the PIN) but does not sign in; the address bar shows plain `/owner/login` afterwards.
- A wrong current PIN, mismatched new PINs and a PIN that is not 6 to 12 digits are each refused with a message.
- After a successful change the old PIN no longer works, the new one does, and the browser stays signed in; other signed-in browsers are signed out.
- The admin reset still works after the owner has changed it, and signs the owner out.

### R1d · Owner lists and sharing (FG-104)

### 6. Add and edit gifts
Sign in as Alex and add three gifts: one with all fields, one title only, one with a bad link (`javascript:alert(1)`).
- The bad link is rejected with a clear message; the other two save.
- Items group under Most Wanted, Would Love, Nice to Have with words and icons; the default is Would Love.
- Editing a gift keeps its position in its group.

### 7. Delete and ownership
Delete a gift; then try to open Sarah's list id while signed in as Alex.
- A confirmation appears and does not mention reservations.
- The gift disappears from the owner and public pages.
- Sarah's list shows the not-found page.

### 8. Family page and list page
Open `/` and a list link in a private window.
- `/` shows a card per member with their lists; archived lists are not offered.
- The list page is read-only and shows images with alt text, prices, links and notes.
- `/robots.txt` disallows everything and the page has a noindex tag.

### 9. Archived and unknown links
Archive a list, then visit its link; then visit `/l/doesnotexist`.
- The archived list shows an Archived banner and its items, and no edit controls.
- The unknown link shows a friendly not-found page that names no member.

### R2a · Guests and claims (FG-201)

### 10. Guest name
As a new guest open Alex's list.
- A name prompt appears before any action; after saving, a reload does not ask again.
- Two browsers both using the name "Sam" are treated as two different people (reserving in one is "Reserved by Sam" to the other).
- Renaming a guest keeps their reservations.

### 11. Reserve and purchase
Guest 1 clicks Interested on two gifts and Reserve on one; guest 2 views the list.
- Guest 1 sees "Reserved by you" with Mark purchased and Release buttons.
- Guest 2 sees "Reserved by Sam" and no buttons for that gift; guest 2's own interest is not visible to guest 1.
- After Mark purchased, guest 2 sees "Purchased by Sam".
- Undo purchase asks for confirmation first.

### 12. Race
Have two guests press Reserve on the same gift at the same moment (two phones or two windows, press together a few times on different gifts).
- Exactly one wins each time; the loser sees "Someone else just reserved this" and the card updates.
- After the winner releases, the other guest can reserve it.

### 13. Owner isolation
As Alex (owner) look at your list; then as admin look at everything.
- No reservation, interest, purchase or buyer text appears anywhere, including in the page source.
- Deleting a gift that a guest has reserved shows no hint it was reserved.
- A signed-in owner who opens a list as a guest (in the same browser with the owner cookie) is still treated as a new guest and sees the guest view.

### R2b · Ordering and sorting (FG-202)

### 14. Reorder
As Alex move a gift up and down with the buttons, including with the keyboard.
- Move up is disabled on the first item in a group and Move down on the last.
- The order persists after refresh and appears in that order for guests.
- Changing a gift's priority puts it at the end of its new group.

### 15. Sort and filter
As a guest sort by price low-high and high-low, newest, then filter by priority, price range and Available only.
- The gift with no price is last in both price directions.
- Available only hides gifts reserved or purchased by others.
- Copying the address bar to another window reproduces the same view; Alex's own order is unchanged on his next visit.

### R3a · Planner (FG-301)

### 16. Planner basics
As guest 1 reserve gifts from both Alex's and Sarah's lists and mark interest in a third, then open My Planner.
- Entries are grouped by recipient with title, link, price (or "No price"), and status in words.
- Interest-only entries are shown under potential spend, not planned.
- Releasing a reserved gift from the planner works; removing it without releasing is refused with a clear message.

### 17. Budgets and totals
Set a £250 total budget and a recipient budget; mark one gift purchased with an actual price lower than the listed price and add a note.
- Planned, Spent, Potential and Remaining match a hand calculation, and the unpriced gift is counted as "1 item without a price".
- Setting the budget lower than planned shows remaining as over budget.
- The wishlist price shown to others is unchanged by the actual price.

### 18. Privacy and devices
Open the planner as guest 2, Alex and admin; then reload as guest 1 in a second tab.
- Nobody else sees guest 1's note, actual price or budget, in the page or in network responses.
- Deleting a reserved gift as the owner leaves it in guest 1's planner as "Removed by the owner" with its price still counted.

### R3b · Exports (FG-302)

### 19. Export
Select some entries and use Copy, Markdown and CSV; then clear the selection.
- The copied text groups by recipient and reads cleanly when pasted into Notes.
- The CSV opens in a spreadsheet; a gift titled `=1+1` shows as text, not a formula; commas and quotes survive.
- Notes appear only when "include notes" is ticked.
- With nothing selected the menu says "Choose at least one gift".

### R3c · URL import (FG-303)

### 20. URL import
As Alex paste the JSON-LD product link into the import panel.
- A draft fills the form with title, image and price; nothing is saved until Save is pressed.
- Adding the same link again shows a duplicate warning but still lets you save.

### 21. URL import failures
Paste the bot-blocking link, `http://localhost/`, `http://169.254.169.254/` and a non-HTML link.
- Each shows a friendly message ending with "You can still add it by hand" and the form stays usable.
- Twenty-one previews inside 15 minutes are throttled.

### R3d · Amazon import (FG-304)

### 22. Amazon import
As an owner open your list, press Import from an Amazon wishlist, paste the saved Amazon page (View source → copy), and press Parse. Remove one row, edit a title and press Add selected items; then try again with random text.
- The preview shows one row per product with its price; rows with a missing title or price show a warning, and a product already on your list says so.
- Nothing is on the list until Add selected items; Cancel adds nothing.
- Added items sit at the end of Would Love in preview order, with their Amazon link.
- A block of copied text with Amazon links also works (title on the line above each link).
- Random text shows "You can still add them by hand." and the Add a gift form still works.
- Pasting something over 500 KB is refused with a message, not an error page.

### R4a · Recovery links (FG-401)

### 23. Recovery
As guest 1 open Save access (top bar, or the menu on a phone), press Make a link, copy it, and open it in the other device's browser.
- A visitor who has not picked a name has no Save access.
- The warning about anyone with the link is shown.
- The address bar drops the part after `#` straight away, and the same planner, reservation and note appear.

### 24. Revoke
Generate a new link on device 1 and open the old link on a third browser; then revoke and try the newest.
- The old and the revoked links show a generic failure message.
- Device 2 stays signed in after a new link is generated.
- Turn off link makes the newest link fail the same way, and guest 1 stays signed in.
- Pressing the link more than 10 times in 15 minutes from one connection shows "Too many attempts".

### R4b · Hardening (FG-402)

### 25. Headers and secrets
Check response headers and page source on `/`, a list, `/owner/login` and `/recover`.
- `X-Content-Type-Options`, `X-Frame-Options` and the referrer policies are present.
- No secret from the environment appears in any page or script.

### 26. Backup and restore
Follow the restore test in `docs/FamilyGifts/Runbook.md`: run `scripts/backup.sh`, restore into a scratch database with `scripts/restore.sh <dump> <url>`, and compare `scripts/row-counts.sh` output for both.
- Counts match; restoring into a non-empty database is refused. The result is recorded in the Runbook. Repeat it once against the real Supabase project.

### 27. Phone and accessibility
On a real phone run: admin setup, owner adds a gift, guest reserves, planner, recovery.
- No horizontal scroll, buttons easy to tap, text readable, status never relies on colour alone, links are underlined.
- With the system's reduced-motion setting on there is no animation.

### 28. Toggles
- There are no feature flags; confirm the build has no leftover flag in `.env.example` or the code.

## Watch for

- Browser console errors after claim actions or when the planner updates.
- A guest's totals disagreeing between the planner header and the entries listed.
- Items appearing twice after a reserve then purchase.
- Cookies: `fg_admin`, `fg_owner` and `fg_guest` are separate, HttpOnly, and Secure on the real URL.
- The free-tier database sleeping after inactivity.

## Known and accepted

- **Owner using the guest link:** an owner who deliberately opens a guest view can see claim state; this is the PRD's stated trusted-family limit.
- **Amazon import:** can fail when Amazon changes its markup; manual entry always works.
- **Recovery:** losing the link and every browser session may lose a guest's data.
- **Currency:** GBP only; non-GBP prices from URL import are dropped with a warning.
- **No realtime:** another guest's change shows after a refresh or the next action.

## Quick pass / fail summary

| # | Release | Area | Pass / Fail | Notes |
|---|---|---|---|---|
| 1 | R1a | App shell | | |
| 2 | R1b | Database | | |
| 3 | R1c | Admin sign-in | | |
| 4 | R1c | Admin setup | | |
| 5 | R1c | Owner PIN | | |
| 6 | R1d | Add and edit | | |
| 7 | R1d | Delete and ownership | | |
| 8 | R1d | Family and list pages | | |
| 9 | R1d | Archived and unknown | | |
| 10 | R2a | Guest name | | |
| 11 | R2a | Reserve and purchase | | |
| 12 | R2a | Race | | |
| 13 | R2a | Owner isolation | | |
| 14 | R2b | Reorder | | |
| 15 | R2b | Sort and filter | | |
| 16 | R3a | Planner basics | | |
| 17 | R3a | Budgets and totals | | |
| 18 | R3a | Privacy and devices | | |
| 19 | R3b | Export | | |
| 20 | R3c | URL import | | |
| 21 | R3c | URL import failures | | |
| 22 | R3d | Amazon import | | |
| 23 | R4a | Recovery | | |
| 24 | R4a | Revoke | | |
| 25 | R4b | Headers and secrets | | |
| 26 | R4b | Backup and restore | | |
| 27 | R4b | Phone and accessibility | | |
| 28 | all | Toggles | | |
