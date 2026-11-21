# 0028 · The brand goes home, one account menu serves members, and a member's own list opens in the editor, never the family view

**Status:** Agreed · **Work items:** FG-802 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-20-FG-003-unified-accounts-and-own-lists.md` D10, D11, D12, D13, D14, D15

A member is both an editor and a viewer (decision 0025), so the chrome no longer depends on which cookie they arrived with. Both shells ask `getViewer()`.

- **Brand.** The top-left logo goes to `/` in the guest and owner shells; the admin shell keeps `/admin`. The old "Owner" pill is gone.
- **One menu.** `AccountMenu` takes `{ id, name, member? }`. A plain guest sees today's menu plus Set a PIN. A member with the editor session sees, in order: My list, All my lists, Browse family lists, My planner, Change my name, Save access (recovery link), Change my PIN, Sign out. A member waiting for approval sees no list entries, the line "Waiting for admin approval", and no Set a PIN or owner sign-in. An approved member without the editor session sees Sign in to edit (`/owner/login`) in place of the list entries and Change my PIN. A member's Sign out is `signOutMember` (both sessions), goes to `/`, and never asks about a recovery link.
- **Links.** Family pages for a member with the editor session: Family, My list, Wishlist, My planner. Owner pages: Family, My list, Add a gift, Import. Other visitors see what they saw before. There is still exactly one "Main" navigation at every width.
- **Home.** The greeting uses the viewer's name whichever way they arrived. The viewer's own list card is first, tinted, marked "Your list" and says Edit. It links to `/l/{slug}`, which is the same address everyone else uses, and that address redirects.
- **Your own list.** `/l/{slug}` for a list owned by the guest's linked member redirects to `/owner/lists/{id}` with a valid editor session, and to `/owner/login` without one. This is decided from `guest.member_id` before any claim state is read, so a lapsed editor session can never fall through to the family view. Tested by calling the page and asserting claim state is never requested.
- **Admin.** A member with `approved_at` null shows "Waiting for approval" and an Approve button on the admin card; Deactivate rejects them.

## Why

The disconnect between "viewer" and "user" came from deciding the chrome by cookie. Asking one question, who is this browser, removes it. Redirecting from the family address (rather than linking the card straight to the editor) keeps the dashboard data free of list ids and keeps one rule for every way of reaching your own list, including an old shared link.

## Consequences

- An owner session with no guest cookie (one made before this release) still gets the owner chrome, but "Browse family lists" opens the family page as an unnamed visitor until they sign in again.
- The Edit link on the home page goes through one redirect.
- "My planner" appears for every member, including a member whose own list is all they have; it is simply empty.
