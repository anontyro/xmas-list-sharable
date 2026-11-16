# 0004 · Owner PINs are 6+ digits hashed with Argon2id, and sign-in is throttled in the database

**Status:** Agreed · **Work items:** FG-103 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D13, D14, D15

Owner PINs are 6 to 12 digits, hashed with Argon2id, and only an admin can set or reset one. Admin and owner sign-in share one failure counter in the `auth_limit` table.

- **PIN reset.** Setting a PIN or deactivating a member revokes that member's owner sessions.
- **Throttle.** Five failures inside 15 minutes block the key (`admin:<ip>`, `owner:<memberId>:<ip>`) for 15 minutes. The count is one atomic SQL statement, so parallel guesses cannot slip through. Success clears the key.
- **One message.** Wrong secret, wrong PIN, unknown or inactive member, no PIN set, malformed id and "blocked" all return "Incorrect details or too many attempts. Try again later."
- **Admin secret.** Compared in constant time against `ADMIN_SECRET`.
- **No leaks.** Query helpers select columns explicitly, so `pin_hash` is never returned; PINs and hashes are never logged.

## Why

Six digits is easy to guess, so the limit matters more than the hash. State lives in the database because serverless instances share no memory. A single message stops the form revealing which members exist or have PINs.

## Consequences

- Someone behind a shared network address who mistypes repeatedly can lock out only their own address and member pair.
- A forgotten PIN needs the admin.
