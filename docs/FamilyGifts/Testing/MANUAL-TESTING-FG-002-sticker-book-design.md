# Manual testing: Sticker Book design (FG-002)

**Spec:** `Docs/FamilyGifts/Specs/2026-11-17-FG-002-sticker-book-design.md`
**Branch / PR:** `feature/FG-5xx-…` and `feature/FG-6xx-…` (one per release, stacked)
**Work items:** FG-002 · tasks FG-501 to FG-701
**Environment:** Test (a hosted preview with a Supabase Postgres) and a real phone for every 375 px case. Compare each screen with `docs/family-gifts-design/reference/NN-name.html` opened in a browser at the same width.
**Covers:** the re-skin and the new flows. The rules of FG-001 are tested by `MANUAL-TESTING-FG-001-family-gifts.md`, which should still pass in full after each release.

## What changed

### R5a–R5b · Theme, stickers and components (FG-501, FG-502)

- **Look.** Cream dot-grid page, ink borders with hard shadows, red and green buttons, Lilita One headings, a visible focus ring, sticker icons instead of the old icons.
- **Gift pictures.** A gift shows its product picture, or a sticker chosen from its title when there is none.

### R5c · Shells and navigation (FG-503)

- **Top bar, tabs and account menu.** Links on desktop, bottom tabs on phones, a name chip with a menu (change name, save access, sign out of this device).
- **Wishlist shortcut.** Goes to the last list the guest opened.

### R5d · Welcome and sign-in (FG-504)

- **Welcome screen.** "I'm shopping" asks for a name; "I own a list" is the owner sign-in with name buttons and a PIN. A recovery link can be pasted.

### R5e · Family and wishlist (FG-505)

- **Family page.** Avatar cards with gift counts, a countdown to Christmas, the planner at a glance, earlier years.
- **List page.** Ribbons by priority, gift rows, a sort and filter sidebar (a filter dialog on phones).

### R5f · Planner and access (FG-506)

- **Planner.** A card per recipient, a budget meter, a shopping list with exports.
- **Budget and notes page** and **Save your access page** (the link is shown once, when made).

### R6a–R6b · Owner screens (FG-601, FG-602)

- **Editor, Add / edit gift, Amazon import, owner PIN.** One screen per task, with a live preview, a "what we found" list, and ticking, priority and price per imported gift.

### R6c · Admin (FG-603)

- **One screen.** A card per member with PIN, rename, archive and deactivate; Add a member (picture and PIN); Create a list; a Lists tab.

### R7 · Polish and gates (FG-701)

- **States.** Empty, loading and error screens in the same style; every page checked at phone and desktop widths and for accessibility.

## Setup

- A Test deployment with the three environment variables set, migrations applied (including `0001_member_avatar`) and the household seeded.
- Members: Sarah, Alex, Nana and Mia (give Mia no PIN), each with a Christmas list and a few gifts with and without prices, plus one archived list from last year.
- Devices: a real phone (iPhone and Android if possible), a laptop, and a second browser for the guest cases.
- Have the design pack open for comparison.

## Change checklist

| Done | Release | Work item | Change | Spec decision | Test case |
|---|---|---|---|---|---|
| ☐ | R5a | FG-501 | Theme, fonts, focus ring | D46–D49 | 1 |
| ☐ | R5b | FG-502 | Stickers, components, gift pictures | D50–D53 | 2 |
| ☐ | R5c | FG-503 | Shells, account menu, sign out, last list | D54–D58 | 3, 4 |
| ☐ | R5d | FG-504 | Welcome, owner sign-in, paste recovery link | D59–D63 | 5, 6 |
| ☐ | R5e | FG-505 | Family page, countdown, earlier years | D64–D68 | 7 |
| ☐ | R5e | FG-505 | List page, filters | D69–D71 | 8 |
| ☐ | R5f | FG-506 | Planner and meter | D72–D73 | 9 |
| ☐ | R5f | FG-506 | Budget and notes, Save your access | D74–D75 | 10, 11 |
| ☐ | R6a | FG-601 | Owner editor, Add / edit gift | D76–D78 | 12, 13 |
| ☐ | R6b | FG-602 | Amazon import page, owner PIN page | D79–D81 | 14, 15 |
| ☐ | R6c | FG-603 | Admin on one screen | D82–D84 | 16, 17 |
| ☐ | R7 | FG-701 | States, accessibility, phone gate | D85–D86 | 18, 19 |

**Not run yet (nothing below is ticked):** the automated suites cover every screen at 375 px and 1280 px, but a real phone, a real Supabase database, the Vercel image handling, the iOS home-bar spacing and a screen reader have not been tried. Those are what cases 2, 19 and the "Watch for" list are for.

## Test cases

### R5a–R5b · Theme and stickers (FG-501, FG-502)

### 1. Look and feel
Open `/`, a list and the admin page on a phone and a laptop.
- Cream background with faint dots, thick dark borders and hard shadows on cards and buttons, headings in the chunky font, body text readable.
- Tab through the page: every control shows a dark focus outline (cream on the red bar). Links are always underlined.
- With the system's reduced-motion setting on, nothing animates.

### 2. Gift pictures
Look at a list with gifts that have a product picture, gifts that do not, and one with a broken picture link.
- A gift with a picture shows it in a round frame; one without shows a sticker that suits its title (socks, book, candle…); the broken one falls back to a sticker.
- Reloading shows the same sticker for the same gift.

### R5c · Shells and navigation (FG-503)

### 3. Navigation
At 375 px and at 1280 px, as a named guest, an owner and the admin.
- Phone: bottom tabs only, the active one highlighted. Desktop: links in the red bar only. The same destinations in both.
- Guest: Family, Wishlist (the last list opened), My planner. Owner: My list. Admin: Members.

### 4. Account menu
As a guest open the name chip.
- Change my name renames you and your reservations show the new name. Save access, My planner and I own a list work.
- Sign out of this device with no recovery link asks first; with a link it signs out at once. Opening your recovery link brings you back with your reservations.
- Escape and clicking outside close the menu and focus returns to the chip.

### R5d · Welcome and sign-in (FG-504)

### 5. Welcome
Open a list link in a private window, press the name prompt, enter a name.
- A split screen (red panel and form on desktop, red band above on phones); "Let's go" returns you to the list; a made-up return address in the link goes to the family page.

### 6. Owner sign-in and recovery paste
Press "I own a list", tap a name, enter the PIN. Then on the welcome screen use "Use recovery link" with a real link.
- Wrong PINs show the generic message and the pause message after too many. A sign-in link from the admin fills the name and PIN.
- A valid pasted link signs you in as the original guest; an old or made-up one says it doesn't work.

### R5e · Family and wishlist (FG-505)

### 7. Family page
- Cards show avatar, name and gift count. The countdown shows only for a current-year Christmas list. The planner card shows only when named, with the right figures. Earlier years opens the archived lists, read-only.

### 8. List page
- Ribbons and rows match the design; reserving, interest and purchase work and the status is always in words.
- Sort buttons, priority, the price slider and Available only change the list and the address; a copied address shows the same view. On a phone "More filters" opens the same controls.

### R5f · Planner and access (FG-506)

### 9. Planner
- A card per recipient with budget, rows, paid prices and private notes; the totals and meter agree with the figures in FG-001 case 17. Copy list, Markdown and CSV work for the selected rows.

### 10. Budget and notes
- Set total and per-person budgets, open Edit note on a gift, change the price paid and note, Save; the planner updates. Cancel changes nothing.

### 11. Save your access
- Make a link: it shows once with a Copy button. Reload: the status says active and the link is not shown. Make a new link or turn it off and the old one fails.

### R6a–R6b · Owner screens (FG-601, FG-602)

### 12. Owner editor
- Up and Down reorder within a priority group, Edit opens the gift page, the share card copies the link, and nothing about reservations appears anywhere.

### 13. Add and edit a gift
- Paste a real product link: fields fill and "What we found" ticks what it found; a blocked link shows the by-hand message and the form still works. The preview changes as you type. Remove asks first.

### 14. Amazon import
- Paste a saved Amazon wishlist: tick and untick, change a priority, add a missing price, remove one, add the rest. Added gifts sit in the right groups; duplicates are skipped; random text shows the fallback.

### 15. Owner PIN
- Change my PIN works from the menu; the admin can still reset it afterwards.

### R6c · Admin (FG-603)

### 16. Members and lists
- Add a member with a picture and a PIN, and one with no PIN ("PIN not set", red Set PIN). Reset PIN opens a dialog and shows the sign-in links after saving; the link with the PIN fills the owner sign-in form, and the old PIN stops working. Rename (with a new picture), Archive list (per list), Restore (on the Lists tab) and Deactivate work, ask first where they should, and the family page follows. Copy link puts the full address on the clipboard. `/admin/members/<id>` goes to `/admin`.

### 17. Admin privacy
- No page shows who reserved or planned anything.

### R7 · Polish and gates (FG-701)

### 18. Empty and error states
- An empty list, a new member with no list, an empty planner, an empty Lists tab and an unknown list or year link each show a friendly screen; a slow page shows "One moment…". To see "Something went wrong" with Try again, stop the database briefly and open a page (the automated tests only check how it looks).

### 19. Phone and accessibility
On a real phone run: welcome, reserve, planner, save access, owner add gift, import, admin.
- No sideways scroll, buttons easy to tap, text readable, bottom tabs clear of the home bar.
- With a screen reader or VoiceOver on, buttons, ribbons, the meter and the status pills read sensibly.

## Watch for

- Fonts flashing or not loading on the first visit, and layout jumping when stickers load.
- Anything that looks right in the mockup but loses a word the old screen had (statuses, errors, help text).
- A control that is only reachable by hover or mouse.
- Owner or admin pages showing a guest's name, reservation or note.
- The sticker outline looking heavy on small icons.

## Known and accepted

- **Recovery link shown once:** the mockup shows it on every visit; the app stores only a hash.
- **Status wording:** "Reserved by Sam" rather than the mockup's "Reserved · Sam".
- **Currency:** GBP only, shown as a fixed pill.
- **Countdown:** only for Christmas lists in the current year.
- **No dark mode.**
- **Admin phone tabs:** Members and Lists only. Sign out is in the top bar at every width.
- **Archive is per list** on the admin member card, not one button per member.
- **No warning** when leaving the import page with edits not added.
- **No Content-Security-Policy** yet (a follow-up).

## Quick pass / fail summary

| # | Release | Area | Pass / Fail | Notes |
|---|---|---|---|---|
| 1 | R5a | Look and feel | | |
| 2 | R5b | Gift pictures | | |
| 3 | R5c | Navigation | | |
| 4 | R5c | Account menu | | |
| 5 | R5d | Welcome | | |
| 6 | R5d | Owner sign-in and recovery paste | | |
| 7 | R5e | Family page | | |
| 8 | R5e | List page | | |
| 9 | R5f | Planner | | |
| 10 | R5f | Budget and notes | | |
| 11 | R5f | Save your access | | |
| 12 | R6a | Owner editor | | |
| 13 | R6a | Add and edit a gift | | |
| 14 | R6b | Amazon import | | |
| 15 | R6b | Owner PIN | | |
| 16 | R6c | Members and lists | | |
| 17 | R6c | Admin privacy | | |
| 18 | R7 | Empty and error states | | |
| 19 | R7 | Phone and accessibility | | |
