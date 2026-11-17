# 0015 · Recovery tokens travel in the URL fragment and are stored only as a hash

**Status:** Agreed · **Work items:** FG-401 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D43

A guest has no password, so their only identity is a browser cookie. To move to another phone or computer they can make a private recovery link. Opening it there signs that browser in as the same guest, with the same planner, notes, reservations and interests.

- **Token.** 32 random bytes as base64url. The database stores only its sha256 (`recovery_token.token_hash`); the raw token is shown once when the link is made and never kept.
- **One live link.** A guest has at most one active link. Making a new one revokes the old one in the same transaction, which locks the guest row so simultaneous requests cannot clash. "Turn off link" revokes it. Browser sessions the guest already has keep working either way.
- **Link shape.** `/recover#t=<token>`. The token is in the fragment, so it is never sent to any server, written to access logs or sent in a Referer header.
- **Exchange.** The `/recover` page reads the fragment, replaces the history entry with plain `/recover` before doing anything else, then POSTs the token as JSON to `/api/recovery/exchange`. A valid token gets a new `fg_guest` session for the original guest (204) and the page goes to `/planner`.
- **One failure.** An unknown, malformed or revoked token all get the same 404 and body. A blocked address gets 429.
- **Throttle.** 10 attempts per address per 15 minutes (`recovery:<ip>`), counting every attempt.
- **Headers.** Exchange responses carry `Cache-Control: no-store` and `Referrer-Policy: no-referrer`; the `/recover` page asks for no referrer too and is not indexed.
- **Who can make one.** Only a signed-in guest, and only for themselves (`createRecoveryLink`, `revokeRecoveryLink`, `recoveryLinkStatus`). "Save access" appears in the top bar only when the browser has a guest session.
- **Warning.** The dialog says anyone with the link can see and change the guest's plans, and that losing the link and every browser may lose the data.

## Why

The token is as powerful as a password, so it should not leave the browser except in the one request meant for it. A fragment plus an immediate address-bar clean-up keeps it out of logs, history and Referer headers, and a hash-only store means a database leak does not leak working links.

## Consequences

- Anyone who gets the link gets the guest's access until it is turned off. There is no expiry.
- A link that was copied into a chat or email stays in that chat or email. Turning it off is the remedy.
- Owners and admin have no recovery links; they sign in with a PIN or secret.
