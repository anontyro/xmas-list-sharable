# 0014 · Pasted Amazon content is parsed as inert data into drafts that need explicit confirmation

**Status:** Agreed · **Work items:** FG-304 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D41, D42

An owner can paste an Amazon wishlist page (View source) or copied wishlist text and add the gifts it contains in one go. It is best effort: Amazon changes its markup, and manual entry always works.

- **Nothing is fetched.** The app never contacts Amazon and never logs in. It reads only what the owner pasted.
- **Parser** (`src/features/imports/amazon/`). `parseAmazonHtml` and `parseAmazonText` return drafts, and `parseAmazon` picks one by what was pasted and enforces the limits. A product is any link containing `/dp/<ASIN>` or `/gp/product/<ASIN>`; its link is rewritten to `https://www.amazon.co.uk/dp/<ASIN>` and each ASIN appears once. HTML mode takes the title, the price (`.a-offscreen`, else the first £ amount) and the image from the same list row. Text mode gives each link the nearest earlier non-empty line as its title (or the words before it on the same line) and picks up a price line in between.
- **Inert.** HTML is parsed with cheerio as data: scripts are dropped and every field is plain text. Image links must be http(s).
- **Uncertain drafts.** A draft with no title or no price gets a warning and `uncertain: true`. The preview shows the warning under the row.
- **Limits.** Input over 500 KB is refused with `INPUT_TOO_LARGE`. At most 100 gifts are read or added at a time. Input with no products gives a message ending "You can still add them by hand." and never an error page. The dialog checks the 500 KB limit itself before sending, because the server never sees a paste over the request size limit.
- **Never auto-saved.** `previewAmazonImport` returns drafts only. `commitBulkImport` runs when the owner presses "Add selected items".
- **Commit.** Owner-only, refuses archived lists, skips rows with a blank title, and checks every row with the same schema as the item form. If any row is invalid, nothing is added. All rows go in as one insert at the end of "Would Love", in preview order.
- **Duplicates.** A product already on the list (same link once tracking is ignored, or the same ASIN) is flagged in the preview. It never blocks adding.

## Why

The PRD wants a quick way to bring in an existing wishlist without paid scraping or an Amazon login. Pasting keeps the app out of Amazon's terms and out of the SSRF risks in decision 0013, and an isolated parser with fixtures means a markup change only breaks this one feature.

## Consequences

- Amazon markup changes will break HTML mode. The fixtures in `tests/fixtures/amazon/` are the contract, and text mode is the fallback.
- Only `amazon.co.uk`-style paths are recognised as products, and shortened `amzn.to` links have no ASIN, so they are ignored.
- Prices are read as pounds. Pasted prices in other currencies are not detected.
- Parsing runs on the server and is not throttled; it needs an owner session and is capped at 500 KB.
