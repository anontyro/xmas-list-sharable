# 0023 · Imported gifts are ticked, given a priority and a price on a page, and added all or nothing

**Status:** Agreed · **Work items:** FG-602 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-17-FG-002-sticker-book-design.md` D79, D80, D81

The Amazon paste import moved from a dialog to its own page, where the owner chooses which found gifts to add and how much each is wanted. Parsing, the 500 KB limit and "nothing is saved until Add" are unchanged (decision 0014).

- **Import page (D79).** `/owner/lists/[listId]/import`: a sky hero "Paste from Amazon" ("Nothing is saved until you say so") with a back link, a three-step card, the paste box ("Paste your wishlist") with Find gifts and Clear, the yellow best-effort note and, once something is found, a sky ribbon "WE FOUND N GIFTS" over a two-column grid of cards. Each card has a checkbox ("Add <title>"), the picture or a sticker, an editable title ("Gift"), the price or, when none was found, an "Add a price (£)" box ("Price for <title>"), a pill (All found, Price not found, Already on your list), a priority select ("Priority for <title>", Would Love by default) and Remove ("Remove <title>"). A duplicate of a gift already on the list starts unticked and reads "Skipped", where the select and price box would be; ticking it adds it anyway. Unreadable or oversize input shows its message with an "Add a gift by hand" button.
  The yellow "Ready to add" card says "N gifts will be added to your list", then in one line how many are already on the list (skipped), how many are not ticked and how many need a price, with "Add N gifts" (disabled at 0) and "Start over". It comes last on phones. Clear empties only the paste box; Start over empties everything; neither, nor Find gifts or editing, saves anything. Only ticked rows with a title are sent. A list that is archived has no import page (it goes back to the list). The owner nav gains "Import", and the editor's sidebar button "Paste Amazon wishlist" opens the page. The old dialog is gone.
- **Bulk commit (D80).** `commitBulkImport(listId, rows)` takes an optional `priority` on each row. Absent means `would_love`; any other value (empty, null, a number, wrong case) is invalid, and one invalid row adds nothing at all. Rows are validated with `itemInput`, then each goes to the end of its own priority group in the order given; each group continues from its own last gift, so no existing gift moves. Still owner-only, archived lists refused, blank titles skipped, at most 100 rows. Decision 0014 is edited to say so.
- **Owner account pages (D81).** `/owner/pin` holds the change-PIN form with its behaviour unchanged (decision 0004: wrong current PIN refused, new PINs must match, other sessions ended, this one kept, the admin can still reset). The account menu links to it ("Change my PIN"). `/owner` is now the list picker: a card per list of the owner's, archived ones included (pill "Archived · read-only"), each with an Open button; with none it says "You don't have a list yet. Ask the family admin to create one."

## Why

A wishlist paste usually brings gifts the owner does not want or already has, and often misses a price or two. Ticking, renaming, pricing and ranking before anything is saved means one pass instead of importing and then editing every gift. A page has room for that at phone width, which the dialog did not. Giving the PIN form its own page leaves `/owner` as a plain list picker.

## Consequences

- The priority is an owner choice per row; the importer never guesses it. The page sends only the three valid values, so the validator's own wording for a bad value is only seen by something calling the action directly.
- A found price cannot be edited on the page, only a missing one filled in; a wrong found price is fixed on the gift afterwards.
- There is no warning when leaving the page with edits not added.
- Owner list cards show the title and the occasion and year, with no gift count.
