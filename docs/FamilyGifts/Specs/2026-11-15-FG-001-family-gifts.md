# Family Gifts

Work item: FG-001 (the PRD, `docs/family-gifts-prd-v1.md`). Each release below ships as its own commit or PR and maps to these tasks:

| Release | Task |
|---|---|
| R1a · Scaffold | FG-101 |
| R1b · Database | FG-102 |
| R1c · Auth and admin | FG-103 |
| R1d · Owner lists and sharing | FG-104 |
| R2a · Guests and claims | FG-201 |
| R2b · Ordering and sorting | FG-202 |
| R3a · Planner | FG-301 |
| R3b · Exports | FG-302 |
| R3c · URL import | FG-303 |
| R3d · Amazon import | FG-304 |
| R4a · Recovery links | FG-401 |
| R4b · Hardening | FG-402 |

Branch: `feature/FG-001-family-gifts` (or one branch per release, `feature/FG-1xx-…`; each release must merge on its own).
Toggle: none (D1). The repo is greenfield and nothing is live until it is deployed.
Design: icon pack at `docs/family_gifts_christmas_icon_pack/`; PRD §10 for palette and rules.
Status: **draft 2026-11-15**. No open questions. Awaiting approval.
Manual testing: `Docs/FamilyGifts/Testing/MANUAL-TESTING-FG-001-family-gifts.md`
Decisions: `Docs/FamilyGifts/Decisions/` (README lists every planned record and the package that writes it).

## Goal

A family can run its Christmas lists: the admin sets up members and lists, owners fill them in, guests reserve and buy
without owners seeing it, and guests plan spend across recipients on any device.

| Release | What ships | PRD release |
|---|---|---|
| **R1a** | Running Next.js + MUI app with festive theme, icons and app shell | v0.1.0 |
| **R1b** | Postgres schema, migration, seed, integration-test harness | v0.1.0 |
| **R1c** | Admin login, member and list management, owner PIN login, throttling | v0.1.0 |
| **R1d** | Owner item CRUD, public family dashboard and shareable list pages | v0.1.0 (MVP) |
| **R2a** | Guest identity, interest, exclusive reserve/purchase, owner isolation tests | v0.2.0 (minimum Christmas release) |
| **R2b** | Owner reorder, guest sort and filter | v0.2.0 |
| **R3a** | Planner page, budgets, notes, actual prices, totals | v0.3.0 |
| **R3b** | Copy, Markdown and CSV export | v0.3.0 |
| **R3c** | Product URL import | v0.3.0 |
| **R3d** | Amazon paste import (best effort, droppable) | v0.3.x |
| **R4a** | Portable guest recovery links | v1.0.0 |
| **R4b** | Security headers, backup/restore runbook, mobile and accessibility pass | v1.0.0 |

Order is deliberate: R2a is the minimum useful Christmas release, so R3c, R3d and R4 can slip without blocking it.
R3a–R3d do not depend on each other beyond R3b needing R3a, so they may be reordered or R3d dropped.

## Background (read 2026-11-15)

### Repo

- Greenfield: no commits, no code. Contains only `docs/` (`family-gifts-prd-v1.md`, `family_gifts_christmas_icon_pack/`).
- Node 24 and pnpm 11 are installed. The PRD's Tailwind/shadcn choice is replaced by MUI at the user's request.
- Case-insensitive filesystem: `Docs/FamilyGifts/` in this spec is the on-disk `docs/FamilyGifts/`. Keep the existing lowercase `docs/`.

### Icon pack

- `docs/family_gifts_christmas_icon_pack/{christmas,shopping,interface}/` hold 12 transparent 384×384 PNGs each (36 total), plus `manifest.json`.
  `background_preserved/` and `sheets/` are not shipped.
- Names: christmas (candy_cane, christmas_stocking, christmas_tree, gift_tag, gingerbread, gold_star, holly, reindeer, santa_hat, snow_globe, snowflake,
  wrapped_present_red), shopping (checklist, heart_badge, heart_wishlist, priority_bookmark, sale_tag, shipping_box, shopping_bag, shopping_basket,
  sparkles, wrapped_parcel, wrapped_present_gold, wrapped_present_green), interface (adult_avatar, budget_chart, child_avatar, coins, completed_badge,
  download, edit_pencil, family_group, occasion_calendar, reminder_clock, share, wallet).

### PRD points the packages rely on

- Roles, permission matrix and journeys: PRD §3, §5. Functional requirements F01–F14: §6. Schema and invariants: §7. API boundaries: §8. Security: §9.
- Reuse note: nothing exists to reuse. Each helper below is created once by the package named, and later packages import it.

## Decisions

### R1a · Scaffold, plus decisions shared by every release

> **R1a · task FG-101 · ~19 files: ~18 new, ~1 modified (plus 36 icon assets) · packages P0–P1**
>
> The repo becomes a running Next.js app with a festive MUI theme, the icon pack wired in as a typed component, and an app shell with navigation.
> Every dependency the whole project needs is installed here so later packages never edit `package.json`.

- **D1 · No feature flag.** Releases are not toggled. A release that is merged but unfinished is not deployed. Shared acceptance "nothing new runs with the toggle off" does not apply.
- **D2 · Stack.** Next.js App Router, TypeScript `strict`, pnpm, MUI v7 with `@mui/material-nextjs` (`AppRouterCacheProvider`), no Tailwind or shadcn.
  P0 installs every library: `@mui/material @mui/icons-material @emotion/react @emotion/styled @mui/material-nextjs drizzle-orm postgres drizzle-kit zod @node-rs/argon2 cheerio vitest @playwright/test @axe-core/playwright tsx`.
  `engines.node >= 22`. Scripts: `dev build start lint typecheck test test:integration test:e2e db:up db:down db:generate db:migrate db:seed`.
- **D3 · Layout.** Follow PRD Appendix A under `src/`. Route groups `(public)`, `(owner)`, `(admin)`.
  URLs: `/` family dashboard, `/l/[slug]` list, `/planner`, `/recover`, `/owner/*`, `/admin/*`. Server logic lives in `src/features/<area>/` and `src/lib/`, never in components.
- **D4 · Theme.** `src/theme/theme.ts` holds the PRD §10 tokens: pine `#24764F` (primary navigation), holly `#D8494F` (primary action), gold `#F3C65D` (priority accent),
  cream `#FFF7EA` (background), slate `#334155` (text). Card radius 16, buttons min height 44, system font stack, no hover-only affordances,
  animation off under `prefers-reduced-motion`. Status is never shown by colour alone.
- **D5 · Icons.** Copy the 36 transparent PNGs to `public/icons/<group>/<name>.png`. `<Icon name="christmas/holly" size={48} alt="" />` in `src/components/ui/Icon.tsx`
  wraps `next/image`; `name` is a string-literal union of the 36 files; `alt` defaults to `""` (decorative) and must be set when the icon is the only label.
- **D6 · Environment.** `src/lib/env.ts` validates `DATABASE_URL`, `ADMIN_SECRET` (min 12), `SESSION_SECRET` (min 32), `TEST_DATABASE_URL` (tests only) with zod and throws at first use.
  `.env.example` lists all four. Nothing from `env.ts` is imported by a client component.
- **D7 · CI.** `.github/workflows/ci.yml` runs install, lint, typecheck, unit tests and build on push and pull request. Integration and e2e jobs are added by P3 and P13.

### R1b · Database

> **R1b · task FG-102 · ~15 files: ~15 new · packages P2–P3**
>
> The full PRD §7 schema is defined in Drizzle and applied as one checked-in migration, with a local Postgres, a seed script, and an integration-test harness.
> No user-facing change.

- **D8 · Whole schema now.** All PRD §7 tables are created in R1b, so later releases only add code. Files: `src/db/schema/{identity,wishlist,claims,planner,limits}.ts` plus `index.ts`.
  Primary keys `uuid` (`gen_random_uuid()`), timestamps `timestamptz default now()`, snake_case table and column names exactly as in PRD §7.
  Enum-like columns are `text` with a `check` constraint: `priority in ('most_wanted','would_love','nice_to_have')`, `item_claim.status in ('reserved','purchased')`, `session.principal_type in ('admin','owner','guest')`.
- **D9 · Money.** Prices are `integer` pence in `price_minor`, currency `text default 'GBP'`. `src/lib/money.ts` exports `formatGBP(minor)` and `parsePoundsToMinor(string)`;
  parsing is string based (no floats), rejects negatives, more than 2 decimals, and values over £999,999.99.
- **D10 · Exclusive claim index.** `item_claim` has a partial unique index named `item_claim_one_active_per_item` on `(item_id) where released_at is null`.
  A claim row is active while `released_at is null`; a purchased claim is still active.
- **D11 · Dev and test database.** `docker-compose.yml` runs Postgres 16 on host port 5433 (`pnpm db:up`). Integration tests use `TEST_DATABASE_URL`, apply migrations once per run,
  and truncate every table between tests via `tests/integration/db-harness.ts`. `pnpm db:seed` creates the single `household` row only; `--demo` also adds two members and a list.
  Hosted Supabase uses the pooled (transaction-mode) connection string, so the client sets `prepare: false` in `src/db/client.ts`.

### R1c · Auth and admin

> **R1c · task FG-103 · ~26 files: ~26 new · packages P4–P7**
>
> The admin signs in with the environment secret, creates members and their owner PINs, and creates, archives and restores lists. Owners can sign in with their PIN.
> In code this adds the password, token and throttle primitives, the session layer and the permission checks every later feature calls first.

- **D12 · Sessions.** `session` rows hold `token_hash` = sha256 hex of a 32-byte random token (base64url in the cookie). Three cookies, one per role, so contexts never inherit each other:
  `fg_admin` (8 h), `fg_owner` (12 h), `fg_guest` (180 days). All `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` when `NODE_ENV=production`. Admin sessions use the household id as `principal_id`.
  `src/lib/auth/session.ts` exports `createSession`, `getSession`, `revokeSession`; expired or revoked sessions never resolve.
- **D13 · Admin login.** `ADMIN_SECRET` is compared with `timingSafeEqual` on sha256 digests. Wrong secret creates no session and returns the generic message below (D15).
- **D14 · PINs.** Owner PIN matches `^\d{6,12}$`, hashed with Argon2id (`@node-rs/argon2` defaults) into `member.pin_hash`. Only an admin session can set or reset it; doing so revokes that member's owner sessions.
  The PIN, its hash and token hashes are never returned by any query helper (selects list columns explicitly) and never logged.
- **D15 · Throttle.** `src/lib/security/rate-limit.ts` uses the `auth_limit` table with an atomic `insert … on conflict do update` keyed `admin:<ip>`, `owner:<memberId>:<ip>`,
  `import:<memberId>` and `recovery:<ip>`. Five failures in 15 minutes block that key for 15 minutes; success clears it. The user-facing message for any failure, blocked or wrong, is
  "Incorrect details or too many attempts. Try again later." The IP is the first `x-forwarded-for` hop, else `unknown`.
- **D16 · Permissions and results.** `src/lib/permissions/index.ts` is a pure `can(principal, action)` decision function that mirrors the PRD §3.1 matrix. `src/lib/auth/require.ts` exports
  `requireAdmin()`, `requireOwner(memberId)` and `requireGuest()`, and every server action calls one as its first statement. Actions return `Result<T> = {ok:true,data:T} | {ok:false,error:{code:string,message:string}}`
  from `src/lib/result.ts`. Validation uses zod at the action boundary.
- **D17 · Admin scope.** Admin code may read and write `household`, `member`, `wishlist` and `session`. Admin code never imports or queries `item_interest`, `item_claim`, `guest_planner`, `recipient_budget`, `planner_item` or `recovery_token`.

### R1d · Owner lists and sharing

> **R1d · task FG-104 · ~28 files: ~26 new, ~2 modified · packages P8–P13**
>
> Owners sign in, see their lists, and add, edit, prioritise and delete gifts. Anyone with a list link sees a read-only list, and the family dashboard shows every active list.
> In code this adds the slug generator, item validation, the owner and public serializers and the first Playwright journey.

- **D18 · Slugs.** 10 characters of base62 drawn with `crypto.randomBytes` and rejection sampling (no modulo bias), unique index on `wishlist.slug`, up to 5 retries on a unique violation. Slugs contain no name data.
  `src/features/wishlists/slug.ts` exports `generateSlug()`.
- **D19 · Archive policy.** Archived lists stay readable to guests at their slug with an "Archived" banner and no guest actions beyond browsing. Owners cannot edit them. Admin can restore (R1c).
  Unknown slugs and deleted-or-inactive members' lists return the shared safe `not-found` page.
- **D20 · Serializers.** `src/features/wishlists/views.ts` defines `OwnerWishlistView`, `GuestWishlistView` and `FamilyDashboardView` and a mapper for each. Queries select explicit columns; no query joins claim,
  interest, planner or guest tables for an owner or admin route. In R1d the guest view has items only; R2a adds claim state.
- **D21 · Item fields.** Per F04: `title` 1–120 chars, `description` ≤ 1000, `product_url` and `image_url` http(s) only and ≤ 2000, optional price via `parsePoundsToMinor`, currency GBP,
  priority default `would_love`, `sort_order` an integer with gaps of 10, new items appended to the end of their priority group. Zod schemas live in `src/features/wishlists/schemas.ts`.
- **D22 · Soft delete.** `deleteItem` always sets `deleted_at`. Every read filters `deleted_at is null` except the planner, which can still label claimed deleted items (R3a). The owner's confirm text is generic and does not mention claims.
- **D23 · Discovery.** `src/app/robots.ts` disallows all crawlers, and list and dashboard pages set `robots: noindex`. The dashboard lists only non-archived lists of active members, grouped by member with occasion and year.
- **D24 · Owner flow.** `/owner/login` (pick member, enter PIN) → `/owner` (own lists) → `/owner/lists/[listId]` (item form and list). A signed-in owner can open only their own lists; other ids return not-found.
  Owner pages import nothing from `src/features/reservations` or `src/features/planner`.

### R2a · Guests and claims

> **R2a · task FG-201 · ~21 files: ~15 new, ~6 modified · packages P14–P18**
>
> Guests give a name once, then mark interest and reserve, buy or release gifts. Exactly one guest can win a reservation, and owners and admin never see any of it.
> In code this adds the guest session, the claim service on the partial unique index, the guest claim view and a lint rule and test that keep owner code away from claim data.

- **D25 · Guest identity.** First visit to a list shows `GuestWelcome` asking for a display name (1–40 chars, trimmed). `createGuest` inserts a `guest` row, creates a `fg_guest` session and returns. Names are not unique;
  the guest UUID is the identity. `renameGuest` updates `display_name` only. An owner or admin session never counts as a guest session.
- **D26 · Claim operations.** In `src/features/reservations/` all state changes are single statements or short transactions:
  `setInterest` / `clearInterest` (insert or delete on unique `(guest_id, item_id)`); `reserve` inserts an active `item_claim` with status `reserved` (a unique violation maps to `CLAIM_CONFLICT`);
  `markPurchased` updates status to `purchased` where `guest_id` is the caller and `released_at is null`; `release` sets `released_at = now()`.
  Releasing a purchased claim requires `confirm: true`. Error codes: `CLAIM_CONFLICT`, `NOT_CLAIMANT`, `ITEM_UNAVAILABLE` (deleted item or archived list), `CONFIRM_REQUIRED`.
  Every result carries the refreshed `GuestItemState` for that item.
- **D27 · Guest item state.** `GuestItemState` is one of `available`, `interested`, `reserved_by_you`, `reserved_by_other`, `purchased_by_you`, `purchased_by_other`. Active claim wins over interest.
  Guests see only their own interest; interest counts for other guests are not exposed.
- **D28 · Buyer names.** Claims by other guests show the claimant's current `display_name` (PRD §15.2 default). Dropping the name later only requires removing it from the guest view mapper.
- **D29 · Isolation guard.** `eslint.config.mjs` gets a `no-restricted-imports` rule forbidding `@/features/reservations/*` and `@/features/planner/*` from `src/app/(owner)`, `src/app/(admin)`,
  `src/features/family` and the owner modules in `src/features/wishlists`. `tests/integration/projection-isolation.test.ts` serialises every owner and admin query result
  and asserts no key matches `claim|interest|guest|planner|recovery|token|hash|pin`.
- **D30 · Refresh.** Actions call `revalidatePath` for the list. No realtime. A conflict result tells the UI to show "Someone else just reserved this" and re-render.

### R2b · Ordering and sorting

> **R2b · task FG-202 · ~11 files: ~8 new, ~3 modified · packages P19–P21**
>
> Owners reorder gifts within a priority group with up and down buttons, and guests can sort and filter any list without changing the owner's order.
> In code this adds a transactional reorder service and pure sort and filter functions driven by URL search params.

- **D31 · Reorder.** `moveItem(itemId, 'up' | 'down')` in a transaction locks the item's priority group (`select … for update`), swaps `sort_order` with the neighbour, and does nothing at the ends. Changing priority appends to the end of the new group.
  There is no drag-and-drop dependency (PRD allows move buttons).
- **D32 · Guest sort and filter.** `src/features/wishlists/sort-filter.ts` has pure `sortItems` and `filterItems`. Sorts: `priority` (default, priority then owner order), `price_asc`, `price_desc`, `newest`.
  Items with no price sort last in both price directions. Filters: priority set, min and max pence, `avail=1` (hides items claimed by someone else).
  State lives in the URL search params `sort`, `priority`, `min`, `max`, `avail`. Nothing is written to the database. The owner UI has no claim-based sort or filter.

### R3a · Planner

> **R3a · task FG-301 · ~14 files: ~11 new, ~3 modified · packages P22–P25**
>
> Guests get My Planner: everything they are interested in or have claimed, grouped by recipient, with a total budget, optional recipient budgets, private notes and actual prices, and clear planned, spent and remaining numbers.
> In code this adds the accounting function, planner queries and actions that only ever read the session guest's rows, and the planner page.

- **D33 · Accounting.** `src/features/planner/accounting.ts` exports `computePlan(entries, budgetMinor | null)` returning
  `{ plannedMinor, spentMinor, potentialMinor, remainingMinor | null, unpricedCount }`. Per entry, unit = `actualPriceMinor ?? listedPriceMinor`.
  planned = Σ unit over `reserved` and `purchased`; spent = Σ unit over `purchased`; potential = Σ listed over interest-only entries; remaining = budget − planned (may be negative; null when no budget).
  Entries with no unit price add nothing and increment `unpricedCount`; entries with `included = false` are ignored. An entry is counted once whatever its state.
- **D34 · Planner scope and creation.** One `guest_planner` per guest, occasion and year, created lazily on first budget or note write. `planner_item` rows are created lazily on the first note, actual price or exclusion.
  The page defaults to the occasion and year of the lists the guest has touched (Christmas 2026 now) with a selector when several exist.
- **D35 · Privacy.** Planner queries and actions begin with `requireGuest()` and filter on `guest_planner.guest_id = session guest`. Notes ≤ 500 chars; actual price uses `parsePoundsToMinor`.
  Actual price never updates `wishlist_item.price_minor`. Deleted-by-owner items that the guest holds show the saved title with "Removed by the owner" and still count in totals.
- **D36 · Navigation.** `/planner` is linked from `AppShell` only when a guest session exists, and from each claimed item.

### R3b · Exports

> **R3b · task FG-302 · ~8 files: ~6 new, ~2 modified · packages P26–P27**
>
> Guests select planner entries and copy them as a readable shopping list or download Markdown or CSV.
> In code this adds three pure formatters and an export menu that works from the planner payload already on the page.

- **D37 · Formats.** Formatters in `src/features/planner/export/{text,markdown,csv}.ts` are pure functions of `(entries, totals, options)`. Text follows PRD Appendix B. CSV columns:
  `Recipient,Occasion,Item,Status,Listed price,Actual price,URL` (+ `Note` only when "include notes" is ticked, default off). CSV is RFC 4180 (quote fields containing `,` `"` CR or LF, double quotes, CRLF rows)
  and any cell starting with `=`, `+`, `-`, `@`, tab or CR is prefixed with `'`. Exports never contain recovery links, session data or any other guest's data. An empty selection shows "Choose at least one gift".

### R3c · URL import

> **R3c · task FG-303 · ~17 files: ~14 new, ~3 modified · packages P28–P31**
>
> Owners paste a product link and get an editable draft, or a clear fallback to manual entry.
> In code this adds an SSRF-safe fetch, a metadata extractor and a duplicate check, wired into the existing item form.

- **D38 · Safe fetch.** `src/lib/security/safe-fetch.ts`: only `http:` and `https:`, ports 80 and 443 only, DNS resolved with `dns.lookup(all)`, every address checked against a `net.BlockList`
  (loopback, private, link-local incl. 169.254.169.254, CGNAT, multicast, unspecified, IPv6 ULA and link-local, IPv4-mapped IPv6). The connection uses the checked IP (pinned via a custom `lookup`) so DNS rebinding cannot swap it.
  Max 3 redirects, each hop re-validated. 5 s timeout, 1 MB body cap, `text/html` only, User-Agent `FamilyGiftsBot/1.0`. Failures return typed codes (`BLOCKED_ADDRESS`, `TIMEOUT`, `TOO_LARGE`, `NOT_HTML`, `HTTP_ERROR`, `INVALID_URL`).
  Tests may reach a local server only when `FG_ALLOW_TEST_HOSTS=1` and `NODE_ENV=test`; the flag is ignored in any other environment.
- **D39 · Extraction.** `extractMetadata(html, sourceUrl)` uses cheerio (never executes scripts) in the order JSON-LD `Product` (`offers.price`, `priceCurrency`) → Open Graph and `product:price:*` → `<title>` and meta description.
  Output `ImportDraft = { title, description, imageUrl, priceMinor, currency, canonicalUrl, sourceUrl, warnings: string[] }`. Prices parse from strings with `parsePoundsToMinor`; non-GBP currency is kept as a warning and the price is dropped.
- **D40 · Confirmation and duplicates.** `previewUrlImport(listId, url)` is owner-only, throttled with `import:<memberId>` at 20 per 15 minutes, and returns a draft or a typed failure; it never writes an item.
  The UI pre-fills `ItemForm`; saving uses the normal `createItem`. A normalised URL (lowercase host, no fragment, no `utm_*`/`fbclid`, no trailing slash) matching an item already in the list shows a warning, not a block.

### R3d · Amazon import

> **R3d · task FG-304 · ~13 files: ~11 new, ~2 modified · packages P32–P34**
>
> Owners paste an Amazon wishlist page or copied text, review a table of drafts, and add the ones they want in one go.
> In code this adds an isolated parser with fixtures and a bulk preview and commit. It must never block manual entry, and can be dropped without affecting any other release.

- **D41 · Parser.** `src/features/imports/amazon/` exports `parseAmazonHtml(html)` and `parseAmazonText(text)`, both returning `ImportDraft[]` with an `uncertain: boolean` per draft. Input over 500 KB returns `INPUT_TOO_LARGE`.
  HTML is parsed with cheerio as data and never rendered. ASINs found in `/dp/`, `/gp/product/` or `data-asin` map to `https://www.amazon.co.uk/dp/<ASIN>`. Text mode pairs each Amazon URL with the nearest preceding non-empty line as title.
  Zero results returns an empty list and a message pointing to manual entry. Fixtures under `tests/fixtures/amazon/` are the contract when Amazon markup changes.
- **D42 · Bulk commit.** `commitBulkImport(listId, drafts)` inserts all confirmed rows in one transaction with priority `would_love`, skipping blank titles, re-validating every field with the D21 schemas. Duplicate URLs warn in the preview and do not block.

### R4a · Recovery links

> **R4a · task FG-401 · ~9 files: ~8 new, ~1 modified · packages P35–P37**
>
> A guest can create a private link, open it on another device and get their planner and claims back, and can revoke it.
> In code this adds the token service, a fragment-based exchange page and API route, and the Save Access dialog.

- **D43 · Recovery.** Token is 32 random bytes (base64url); only its sha256 is stored in `recovery_token`, one active per guest (creating a new one sets `revoked_at` on the old, existing sessions keep working).
  The link is `/recover#t=<token>`: the page reads the fragment, calls `history.replaceState` to `/recover` at once, and POSTs the token as JSON to `/api/recovery/exchange` (`Cache-Control: no-store`, `Referrer-Policy: no-referrer`).
  Success sets `fg_guest` for the original guest id and returns 204; any invalid or revoked token returns the same generic 404. Throttled with `recovery:<ip>`. The dialog warns that anyone with the link gets access and that losing it plus all browser sessions may lose the data.

### R4b · Hardening

> **R4b · task FG-402 · ~10 files: ~8 new, ~2 modified · packages P38–P40**
>
> No new features. Security headers, a payload-isolation sweep, a backup and restore runbook with scripts, and a 375 px and accessibility pass on the critical flows.
> This is the Christmas release gate.

- **D44 · Headers.** `next.config.ts` sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` (and `no-referrer` on `/recover` and `/api/recovery/*`). A CSP is a follow-up.
- **D45 · Backup.** `scripts/backup.sh` runs `pg_dump --format=custom` against `DATABASE_URL`; `scripts/restore.sh` restores into an empty database named by its argument. `Docs/FamilyGifts/Runbook.md` documents deploy, migrate, backup, restore test,
  and the Supabase free-tier pause risk to check before launch.

## Non-goals

- Everything in PRD §2.3 (public registration, multi-household, email, payments, price monitoring, notifications, receipts, realtime, etc.).
- Drag-and-drop reordering, a CSP, stronger-than-URL guest authentication, per-release feature flags.
- Live Amazon login or any paid scraping service.
- Admin visibility of claims or planners, owner-visible claim counts, configurable buyer-name visibility.
- Multiple currencies beyond GBP, rollover of lists between years.

## Lanes

| Lane | Touched | Checks |
|---|---|---|
| `repo` (config, CI, docs, scripts) | yes | `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck` |
| `db` (`src/db/**`) | yes | `pnpm db:up && pnpm db:migrate && pnpm test:integration` |
| `server` (`src/lib/**`, `src/features/**/*.ts`, route handlers) | yes | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration` |
| `ui` (`src/app/**`, `src/components/**`, `src/features/**/components/**`, `src/theme/**`) | yes | `pnpm lint`, `pnpm typecheck`, `pnpm build` |
| `e2e` (`tests/e2e/**`) | yes | `pnpm test:e2e` (starts `pnpm build && pnpm start` and the test database) |

## Packages

Waves:

| Wave | Packages | Release | Note |
|---|---|---|---|
| 1 | P0 | R1a (FG-101) | |
| 2 | P1, P2 | R1a (FG-101), R1b (FG-102) | parallel; P2 only needs P0 |
| 3 | P3 | R1b (FG-102) | |
| 4 | P4 | R1c (FG-103) | |
| 5 | P5 | R1c (FG-103) | |
| 6 | P6 | R1c (FG-103) | |
| 7 | P7 | R1c (FG-103) | |
| 8 | P8 | R1d (FG-104) | |
| 9 | P9, P10 | R1d (FG-104) | parallel |
| 10 | P11, P12 | R1d (FG-104) | parallel |
| 11 | P13 | R1d (FG-104) | |
| 12 | P14 | R2a (FG-201) | |
| 13 | P15 | R2a (FG-201) | |
| 14 | P16 | R2a (FG-201) | |
| 15 | P17 | R2a (FG-201) | |
| 16 | P18 | R2a (FG-201) | |
| 17 | P19 | R2b (FG-202) | |
| 18 | P20 | R2b (FG-202) | |
| 19 | P21 | R2b (FG-202) | |
| 20 | P22 | R3a (FG-301) | |
| 21 | P23 | R3a (FG-301) | |
| 22 | P24 | R3a (FG-301) | |
| 23 | P25 | R3a (FG-301) | |
| 24 | P26 | R3b (FG-302) | |
| 25 | P27 | R3b (FG-302) | |
| 26 | P28, P29 | R3c (FG-303) | parallel |
| 27 | P30 | R3c (FG-303) | |
| 28 | P31 | R3c (FG-303) | |
| 29 | P32 | R3d (FG-304) | |
| 30 | P33 | R3d (FG-304) | |
| 31 | P34 | R3d (FG-304) | |
| 32 | P35 | R4a (FG-401) | |
| 33 | P36 | R4a (FG-401) | |
| 34 | P37 | R4a (FG-401) | |
| 35 | P38, P39 | R4b (FG-402) | parallel |
| 36 | P40 | R4b (FG-402) | |

Packages that share a wave share no files.

Shared acceptance for every package:

- The lane checks pass for its files, measured against the baseline.
- No test is deleted or skipped to pass a check.
- The branch passes the pre-PR audit (SKILL.md step 10) before a PR is raised: no unneeded changes, tests that exercise real cases, no DRY/SOLID defects.
- Shared resources (strings, config, schemas, dependencies) only through the package that owns them. A package that finds one missing reports `blocked`.
- Every server action starts with the `require*` guard from D16 and validates input with zod.
- UI changes work at 375 px and by keyboard, with no horizontal scroll.

### P0 · repo: Next.js, MUI and tooling scaffold (R1a · FG-101, wave 1)
- Lane: `repo`
- ownedFiles:
  - `package.json` (new)
  - `pnpm-lock.yaml` (new)
  - `tsconfig.json` (new)
  - `next.config.ts` (new)
  - `eslint.config.mjs` (new)
  - `.gitignore` (new)
  - `.env.example` (new)
  - `vitest.config.ts` (new)
  - `docker-compose.yml` (new)
  - `.github/workflows/ci.yml` (new)
  - `README.md` (new)
  - `src/lib/env.ts` (new)
  - `src/theme/theme.ts` (new)
  - `src/theme/ThemeRegistry.tsx` (new)
  - `src/app/layout.tsx` (new)
  - `src/app/(public)/page.tsx` (new)
  - `tests/unit/env.test.ts` (new)
- Acceptance criteria:
  1. `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass on a clean checkout.
  2. `package.json` lists every dependency named in D2 and the scripts named in D2; `engines.node` is `>=22`.
  3. `tests/unit/env.test.ts` fails when `SESSION_SECRET` is shorter than 32 characters and passes with a valid set.
  4. `pnpm dev` serves `/` with MUI styles server-rendered (no flash of unstyled content) and the cream background from D4.
  5. `.env.example` lists `DATABASE_URL`, `ADMIN_SECRET`, `SESSION_SECRET`, `TEST_DATABASE_URL`; `.gitignore` excludes `.env*` except `.env.example`.

### P1 · ui: icons and app shell (R1a · FG-101, wave 2)
- Lane: `ui`
- ownedFiles:
  - `public/icons/**/*.png` (new, copied from the icon pack per D5)
  - `src/components/ui/Icon.tsx` (new)
  - `src/components/layout/AppShell.tsx` (new)
  - `src/app/layout.tsx`
  - `Docs/FamilyGifts/Decisions/0001-stack-and-layout.md` (new)
- Acceptance criteria:
  1. `public/icons/{christmas,shopping,interface}/` contain exactly the 36 transparent PNGs from the pack, none from `background_preserved/` or `sheets/`.
  2. `<Icon name="christmas/nope" />` fails `pnpm typecheck`; `<Icon name="christmas/holly" />` renders an `<img>` with `alt=""`, and with `alt="Holly"` renders that alt.
  3. `AppShell` renders a pine-green top bar with links Family (`/`), and a slot for role-specific links; at 375 px the links collapse into a menu button with an accessible name.
  4. `AppShell` is used by `src/app/layout.tsx`; every link and the menu button are reachable by keyboard with a visible focus ring.
  5. Decision 0001 exists with `Status: Agreed` and describes D2 and D3 as built.

### P2 · db: Drizzle schema and client (R1b · FG-102, wave 2)
- Lane: `db`
- ownedFiles:
  - `drizzle.config.ts` (new)
  - `src/db/client.ts` (new)
  - `src/db/schema/index.ts` (new)
  - `src/db/schema/identity.ts` (new)
  - `src/db/schema/wishlist.ts` (new)
  - `src/db/schema/claims.ts` (new)
  - `src/db/schema/planner.ts` (new)
  - `src/db/schema/limits.ts` (new)
  - `src/lib/money.ts` (new)
  - `tests/unit/money.test.ts` (new)
- Acceptance criteria:
  1. `pnpm typecheck` passes and the schema defines every PRD §7 table with the columns, uniques and checks from D8.
  2. `claims.ts` declares the partial unique index `item_claim_one_active_per_item` on `item_id where released_at is null`.
  3. `parsePoundsToMinor("12.5")` is 1250, `"12.50"` is 1250, `"0.07"` is 7, and `"-1"`, `"1.234"`, `"abc"`, `"1000000"` are rejected; `formatGBP(12999)` is `£129.99`.
  4. `src/db/client.ts` reads `DATABASE_URL` through `src/lib/env.ts` and uses `prepare: false`.

### P3 · db: migration, seed and integration harness (R1b · FG-102, wave 3)
- Lane: `db`
- ownedFiles:
  - `src/db/migrations/**/*.sql` (new, generated)
  - `src/db/migrations/meta/**/*.json` (new, generated)
  - `src/db/seed.ts` (new)
  - `vitest.integration.config.ts` (new)
  - `tests/integration/db-harness.ts` (new)
  - `tests/integration/schema.test.ts` (new)
  - `Docs/FamilyGifts/Decisions/0002-money-and-schema.md` (new)
- Acceptance criteria:
  1. `pnpm db:up && pnpm db:migrate` applies the migration to an empty database with no error and a second run is a no-op.
  2. `schema.test.ts` inserts two active `item_claim` rows for one item and the second fails with a unique violation; a claim with `released_at` set does not block a new active claim.
  3. `schema.test.ts` rejects an `item_claim.status` of `"bogus"` and a `wishlist_item.priority` of `"urgent"`, and a duplicate `wishlist.slug`.
  4. `pnpm db:seed` creates exactly one `household` row and is safe to run twice; `--demo` adds two members and one list.
  5. `pnpm test:integration` runs against `TEST_DATABASE_URL` with tables truncated between tests; the CI workflow gains a Postgres service and an integration step.
  6. Decision 0002 exists with `Status: Agreed`.

### P4 · server: password, token and throttle primitives (R1c · FG-103, wave 4)
- Lane: `server`
- ownedFiles:
  - `src/lib/security/password.ts` (new)
  - `src/lib/security/token.ts` (new)
  - `src/lib/security/rate-limit.ts` (new)
  - `tests/unit/security/password.test.ts` (new)
  - `tests/unit/security/token.test.ts` (new)
  - `tests/integration/rate-limit.test.ts` (new)
- Acceptance criteria:
  1. `hashPin("123456")` verifies with `verifyPin("123456", hash)` and fails for `"123457"`; the hash starts with `$argon2id$`; `hashPin("12345")` and `hashPin("abcdef")` throw a validation error.
  2. `newToken()` returns 43-character base64url strings, 1000 calls are unique, and `hashToken(t)` is a stable 64-character hex string different from `t`.
  3. `rate-limit.test.ts`: the 5th failure for a key sets `blocked_until`; the 6th attempt is refused even with a correct credential; `clear(key)` unblocks; a different key is unaffected.
  4. Two parallel `recordFailure` calls on one key both count (no lost update), proven by an integration test.

### P5 · server: sessions, permissions and guards (R1c · FG-103, wave 5)
- Lane: `server`
- ownedFiles:
  - `src/lib/result.ts` (new)
  - `src/lib/auth/session.ts` (new)
  - `src/lib/auth/cookies.ts` (new)
  - `src/lib/auth/require.ts` (new)
  - `src/lib/permissions/index.ts` (new)
  - `tests/unit/permissions.test.ts` (new)
  - `tests/integration/session.test.ts` (new)
- Acceptance criteria:
  1. `permissions.test.ts` encodes every row of PRD §3.1 (admin, owner, guest × each operation) and passes; an owner session cannot act on another member's list.
  2. `session.test.ts`: `getSession` returns nothing for an expired, revoked or unknown token, and for a token presented under the wrong cookie role.
  3. The database row stores only the sha256 of the token; no test or query result contains the raw token.
  4. Cookies are created with `HttpOnly`, `SameSite=Lax`, `Path=/`, the TTLs from D12, and `Secure` only when `NODE_ENV=production`.
  5. `requireOwner(memberId)` throws a typed unauthorized error when the session is a guest or admin session.

### P6 · server: admin and owner login, family services (R1c · FG-103, wave 6)
- Lane: `server`
- ownedFiles:
  - `src/features/authentication/admin-login.ts` (new)
  - `src/features/authentication/owner-login.ts` (new)
  - `src/features/family/schemas.ts` (new)
  - `src/features/family/queries.ts` (new)
  - `src/features/family/actions.ts` (new)
  - `tests/integration/authentication.test.ts` (new)
  - `tests/integration/family.test.ts` (new)
- Acceptance criteria:
  1. `authentication.test.ts`: a wrong admin secret and a wrong owner PIN create no session row and both return the D15 message; six wrong PINs for one member block the seventh even with the right PIN.
  2. A correct PIN for an inactive member is refused with the same generic message.
  3. `family.test.ts`: without an admin session, `createMember`, `setOwnerPin`, `createList`, `archiveList` and `restoreList` all return unauthorized and change nothing.
  4. `setOwnerPin` stores an Argon2id hash and revokes the member's existing owner sessions; member queries return no `pin_hash` field.
  5. Member names are unique among active members; `deactivateMember` hides the member from the dashboard query; `archiveList` sets `archived_at` and `restoreList` clears it; list creation stores a D18 slug.

### P7 · ui: admin and owner sign-in screens (R1c · FG-103, wave 7)
- Lane: `ui`
- ownedFiles:
  - `src/app/(admin)/admin/login/page.tsx` (new)
  - `src/app/(admin)/admin/page.tsx` (new)
  - `src/app/(admin)/admin/members/[memberId]/page.tsx` (new)
  - `src/app/(owner)/owner/login/page.tsx` (new)
  - `src/features/family/components/MemberForm.tsx` (new)
  - `src/features/family/components/ListForm.tsx` (new)
  - `src/features/family/components/PinResetForm.tsx` (new)
  - `tests/e2e/admin-setup.spec.ts` (new)
  - `Docs/FamilyGifts/Decisions/0003-session-model.md` (new)
  - `Docs/FamilyGifts/Decisions/0004-pin-and-throttling.md` (new)
- Acceptance criteria:
  1. `admin-setup.spec.ts`: signing in at `/admin/login` with `ADMIN_SECRET`, adding a member with a 6-digit PIN and creating a Christmas 2026 list shows the list's `/l/<slug>` link with a Copy button.
  2. Visiting `/admin` without a session redirects to `/admin/login`; a wrong secret shows the D15 message and nothing else.
  3. The member page can rename, deactivate, reset PIN, archive and restore, with archived lists labelled "Archived" in words.
  4. `/owner/login` lets a member be chosen and a PIN entered; a wrong PIN shows the D15 message. The PIN field is `type="password"` with `inputMode="numeric"` and autocomplete off.
  5. Decisions 0003 and 0004 exist with `Status: Agreed`.

### P8 · server: slugs and item schemas (R1d · FG-104, wave 8)
- Lane: `server`
- ownedFiles:
  - `src/features/wishlists/slug.ts` (new)
  - `src/features/wishlists/schemas.ts` (new)
  - `tests/unit/wishlists/slug.test.ts` (new)
  - `tests/unit/wishlists/schemas.test.ts` (new)
- Acceptance criteria:
  1. `generateSlug()` returns 10 base62 characters; 10,000 calls produce no duplicates and no character outside `[0-9A-Za-z]`.
  2. The item schema rejects an empty title, a 121-character title, `javascript:alert(1)` and `ftp://x` as URLs, and accepts a missing price; priority defaults to `would_love`.
  3. Price `"19.99"` becomes 1999; `"1e3"` and `"-5"` are rejected.
  4. Exported types `OwnerItemInput` and `ItemFields` are inferred from the schema, not hand-written.

### P9 · server: owner item services (R1d · FG-104, wave 9)
- Lane: `server`
- ownedFiles:
  - `src/features/wishlists/owner-queries.ts` (new)
  - `src/features/wishlists/owner-actions.ts` (new)
  - `tests/integration/owner-items.test.ts` (new)
- Acceptance criteria:
  1. `owner-items.test.ts`: owner A can create, edit and delete items on their own list; the same calls with owner B's session against A's list return unauthorized and change nothing.
  2. `deleteItem` sets `deleted_at` and the row remains; `listOwnerItems` omits it.
  3. Editing or adding on an archived list is refused with `LIST_ARCHIVED`.
  4. New items get a `sort_order` 10 above the highest in their priority group; the first item in a group gets 10.
  5. `OwnerWishlistView` results contain no key matching `claim|interest|guest|planner`.

### P10 · server: public views and queries (R1d · FG-104, wave 9)
- Lane: `server`
- ownedFiles:
  - `src/features/wishlists/views.ts` (new)
  - `src/features/wishlists/public-queries.ts` (new)
  - `tests/integration/public-views.test.ts` (new)
- Acceptance criteria:
  1. `getListBySlug` returns the view for an active list, the same view plus `archived: true` for an archived list (D19), and `null` for an unknown slug or an inactive member's list.
  2. The family dashboard query returns only non-archived lists of active members, grouped by member, and never returns slugs for archived lists.
  3. Deleted items never appear in the guest view; items are in priority order (most wanted, would love, nice to have) then `sort_order`.
  4. The guest view has no claim, interest, owner PIN or session fields; a test asserts the exact key set of one serialized item.

### P11 · ui: owner dashboard and item editor (R1d · FG-104, wave 10)
- Lane: `ui`
- ownedFiles:
  - `src/app/(owner)/owner/page.tsx` (new)
  - `src/app/(owner)/owner/lists/[listId]/page.tsx` (new)
  - `src/features/wishlists/components/ItemForm.tsx` (new)
  - `src/features/wishlists/components/OwnerItemList.tsx` (new)
  - `src/features/wishlists/components/PriorityChip.tsx` (new)
  - `src/features/wishlists/components/SignOutButton.tsx` (new)
- Acceptance criteria:
  1. `/owner` without an owner session redirects to `/owner/login`; with one it lists only that member's lists and a sign-out button that ends the session.
  2. The item form has fields for title, link, notes, image link, price and priority (Most Wanted, Would Love, Nice to Have, default Would Love) and shows field-level errors from the zod messages.
  3. Items show grouped by priority with words and an icon, not colour alone; delete asks for confirmation with the generic text from D22.
  4. Opening another member's list id shows the not-found page.
  5. The owner pages import nothing from `src/features/reservations` or `src/features/planner` (checked by `pnpm lint` from R2a on and by grep now).

### P12 · ui: family dashboard and public list page (R1d · FG-104, wave 10)
- Lane: `ui`
- ownedFiles:
  - `src/app/(public)/page.tsx`
  - `src/app/(public)/l/[slug]/page.tsx` (new)
  - `src/app/(public)/l/[slug]/not-found.tsx` (new)
  - `src/features/wishlists/components/PublicItemCard.tsx` (new)
  - `src/features/wishlists/components/CopyLinkButton.tsx` (new)
  - `src/app/robots.ts` (new)
- Acceptance criteria:
  1. `/` shows a card per member with their active list titles linking to `/l/<slug>`, and a friendly empty state when there are none.
  2. `/l/<slug>` shows items in priority order with image (alt text = item title, fallback icon when missing), price, link and notes; it has `robots: noindex`.
  3. An archived list shows an "Archived" banner and the items; an unknown slug shows the safe not-found page with no member or list names.
  4. Copy Link copies the absolute list URL and shows a visible "Copied" confirmation; it works by keyboard.
  5. `/robots.txt` disallows all.

### P13 · e2e: owner journey and decisions (R1d · FG-104, wave 11)
- Lane: `e2e`
- ownedFiles:
  - `playwright.config.ts` (new)
  - `tests/e2e/helpers.ts` (new)
  - `tests/e2e/owner-list.spec.ts` (new)
  - `Docs/FamilyGifts/Decisions/0005-slugs-and-archive.md` (new)
  - `Docs/FamilyGifts/Decisions/0006-role-scoped-views.md` (new)
  - `Docs/FamilyGifts/Decisions/0007-soft-delete.md` (new)
- Acceptance criteria:
  1. `pnpm test:e2e` starts the built app against the test database, seeds a household and runs headless Chromium at 375 px and 1280 px.
  2. `owner-list.spec.ts`: admin creates a member and list, the owner signs in, adds a gift, and a fresh browser context opens `/l/<slug>` and sees it with no edit controls.
  3. The same spec checks the owner can delete the gift and it disappears from the public page.
  4. The CI workflow runs the e2e job.
  5. Decisions 0005, 0006 and 0007 exist with `Status: Agreed`.

### P14 · server: guest identity (R2a · FG-201, wave 12)
- Lane: `server`
- ownedFiles:
  - `src/features/authentication/guest-actions.ts` (new)
  - `src/features/authentication/guest-session.ts` (new)
  - `tests/integration/guest-session.test.ts` (new)
- Acceptance criteria:
  1. `createGuest("Sam")` and a second `createGuest("Sam")` produce two different guest ids and two sessions.
  2. A request with the `fg_guest` cookie resolves to the same guest id on later calls; an expired or revoked token resolves to none.
  3. `renameGuest` changes `display_name` and leaves claims pointing at the same guest id.
  4. Names are trimmed; empty and 41-character names are rejected.
  5. Presenting an owner or admin cookie to a guest-only action returns unauthorized.

### P15 · server: interest and claim service (R2a · FG-201, wave 13)
- Lane: `server`
- ownedFiles:
  - `src/features/reservations/claims.ts` (new)
  - `src/features/reservations/interest.ts` (new)
  - `src/features/reservations/errors.ts` (new)
  - `src/features/reservations/actions.ts` (new)
  - `tests/integration/claims.test.ts` (new)
  - `tests/integration/claims-concurrency.test.ts` (new)
- Acceptance criteria:
  1. `claims-concurrency.test.ts`: 20 parallel `reserve` calls from 20 guests for one item produce exactly one success and 19 `CLAIM_CONFLICT`, and exactly one active `item_claim` row.
  2. `claims.test.ts`: reserve → markPurchased → release (with `confirm: true`) works for the claimant; the same calls from another guest return `NOT_CLAIMANT`; releasing a purchased claim without `confirm` returns `CONFIRM_REQUIRED`.
  3. After release, a different guest can reserve the item and the first guest's row keeps its `released_at`.
  4. Interest is idempotent (twice gives one row), can be cleared, and does not block another guest from reserving.
  5. Reserving a soft-deleted item or an item on an archived list returns `ITEM_UNAVAILABLE`.
  6. Every result includes the refreshed `GuestItemState` for the item.

### P16 · server: guest claim view and isolation guard (R2a · FG-201, wave 14)
- Lane: `server`
- ownedFiles:
  - `src/features/wishlists/views.ts`
  - `src/features/wishlists/public-queries.ts`
  - `src/features/reservations/guest-claim-view.ts` (new)
  - `eslint.config.mjs`
  - `tests/integration/guest-view.test.ts` (new)
  - `tests/integration/projection-isolation.test.ts` (new)
- Acceptance criteria:
  1. `guest-view.test.ts`: the same list loaded as guest A, guest B and an anonymous visitor shows each item with the right `GuestItemState` (D27), and the other guest's `display_name` as claimant for `*_by_other`.
  2. Anonymous visitors see `available` for unclaimed items and `reserved_by_other` or `purchased_by_other` for claimed items without a claimant name.
  3. `projection-isolation.test.ts` serialises every owner query, admin query and the owner list page data after claims and interests exist, and finds no key matching `claim|interest|guest|planner|recovery|token|hash|pin`.
  4. `pnpm lint` fails when a file under `src/app/(owner)` imports from `@/features/reservations/*` and passes on the repo as written (D29).
  5. The R1d guest view tests still pass unchanged.

### P17 · ui: guest welcome and claim controls (R2a · FG-201, wave 15)
- Lane: `ui`
- ownedFiles:
  - `src/features/reservations/components/GuestWelcome.tsx` (new)
  - `src/features/reservations/components/ClaimControls.tsx` (new)
  - `src/features/reservations/components/StatusChip.tsx` (new)
  - `src/app/(public)/l/[slug]/page.tsx`
  - `src/features/wishlists/components/PublicItemCard.tsx`
- Acceptance criteria:
  1. A first-time visitor sees the name prompt before any action; after saving a name, reloading the page does not ask again.
  2. Each item shows a status label in words (Available, Interested, Reserved by you, Reserved by <name>, Purchased by you, Purchased by <name>) with an icon; colour is never the only signal.
  3. Buttons shown match the state: Interested / Not interested / Reserve; Mark purchased / Release for the claimant; nothing but the status for another guest's claim.
  4. Undoing a purchase opens a confirmation dialog before calling the action with `confirm: true`.
  5. On `CLAIM_CONFLICT` the card shows "Someone else just reserved this" and refreshes to the new state.
  6. All controls have 44 px targets and work by keyboard at 375 px.

### P18 · e2e: claims journey and decisions (R2a · FG-201, wave 16)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/claims.spec.ts` (new)
  - `Docs/FamilyGifts/Decisions/0008-exclusive-claim.md` (new)
  - `Docs/FamilyGifts/Decisions/0009-buyer-names.md` (new)
- Acceptance criteria:
  1. Two browser contexts as guests open the same list and click Reserve on one item at the same time; exactly one ends with "Reserved by you" and the other with a reserved-by-name status.
  2. After the winner marks the item purchased, the other guest sees "Purchased by <name>" and no buttons for it.
  3. The owner, signed in at `/owner/lists/<id>`, sees no reservation, interest or purchase text for any item.
  4. A release by the winner makes the item available to the other guest again.
  5. Decisions 0008 and 0009 exist with `Status: Agreed`.

### P19 · server: reorder service and sort-filter functions (R2b · FG-202, wave 17)
- Lane: `server`
- ownedFiles:
  - `src/features/wishlists/reorder.ts` (new)
  - `src/features/wishlists/reorder-actions.ts` (new)
  - `src/features/wishlists/sort-filter.ts` (new)
  - `tests/unit/wishlists/sort-filter.test.ts` (new)
  - `tests/integration/reorder.test.ts` (new)
- Acceptance criteria:
  1. `reorder.test.ts`: `moveItem(up)` on the second item of a group swaps with the first; on the first item it changes nothing; the order persists after reload; items in other priority groups are untouched.
  2. Ten concurrent `moveItem` calls on one group leave `sort_order` values unique within the group.
  3. Changing an item's priority places it last in the new group.
  4. An owner session for another member cannot move items.
  5. `sort-filter.test.ts`: `price_asc` and `price_desc` both put unpriced items last; `newest` orders by `created_at` descending; default sort is priority then `sort_order`; the price range filter is inclusive; `avail` removes items whose state is `*_by_other`.

### P20 · ui: reorder buttons and guest sort/filter bar (R2b · FG-202, wave 18)
- Lane: `ui`
- ownedFiles:
  - `src/features/wishlists/components/ReorderControls.tsx` (new)
  - `src/features/wishlists/components/SortFilterBar.tsx` (new)
  - `src/features/wishlists/components/OwnerItemList.tsx`
  - `src/app/(public)/l/[slug]/page.tsx`
- Acceptance criteria:
  1. Owner items have Move up and Move down buttons with text labels for assistive tech, disabled at group ends; the order survives a refresh.
  2. The guest bar offers sort and filter controls bound to the URL params in D32; a copied URL reproduces the same view.
  3. Changing sort or filter makes no database write and the owner's order is unchanged on the next owner visit.
  4. The owner page has no claim-state filter or sort.
  5. The bar is usable at 375 px without horizontal scroll.

### P21 · e2e: ordering and decision 0010 (R2b · FG-202, wave 19)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/ordering.spec.ts` (new)
  - `Docs/FamilyGifts/Decisions/0010-ordering-sorting.md` (new)
- Acceptance criteria:
  1. The spec moves an item up as the owner and a guest sees the new order; the guest then sorts by price descending and the unpriced item is last.
  2. After the guest sorts, a fresh visit without params shows the owner's priority order.
  3. Keyboard-only use of Move up works.
  4. Decision 0010 exists with `Status: Agreed`.

### P22 · server: accounting function (R3a · FG-301, wave 20)
- Lane: `server`
- ownedFiles:
  - `src/features/planner/accounting.ts` (new)
  - `tests/unit/planner/accounting.test.ts` (new)
- Acceptance criteria:
  1. The Appendix B example (reserved £129.99, interested £14.99, purchased £24.99 paid £19.50, budget £250) gives planned 14949, spent 1950, potential 1499, remaining 10051.
  2. A zero budget gives remaining equal to minus planned; a null budget gives `remainingMinor` null; overspend gives a negative remaining.
  3. Entries with no price add nothing and are counted in `unpricedCount`; an `included = false` entry is ignored entirely.
  4. Moving one entry through interested → reserved → purchased never counts it twice in planned or spent.
  5. All arithmetic is on integers; a test asserts `Number.isInteger` on every output.

### P23 · server: planner queries and actions (R3a · FG-301, wave 21)
- Lane: `server`
- ownedFiles:
  - `src/features/planner/schemas.ts` (new)
  - `src/features/planner/queries.ts` (new)
  - `src/features/planner/actions.ts` (new)
  - `tests/integration/planner.test.ts` (new)
- Acceptance criteria:
  1. `getPlanner()` returns the session guest's interests and active claims grouped by recipient and occasion with item title, URL, listed price and state; another guest's rows never appear.
  2. Without a guest session every planner query and action returns unauthorized; an owner or admin cookie does not satisfy the guard.
  3. Setting the total budget, a recipient budget, a note (≤ 500) and an actual price persists, and a second guest cannot read or change any of them even when passing the first guest's planner id.
  4. Setting an actual price leaves `wishlist_item.price_minor` unchanged.
  5. A claimed item the owner later deletes still appears with the saved title and a `removed` flag; its price counts in totals.
  6. Removing an interested item clears interest; removing a reserved or purchased item returns `CLAIM_ACTIVE` until the claim is released.

### P24 · ui: planner page (R3a · FG-301, wave 22)
- Lane: `ui`
- ownedFiles:
  - `src/app/(public)/planner/page.tsx` (new)
  - `src/features/planner/components/PlannerGroup.tsx` (new)
  - `src/features/planner/components/TotalsPanel.tsx` (new)
  - `src/features/planner/components/BudgetSheet.tsx` (new)
  - `src/features/planner/components/EntryNotes.tsx` (new)
  - `src/components/layout/AppShell.tsx`
- Acceptance criteria:
  1. `/planner` without a guest session shows a friendly "Pick a name first" prompt linking to the family page.
  2. Entries are grouped by recipient, each with title, link, listed price (or "No price"), status in words and the buttons from D35.
  3. `TotalsPanel` shows Planned, Spent, Potential, Remaining and "N items without a price", using `computePlan` only (no arithmetic in the component); negative remaining is shown in words as "over budget".
  4. The budget sheet saves a total and per-recipient budgets; notes and actual price save per entry and are shown only on this page.
  5. `AppShell` shows a My Planner link only when a guest session exists; items on the list page link to the planner when held by the guest.

### P25 · e2e: planner journey and decision 0011 (R3a · FG-301, wave 23)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/planner.spec.ts` (new)
  - `Docs/FamilyGifts/Decisions/0011-planner-accounting.md` (new)
- Acceptance criteria:
  1. A guest reserves items on two members' lists, sets a £250 budget, marks one purchased with an actual price and a note, and the planner shows the expected planned, spent and remaining.
  2. A second guest, the owner and the admin cannot see the note or actual price anywhere, including in page source and network responses.
  3. The planner works after reload and shows the same data in a second context that shares the guest cookie.
  4. Decision 0011 exists with `Status: Agreed`.

### P26 · server: export formatters (R3b · FG-302, wave 24)
- Lane: `server`
- ownedFiles:
  - `src/features/planner/export/text.ts` (new)
  - `src/features/planner/export/markdown.ts` (new)
  - `src/features/planner/export/csv.ts` (new)
  - `tests/unit/planner/export.test.ts` (new)
- Acceptance criteria:
  1. `text.ts` reproduces the PRD Appendix B output byte for byte for its sample data, including paid price and the totals lines.
  2. CSV: a title containing a comma, a double quote and a newline round-trips through a standard CSV parser unchanged; rows end in CRLF.
  3. CSV: a title `=HYPERLINK("x")`, `+1`, `-1`, `@a` and a tab-prefixed value each come out prefixed with `'`.
  4. Notes appear only when `includeNotes` is true; recovery or session data cannot be passed in because the entry type has no such field.
  5. Every entry with a URL has it in all three formats; entries without a URL still render.

### P27 · ui: export menu and decision 0012 (R3b · FG-302, wave 25)
- Lane: `ui`
- ownedFiles:
  - `src/features/planner/components/ExportMenu.tsx` (new)
  - `src/features/planner/components/PlannerGroup.tsx`
  - `tests/e2e/planner-export.spec.ts` (new)
  - `Docs/FamilyGifts/Decisions/0012-export-escaping.md` (new)
- Acceptance criteria:
  1. Each entry has a checkbox with a visible label, plus Select all and Clear; selection is local state.
  2. Copy puts the text format on the clipboard and confirms "Copied"; Markdown and CSV download as files generated in the browser.
  3. With nothing selected the menu shows "Choose at least one gift" and downloads nothing.
  4. The e2e spec checks the copied text and a downloaded CSV for a selected subset and that unselected entries are absent.
  5. Decision 0012 exists with `Status: Agreed`.

### P28 · server: SSRF-safe fetch (R3c · FG-303, wave 26)
- Lane: `server`
- ownedFiles:
  - `src/lib/security/ssrf.ts` (new)
  - `src/lib/security/safe-fetch.ts` (new)
  - `tests/unit/security/ssrf.test.ts` (new)
  - `tests/integration/safe-fetch.test.ts` (new)
- Acceptance criteria:
  1. `ssrf.test.ts` rejects `127.0.0.1`, `10.0.0.1`, `172.16.0.1`, `192.168.1.1`, `169.254.169.254`, `100.64.0.1`, `0.0.0.0`, `::1`, `fd00::1`, `fe80::1` and `::ffff:127.0.0.1`, and accepts `93.184.216.34`.
  2. `safe-fetch.test.ts` against a local test server: a redirect to a private address, a hostname resolving to a private address, a 5-hop redirect chain, a port other than 80/443, a `file:` URL, a body over 1 MB, a non-HTML response and a response slower than 5 s each fail with their typed code from D38.
  3. A hostname that resolves to a public address on the first check and a private address on a second lookup is still blocked (the checked IP is the one connected to).
  4. A normal public-style HTML response returns its text.

### P29 · server: metadata extraction and duplicates (R3c · FG-303, wave 26)
- Lane: `server`
- ownedFiles:
  - `src/features/imports/types.ts` (new)
  - `src/features/imports/extract-metadata.ts` (new)
  - `src/features/imports/duplicates.ts` (new)
  - `tests/unit/imports/extract-metadata.test.ts` (new)
  - `tests/fixtures/product-jsonld.html` (new)
  - `tests/fixtures/product-opengraph.html` (new)
  - `tests/fixtures/product-bare.html` (new)
- Acceptance criteria:
  1. The JSON-LD fixture yields title, description, image, `priceMinor`, currency `GBP` and canonical URL; the Open Graph fixture yields title, image and price from `product:price:*`; the bare fixture yields at least a title from `<title>`.
  2. A fixture containing `<script>` and `onerror` attributes produces text fields with the markup left as inert text and nothing executed.
  3. A USD price produces no `priceMinor` and a warning naming the currency.
  4. `normalizeUrl("HTTPS://Shop.example/p/1/?utm_source=x#top")` equals `normalizeUrl("https://shop.example/p/1")`, and `findDuplicate` returns the matching item id from a list of existing URLs.
  5. `ImportDraft` is defined once in `types.ts` and reused by R3d.

### P30 · server and ui: URL preview action and panel (R3c · FG-303, wave 27)
- Lane: `server`
- ownedFiles:
  - `src/features/imports/url-actions.ts` (new)
  - `src/features/imports/components/UrlImportPanel.tsx` (new)
  - `src/features/wishlists/components/ItemForm.tsx`
  - `tests/integration/url-import.test.ts` (new)
- Acceptance criteria:
  1. `previewUrlImport` returns unauthorized without an owner session for the list's member, refuses archived lists, and writes no `wishlist_item` row on any outcome.
  2. The 21st preview in 15 minutes for one member returns the D15 throttle message; each failure code maps to a friendly message that ends with "You can still add it by hand".
  3. A successful draft pre-fills the form with fields the owner can edit, and nothing is saved until the owner presses Save.
  4. A duplicate URL in the same list shows a warning above the Save button and still allows saving.
  5. The form works unchanged when the import panel is unused.

### P31 · e2e: URL import and decision 0013 (R3c · FG-303, wave 28)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/url-import.spec.ts` (new)
  - `tests/integration/safe-fetch.test.ts`
  - `Docs/FamilyGifts/Decisions/0013-url-import-ssrf.md` (new)
- Acceptance criteria:
  1. The spec serves the JSON-LD fixture from a local test server (allowed only when `FG_ALLOW_TEST_HOSTS=1` and `NODE_ENV=test`) and the owner gets a pre-filled editable draft.
  2. A URL pointing at a blocked or failing target shows the fallback message and the manual form still saves an item.
  3. `tests/integration/safe-fetch.test.ts` gains a case proving `FG_ALLOW_TEST_HOSTS=1` is ignored when `NODE_ENV=production` (a loopback URL is still blocked).
  4. Decision 0013 exists with `Status: Agreed`.

### P32 · server: Amazon parser and fixtures (R3d · FG-304, wave 29)
- Lane: `server`
- ownedFiles:
  - `src/features/imports/amazon/parse-html.ts` (new)
  - `src/features/imports/amazon/parse-text.ts` (new)
  - `src/features/imports/amazon/index.ts` (new)
  - `tests/fixtures/amazon/wishlist-basic.html` (new)
  - `tests/fixtures/amazon/wishlist-partial.html` (new)
  - `tests/fixtures/amazon/wishlist-copied.txt` (new)
  - `tests/unit/imports/amazon.test.ts` (new)
- Acceptance criteria:
  1. The basic fixture yields the expected count of drafts with title, canonical `https://www.amazon.co.uk/dp/<ASIN>` URL and price; the partial fixture yields drafts with `uncertain: true` where fields are missing.
  2. The copied-text fixture yields drafts by pairing each Amazon URL with the preceding title line.
  3. Input over 500 KB returns `INPUT_TOO_LARGE`; empty input, plain prose and malformed HTML return an empty list with the manual-entry message and never throw.
  4. Fixture HTML containing `<script>alert(1)</script>` and `<img onerror>` yields text fields with no markup executed or retained as HTML.
  5. Drafts use the shared `ImportDraft` type from R3c.

### P33 · server and ui: bulk preview and commit (R3d · FG-304, wave 30)
- Lane: `ui`
- ownedFiles:
  - `src/features/imports/bulk-actions.ts` (new)
  - `src/features/imports/components/BulkImportDialog.tsx` (new)
  - `src/app/(owner)/owner/lists/[listId]/page.tsx`
  - `tests/integration/bulk-import.test.ts` (new)
- Acceptance criteria:
  1. The dialog has a paste box, a Parse button and a preview table with editable titles, per-row remove, uncertain-field markers and duplicate warnings.
  2. `commitBulkImport` is owner-only, refuses archived lists, validates each row with the D21 schemas, skips blank titles, and inserts all or none in a transaction (a test with one invalid row inserts nothing and reports it).
  3. Nothing is inserted by Parse; only Add selected items inserts.
  4. A failed parse shows the manual-entry message and leaves the item form usable.
  5. Committed items append to the end of the `would_love` group in preview order.

### P34 · e2e: Amazon import and decision 0014 (R3d · FG-304, wave 31)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/amazon-import.spec.ts` (new)
  - `Docs/FamilyGifts/Decisions/0014-amazon-import.md` (new)
- Acceptance criteria:
  1. The spec pastes `wishlist-basic.html`, removes one row, edits one title and commits; the list shows exactly the remaining rows.
  2. Pasting unparseable text shows the fallback and the owner adds an item by hand.
  3. Decision 0014 exists with `Status: Agreed`.

### P35 · server: recovery token service and exchange route (R4a · FG-401, wave 32)
- Lane: `server`
- ownedFiles:
  - `src/features/authentication/recovery.ts` (new)
  - `src/features/authentication/recovery-actions.ts` (new)
  - `src/app/api/recovery/exchange/route.ts` (new)
  - `tests/integration/recovery.test.ts` (new)
- Acceptance criteria:
  1. `createRecoveryLink` stores only the sha256 of the token and returns the raw link once; the database never holds the raw token.
  2. Exchanging a valid token returns 204 and a new `fg_guest` session for the original guest id; exchanging after revoke or regenerate, or with an unknown token, returns the same 404 body.
  3. Creating a second link revokes the first; existing sessions of that guest still work.
  4. Only a guest session can create or revoke a link, and only for itself.
  5. The 11th exchange attempt in 15 minutes from one IP is throttled; responses carry `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.

### P36 · ui: Save Access dialog and recover page (R4a · FG-401, wave 33)
- Lane: `ui`
- ownedFiles:
  - `src/app/(public)/recover/page.tsx` (new)
  - `src/features/authentication/components/SaveAccessDialog.tsx` (new)
  - `src/components/layout/AppShell.tsx`
- Acceptance criteria:
  1. `AppShell` shows a Save access entry for guests; the dialog creates a link, shows it with Copy and Revoke, and shows the warning from D43.
  2. `/recover` reads `#t=…`, replaces the history entry with `/recover` before any network call, posts the token, and on success redirects to `/planner`.
  3. A missing or invalid token shows a clear failure message and a link to the family page.
  4. The raw token appears in no request URL, no server-rendered HTML and no `console` output.

### P37 · e2e: recovery journey and decision 0015 (R4a · FG-401, wave 34)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/recovery.spec.ts` (new)
  - `Docs/FamilyGifts/Decisions/0015-recovery-links.md` (new)
- Acceptance criteria:
  1. A guest with a reservation and a note creates a link, a fresh browser context opens it and sees the same planner, reservation and note.
  2. After the guest revokes or regenerates, opening the old link in another fresh context fails with the generic message.
  3. A different guest who does not have the link cannot reach the first guest's data.
  4. The test asserts the address bar shows `/recover` with no fragment after load.
  5. Decision 0015 exists with `Status: Agreed`.

### P38 · server: security headers and payload sweep (R4b · FG-402, wave 35)
- Lane: `server`
- ownedFiles:
  - `next.config.ts`
  - `tests/security/headers.test.ts` (new)
  - `tests/security/payload-isolation.test.ts` (new)
- Acceptance criteria:
  1. `headers.test.ts` against the running app asserts the D44 headers on `/`, `/l/<slug>`, `/owner/login`, and `no-referrer` on `/recover` and `/api/recovery/exchange`.
  2. `payload-isolation.test.ts` walks every owner and admin page and action result for a world with claims, interests, notes, budgets and recovery tokens, and finds no forbidden key and none of the seeded secret strings (note text, actual price, raw token).
  3. The same test confirms no `ADMIN_SECRET`, `SESSION_SECRET` or `DATABASE_URL` value appears in any HTML or JS bundle served.
  4. Both files run in CI.

### P39 · repo: backup, restore and runbook (R4b · FG-402, wave 35)
- Lane: `repo`
- ownedFiles:
  - `scripts/backup.sh` (new)
  - `scripts/restore.sh` (new)
  - `Docs/FamilyGifts/Runbook.md` (new)
  - `README.md`
- Acceptance criteria:
  1. `scripts/backup.sh` writes a timestamped custom-format dump; `scripts/restore.sh <db>` restores it into an empty database and refuses a non-empty one.
  2. A documented restore test (backup, restore to a scratch database, compare row counts for every table) has been run and its result is pasted in the Runbook.
  3. The Runbook covers environment variables, Vercel deploy, running migrations as a deliberate step, seeding the household, the Supabase pause and free-tier check, and what to do if a recovery link is lost.
  4. The README links the Runbook and lists the `pnpm` scripts from D2.

### P40 · e2e: mobile and accessibility pass (R4b · FG-402, wave 36)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/mobile-a11y.spec.ts` (new)
  - `src/theme/theme.ts`
- Acceptance criteria:
  1. At 375 px the spec runs admin setup, owner add item, guest reserve, planner and recovery without horizontal scroll (document width ≤ viewport width) on each page.
  2. `@axe-core/playwright` reports no serious or critical violations on `/`, `/l/<slug>`, `/planner`, `/owner/lists/<id>` and `/admin`.
  3. The critical flows (reserve, mark purchased, add item) complete by keyboard alone.
  4. Any theme change needed to pass contrast is made in `src/theme/theme.ts` only, and status text remains readable at the new colours.
  5. With `prefers-reduced-motion: reduce` no transition or animation runs on interactive elements.

## Follow-ups

- Content-Security-Policy compatible with MUI/Emotion nonces.
- Configurable buyer-name visibility, copy-forward of lists to next year, birthday theme, price refresh, per-occasion templates (PRD §11.2).
- Running R3c–R3d in parallel with R3a–R3b if more than one builder is available.
- Whether to commit the PRD's mockup images under `Docs/FamilyGifts/Design/` once they are available (not in the repo today).

## Resolved questions

- **Q1 → D2.** Next.js with MUI replaces Tailwind/shadcn; Supabase Postgres via Drizzle with a local Docker Postgres for development and tests.
- **Q2 → D19, D28.** The PRD §15 defaults are accepted (buyer names visible to other guests, archived lists read-only with notice, 6+ digit PINs, soft delete of claimed items).
- **Q3 → release order.** PRD order is kept; Amazon import (R3d) is last of v0.3 and droppable; recovery links are R4a.
- **Q4 → structure.** One spec with twelve releases R1a–R4b, each merged separately, with PRD epic scope folded into packages.

## Open questions

- None.
