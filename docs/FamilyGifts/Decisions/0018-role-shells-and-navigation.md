# 0018 · Each role has its own shell, a guest can sign out of a device without losing their data, and the last list is remembered

**Status:** Agreed · **Work items:** FG-503 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-17-FG-002-sticker-book-design.md` D54, D55, D56, D57, D58

The single app-wide top bar is replaced by one shell per kind of visitor. The root layout only provides the theme and fonts; the chrome comes from the route group's own layout.

- **Shells.** `(public)` renders `GuestShell`, `(owner)` renders `OwnerShell`, `(admin)` renders `AdminShell`. Each hands `ShellFrame` its links and whatever sits on the right of the bar. `ShellFrame` is the red `TopBar` (brand, links), the page, and the `TabBar`, filling the screen so the tabs sit at the bottom on short pages.
  The top links show from 860 px and the tabs below it, never both, so there is exactly one "Main" navigation on screen. The tab bar is left out when there is only one place to go. The current item is marked with `aria-current="page"` from the path (`/` matches only itself; other items match their path and anything beneath it).
- **Who sees what.** A guest sees Family always, and Wishlist and My planner (tab label Planner) once they have a name. An unnamed visitor sees only Family and no account chip. An owner sees "My list" (their newest list that is not archived, else `/owner`) and an "Owner" pill. The admin sees Members, an "Admin" pill and a Sign out button that is always visible, because admin has no menu. A signed-out owner or admin page shows just the brand, and the pages still redirect to sign-in as before.
- **Account menu.** The name chip opens an MUI menu (290 px, card style) that closes on Escape and outside click and returns focus to the chip.
  Guest: name and "Shopping on this device"; Change my name (a dialog that renames through `renameGuest`, so every reservation shows the new name); Save access (recovery link) (still the dialog); My planner; I own a list (PIN); and, in the danger colour, Sign out of this device with the note "You'll need your recovery link to get back in.".
  Owner: name and "List owner"; My list; All my lists; Sign out.
- **Guest sign-out.** `signOutGuest()` ends only this browser's guest session and clears `fg_guest`. The guest, their claims, planner and recovery link stay, and the guest's other devices stay signed in. With no recovery link the menu first asks "Sign out without a recovery link?" (Cancel or Sign out); with one it signs out at once. Either way the page goes to `/`. Owner sign-out ends the owner session and goes to `/owner/login`. The sign-out buttons that sat on the owner and admin pages moved into the shells.
- **Last list.** The list page runs `RememberList`, which writes the non-HttpOnly cookie `fg_last_list=<slug>` (site-wide, `SameSite=Lax`, 180 days, `Secure` on https) once the page has loaded. `GuestShell` accepts only a 10 character letters-and-digits slug and uses it for the Wishlist link; anything else is ignored and the link goes to `/`. The slug is not secret to someone who already opened the list.

## Why

Guests, owners and the admin need different things on screen, and one bar with conditionals for all three made each harder to reason about and to test. Letting each route group own its chrome keeps the roles apart, in line with the rule that owner and admin code never touches guest data. Sign-out was missing for guests, and without a recovery link it can lose their reservations, so it asks first. The Wishlist shortcut needs no stored data: a cookie holding a list they already viewed is enough.

## Consequences

- The Wishlist link can point at a list that has since been archived or removed; the guest then sees that list's usual archived notice or not-found page.
- The cookie is written after the page loads, so leaving a list within the first instant may keep the previous one.
- Owners and the admin have a single destination for now, so they get no tab bar; the admin's Sign out button is in the bar at every width. "Add a gift", "Import", the admin Lists tab and "Change my PIN" are added by later releases.
- A visitor who has not yet given a name gets no way to do so from the bar until the welcome release adds a "Pick your name" chip; they still name themselves on the list page.
- Save access is still a dialog until the access page replaces it.
