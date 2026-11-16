# 0013 · Outbound fetches only reach public addresses, with the resolved IP pinned and every redirect re-checked

**Status:** Agreed · **Work items:** FG-303 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D38, D39, D40

When an owner pastes a product link, the server fetches that page. That is the one place the app makes requests to addresses a user chose, so it is locked down in `src/lib/security/safe-fetch.ts`.

- **What may be fetched.** `http` and `https` only, ports 80 and 443 only, no login in the address.
- **Public addresses only.** The host is resolved first and every returned address must be public. Loopback, private, link-local (including the cloud metadata address 169.254.169.254), carrier-grade NAT, multicast, reserved, documentation and IPv6 equivalents are refused, including IPv4 hidden inside IPv6 (`::ffff:127.0.0.1`, NAT64, 6to4). One bad address among several refuses the host.
- **No DNS switch.** The connection goes to the address that was checked (the lookup is pinned), so a host that answers differently the second time cannot redirect the request.
- **Redirects.** At most three, and each hop goes through all the checks above again.
- **Limits.** 5 seconds in total, 1 MB of body, `text/html` only, uncompressed responses only, generic `FamilyGiftsBot/1.0` user agent, no cookies.
- **Parsing.** The page is parsed with cheerio as data. Nothing in it runs, every value comes out as plain text, and image and canonical links must be http(s).
- **Order of preference.** JSON-LD `Product`, then Open Graph and product price tags, then the page title and description. Prices in another currency are left out with a warning; a price with no stated currency is kept with a "please check" warning.
- **Never auto-saved.** `previewUrlImport` returns a draft only. The owner reviews it in the normal item form and saves it as usual. A link already on the list (compared with case, fragments, tracking parameters, trailing slashes and parameter order ignored) shows a warning but does not block saving.
- **Throttle.** 20 lookups per owner per 15 minutes.
- **Failures.** Every failure becomes a friendly message ending "You can still add it by hand."
- **Tests.** Tests may reach a local server only with `FG_ALLOW_TEST_HOSTS=1` and `NODE_ENV=test`, and then only loopback addresses on any port. A built app always reports production, so the flag does nothing there.

## Why

A server that fetches user-chosen URLs can be pointed at internal services or cloud credentials. Checking the address, connecting to exactly that address and re-checking each redirect closes the usual routes. Treating the page as data stops a hostile shop page from running anything.

## Consequences

- Plenty of big retailers block bots, so many links will fall back to manual entry. That is expected.
- Pages that need JavaScript to show their details give only a title, if that.
- Only UTF-8 pages are decoded correctly.
