# 0004 · Owner PINs are 6+ digits hashed with Argon2id, and sign-in is throttled in the database

**Status:** Agreed · **Work items:** FG-103 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D13, D14, D15

Owner PINs are 6 to 12 digits, hashed with Argon2id, and either the admin (set or reset, any time) or the owner themselves (change, with the current PIN) can set one. Admin and owner sign-in share one failure counter in the `auth_limit` table.

- **PIN reset.** Setting a PIN or deactivating a member revokes that member's owner sessions.
- **Owner changes their own PIN.** `changeOwnPin` needs a signed-in owner and their current PIN, and a valid new one. A wrong current PIN counts against the same `owner:<memberId>:<ip>` throttle as signing in. On success every owner session of that member ends and the browser gets a fresh one. The admin reset still works afterwards and replaces whatever the owner chose.
- **Sign-in links.** `/owner/login?name=<name>[&pin=<digits>]` only fills the form (name matched ignoring case; a PIN of 1 to 12 digits); the person still presses Sign in. The page removes the query from the address bar straight away, and is served with `Referrer-Policy: no-referrer` and `Cache-Control: no-store`. The admin screen offers a name-only link, and after setting a PIN a second link that includes it. The PIN is only known on the screen where it was just typed, because it is stored hashed.
- **Throttle.** Five failures inside 15 minutes block the key (`admin:<ip>`, `owner:<memberId>:<ip>`) for 15 minutes. The count is one atomic SQL statement, so parallel guesses cannot slip through. Success clears the key.
- **One message.** Wrong secret, wrong PIN, unknown or inactive member, no PIN set, malformed id and "blocked" all return "Incorrect details or too many attempts. Try again later."
- **Admin secret.** Compared in constant time against `ADMIN_SECRET`.
- **No leaks.** Query helpers select columns explicitly, so `pin_hash` is never returned; PINs and hashes are never logged.

## Why

Six digits is easy to guess, so the limit matters more than the hash. State lives in the database because serverless instances share no memory. A single message stops the form revealing which members exist or have PINs.

## Consequences

- Someone behind a shared network address who mistypes repeatedly can lock out only their own address and member pair.
- A forgotten PIN needs the admin.
- A link with a PIN in it reaches the server in the request URL, so it can appear in hosting logs and in anything that records the link (chat history, browser history before the page cleans it). It is meant to be sent privately and replaced by the owner's own PIN on first sign-in.
