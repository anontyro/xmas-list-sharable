# Family Gifts — Product Requirements Document

**Status:** Discovery complete; implementation-ready draft  
**Version:** 1.0 (PRD version, not app version)  
**Prepared:** 14 November 2026  
**Working product name:** Family Gifts  
**Product owner:** Family administrator (single-household deployment)  
**Target:** Private family use for Christmas 2026, extensible to birthdays and future years  
**Release approach:** Incremental, usable release first (discovery Question 11 option C, assumed from instruction to proceed)

> **Purpose of this document:** A structured source of truth for another LLM or development agent to decompose into implementable, testable features and tasks. Maintain scope boundaries and security requirements when decomposing it. Proposed implementation details are recommendations, not undisclosed user decisions.

## 1. Executive summary

Family Gifts is a lightweight, mobile-first family wishlist and gift-coordination web application. The administrator creates family members and occasion/year-specific wishlists. Owners use a PIN to maintain their wishlists, rapidly add products via URL metadata extraction, paste Amazon wishlist HTML/text for bulk import, and rank desired gifts. Family guests browse shared, unguessable URLs and coordinate purchases through **Interested → Reserved → Purchased** states that are absent from owner-facing responses. A private, cross-list gift planner lets guests track budgets, notes, prices, recipients and export shopping lists. Guests identify themselves with a display name, retain a browser session, and optionally save a private recovery link for another device.

The application is intended for **one trusted family**, not as a public multi-tenant product. It should be cheap to host, simple to administer, pleasant on phones and ready for practical use before Christmas without making fragile integrations release blockers.

## 2. Goals, success criteria and non-goals

### 2.1 Product goals

1. Let an administrator create family members and their wishlists in minutes.
2. Let owners populate a list quickly, with URL extraction and a best-effort Amazon bulk-import path.
3. Prevent accidental duplicate gifting through a database-enforced exclusive active gift claim.
4. Keep gift coordination out of standard owner/admin views and all associated response payloads.
5. Let guests manage their personal buying plans across recipients and access them on multiple devices with a recovery link.
6. Offer a playful Christmas experience that remains functional, responsive and accessible.
7. Operate with minimal maintenance on free or low-cost hosting, acknowledging third-party free-tier limitations.

### 2.2 Practical success measures (initial targets, not established baselines)

- One administrator can add a member, create a list and share its URL in **under 5 minutes** in a usability test.
- An owner can manually add one gift in **under 45 seconds** after opening the form.
- A supported URL can produce an editable draft without requiring retyping the title; unsupported URLs always expose manual entry.
- Two simultaneous reservation attempts cannot both succeed.
- A guest can select, reserve and later find a gift in their planner on the same device; recovery links work on a second device.
- All owner/admin data-isolation tests pass and no private planner information leaks through publicly accessible endpoints.
- At least one real family trial can complete list creation, browsing and purchase marking on mobile before the v1.0.0 release.

No mandatory telemetry service is required; use anonymized development/test observations rather than adding analytics by default.

### 2.3 Non-goals for v1

Public registration, multiple unrelated households, email verification, retailer checkout, in-app payments, affiliate marketing, marketplace product catalogs, automated price monitoring, AI shopping suggestions, delivery tracking, receipt uploads, shared budgets, automatic occasion rollover, push notifications, OCR, browser extensions, realtime collaborative editing, guaranteed secrecy from someone deliberately acting as a guest, or sophisticated financial accounting.

## 3. Audiences and roles

| Persona | Needs | Privileges |
|---|---|---|
| Family administrator | Set up the household, reset owner PINs, create/archive lists | Member/list structure only; no gift-claim or personal planner access by virtue of admin role |
| Wishlist owner | Maintain gifts, priorities and preferences for their lists | Modify only their own wishlist items; never receive claims/reservations/purchase data in owner mode |
| Gift buyer / guest | View lists, coordinate purchases, plan spending privately | View published wishlist content, use own claims and planner, see other buyers' non-private claim state as specified |

A person may be both an owner and a gift buyer. **Authorization must be based on the current explicit session/context, not simply the person's display name.** The app does not promise malicious-user resistance against an owner choosing to enter a guest view.

### 3.1 Permission matrix

| Operation | Admin session | Owner session (own list) | Guest session |
|---|---:|---:|---:|
| Create/deactivate member | Yes | No | No |
| Create/archive list | Yes | No | No |
| Set/reset owner PIN | Yes | No | No |
| Add/edit/remove list item | No (unless also owner in owner context) | Yes | No |
| View published items | Yes | Yes | Yes |
| View guest-visible claim state | No via admin endpoints | No via owner endpoints | Yes |
| Set interest/reserve/purchase | No via admin endpoints | No via owner endpoints | Yes, on own behalf |
| Read/update planner budget, notes, actual price | No | No | Own only |
| Export private planner | No | No | Own only |

**Important limitation:** The shared guest URL permits guest access by anyone who has the URL. An owner who deliberately opens guest mode can see guest-visible claim state. Do not promise stronger surprise protection without verified guest access controls.

## 4. Confirmed discovery decisions

| # | Decision | Interpretation |
|---|---|---|
| 1 | Owner PIN + guest names | No formal guest registration; server-verified owner PIN, persistent guest ID |
| 2 | Interested → Reserved → Purchased | Multiple interests; exactly one active exclusive claim per wishlist item |
| 3 | Hybrid family dashboard | Members have occasion/year-scoped lists; one household initially |
| 4 | URL extraction + Amazon HTML import | Best effort, editable preview, manual fallback |
| 5 | Priority categories + manual order | Most Wanted / Would Love / Nice to Have; sort and filter without mutating priority |
| 6 | Full personal shopping tracker | Cross-list selections, budgets, notes, actual purchase price and exports |
| 7 | Single family administrator | Admin sets up members/lists/PINs; no general access to private gift data |
| 8 | Browser guest identity + recovery link | Private portable secret restores same persistent guest identity |
| 9 | Next.js + Supabase Postgres + Drizzle | Next.js server-side data access, Vercel hosting, TypeScript |
| 10 | Playful, festive mobile UI | Friendly, colourful and accessible; restrained interactions |
| 11 | Incremental Christmas delivery | **Working assumption:** option C chosen when user asked to proceed; confirm only if requirements change |

## 5. Principal journeys

### 5.1 Administrator onboarding

Admin authenticates with an environment-configured secret → creates household member (name, optional avatar) → sets member owner PIN → creates Christmas 2026 wishlist for member → copies individual share URL. Admin can later rename/deactivate members, archive lists, reset owner PINs. There is no default ability to read gift claims or personal planner records.

### 5.2 Owner builds a list

Owner visits their owner entry point → enters PIN → selects their own list → adds item manually, from a URL, or via Amazon pasted HTML/text → reviews/corrects extracted draft → sets priority → reorders items within priority group → saves and shares the list. Owner sees no guest interest, reservations, purchase indicators or sorting derived from claim state.

### 5.3 Guest reserves and purchases

Guest opens a shared wishlist URL → picks a display name if not yet known → sees owner priorities and current guest-visible gift availability → marks interest in several items → claims one available item as Reserved → later records Purchased, actual price and private note in planner. Other guests see reserved/purchased status and optionally the claimant's **display name** (buyer name visibility is a configurable product assumption for v1, and should be kept consistent). They do not see the buyer's notes or budget.

### 5.4 Guest plans across recipients

Guest navigates from a list to My Gift Planner → views their interests and claims grouped by family member/occasion → sets a total budget and optional per-recipient budgets → sees estimated/planned, actual spent and remaining amounts → exports selected entries to clipboard or Markdown/CSV. Guests are never shown other guests' private financial data.

### 5.5 Recover guest identity

Guest chooses "Save access" → receives an unguessable private recovery link → opens it on another device → the link exchanges for a secure session → original guest ID and data are restored; newly issued recovery link can revoke the previous one. If all browser sessions and recovery links are lost, recovery is not guaranteed.

## 6. Functional requirements and acceptance criteria

Priority legend: **P0** must ship for first useful family trial; **P1** intended before Christmas if stable; **P2** after core release or best-effort. `v0.x` assignments are suggested milestones, not rigid dates.

### F01 — Household administration [P0; v0.1.0]

- Create, rename and deactivate family members; unique member ID and display name.
- Create, rename, archive and list occasion/year wishlists for each member.
- Provide admin-authenticated PIN setup/reset for owners.
- Family dashboard displays available member lists and occasion/year context.

**Acceptance criteria:** Only admin can create members/lists or reset PINs; archived lists are clearly labeled and cannot be edited unless restored; an admin cannot retrieve purchase/claim/planner data through admin endpoints; no member creation requires a redeploy.

### F02 — Owner access [P0; v0.1.0]

- Owner PIN is checked on server; owner session is tied to member ID.
- Limit login attempts across serverless instances using shared durable state.
- Owner can sign out; expired session requires reauthentication.
- Owner may manage only their own lists and items.

**Acceptance criteria:** Wrong PIN does not create session; direct requests to another owner's mutation endpoints fail; secrets and hash material never appear in HTML/API responses or logs; basic brute-force protections tested.

### F03 — Shareable lists [P0; v0.1.0]

- Each list gets a stable, short, cryptographically random, unguessable slug, e.g. `/l/a8Kp2vQx9m` (example only).
- Shared URL opens a published read-only list; offer Copy Link.
- Do not index lists in search engines; slug is a privacy measure, not authentication.
- Archived lists either show an archive notice or become unavailable according to a single consistent policy.

**Acceptance criteria:** Slugs are collision-checked, not sequential and do not reveal names; guests cannot modify wishlist content; unknown/disabled slugs display a safe not-found page.

### F04 — Manual wishlist item management [P0; v0.1.0]

- Fields: title (required), URL (optional), description (optional), image URL (optional), price (optional), currency (GBP default), priority, sort order.
- Owner can create, edit, remove items and choose category.
- Default category is **Would Love**; display priority order is Most Wanted, Would Love, Nice to Have.
- Deleting an item with gift claims should be **soft delete** so associated buyer records remain recoverable in historical planner view.

**Acceptance criteria:** Required fields validated; missing price does not block creation; invalid links are rejected safely; only owner can mutate item; an owner edit cannot cause private claim fields to be serialized.

### F05 — Ordering, sorting and filtering [P1; v0.2.0]

- Owner can reorder items within a priority group using drag-and-drop or accessible move-up/down controls.
- Guest default sort: priority then owner order.
- Guest sort: priority, price ascending, price descending, recently added; missing prices last for either price direction.
- Guest filters: priority, price range and availability.
- All owner-facing sorts and filters must be independent of guest claim state.

**Acceptance criteria:** Manual ordering persists after refresh and is stable; guest sorting does not change database owner order; list works with keyboard and touch; claim-state filter is absent in owner view.

### F06 — Guest identity and sessions [P0; v0.2.0]

- Guest supplies display name once; server issues stable random guest ID and session token.
- Subsequent visits on same browser restore same guest ID; display name is editable.
- Guest session works across all member lists in one household.
- Guest context cannot accidentally inherit owner/admin authorization.

**Acceptance criteria:** Two guests with the same display name have distinct IDs and private records; renaming does not break claims; guest-specific planner endpoints require own session; cookies are HttpOnly, Secure in production and appropriately SameSite.

### F07 — Gift interest and exclusive claim [P0; v0.2.0]

- Multiple guests can express Interest in the same item.
- Exactly one guest can hold a Reserved or Purchased claim at a time.
- Only claimant may change Reserved → Purchased, release Reserved, or undo their own purchased status (with explicit confirmation).
- Marking Purchased preserves exclusivity until claimant explicitly releases/reverses.
- Interested guests can withdraw interest; interest alone does not lock an item.
- Guest-visible statuses: Available, Interested, Reserved, Purchased. Distinguish viewer-owned actions from another guest's claim.

**Acceptance criteria:** Concurrent claims for one item have exactly one winner; failed claimant receives understandable conflict feedback and refreshed status; unauthorized guest cannot alter another guest's claim; owners/admin routes never return claims or interested-buyer counts; purchased items remain visible to guests.

### F08 — Basic personal planner [P1; v0.3.0]

- Aggregate guest's interests and active claims across lists.
- Group by recipient and occasion; show item name, product URL, wishlist price and state.
- Allow remove-from-planner/withdraw interest where appropriate; removing a reserved or purchased item requires explicit claim release/undo.
- Provide easy navigation from wishlist item to planner.

**Acceptance criteria:** Planner shows only records belonging to session guest; changes on device A appear on refresh on device B for same recovered ID; historical soft-deleted item still has a safe, meaningful label in planner.

### F09 — Budgets, personal notes and spending [P1; v0.3.0]

- Total budget per guest per occasion/year; optional recipient budgets.
- Private notes per planner entry; optional actual purchase price distinct from wishlist price.
- Show clear **estimated planned**, **actual spent** and **remaining budget** values.
- Define deterministic accounting: planned = sum of guest-owned Reserved item estimate (prefer actual if provided, else listed price) plus Purchased actual/listed estimate; Interested-only items are excluded from committed plan and may appear separately as potential spend. Spent = sum Purchased actual/listed estimate. Remaining = budget - planned. Unknown prices are excluded from numeric totals and counted as unpriced items. No item counted twice when state changes.

**Acceptance criteria:** Calculations cover zero budgets, missing prices, negative remaining and all transitions; guest-only note and price fields cannot be read by other guests, owners or admin; currency displayed GBP for v1; actual price is never used to update owner's item price.

### F10 — Clipboard and exports [P1; v0.3.0]

- Guest selects all or subset of their planner entries.
- Copy a readable text shopping list grouped by recipient, including item title, URL, status and price where available.
- Export Markdown and CSV as client-side generated downloads from authorized server-returned planner data.
- Escape CSV correctly; do not include recovery links, sessions or another guest's private records.

**Acceptance criteria:** Clipboard format readable when pasted into a note; all exported selected entries include source URLs where one exists; CSV handles commas, quotes and line breaks; no selection produces a helpful empty-state notice.

### F11 — Product URL extraction [P1; v0.3.0]

- Owner enters an individual product URL; server attempts standards-based structured metadata extraction (JSON-LD Product, Open Graph, standard metadata).
- Normalize title, description, image, price, currency and canonical URL into a draft.
- Manual editor is always available, including on HTTP errors, bot blocks and missing fields.
- Extraction result requires explicit owner confirmation before save.
- Detect exact/normalized duplicate URLs within the same list and warn (do not silently discard).

**Acceptance criteria:** A supported sample page prefills available fields; blocked retailer displays helpful fallback; request timeouts and response size caps apply; SSRF protections cover host/IP verification and redirects; remote HTML is parsed as data and never executed.

### F12 — Amazon bulk paste import [P1 best-effort; v0.3.x–v1.0.0]

- Owner pastes Amazon wishlist HTML or copied text into a textarea.
- Parser extracts zero or more candidate product drafts and indicates missing/uncertain fields.
- Show an editable multi-item preview with remove option, duplicate warning and batch confirmation.
- Support a useful text/URL fallback when Amazon markup changes; no live Amazon authentication or paid scraping service.

**Acceptance criteria:** Fixture-based tests cover representative pasted HTML and copied text; malformed/oversized input fails gracefully; parser never creates items without explicit confirmation; no script execution or unsafe HTML rendering; a failed parse never blocks manual item entry. **Release gate:** This feature must not delay usable core lists and reservations.

### F13 — Portable guest recovery [P1; v1.0.0 target]

- Guest can generate a private link with a high-entropy token, store only a hash server-side, and display copy/save guidance.
- Opening link on another browser exchanges token for a session tied to the original guest ID.
- Avoid leaking token into logs/analytics/referrer: prefer URL-fragment handoff followed by client-side token exchange and immediate history cleanup; never store the raw token in database.
- Guest can revoke/regenerate link; regeneration invalidates previous link, not existing sessions unless explicitly chosen.

**Acceptance criteria:** Recovery works on separate device/browser; revoked token fails; token not exposed in standard server logs; a different guest cannot take over without link; clear warning says possession of link grants access and losing it plus browser sessions may make data unrecoverable.

### F14 — Mobile-first festive UI [P0 foundation; polish through v1.0.0]

- Responsive design from narrow phone widths to desktop.
- Holiday palette, cheerful illustrations/icons, rounded cards and product images with accessible labels.
- Consistent navigation: Family, Wishlists, My Planner; Admin and Owner options only in appropriate authenticated modes.
- Important actions visible without relying solely on icon shape/colour; no essential functionality hidden behind hover-only interactions.
- Respect reduced motion; accessible focus, keyboard usage and usable touch targets.

**Acceptance criteria:** Critical flows tested at 375px and desktop; no horizontal overflow; images have meaningful alt/fallback; contrast and status text are readable; reservation actions work by touch and keyboard.

## 7. Data model (proposed relational schema)

The names below express relationships and constraints; final migrations can refine field types and indexes.

| Table | Key fields | Constraints / purpose |
|---|---|---|
| `household` | `id`, `name`, `created_at` | Single household initially; no tenant picker |
| `member` | `id`, `household_id`, `display_name`, `pin_hash`, `active` | Owner entity; owner session maps to member ID |
| `wishlist` | `id`, `member_id`, `title`, `occasion`, `year`, `slug`, `archived_at` | Unique random `slug`; indexed by member/occasion/year |
| `wishlist_item` | `id`, `wishlist_id`, `title`, `description`, `product_url`, `image_url`, `price_minor`, `currency`, `priority`, `sort_order`, `deleted_at`, `created_at` | Store price in minor units (pence); soft deletion |
| `guest` | `id`, `household_id`, `display_name`, `created_at` | Names not unique, guest UUID is authoritative |
| `session` | `id`, `principal_type`, `principal_id`, `token_hash`, `expires_at`, `revoked_at` | Server-managed sessions for guest/owner/admin as appropriate |
| `recovery_token` | `id`, `guest_id`, `token_hash`, `created_at`, `revoked_at` | Only one active token per guest in initial implementation |
| `item_interest` | `guest_id`, `item_id`, `created_at` | Unique (`guest_id`, `item_id`); non-exclusive |
| `item_claim` | `id`, `item_id`, `guest_id`, `status`, `created_at`, `updated_at`, `released_at` | **Partial unique index on `item_id` where `released_at IS NULL`**; active status Reserved or Purchased |
| `guest_planner` | `id`, `guest_id`, `occasion`, `year`, `budget_minor` | Unique guest/occasion/year |
| `recipient_budget` | `planner_id`, `member_id`, `budget_minor` | Unique planner/member |
| `planner_item` | `planner_id`, `item_id`, `private_note`, `actual_price_minor`, `included` | Unique planner/item; links shopper's interest/claim context |
| `pin_attempt` or `auth_limit` | `subject_key`, `window_start`, `attempt_count`, `blocked_until` | Durable server-side login throttling (do not log raw PIN) |

### 7.1 Model invariants

- **Exclusive claim:** only one unreleased claim per item, enforced by database unique index rather than a client-only check.
- Claims always identify the **guest UUID**, never a display name.
- Planner rows are only readable/writable by the session guest; apply authorization in every server handler/service.
- Owner/admin route query projections exclude claim, interest, guest planner, recovery and financial records.
- Prices stored as integers in minor units; avoid floating-point currency arithmetic.
- List item removal defaults to soft delete once referenced by guest selections.
- `sort_order` is stable within a priority group; transactionally update affected rows when reordering.
- If an interested guest reserves an item, the interest row can be retained for history; UI derives exclusive state from active claim first.

## 8. API and server boundaries

Prefer Next.js Server Actions for authenticated forms and route handlers for shareable reads, imports, clipboard/export data and recovery exchange. Suggested resource/action grouping:

- `admin`: admin login/logout, member CRUD, owner PIN reset, list creation/archive.
- `owner`: PIN login/logout, own list items CRUD and reorder, import preview/commit.
- `public`: family dashboard/list metadata and published item read projection; no gift-state joins in owner-facing variants.
- `guest`: onboarding/name, identity/session, interest, reserve, purchase, release, recovery create/exchange/revoke.
- `planner`: read/update own budgets, recipient budgets, notes, actual costs, export source.

**Never use an unguarded generic `getWishlistWithEverything()` response for multiple roles.** Implement explicit `OwnerWishlistView` and `GuestWishlistView` serializers and test field-level isolation. All mutations must re-check authorization server-side.

## 9. Security, privacy and reliability

### 9.1 Threat model and safeguards

- **PIN attacks:** Environment-based administrator passcode is kept server-only; per-member PINs are salted, slow password hashes (Argon2id or equivalently appropriate approved scheme). Strong minimum length/passphrase guidance, durable rate limiting and secure cookies.
- **Session hijacking:** Opaque random tokens, hashed at rest where feasible, HttpOnly/Secure/SameSite cookies, rotation or expiry policy, logout/revoke support and no secret in error messages.
- **Guest recovery link leakage:** High-entropy secret, hash at rest, revoke/regenerate, avoid referrer/log exposure, no third-party analytics on recovery flow.
- **Owner data leakage:** No guest claim/planner fields in owner/admin responses, even under direct API access. Guard all endpoints. Trusted-family boundary remains explicit.
- **SSRF during product import:** Allow only `https:` and `http:` to public addresses; resolve DNS and reject loopback, link-local, private, metadata and reserved IP ranges; validate every redirect hop; set timeout, redirect count and body-size limits; block unsafe ports where possible.
- **Untrusted HTML and URLs:** Parse pasted HTML as inert data with an HTML parser; never render it unsanitized. Validate URL schemes, text length and image sources. Guard against stored XSS and CSV formula injection in spreadsheet-oriented exports.
- **Concurrency:** Database unique constraint/transaction is source of truth for gift claims; return conflict response with refreshed state.
- **Data retention:** No automatic deletion for v1; archived wishlists preserved; add explicit deletion tools later if useful.
- **Backups:** Document manual database backup/export and restore test before broad family usage. Free hosting may not include automated backups or guaranteed uptime.

### 9.2 Operational requirements

- Deploy one Next.js application to Vercel Hobby or appropriate plan subject to current plan eligibility and limits.
- Store database connection string, session secret and admin secret in managed environment variables; never bundle in client assets.
- Use Supabase-managed Postgres via server-side Drizzle access, appropriate pooled connection for serverless runtime.
- Database migrations checked into Git and applied as a deliberate deployment step.
- Provide `.env.example`, onboarding seed/init steps, deployment and restore runbook.
- Treat service pauses/inactivity and free-tier usage limits as operational risks; validate live provider policy before deployment.
- Minimal privacy-conscious server logs; no raw pasted wishlist HTML or sensitive guest notes in logs.

## 10. UX and design guidelines

**Style:** Playful and festive, not cluttered. Use warm cream canvas, pine green navigation, holly red primary highlights, golden yellow priority accents, soft pastels, rounded cards, occasional trees/snowflakes/presents and tasteful illustrations. Preserve prominent product images and readable text.

| Token / concept | Suggested initial value |
|---|---|
| Pine green | `#24764F` |
| Holly red | `#D8494F` |
| Gift gold | `#F3C65D` |
| Warm cream | `#FFF7EA` |
| Text slate | `#334155` |
| Font | Accessible friendly sans-serif; use system fallback |
| Radius | 12–20px for cards and panels |
| Touch targets | Aim for at least 44×44 CSS px |

**Screen inventory:** Family dashboard; list owner editor; guest wishlist detail; add/edit item; import preview; guest welcome; gift planner; budget/notes sheet; recovery-link page; admin management. Keep the list editor and planner navigable on narrow screens.

**Design rules:** Label actions in words; icons supplement statuses; do not rely on red/green colour alone; price and claim labels must not obscure product names; owner mode must contain no hints of secret purchase state. Occasion-aware themes may come later.

### 10.1 Visual mockup references

- `a_clean_high_resolution_marketing_product_ui_mock.png` — family dashboard, guest wishlist, guest planner, mobile emphasis.
- `a_clean_high_resolution_set_of_three_connected_ap.png` — alternate desktop/mobile family, wishlist and planner composition.
- `a_wide_banner_like_image_with_three_vertical_panel.png` — early visual concept with festive header illustrations.

These are **directional concept art**, not final production screenshots or pixel-accurate specifications. Product names, prices and UI copy in them are illustrative. The PRD controls functionality if concepts differ.

## 11. MVP boundaries and phased roadmap

Delivery strategy is incremental; **a working core is more important than perfect Amazon import**. The schedule is a target for solo/AI-assisted development, not an estimate or contractual commitment.

| Stage | Target window | Release | Core deliverables | Exit gate |
|---|---|---|---|---|
| Foundation | 14–22 Nov 2026 | `v0.1.0` | Project setup, schema/migrations, basic PIN/admin, family dashboard, manual owner list CRUD, share links | A real family list can be created and browsed |
| Coordination | 23–29 Nov | `v0.2.0` | Guest identity, interest, exclusive reservation, purchase/release, priority sorting/reorder | Concurrency and owner-isolation tests pass |
| Shopping + import | 30 Nov–10 Dec | `v0.3.0` | Cross-list planner, budgets/notes/actual cost, copy/Markdown/CSV, URL metadata import, Amazon paste parser alpha | Buyer can plan gifts end-to-end; import failure never blocks entry |
| Christmas-ready hardening | 11–17 Dec | `v1.0.0` | Recovery links, import fixes, mobile polish, backup/restore test, security review, family acceptance test | Core flows stable on mobile and guest isolation verified |
| Buffer & improvements | 18 Dec onward | `v1.0.x` | Defects, parser fixture updates, small UX polish | No risky major new capability needed for Christmas |

### 11.1 Minimum viable release gates

- **MVP (`v0.1.0`):** Admin can create lists; owners can add/manage gifts; guests can browse with stable links.
- **Gift-coordination milestone (`v0.2.0`):** Guests can reserve/purchase safely without visible gift state in owner mode. **This is the minimum useful Christmas coordination experience.**
- **Preferred Christmas release (`v1.0.0`):** Planner, budgets, exports and portable recovery. Amazon HTML import is best effort and may be postponed if unreliable.

### 11.2 Stretch / later roadmap

Automated copy-forward to next year's list; birthday themes; improved retailer adapters; price refresh; receipt attachments; shared/group gifts; guest account login option; imports from CSV; per-occasion templates; configurable buyer-name visibility; scheduled reminders; multi-family tenancy only if demand emerges.

## 12. Delivery backlog for LLM feature decomposition

Each epic below must be split into independently testable tasks. IDs are stable references to use in tickets and implementation prompts.

| Epic | Scope | Depends on | Gate |
|---|---|---|---|
| `EP-01` Project foundation | Next.js TS setup, Tailwind/shadcn, config, CI, environments | None | Dev/test/build run reliably |
| `EP-02` Database | Drizzle schema, migrations, indexes, seed data, DB connection | EP-01 | Schema migrates cleanly and enforces claim invariant |
| `EP-03` Sessions/auth | Admin/owner PIN verification, guest sessions, cookies, rate limiting | EP-02 | Unauthorized access tests pass |
| `EP-04` Family administration | Member/list CRUD, PIN resets, archive | EP-03 | Admin can initialize a household from UI |
| `EP-05` Owner lists | Owner dashboard, item CRUD, priority, order | EP-03, EP-04 | Owner can make usable shared list |
| `EP-06` Public sharing | Slugs, browse/read projections, family navigation | EP-04, EP-05 | Share links work safely |
| `EP-07` Guest gift claims | Interest, reserve/purchase/release, concurrency handling | EP-03, EP-06 | Exactly one exclusive active claim |
| `EP-08` Guest planner | Cross-list aggregation, budget totals, notes, actual prices | EP-07 | Planner private and totals correct |
| `EP-09` Planner exports | Clipboard, Markdown and CSV | EP-08 | Correct formatted, private exports |
| `EP-10` URL importer | Metadata fetch/normalize, security, draft review | EP-05 | Failure falls back to manual entry |
| `EP-11` Amazon importer | Paste HTML/text parse, fixtures, bulk preview/commit | EP-10 | Accepts fixtures; graceful failure |
| `EP-12` Recovery links | Token issue/restore/revoke, UX | EP-03, EP-08 | Cross-device session restore |
| `EP-13` Festive UI | Responsive system, cards, accessible patterns, polish | EP-01; all screens | Mobile critical flows work |
| `EP-14` Operational hardening | Backup/restore, release checklist, E2E/security tests | EP-02 onward | Christmas release gate met |

### 12.1 Mandatory decomposition output format

For each generated feature or task, output:

```yaml
id: TASK-###
epic: EP-##
title: short imperative name
user_value: why it matters
priority: P0 | P1 | P2
release: v0.1.0 | v0.2.0 | v0.3.0 | v1.0.0 | later
dependencies: [TASK-...]
scope:
  in: [explicit behavior]
  out: [explicit exclusions]
implementation_notes: [relevant modules, schemas, API constraints]
acceptance_criteria:
  - Given / When / Then testable condition
tests:
  - unit | integration | e2e | security
risks_or_questions: [only unresolved blockers]
size: XS | S | M | L
```

Prefer tasks small enough for one focused PR/code-review iteration. Break L tasks further, avoid vague “implement entire planner” tickets, and do not broaden scope beyond this PRD without flagging it as a proposal. Schema and security constraints must appear in the tasks implementing them, not remain as generic post-launch work.

## 13. Testing and quality plan

### 13.1 Unit tests (Vitest)

Priority/category ordering; pricing arithmetic; import normalizers; Amazon pasted fixtures; URL/currency validation; export string/CSV escaping; session/token utilities; permission decision functions.

### 13.2 Integration tests (database and server)

Concurrent reservations; unique index behavior; claim transitions; session ownership; owner/guest projection isolation; archived/soft-deleted item behavior; PIN throttling; duplicate URL warnings; reset/revoke recovery tokens.

### 13.3 End-to-end tests (Playwright)

1. Admin creates a member/list; owner signs in and adds gift; guest opens share URL.
2. Two guests attempt to reserve same gift; exactly one succeeds.
3. Guest purchases and adds a private note; owner and other guest cannot retrieve note/actual price.
4. Guest builds cross-recipient planner, updates budget and exports list.
5. Guest recovery link restores same planner on fresh browser session and revoked link fails.
6. URL import works for fixture and gracefully falls back for blocked source.
7. Narrow-screen/keyboard interactions allow critical flows without layout breakage.

### 13.4 Release checklist

- No client-exposed secrets; tests for role-scoped API payloads.
- Migration deployed and rollback/restore documented.
- Manual database backup and restore verified.
- Critical flows verified on real phone browser.
- No blocker-level accessibility failures for critical flows.
- Import failures show user-friendly fallback and do not corrupt data.
- Share links, sessions and recovery links confirmed on production URL.

## 14. Risks, tradeoffs and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Amazon HTML changes or incomplete pasted content | Import fails | Fixture-tested isolated parser; preview; manual fallback; best-effort release gate |
| Retailers block metadata extraction | Low prefill success | Standards-first extraction, timeout, manual editing; no paid scraping dependency |
| Guest masquerading / owner entering guest mode | Surprise protection not absolute | Clearly state trusted-family limitation; optional stronger auth later |
| Custom auth bugs | Private data exposure | Secure session primitives, rate limit, permission tests, minimal scopes |
| Race on gift reservation | Duplicate gifts | Partial unique DB index and conflict handling |
| Supabase project pauses/free-tier changes | Temporary unavailability | Provider policy check, backups, restoration runbook, avoid guaranteed uptime claims |
| Solo development overload | Late Christmas delivery | Protect v0.2 coordination milestone; defer advanced importer first |
| Currency/budget errors | Misleading planner | Integer pence, explicit accounting rules, unit tests, unpriced count |
| URL import SSRF/XSS | Security incident | Network restrictions, redirect validation, inert parsing, output encoding |
| Recovery link disclosure | Planner takeover | High entropy, hash at rest, revocation, token-cleanup UX |

## 15. Open decisions and explicit working assumptions

The project discovery is sufficiently complete for task decomposition. These should not block an initial build; resolve them when implementing the relevant feature:

1. **Delivery strategy:** Assume Q11 option C (incremental Christmas release) because user asked to proceed instead of choosing explicitly.
2. **Buyer display names:** Proposed visible to other guests for reserved/purchased items; not visible in owner/admin modes. If family prefers anonymity, remove guest name from guest-visible claim projection without changing ownership model.
3. **Archive visibility:** Proposed archived lists display read-only to guests, with archived notice. May instead return 404 if preferred.
4. **PIN length:** Recommend at least six numeric digits for owners, preferably passphrases for admin; test usability versus rate-limit protection.
5. **Budget and occasion association:** Use Christmas 2026 planner by default; permit separate planners for other occasion/year combinations in the schema. A guest may shop across lists matching the selected occasion/year.
6. **Item deletion:** Soft delete for already-claimed items, with guest planner fallback label and a warning to owner when removing an active item (without revealing who claimed it or that it is claimed).
7. **Total budget presentation:** Display planned and spent separately; remaining is total budget less committed plan. Interested items are indicative rather than committed.
8. **Family dashboard visibility:** Anyone with family/dashboard URL may browse list links; avoid publishing a searchable family index. This is not a robust private invitation system.

## 16. Definition of done

A requirement is done when its acceptance criteria and relevant unit/integration/E2E/security tests pass, database migrations and types are updated, error/empty/loading states are handled, mobile layout is tested, role-isolation checks are verified, and README/deployment notes are revised if operations changed. A release is done only when its milestone exit gate is met; visually polished mockups do not count as implemented behavior.

---

## Appendix A — Reference app structure

```text
src/
  app/
    (public)/
    (owner)/
    (admin)/
    api/
  features/
    family/
    wishlists/
    imports/
    reservations/
    planner/
    authentication/
  components/ui/
  db/
    schema/
    migrations/
  lib/
    auth/
    permissions/
    security/
    validation/
tests/
  unit/
  integration/
  e2e/
```

## Appendix B — Example guest planner text export

```text
Christmas 2026 — My Gift Planner

Alex
- Noise-Cancelling Headphones — Reserved — £129.99
  https://example.com/headphones
- Fantasy Novel — Interested — £14.99
  https://example.com/book

Sarah
- Cookbook — Purchased — £24.99 (paid £19.50)
  https://example.com/cookbook

Estimated committed: £149.49
Actual spent: £19.50
Budget: £250.00
Remaining committed budget: £100.51
```

The example is illustrative. The real export totals must be calculated by the accounting rules in F09 and may omit private notes unless the guest explicitly includes them.
