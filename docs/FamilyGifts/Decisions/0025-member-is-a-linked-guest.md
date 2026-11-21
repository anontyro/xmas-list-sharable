# 0025 · A member is a guest with a link, so one PIN sign-in is both an editor and a viewer

**Status:** Agreed · **Work items:** FG-801 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-20-FG-003-unified-accounts-and-own-lists.md` D2, D3, D4, D5, D7

`guest.member_id` (nullable, unique, references `member`) links a member to exactly one guest, their viewer side. Claims, interest, planners and recovery links stay on the guest id.

- **Linking.** `ensureLinkedGuest(memberId)` returns the member's existing guest; else adopts this browser's current guest if it is linked to nobody (keeping its reservations and planner, and taking the member's name); else creates a guest with the member's name. A guest linked to another member is never relinked. Two sign-ins at once cannot make two guests (the unique index decides).
- **Sign-in.** A correct PIN verifies as before, then signs the browser in as the linked guest (`fg_guest`, 180 days) and, for an approved member, as the owner (`fg_owner`, 12 hours). The cookies and lifetimes of decision 0003 are unchanged.
- **Principal.** The guest principal carries `memberId` (null for an ordinary guest). `getViewer()` returns the guest (with `memberId` and `pending`) and the owner, each or neither, and is what shells and pages ask.
- **One name.** Renaming a linked guest renames the member in the same transaction, and the admin renaming a member renames the linked guest. A name clash rolls both back.

## Why

Moving claims and planners to member ids would touch every reservation and planner query. A link touches none of them, and keeps the rule that owner and admin code never reads claims: a member's editor side still has no access to claim data. Keeping two cookies means an expired editor session still leaves the person recognised by name.

## Consequences

- When the owner session lapses (12 hours) a member is still named and browsing, and is asked for their PIN only when they edit.
- Signing in on a browser that holds a guest linked to another member replaces that guest session; the other member's guest is untouched.
- A member and their guest share a name, so a plain guest may still share a name with a member but a member's name must stay unique among active members.
