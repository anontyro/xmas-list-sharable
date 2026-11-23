# 0029 · Members create their own lists, and a draft is private until published

**Status:** Agreed · **Work items:** FG-803 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-20-FG-003-unified-accounts-and-own-lists.md` D16 to D19

`createOwnList({ title, occasion, year, draft })` makes a list for the member who holds the editor session. Who owns it comes from the session, never from the input, and a waiting member has no editor session, so they cannot. The admin's `createList` goes through the same `insertList` (one random-slug retry loop) and always publishes.

A draft is a list whose `published_at` is null. It is left out of the family page, earlier years and `getListBySlug`, so its share link is "not found" for everyone, its owner included, who edits at `/owner/lists/{id}`. The owner sees it with a "Draft" pill on `/owner`, in the editor (which shows Publish and "Only you can see this" instead of the share card) and under "Your drafts" on their home page. The admin Lists page shows the pill and no copy-link button. `publishList` sets `published_at` once and is safe to repeat. There is no unpublish.

A new list is started from "New list" on `/owner`, from the account menu, or at `/owner/lists/new`, which offers "Create and publish" and "Save as a draft".

## Why

Members were the only ones who could not make a list; the admin did it for them. A draft lets someone build a list in private, with no half-finished gifts on show, before the family sees it. Treating "published" as a nullable timestamp keeps one column for the state and the time, and backfilling it for existing lists keeps every old list visible. Unpublish was left out because a list that has been shared may already have reservations on it, which makes taking it back a different feature.

## Consequences

- Any code or fixture that inserts a list must set `published_at`, or it makes a draft nobody else can see. The demo seed and the test helpers do.
- Because a draft is unreachable by others, nobody can hold a reservation on it; the planner needs no change.
- The account menu now marks the page you are on (`aria-current="page"`), including the new "New list" entry.
