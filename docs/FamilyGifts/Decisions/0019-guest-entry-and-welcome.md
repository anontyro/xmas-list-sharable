# 0019 · New visitors enter a name on a welcome screen, return paths are validated, and a pasted recovery link signs a browser in

**Status:** Agreed · **Work items:** FG-504 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-17-FG-002-sticker-book-design.md` D59, D60, D61, D62, D63

Naming, signing in as an owner and signing in as the admin all happen on one chrome-free frame: a red brand panel beside a white form panel (stacked on phones, side by side from 860 px). The pages live in a `(welcome)` route group with no top bar and no tabs.

- **One frame, two doors.** `/welcome` and `/owner/login` show a switch, "I'm shopping" and "I own a list". Both are links, so it works without script. `/owner/login` stays the owner's address because the admin's sign-in links and decision 0004 use it. `/admin/login` and `/recover` use the same frame without the switch. The brand pill reads "Christmas" and the current year.
- **Naming.** `/welcome?next=<path>` asks "Your name" and calls `createGuest` on "Let's go": the same rules as before (trimmed, 1 to 40 characters, a blank name is refused; at most 20 new guests per address per 15 minutes; a browser that already has a guest keeps it). A visitor who already has a name is sent straight to `next` without seeing the form.
- **Where to go next.** `safeNext` (run on the server) allows only `/`, `/planner`, `/access` and one list page with an optional query (`/l/<10 character slug>`). Anything else, including other sites, `//host` and backslash tricks, becomes `/`.
- **Reading before naming.** A visitor with no name can still read a list, but sees a note with a button to `/welcome?next=/l/<slug>` instead of any Reserve or Interested control. The top bar shows a "Pick your name" link that returns to whatever page they were on. The old inline name form is gone; renaming is in the account menu.
- **Recovery link on the welcome screen.** "Use recovery link" opens a field. `tokenFromPastedLink` accepts the whole link, the path without the host, or the bare 43 character token, with spaces or line breaks around it, and nothing else. The field is emptied as soon as it is read. The token is sent only in the body of the existing exchange request (one helper, `exchangeRecoveryToken`, shared with `/recover`), never in an address, a log or storage. Success goes to `/planner`; a bad paste, a wrong, replaced or turned-off token and a throttled address each show a message, and the failures for a bad token all read the same.
- **Owner sign-in.** "Whose list?" shows each active member as a radio button drawn as a sticker button, selected in yellow. The real radio is laid invisibly over the whole button, so a tap anywhere on it works and the arrow keys move between names. Below it, one PIN field (`type=password`, `inputmode=numeric`, `autocomplete=current-password`), the help "6 or more digits. Too many wrong tries pauses sign-in for a few minutes.", the button "Open my list" and "Lost your PIN? Ask the family admin.". The `?name=` and `?pin=` prefill from decision 0004 still only fills the form and is removed from the address bar at once. Failures and throttling are unchanged, with the one generic message.
- **Admin sign-in.** One field, "Admin secret", and "Sign in", on the same frame. Same throttle and generic failure message.
- **Labels on thick borders.** Floating field labels get a white backing instead of a notch cut into the 3 px border.

## Why

A shared list link is how most people arrive, so reading comes first and naming is asked for only when someone wants to act. A return path that came from a link is untrusted, so only the app's own pages are allowed. The recovery token is as strong as a password, so it is treated like one: body only, field cleared, never stored. One frame for the three entrances keeps the sign-in screens consistent, and links for the switch mean it works even before the page's script loads.

## Consequences

- Someone who clears their cookies becomes a new guest unless they paste their recovery link; names need not be unique, so two guests can share one.
- Returning to a filtered list view after naming is possible (the query is kept for lists), but other pages' queries are dropped.
- The admin door is only reachable by address; there is no link to it from the welcome screen.
- A visitor with no name has to take one extra step before reserving, and the throttle on new guests applies to shared networks as before.
