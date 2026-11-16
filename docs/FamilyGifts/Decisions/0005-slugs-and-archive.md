# 0005 · Lists are shared by random 10-character slugs, and archived lists stay readable

**Status:** Agreed · **Work items:** FG-104 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D18, D19, D23

Each list has a slug of 10 base62 characters drawn with rejection sampling from `crypto.randomBytes`, with a unique index; creation retries on a collision. The slug carries no name data and is a privacy measure, not authentication.

- **Archived lists.** Guests can still open an archived list, with an "Archived" banner. Owners cannot change it, and the admin can restore it.
- **Hidden lists.** An unknown slug, or a list whose member is deactivated, shows the same not-found page, which names no one.
- **Family page.** Shows only non-archived lists of active members.
- **Search engines.** `robots.txt` disallows everything, and list and family pages send `noindex`.

## Why

62^10 slugs cannot be guessed or enumerated, and modulo bias would make some characters more likely, so biased bytes are dropped. Keeping archived lists readable means old links do not break after Christmas.

## Consequences

- Anyone who has a link can read the list, as the PRD states.
- A deactivated member's lists disappear from guests without being deleted.
