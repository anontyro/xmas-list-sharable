# 0030 · A list can be unranked: flat, with no priority, and stored priorities are kept

**Status:** Agreed · **Work items:** FG-804 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-20-FG-003-unified-accounts-and-own-lists.md` D20 to D22

`wishlist.ranked` is true by default (and for every list that existed before). A member chooses "Most wanted first" or "No particular order" on the new-list form and can change it, with the title, in the editor's "List settings" (`updateListSettings`, owner only, not on an archived list). Admin-made lists are ranked.

On an unranked list items are one flat list in `sort_order` then `created_at`, on the server (`itemOrderBy(ranked)`) and in the family page's sort (`sortItems(..., ranked)`). The family page shows no priority ribbons, no priority filter, and the default sort is called "List order"; a `priority` filter in the address is ignored; a note says "Gifts on this list are in no particular order." The editor shows no ribbons, the gift form and Amazon import ask no priority, and the arrows move a gift across the whole list (`moveItem` only limits itself to a priority group when the list is ranked).

New gifts on an unranked list are saved with the default priority and go last in the whole list. Editing a gift there never writes its priority. **Stored priorities and the rest are never rewritten by switching `ranked`, so switching back restores the old groups exactly.** Moving gifts on an unranked list renumbers `sort_order` across the list, which can reorder the groups' relative order if the list is later switched back.

## Why

A wishlist that is not a ranking (a set of ideas, a collection) should not look like "most to least wanted". Keeping priority in the data, and ignoring it when the list is unranked, makes the setting reversible and means no migration or data rewrite.

## Consequences

- Every place that orders or groups items must know the list's `ranked` flag (both views carry it).
- Anything that adds a gift must go through the actions, which apply the unranked rules; a gift inserted another way keeps whatever priority it was given.
