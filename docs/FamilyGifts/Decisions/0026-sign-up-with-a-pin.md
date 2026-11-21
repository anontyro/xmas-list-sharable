# 0026 · Choosing a name and a PIN makes a member who can view at once and edit once the admin approves them

**Status:** Agreed · **Work items:** FG-801 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-20-FG-003-unified-accounts-and-own-lists.md` D6, D8 (and D15 for the admin's side)

On the welcome screen the PIN is optional. With no PIN the visitor is an ordinary guest, as before. With a PIN (6 to 12 digits) `createGuest(name, pin)` makes a member (`approved_at` null, PIN hashed with Argon2id), its linked guest and the guest session, in one transaction.

- **Waiting for approval.** A member with `approved_at` null is a full viewer (browse, reserve, planner) but gets no owner session. Signing in with their PIN sets only `fg_guest` and returns the error `PENDING_APPROVAL` ("You're signed in to browse. The admin will approve you before you can make a list."), so the existing sign-in form shows it. They get the owner session by signing in again after approval.
- **Approval.** `approveMember` (admin only) sets `approved_at` once and is safe to repeat. Members the admin creates, and every member that existed before the migration, are approved.
- **Names.** A name already held by an active member returns `NAME_TAKEN` and creates nothing. Plain guests may still share names.
- **Existing guests.** `addPin(pin)` turns a signed-in ordinary guest into a waiting member, keeping their id, reservations and planner.
- **Throttling.** The per-address cap on new guests covers PIN sign-ups too.
- **Disabling.** `deactivateMember` ends the member's owner sessions and their linked guest's sessions. Rejecting a waiting member is the same action.

## Why

Open sign-up is convenient for a family site, but letting anyone with the link create lists is not. Letting people browse and reserve straight away costs nothing, because the only things approval protects are lists other people will read. The existing sign-in form is reused, so the pending case comes back as an error result rather than a new success shape.

## Consequences

- Nobody is told that someone is waiting or that they were approved; the admin has to look at the members page.
- A waiting member holds their name while they wait.
