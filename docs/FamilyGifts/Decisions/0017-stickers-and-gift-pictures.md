# 0017 · Gifts show their product picture or an automatically chosen sticker, and people get a stable colour

**Status:** Agreed · **Work items:** FG-502 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-17-FG-002-sticker-book-design.md` D50, D51, D52, D53

The old icon pack is gone. The Sticker Book's 36 stickers are the only decorative images, and a small set of components draws the screens from them.

- **Sticker pack.** The 36 PNGs are copied unchanged from `docs/family-gifts-design/icons/` to `public/stickers/<name>.png`, with flat names (`tree`, `gifttag`, `presentgold`, …). A test checks they stay byte-for-byte equal to the design pack. `public/icons/`, `Icon` and `icon-names` no longer exist.
- **`Sticker`.** `<Sticker name="tree" width={64} />` in `src/components/ui/Sticker.tsx`. `name` is a union of the 36 names, so an unknown one is a type error. `sticker-names.ts` records each file's real width and height (read from the PNG headers and checked by a test), so height follows width and layout does not shift. The white outline and soft shadow (the design's `.stk`) are a CSS filter, not baked into the files. It is decorative (`alt=""`) unless the caller passes an `alt`.
- **Components.** `src/components/sticker/` holds `Pill`, `Ribbon`, `Note`, `Hero`, `Meter`, `Stat`, `Thumb`, `GiftThumb`, `MemberAvatar`, `StickerCard`, `TwoColumn`, `SplitLayout` and `PageWrap`. They use theme tokens only; a test fails if any writes a raw colour.
  `Ribbon` and `Pill` carry their meaning in text. `Meter` is `role="img"` and needs a spoken `label`; its segments never add up past 100%. `Hero` renders the page's only `h1` and a back link that is a real link read as "Back to <place>". `TwoColumn` puts the 360 px sidebar beside the content from 860 px, and on phones before it or (with `sideLast`) after it.
  `Note` is a plain tinted box, not an MUI Alert: it stays quiet unless the caller gives it `role="alert"` or `"status"`, so a static hint is not announced like an error. `Hero` is a client component because it renders a link button, which a server page cannot pass to MUI. `StickerCard` is the MUI card from the theme plus a tint (white, yellow, mint, sky, pink, or the dashed cream card).
- **Gift pictures.** `GiftThumb` shows the product picture when the gift has one and it loads. The picture is a plain `<img>` (owners paste any host), lazy, with `referrerPolicy="no-referrer"` and `alt=""` because the title sits beside it. With no picture, or when the picture fails to load, it shows a sticker. A new picture link gets a fresh try.
- **Which sticker.** `stickerForGift(title, id)` is a pure function of the title and id only, so it is safe on owner pages. The first matching keyword group wins: sock, glove, scarf, hat, beanie, mitten → `stocking`; book, novel, cookbook → `parcel`; candle, perfume, soap, bath → `sparkles`; mug, cup, dish, pan, kitchen, headphone, charger, speaker, tech → `box`; toy, game, puzzle, lego → `presentgreen`; voucher, card → `gifttag`.
  Words of four letters or fewer must match a whole word (optionally plural), longer ones match the start of a word, so "what" is not a hat and "cardigan" is not a card. With no match the sticker is a stable pick by hash of the id from `presentred, presentgreen, presentgold, parcel, box, gifttag`.
- **Colour by person.** `tintFor(id)` hashes an id (FNV-1a) to one of yellow, pink, mint or sky, so a member or gift always has the same colour. `MemberAvatar` shows the member's picture sticker when they have one, else their first initial on that tint; it is hidden from screen readers because the name is shown beside it.

## Why

A fixed pack makes every page look like the design and removes a second icon system. Showing the real product picture helps guests recognise the gift, while a sticker keeps pictureless gifts from looking empty. Picking the sticker from the title costs the owner nothing, and a pure function keeps it deterministic and out of reach of claim data. Plain colour-by-hash avoids storing a colour for every person.

## Consequences

- The stickers' white outline is drawn at every size, so very small uses (the 20 px status icons) look heavy. The status and priority chips that use them are replaced by pills in the family and wishlist release.
- A keyword can pick a surprising sticker ("tech" for a tent). It is only decoration, and the sticker is never the only label.
- Remote product pictures are loaded straight from the shop's host, as before. The no-referrer setting keeps the list's address from leaking to it, but the shop's host still sees each guest's address when a list loads, so an owner who pastes a picture link to a tracking host makes every guest contact it. We accept this for a family-only app; a picture proxy would hide it and is the fix if that changes.
