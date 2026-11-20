# Manual testing: one account for viewing and editing, own lists, drafts and unordered lists (FG-003)

**Spec:** `Docs/FamilyGifts/Specs/2026-11-20-FG-003-unified-accounts-and-own-lists.md`
**Branch / PR:** `feature/FG-80x-…` (one per release, stacked)
**Work items:** FG-003 · tasks FG-801 (R8a), FG-802 (R8b), FG-803 (R8c), FG-804 (R8d)
**Environment:** Test (a hosted preview with a Supabase Postgres, migration `0002_unified_accounts` applied) and a real phone for the 375 px cases.
**Covers:** all four releases. The rules of FG-001 and FG-002 are tested by their own documents and should still pass in full.

## What changed

### R8a · Linked accounts (FG-801)

- **One sign-in.** A PIN sign-in signs the browser in as the member and as a viewer, so a member can reserve gifts on other lists.
- **Sign up with a PIN.** The welcome screen has an optional PIN. A name and PIN make an account that can browse and reserve at once; the admin approves it before it can create or edit lists.
- **Your own list is off limits.** You can never reserve or show interest on your own list, even with a crafted request.

### R8b · Navigation and home (FG-802)

- **Brand goes home.** The top-left logo always opens the family home.
- **One menu.** Members get "Browse family lists"; plain guests get "Set a PIN".
- **Home knows you.** It greets you by name, and your own list is first, marked "Your list" with Edit.
- **Admin.** Members waiting for approval are marked, with an Approve button.

### R8c · Own lists and drafts (FG-803)

- **New list.** A member creates a list and saves it as a private draft or publishes it.
- **Publish.** A draft is invisible to everyone else until published.

### R8d · Unordered lists (FG-804)

- **No particular order.** A list can be marked unordered: one flat list, no priority groups, sort or filter.

## Setup

- Members: Sarah and Alex with PINs, each with a Christmas list and a few gifts; Mia with no PIN. One archived list from last year.
- Devices: two browsers (A and B) on a laptop and one real phone.
- Know the admin password.

## Change checklist

| ✓ | Release | Work item | Change | Spec ref | Test case |
|---|---|---|---|---|---|
| ☐ | R8a | FG-801 | PIN sign-in is also a viewer sign-in | D3, D4, D5 | 1 |
| ☐ | R8a | FG-801 | Sign up with a name and PIN; approval | D6, D15 | 2, 3, 10 |
| ☐ | R8a | FG-801 | Names stay in step; disabling works | D7, D8 | 4 |
| ☐ | R8a | FG-801 | No reserving on your own list | D9 | 5 |
| ☐ | R8b | FG-802 | Brand goes home; menu items | D10, D11, D12 | 6, 7 |
| ☐ | R8b | FG-802 | Home shows you and your list | D13 | 8 |
| ☐ | R8b | FG-802 | Own list opens the editor | D14 | 9 |
| ☐ | R8b | FG-802 | Admin sees self sign-ups | D15 | 10 |
| ☐ | R8c | FG-803 | Create own list, draft or published | D16, D19 | 11 |
| ☐ | R8c | FG-803 | Drafts are private; Publish | D17, D18 | 12 |
| ☐ | R8d | FG-804 | Unordered lists | D20, D21, D22 | 13, 14 |

## Test cases

### R8a · Linked accounts (FG-801)

### 1. PIN sign-in is a viewer too
In browser A open `/owner/login`, pick Sarah and enter her PIN. Then open `/` and one of Alex's lists.
- You are signed in on the family pages (your name in the top bar, not "Pick your name").
- You can reserve a gift on Alex's list and see it in My planner.
- A wrong PIN signs in nothing; many wrong PINs are throttled.

### 2. Sign up with a PIN
In browser B on `/welcome` enter a new name "Zed" and a PIN of 6 to 12 digits.
- You land signed in as Zed, with a note "Waiting for admin approval" and no My list or Add a gift.
- Zed can open Sarah's list and reserve a gift, and it shows in Zed's planner.
- Zed's PIN sign-in on `/owner/login` signs in as a viewer only, with the waiting message, until approved.
- A PIN under 6 digits shows an error and creates nothing.

### 3. Name already taken
Sign out and sign up again as "Sarah" with a PIN.
- You see "Someone with that name already exists" and nothing is created.
- Signing up with a name and no PIN still makes an ordinary guest, as before.

### 4. Names stay in step; disabling
As Zed (after test 10's approval, or before it) use Change my name to "Zeddy". Reserve a gift as Zeddy. In the admin page rename Zeddy to "Zedd", then deactivate them.
- Every reservation label and the admin card show the current name.
- After deactivation Zedd's PIN no longer signs in and their open sessions are signed out.

### 5. Your own list
Signed in as Sarah, try to reach Sarah's own list from a saved `/l/{slug}` link.
- You never see reserve buttons or "reserved" markers on your own list (see test 9).
- With the developer tools, a reserve request for one of your own gifts is refused with "This is your own list".

### R8b · Navigation and home (FG-802)

### 6. Brand goes home
As Sarah, on an owner page and on a family page press the top-left logo.
- Both go to `/` and you are still shown as signed in.
- The admin pages' logo still goes to `/admin`.

### 7. The menu
Open the name chip as Sarah, then as an unnamed-PIN guest (Mia's browser).
- Sarah: My list, All my lists, Browse family lists, My planner, Change my name, Save access, Change my PIN, Sign out, in that order.
- The guest has today's items and Set a PIN. Setting a PIN turns the menu into the member menu with no second sign-in.
- Sarah's Sign out signs out of both with no recovery-link prompt.
- On a phone there is exactly one navigation (the tab bar) and it has four tabs.

### 8. Home
As Sarah open `/`.
- "Hi Sarah" and your chip show.
- Your card is first, tinted, marked "Your list" and says Edit; the others say Open.

### 9. Your own list page
As Sarah open Sarah's `/l/{slug}`.
- You are taken to the editor. Sign out of the owner session only (clear the `fg_owner` cookie) and open it again: you are taken to the owner sign-in, never to a family view.

### 10. Admin view
In the admin page.
- Zed shows "Waiting for approval" with an Approve button; admin-made members do not.
- After Approve, the pill and button go. Zed signs in with the PIN again and now has My list, New list and the full member menu (the test 7 order).

### R8c · Own lists and drafts (FG-803)

### 11. Create a list
As Sarah press New list from `/owner` and from the menu; make one as a draft and one published.
- The form needs a title and a year from 2000 to 2100.
- The new lists are Sarah's, whoever is signed in (try the admin page: they appear under Sarah).

### 12. Drafts and publish
With Sarah's draft: look at it from browser B as Alex.
- Alex does not see it on `/`, and its `/l/{slug}` is not found. Sarah sees "Your drafts" on her home and a Draft pill.
- Its editor shows Publish and "Only you can see this", not a share card.
- After Publish, Alex sees it on `/` and can open it; the share card appears for Sarah. Publishing twice changes nothing.
- The admin Lists page shows the draft with a Draft pill and no copy-link button.

### R8d · Unordered lists (FG-804)

### 13. Make a list unordered
Create a list with "No particular order", add several gifts, then view it as Alex.
- One flat list, no ribbons, no priority sort or filter, and the "no particular order" note, on phone and laptop.
- The editor has no ribbons or priority field (gift form and Amazon import) and up/down moves a gift across the list.

### 14. Switch back
In List settings set the list back to "Most wanted first".
- The old groups come back exactly as they were.

### 15. Switches
- A ranked list looks and behaves exactly as before FG-003.
- Everything in FG-001 and FG-002 documents still passes.

## Watch for

- Console errors when the menu changes after setting a PIN.
- A claim marker ever appearing on your own list, in the editor or elsewhere.
- Names that disagree between the top bar, reservations and the admin page.
- Old (pre-migration) lists all still visible on the home page.

## Known and accepted

- **Edit sign-in:** after 12 hours the owner session lapses; you stay named and are asked for your PIN only when you edit.
- **No unpublish, no preview** of your own list as the family sees it (spec follow-ups).
- **Open sign-up:** anyone with the link can make an account and browse and reserve; only editing waits for the admin. No email or push notice either way.

## Quick pass / fail summary

| # | Release | Area | Pass / Fail | Notes |
|---|---|---|---|---|
| 1 | R8a | PIN sign-in is a viewer | | |
| 2 | R8a | Sign up with a PIN | | |
| 3 | R8a | Name taken | | |
| 4 | R8a | Names and disabling | | |
| 5 | R8a | Own list refused | | |
| 6 | R8b | Brand | | |
| 7 | R8b | Menu | | |
| 8 | R8b | Home | | |
| 9 | R8b | Own list page | | |
| 10 | R8b | Admin | | |
| 11 | R8c | Create a list | | |
| 12 | R8c | Drafts and publish | | |
| 13 | R8d | Unordered | | |
| 14 | R8d | Switch back | | |
| 15 | all | Regression | | |
