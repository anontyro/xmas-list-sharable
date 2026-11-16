# 0012 · Exports are built in the browser from the planner on the page, and CSV is guarded against formulas

**Status:** Agreed · **Work items:** FG-302 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D37

The copy text, Markdown and CSV are pure functions in `src/features/planner/export/`, run in the browser over the planner data the page already holds. The server has no export endpoint.

- **Selection.** The guest ticks entries (or Select all). Totals in the export are computed over just the ticked entries, so a subset has its own committed, spent and remaining figures. Nothing selected shows "Choose at least one gift" and downloads nothing.
- **Text.** Follows PRD Appendix B exactly: grouped by recipient, status, price (and price paid), the link, then Estimated committed, Actual spent, Budget and Remaining. A gift with no price says "No price".
- **Markdown.** Headings per recipient, text escaped so a title cannot become formatting, and URLs percent-encode the characters that would end a link.
- **CSV.** RFC 4180: cells with a comma, quote or line break are quoted, quotes doubled, rows end in CRLF. Prices are plain numbers (`12.50`). Any text cell starting with `=`, `+`, `-`, `@`, tab or carriage return gets a leading `'` so a spreadsheet will not run it. The download adds a byte-order mark so Excel reads accents correctly.
- **Notes.** Private notes are written only when "Include my private notes" is ticked, and are off by default.
- **What cannot leak.** The export entry type has no field for recovery links, sessions or other guests' data.

## Why

The data is already authorised and on the page, so a server route would add a place to get privacy wrong. Titles and notes are typed by other people, so they must be treated as untrusted text in a spreadsheet.

## Consequences

- A subset's "remaining budget" is the whole budget minus that subset, which may surprise someone exporting only part of their list.
- The leading `'` is visible in some spreadsheets for cells that began with a sign.
