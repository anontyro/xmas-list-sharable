# 0003 · Sessions are opaque hashed tokens, with one cookie per role

**Status:** Agreed · **Work items:** FG-103 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D12, D16, D17

A session is a random 32-byte token. The browser holds the token in a cookie; the database holds only its sha256 hash in `session`. Admin, owner and guest each have their own cookie (`fg_admin`, `fg_owner`, `fg_guest`), and a token only resolves under the role it was issued for.

- **Lifetimes.** Admin 8 hours, owner 12 hours, guest 180 days. Expired and revoked sessions never resolve.
- **Cookie flags.** `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` when `NODE_ENV=production`.
- **Guards.** Every server action starts with `requireAdmin`, `requireOwner(memberId)` or `requireGuest`, which decide through the pure `can()` matrix in `src/lib/permissions`. Pages use `currentAdmin`/`currentOwner`/`currentGuest` to redirect instead of throwing.
- **Results.** Actions return `Result<T>`; a failed guard becomes `{ ok: false, error: { code: "UNAUTHORIZED" } }`.
- **Admin scope.** Admin code reads and writes only household, member, wishlist and session data, never claims, interests, planners or recovery tokens.

## Why

Separate cookies mean an owner (or admin) who opens a guest page is treated as a new guest, never as themselves. Hashing tokens at rest means a database leak does not hand out live sessions.

## Consequences

- A person who is both an owner and a buyer has two sessions in one browser.
- Sessions are checked against the database on every request, which is fine at family scale.
