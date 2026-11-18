# Family Gifts: Sticker Book design

Work item: FG-002 (the design handoff in `docs/family-gifts-design/`, whose `PRD.md` is identical to `docs/family-gifts-prd-v1.md`). Each release below ships as its own commit or PR and maps to these tasks:

| Release | Task |
|---|---|
| R5a · Theme | FG-501 |
| R5b · Stickers and components | FG-502 |
| R5c · Shells and navigation | FG-503 |
| R5d · Welcome and sign-in | FG-504 |
| R5e · Family and wishlist | FG-505 |
| R5f · Planner and access | FG-506 |
| R6a · Owner editor and gift form | FG-601 |
| R6b · Amazon import and owner account | FG-602 |
| R6c · Admin | FG-603 |
| R7 · Polish and gates | FG-701 |

Branch: one branch per release, `feature/FG-5xx-…`, each stacked on the last and each able to merge on its own.
Toggle: none (D46). The app is not live yet, and a release that is merged but unfinished is not deployed.
Design: `docs/family-gifts-design/` (`README.md`, `styles/sticker.css`, `reference/01-welcome.html` to `12-menu.html`, `icons/`). Cited below as screen `04-wishlist` and so on.
Status: **approved 2026-11-17** (build started with P0). No open questions.
Manual testing: `Docs/FamilyGifts/Testing/MANUAL-TESTING-FG-002-sticker-book-design.md`
Decisions: `Docs/FamilyGifts/Decisions/` (README lists every planned record, numbered from 0016, and the package that writes it).

## Goal

The app that is built and tested (spec FG-001, releases R1a to R4b, plus the sign-in links) looks and behaves as the Sticker Book design says: a red top bar with a cream
dot-grid page, thick ink borders with hard shadows, chunky Lilita One headings, sticker icons, bottom tabs on phones, an account menu, a welcome screen, and one screen per task for owners and the admin.
No rule from FG-001 changes: owners and admin still never see claims, planner data stays private, the recovery token is still only stored as a hash.

| Release | What ships | Design screens |
|---|---|---|
| **R5a** | MUI theme with the Sticker Book tokens, fonts, accessible focus ring; existing pages pick up the look | `sticker.css`, README tokens |
| **R5b** | The 36 sticker icons, a small component set (Pill, Ribbon, Note, Hero, Meter, Stat, avatars, gift thumbnails), gift picture rules | all |
| **R5c** | Role shells: top bar, bottom tabs, account menu (change name, save access, sign out of this device), "Wishlist" shortcut | 03, 12 |
| **R5d** | Welcome screen (I'm shopping / I own a list), owner sign-in with name chips, paste-a-recovery-link, admin sign-in in the same frame | 01, 02 |
| **R5e** | Family dashboard (avatars, gift counts, countdown, planner strip, earlier years) and the list page (ribbons, rows, filter sidebar) | 03, 04 |
| **R5f** | Planner (recipient cards, budget meter, shopping list), Budget and notes page, Save your access page | 05, 06, 07 |
| **R6a** | Owner list editor and the Add / edit gift page | 08, 09 |
| **R6b** | Amazon paste import page with selection, per-gift priority and price; owner PIN page | 10 |
| **R6c** | Admin on one screen: members, lists tab, add member with picture and PIN, create list | 11 |
| **R7** | Empty, loading and error states, accessibility and phone gate over every route, clean-up | all |

Order is deliberate: R5a and R5b change no behaviour, R5c to R5f are the guest journey, R6a to R6c are owner and admin. After any release the app is complete and working, just partly re-skinned.

## Background (read 2026-11-17)

### What is built today

- Next.js 16 App Router, MUI v9 themed in `src/theme/theme.ts` (pine and holly palette, 16 px radius, system fonts, 44 px buttons), one `AppShell` for every page (`src/components/layout/AppShell.tsx`, called from `src/app/layout.tsx`),
  the old 36-icon pack as `src/components/ui/Icon.tsx` plus `icon-names.ts` over `public/icons/{christmas,shopping,interface}/`.
- Route groups exist but have no layouts: `(public)` has `/`, `/l/[slug]`, `/planner`, `/recover`; `(owner)` has `/owner`, `/owner/login`, `/owner/lists/[listId]`; `(admin)` has `/admin`, `/admin/login`, `/admin/members/[memberId]`.
- Guests name themselves inline on the list page (`src/features/reservations/components/GuestWelcome.tsx`); there is no guest sign-out and no account menu. "Save access" is a dialog (`SaveAccessDialog.tsx`) opened from the top bar.
- The planner page uses `BudgetSheet` (dialog), `EntryNotes` (inline), `TotalsPanel`, `PlannerGroup`, `ExportMenu`, `SelectionContext` in `src/features/planner/components/`. Accounting is `computePlan` (`accounting.ts`, decision 0011) and does not change.
- The owner list page holds the item form, URL import panel, list and `BulkImportDialog` on one page. Admin member management is `/admin` (list and add) plus `/admin/members/[memberId]` (name, PIN, lists).
- Sort and filter are pure functions in `src/features/wishlists/sort-filter.ts` driven by URL params (`sort`, `priority`, `min`, `max`, `avail`) with `SortFilterBar.tsx`; that is reused as is.
- Role-scoped serializers (`views.ts`, decision 0006) and the ESLint rule that stops owner/admin code importing `@/features/reservations/*` and `@/features/planner/*` (`tests/unit/eslint-isolation.test.ts`) must keep working. New owner and admin components must not import either.
- Tests to keep green: 180 unit, 135 integration, 84 e2e (mobile 375 px and desktop 1280 px). Many e2e specs find things by visible text, so each package that changes a label also updates the specs that use it.
- The working tree at the time of writing has the uncommitted owner sign-in links and PIN-change work (decision 0004). This spec assumes it is committed first.

### The design pack

- `styles/sticker.css` is the whole system as plain CSS; class names map to components (README "Suggested component split"). It targets Tailwind/shadcn; here it is ported to MUI (D46).
- Tokens (README): ink `#1F2A44`, cream `#FFF4D6` with a 26 px dot grid, red `#D32F34`, green `#1F7A45`, yellow `#FFC93C`, pink `#FFB3C1`, sky `#BDE0FE`, mint `#7ED9A5`, muted `#4A5570`; Lilita One and Nunito Sans 600/700/800;
  3 px ink borders, radius 12 to 18, hard offset shadows (cards `4px 4px 0`, buttons `0 3px 0`), ribbons rotated -1.5 degrees, tap targets at least 44 px, dashed border for secondary.
- Responsive: mobile first; from 860 px top-bar links show and bottom tabs hide, `.two` becomes content plus a 360 px sidebar (sidebar first on mobile), grids go 2 or 3 columns, welcome and login become a split screen (red panel left, 560 px form right). Max content width 1120 px.
- `icons/` has 36 transparent sticker PNGs (names: adult, badge, bag, basket, bookmark, box, calendar, candycane, chart, checklist, child, clock, coins, download, family, gifttag, gingerbread, heartbadge, heartlist, holly, parcel, pencil, presentgold, presentgreen, presentred, reindeer, saletag, santahat, share, snowflake, snowglobe, sparkles, star, stocking, tree, wallet).
  The white outline and shadow are a CSS filter (`.stk`), not baked in. They are about 100 to 150 px wide, so they are used at 24 to 120 px.
- The mockups use sample data and draw no hover, focus, error, empty or loading states. Those are built from the same tokens (R7).

### Checked while reading the pack

- Contrast (WCAG ratios): white on red 4.97, white on green 5.35, ink on cream 13.0, ink on yellow 9.3, ink on pink 8.5, ink on sky 10.4, ink on mint 8.4, muted on cream 6.8, muted on yellow 4.8, cream on red 4.53 (the brand text on the red bar). All pass AA for text.
- The README's suggested focus ring (3 px sky) fails: sky on white is 1.38 and on cream 1.26, below the 3:1 that WCAG 2.2 asks of focus indicators. D48 uses ink (13:1 on cream) and cream on the red bar (4.5:1).
- The recovery mockup (07) shows the full link on every visit. The server only keeps a hash (decision 0015), so the page shows the link once, when it is made (D75).
- The status wording in the mockups ("Reserved · Jamie", "Bought by you") differs from the built wording ("Reserved by Jamie", "Purchased by you"). The built wording stays, because tests and screen readers rely on it (D71).
- The mockups show a currency select; the app is GBP only, so a fixed "GBP" pill is shown instead.
- The admin mockup puts Rename, PIN, Archive and Deactivate on the member card; today those are on a separate member page.

## Decisions

### R5a · Theme, plus decisions shared by every release

> **R5a · task FG-501 · ~10 files: ~6 new, ~4 modified · packages P0–P1**
>
> Pages keep their layout but take on the Sticker Book look: cream dot-grid page, ink borders, hard shadows, red and green buttons, Lilita One headings, a visible focus ring.
> In code the MUI theme is rebuilt from design tokens, the fonts are added, and a unit test guards the colour contrast. No behaviour changes.

- **D46 · Keep MUI.** The Sticker Book is built as an MUI theme plus a small set of components (R5b), not Tailwind and not a rewrite. No new styling library. Pages are changed one release at a time; until a page is redone it just picks up the theme.
- **D47 · Tokens and theme.** `src/theme/tokens.ts` exports the README tokens as constants (`ink, cream, red, green, yellow, pink, sky, mint, muted, white, danger` where danger is `#B3262B`, the sign-out red in screen 12) and the shadow helpers.
  The MUI theme maps them: `palette.primary` red, `secondary` green, `text.primary` ink, `text.secondary` muted, `background.default` cream, `background.paper` white. `palette.yellow`, `sky`, `pink`, `mint` are added with module augmentation (`src/theme/augment.d.ts`) so `<Button color="yellow">` works.
  Breakpoints: `xs 0, sm 600, md 860, lg 1200, xl 1536` (860 is the design's switch point). Shape radius 12.
  Component overrides: Button (3 px ink border, radius 14, `0 3px 0 ink` shadow, Lilita One, min heights 40 / 44 / 54 for small / medium / large, `variant="ghost"` is transparent with a dashed border and no shadow), Paper and Card (3 px border, radius 18, `4px 4px 0` shadow),
  OutlinedInput and Select (3 px border, radius 12, height 48, 700 weight, 16 px text), Chip (2 px border, radius 12, 12 px 800 weight), Alert (3 px border, radius 14, 700 weight; this is the design's "note"), IconButton (min 44 px), Dialog and Menu paper (card style), Link (always underlined, as decided in R4b),
  CssBaseline (cream background with the 26 px dot grid `radial-gradient(rgba(31,42,68,.08) 2px, transparent 2.5px)`).
  Hover and active states move the shadow (`0 1px 0`, `translateY(2px)`) and never rely on hover alone. Reduced motion still turns every transition and animation off (existing rule).
- **D48 · Focus and contrast.** `:focus-visible` is a 3 px solid ink outline with 2 px offset on every interactive element; on the red bar (`.bar`) it is cream. `tests/unit/theme-contrast.test.ts` computes WCAG ratios for every pairing the design uses (listed in Background) and fails below 4.5 for text and 3 for focus ring and borders.
  If a token has to change to pass, it changes in `tokens.ts` and decision 0016 says so.
- **D49 · Fonts.** Lilita One (display: h1 to h6, buttons, numbers) and Nunito Sans 600, 700, 800 (body), self-hosted with `next/font/local` from the woff2 files of the `@fontsource/lilita-one` and `@fontsource/nunito-sans` packages (dev dependencies), so a build never needs the network. `display: swap`, exposed as CSS variables `--font-display` and `--font-body`, applied in the theme typography with the previous system stack as fallback.

### R5b · Stickers and components

> **R5b · task FG-502 · ~31 files: ~21 new, ~10 modified (plus 36 sticker images) · packages P2–P4**
>
> The old icon pack is replaced by the 36 Sticker Book icons, and the shared pieces the screens are drawn with exist as components. Gifts show their product picture when there is one and a sticker otherwise.
> In code `Icon` becomes `Sticker`, `src/components/sticker/` holds the small components, and two pure helpers choose a gift's sticker and a person's colour.

- **D50 · Sticker pack.** The 36 PNGs are copied unchanged to `public/stickers/<name>.png` (flat names as in the design pack). `src/components/ui/Sticker.tsx` replaces `Icon.tsx`: `<Sticker name="tree" width={64} />` with `name` a string-literal union from `src/components/ui/sticker-names.ts` (which also holds each file's natural width and height so height follows width and nothing shifts).
  It renders `next/image` with the `.stk` look as styles (white 2 px outline and soft shadow via `filter: drop-shadow`), `alt=""` by default, and a required real `alt` when the sticker is the only label. `public/icons/`, `Icon.tsx` and `icon-names.ts` are deleted, and every use is switched in the same package.
- **D51 · Components.** Under `src/components/sticker/`, each small and typed: `Pill` (tone default / yellow / mint / pink / sky), `Ribbon` (tone red / green / yellow / sky, rotated -1.5 degrees, text only so the label is read normally), `Note` (a plain tinted box in the design's note style with an optional sticker; it announces itself only when given `role="alert"` or `"status"`),
  `Hero` (a client component: tint, title, subtitle, optional back link, optional sticker or aside, desktop and mobile sizes from the CSS), `Meter` (segments array, `role="img"` with an `aria-label` the caller supplies), `Stat`, `Thumb` (58 px circle on a tint), `MemberAvatar`, `GiftThumb`, `TwoColumn` (content plus 360 px sidebar, sidebar first on mobile), `SplitLayout` (brand panel plus form, used by the welcome and sign-in screens), `PageWrap` (max 1120 px, paddings from the CSS).
  Cards themselves are MUI `Card` styled by the theme, with a `tint` prop wrapper `StickerCard` (white, yellow, mint, sky, pink, or cream dashed).
- **D52 · Gift pictures.** `GiftThumb` shows the product picture when the gift has an `imageUrl` (a plain `<img>`, `loading="lazy"`, `referrerPolicy="no-referrer"`, `alt=""` because the title is beside it, rounded to the circle), and falls back to a sticker if it has none or the image fails to load.
  The sticker comes from `stickerForGift(title, id)` in `src/components/sticker/gift-sticker.ts`, a pure function: the first matching keyword group in the title (sock, glove, scarf, hat → `stocking`; book, novel, cookbook → `parcel`; candle, perfume, soap, bath → `sparkles`; mug, cup, dish, pan, kitchen → `box`; headphone, charger, speaker, tech → `box`; toy, game, puzzle, lego → `presentgreen`; voucher, card → `gifttag`),
  else a stable pick by hash of `id` from `presentred, presentgreen, presentgold, parcel, box, gifttag`. The thumb's tint is `tintFor(id)`. Neither depends on claim or reservation state, so owners may use them.
- **D53 · Colour by person.** `tintFor(id)` in `src/components/sticker/tint.ts` hashes an id to one of `yellow, pink, mint, sky` so a member or gift always has the same colour. `MemberAvatar` shows the member's picture sticker when they have one, else their first initial in Lilita One on that tint.

### R5c · Shells and navigation

> **R5c · task FG-503 · ~32 files: ~19 new, ~13 modified · packages P5–P8**
>
> Every page gets the right top bar, bottom tabs and account menu for who is using it. Guests can change their name, open Save access, and sign out of the device from the menu.
> In code the single `AppShell` is replaced by one shell per route group, guest sign-out is a server action, and the last list a guest opened is remembered for the Wishlist shortcut.

- **D54 · Shells.** The root layout only provides the theme and fonts. Chrome comes from route-group layouts: `(public)` renders `GuestShell`, `(owner)` renders `OwnerShell`, `(admin)` renders `AdminShell`. Each shell is the design's `bar` plus `tabs`:
  a red top bar with the brand (tree sticker plus "Family Gifts" linking to the role's home), text links from 860 px, an account chip, and a bottom tab bar below 860 px with sticker icons. The same destinations appear in both. The active link and tab get `aria-current="page"` from `usePathname()`.
  Signed-out visitors to an owner or admin page see the brand only; the pages that need a session redirect to sign-in exactly as today.
- **D55 · Navigation items.** Guest: Family `/` always; Wishlist (last list or `/`) and My planner `/planner` only with a guest session, as today. Owner: My list (the owner's newest non-archived list `/owner/lists/<id>`, else `/owner`); R6a adds Add a gift and R6b adds Import.
  Admin: Members `/admin`; R6c adds Lists `/admin/lists`; the admin has a Sign out button in the bar, not in a menu.
  A guest without a session sees no account chip in R5c (the name is still asked for on the list page); R5d adds a "Pick your name" chip that links to `/welcome`.
- **D56 · Account menu.** `AccountMenu` is a client component using MUI `Menu` (Escape and outside click close it, focus returns to the chip, `aria-haspopup="menu"`, `aria-expanded`), 290 px wide, card style, items 46 px tall.
  Guest: header (name, "Shopping on this device"), Change my name (a dialog that calls `renameGuest`), Save access (recovery link) (opens the existing dialog until R5f, then `/access`), My planner, I own a list (PIN) (`/owner/login`), a dashed divider, Sign out of this device in the danger colour with the warning "You'll need your recovery link to get back in.".
  Owner: header (name, "List owner"), My list, All my lists (`/owner`), Sign out; R6b adds Change my PIN (`/owner/pin`) between them. A "Owner" pill sits beside the chip in the bar (screens 08 to 10).
- **D57 · Guest sign-out.** `signOutGuest()` (guest-actions) ends this browser's guest session and clears `fg_guest`. It deletes nothing: the guest, their claims and planner stay and can be recovered with a link. Other devices stay signed in.
  If the guest has never made a recovery link (`recoveryLinkStatus` says none active) the menu item first asks "Sign out without a recovery link? You may not be able to get back in." with Cancel and Sign out; with a link it signs out straight away. After sign-out the page goes to `/`.
- **D58 · Last list.** Opening a list page runs `RememberList` (client) which writes the non-HttpOnly cookie `fg_last_list=<slug>` (`Path=/`, `SameSite=Lax`, 180 days, `Secure` in production). `GuestShell` reads it on the server, accepts only `/^[0-9A-Za-z]{10}$/`, and uses it for the Wishlist link; an unknown value is ignored. The slug is not secret to someone who already opened the list.

### R5d · Welcome and sign-in

> **R5d · task FG-504 · ~37 files: ~15 new, ~22 modified · packages P9–P12**
>
> First-time visitors meet a split welcome screen that asks for their name; list owners sign in by tapping their name and typing a PIN; the admin signs in on the same frame. Someone who already has a recovery link can paste it.
> In code the sign-in pages move into a chrome-free `(welcome)` route group, the inline name form on the list page is replaced by a prompt that links here, and two small pure helpers validate the return path and read a pasted link.

- **D59 · One frame, two doors.** `/welcome` and `/owner/login` both render `SplitLayout` (red brand panel with gingerbread, tree and star stickers, "Family Gifts" and a "Christmas 2026" pill; white form panel) with a two-button switch "I'm shopping" and "I own a list". The buttons are links: shopping goes to `/welcome` (keeping `next`), owner goes to `/owner/login`.
  `/owner/login` stays the owner's canonical URL because the admin's sign-in links and decision 0004 use it. `/admin/login` uses the same frame without the switch. All three routes live in a `(welcome)` route group with a bare layout (no top bar, no tabs). `/recover` moves there too.
- **D60 · Guest name entry.** `/welcome?next=<path>` has the name field ("Your name", help "The family sees this next to gifts you reserve. No password needed.") and the "Let's go" button, which calls `createGuest` (same 20 per address per 15 minutes throttle and the same one-guest-per-browser rule) and then goes to `next`.
  `safeNext(raw)` (pure, in `src/features/authentication/safe-next.ts`) accepts only `/`, `/planner`, `/access`, or `/l/<10 character slug>` with an optional query; anything else, including absolute URLs, `//host` and backslashes, becomes `/`. A visitor who is already named is sent straight to `next`.
  On a list page an unnamed visitor still sees the list read-only, plus a Note "Tell us your name to reserve or mark interest" with a button to `/welcome?next=/l/<slug>`. The old `GuestWelcome` component is deleted; renaming lives in the account menu (D56).
- **D61 · Recovery link on the welcome screen.** "Been here before on another phone or laptop?" with a "Use recovery link" button that reveals a field. `tokenFromPastedLink(text)` (pure, `src/features/authentication/recovery-link.ts`) accepts a full link containing `#t=<token>` or a bare 43 character base64url token and returns the token, else null.
  The field is cleared as soon as it is read, the token goes only to the existing `/api/recovery/exchange` call, and failures show the same message as `/recover`. The token is never logged, stored or put in a URL.
- **D62 · Owner sign-in.** "Whose list?" shows each active member as a toggle button (a radio group, one selected, keyboard arrow keys), then "Your PIN" (`type=password`, `inputmode=numeric`, `autocomplete=current-password`, one field, no keypad), the help "6 or more digits. Too many wrong tries pauses sign-in for a few minutes.", "Open my list", and "Lost your PIN? Ask the family admin.".
  The `?name=` and `?pin=` prefill from decision 0004 keeps working and still only fills the form (the address bar is cleaned straight away).
- **D63 · Admin sign-in.** "Admin secret" field and Sign in on the same frame; no member names, no switch.

### R5e · Family and wishlist

> **R5e · task FG-505 · ~32 files: ~14 new, ~18 modified · packages P13–P17**
>
> The family page shows avatar cards with gift counts, a countdown to Christmas, the guest's planner at a glance and earlier years. A list is read as ribbons and gift rows, with a sort and filter sidebar on desktop and chips plus a filter dialog on phones.
> In code one migration adds an optional member picture, the dashboard query returns counts and earlier years, and both pages are rebuilt from the R5b components.

- **D64 · Member picture.** `member.avatar` is a nullable text column (`src/db/migrations/0001_member_avatar.sql`). The allowed values are the sticker names in `AVATAR_STICKERS` in `src/features/family/avatars.ts` (`gingerbread, reindeer, star, holly, child, santahat, snowflake, snowglobe`), validated with zod where it is written (R6c), not by a database constraint, so the list can change without a migration. Null means initials.
- **D65 · Dashboard data.** `getFamilyDashboard()` also returns, per list, `giftCount` (gifts not soft-deleted), and per member `avatar`. It still returns only active members' non-archived lists, with no claim data of any kind (decision 0006).
  New `getEarlierYears()` returns archived lists grouped by occasion and year with their count, for active members.
- **D66 · Countdown.** `daysUntilChristmas(now)` (pure, `src/features/wishlists/countdown.ts`) uses the Europe/London calendar date and returns days until the coming 25 December (`0` on the day, `null` after it). The hero shows "N days" (or "Today!") with the calendar sticker only for a dashboard whose lists include Christmas of the current year; otherwise nothing.
- **D67 · Planner strip.** For a guest session the family page shows the yellow planner card: "£X left to plan of £Y" when a total budget is set, "£X planned so far" when it is not, "Start planning" when nothing is planned. The numbers come from the existing `getPlanner` and `computePlan`. Visitors without a session do not see it.
- **D68 · Earlier years.** The sky "Earlier years" ribbon and one card per archived occasion and year ("Christmas 2025", pill "Archived · read-only", "View lists") link to `/earlier/<year>`, a read-only page of that year's archived lists as member cards. Nothing there can be changed.
- **D69 · List page.** Hero (back link "< Family", title "Sarah's Christmas", subtitle "2026 · 5 gifts · shared list", tree sticker), then gifts grouped by priority in the owner's order under ribbons "★ MOST WANTED" (red), "WOULD LOVE" (green) and "NICE TO HAVE" (sky); the star is decorative and the label is plain text.
  Each gift is a `GiftRow`: `GiftThumb`, title, price (or "No price"), notes and "View product" link as today, the status pill, and the existing claim controls. The planner card sits in the sidebar for guests. The share link button and the archived notice remain. `PublicItemCard` and `PriorityChip` are removed.
- **D70 · Sort and filter.** Same URL parameters and the same pure functions as today. Desktop sidebar: Sort by (4 buttons), Priority (All and the three), "Up to £N" slider (`max`, whole pounds, from £0 to the dearest gift rounded up to £5; at its maximum the filter is off and the param is omitted), Availability (All, Available only), and the planner card.
  Phones show the chip row "Sort: Priority", "Available only", "Under £25" and a "More filters" button that opens the sidebar controls in a dialog. Every control is a real button or input with a label, and the state shows in text as well as colour (`aria-pressed`).
- **D71 · Status wording stays.** Pills use the built wording (`statusLabel`): Available, Interested, Reserved by you, Purchased by you, Reserved by Sam, Purchased by Sam. Tone: available white, interested pink, reserved yellow, purchased mint; each has text, never colour alone.

### R5f · Planner and access

> **R5f · task FG-506 · ~25 files: ~11 new, ~14 modified · packages P18–P21**
>
> The planner reads as one card per recipient with a budget meter and a shopping list; budgets and private notes are edited on their own page; saving access is a page instead of a dialog.
> In code the planner components are replaced from the R5b parts, a Budget and notes route is added, and the recovery dialog becomes `/access`. Accounting and export logic do not change.

- **D72 · Planner page.** Hero (mint, "My planner", "Christmas 2026 · only you can see this", coins sticker, a period picker when more than one). Main column: one white card per recipient with a ribbon (the recipient's name, tone from `tintFor`) and "Budget £150.00" when one is set; rows with a checkbox ("Select <gift>" label), title, status pill, price (muted when only Interested), and "paid £X" where entered. A private note shows in a dashed card with an "Edit note" button to the Budget and notes page.
  A "Shopping list" card shows "N of M selected" and Copy list, Markdown, CSV (existing `ExportMenu` logic and the line "Exports never include your recovery link or other people's plans."). Sidebar: the yellow total card.
- **D73 · Budget card and meter.** "Total budget", the amount in Lilita One, a `Meter` whose segments are spent (green) and planned-but-not-spent (red), as shares of the total budget (capped at 100%), three `Stat` tiles Planned, Spent, Left, and a note stating what is not counted (interested gifts with their total, unpriced items). `meterSegments(totals)` is pure (`src/features/planner/meter.ts`);
  `aria-label` reads "£19.50 spent and £129.99 more planned out of £250.00". With no budget there is no meter, and a note says "Set a budget to see how much is left". Numbers come only from `computePlan` (decision 0011).
- **D74 · Budget and notes.** `/planner/budget` (guest session required, else the existing "pick a name first" page). Left card "Your budget": total, occasion, per-person budgets with "+ Add a person" (members with no entry yet), and a note when the person budgets add up to the total. With `?gift=<itemId>` (an entry in the guest's planner) the sidebar shows "Gift details": thumbnail, title, "For Sarah", status pill, "What you paid", "Private note", and the help "Sarah's list shows £24.99. What you enter here never changes her list." and "Only you can see notes and prices. Not the family, not the list owner, not the admin.".
  "Save changes" runs the existing `saveBudgets` and `setEntryDetails` actions (budgets first; the first error is shown and nothing else is reported as saved) and returns to `/planner`; Cancel goes back. `BudgetSheet` and `EntryNotes` are removed.
- **D75 · Save your access.** `/access` (guest session required) replaces `SaveAccessDialog`: sky hero "Save your access", the status pill ("Active · made today" or "No link yet", from `recoveryLinkStatus`, which also returns `createdAt`), and "Make a link" / "Make a new link" / "Turn link off".
  The link is shown only in the response to making it (client state, with the full URL, mono font and a large "Copy link" button) and is gone after a reload or leaving the page, with the help "Copy it now: for your safety we can't show it again." A "How it works" card (3 steps), the warning that anyone with the link can open the planner, and the identity card "You're Sam on this browser" complete it.
  This differs from the mockup, which shows the link on every visit, because only a hash is stored (decision 0015). The account menu's "Save access" item links here.

### R6a · Owner editor and gift form

> **R6a · task FG-601 · ~17 files: ~8 new, ~9 modified · packages P22–P24**
>
> Owners get the editor from screen 08 (ribbons, up and down buttons, a share card, shortcuts) and a separate Add / edit gift page with a live "how guests see it" preview and a "what we found" checklist.
> In code the owner list page is rebuilt, the item form moves to two new routes, and the owner nav gains "Add a gift". Server logic is unchanged.

- **D76 · Owner shell and list resolution.** `OwnerShell` resolves the owner's `primaryList` (newest non-archived list) once per request and builds the nav from it (D55). With no list the nav goes to `/owner` and says "Ask the family admin to create a list". New owner components may not import `@/features/reservations/*` or `@/features/planner/*` (existing lint rule).
- **D77 · Editor.** `/owner/lists/[listId]`: mint hero "My Christmas list" with "2026 · 5 gifts · only you can edit", ribbons per priority, a row per gift (`GiftThumb`, title, price, and `↑ Up`, `↓ Down`, `Edit` buttons with the existing aria-labels `Move <title> up` and `Move <title> down`; up is disabled at the top of a group, down at the bottom), via the existing `moveItemAction`.
  Sidebar: "Share your list" (link in mono, Copy link, "Anyone with this link can see your list, so only send it to family."), "Add gifts" (+ Add a gift, Add from a web link → `/add?mode=link`, Paste Amazon wishlist → `/import`, shown from R6b), and the mint note "The surprise is safe. You never see who has reserved or bought anything.". The archived notice and read-only behaviour stay.
  Inline editing is removed: Edit goes to `/owner/lists/[listId]/gifts/[itemId]`.
- **D78 · Gift form.** `/owner/lists/[listId]/add` and `/gifts/[itemId]` share `GiftForm`: a two-button switch "Paste a link" / "Type it in" (`?mode=`, default link on add, manual on edit; every field is always visible and usable in both, so an import failure never blocks entry).
  Link mode has "Product link" plus "Fetch details" (existing `previewUrlImport`, throttle and messages unchanged), then a mint note "Found the title, picture and price. Check them, then save." or a pink note ending "You can still add it by hand.". Fields: What is it?, Price (with a fixed "GBP" pill), "How much do you want it?" (three buttons, default Would love), Picture link, Notes for the family (optional).
  Sidebar: "How guests see it" (a live `GiftRow` preview without actions) and, after a fetch, "What we found" (Title, Picture, Price, Description with a ✓ or – pill and a text label each). "Save gift" and Cancel; edit adds a "Remove this gift" button with a confirmation (soft delete, decision 0007). Validation, `createItem` and `updateItem` are unchanged.

### R6b · Amazon import and owner account

> **R6b · task FG-602 · ~14 files: ~4 new, ~10 modified · packages P25–P28**
>
> The Amazon paste import becomes a page where the owner ticks which found gifts to add, sets each one's priority, and fills in missing prices, with a summary of what will be added. The owner's PIN change moves to its own page.
> In code the bulk commit accepts a priority per row, the dialog is replaced by a route, and `/owner` becomes a list picker.

- **D79 · Import page.** `/owner/lists/[listId]/import`: a card with the three steps, the paste box (label "Paste your wishlist") with Find gifts and Clear, the yellow best-effort note, a sky ribbon "WE FOUND N GIFTS", and a two-column grid of cards. Each card has a checkbox ("Add <title>"), `GiftThumb`, an editable title, the price or an "Add a price (£)" input when none was found, a pill (All found, Price not found, Already on your list), a priority select ("Priority for <title>", default Would love) and Remove.
  Rows that duplicate a gift already on the list start unchecked and read "Skipped". The sidebar "Ready to add" says "N gifts will be added to your list" with the skipped and missing-price counts, and "Add N gifts" and "Start over". Parsing and the 500 KB check are unchanged (decision 0014); nothing is saved until Add.
- **D80 · Bulk commit.** `commitBulkImport(listId, rows)` accepts an optional `priority` on each row (one of the three, default `would_love`), validates every row with `itemInput`, and appends each to the end of its own priority group in preview order. Still owner-only, refuses archived lists, skips blank titles, caps at 100, and is all or nothing. Decision 0014 is updated to say so.
- **D81 · Owner account pages.** `/owner/pin` holds the existing change-PIN form (behaviour unchanged, decision 0004) and is linked from the account menu. `/owner` becomes the list picker (all of the owner's lists including archived, as cards). `BulkImportDialog` is deleted.

### R6c · Admin

> **R6c · task FG-603 · ~22 files: ~8 new, ~14 modified · packages P29–P32**
>
> The admin manages everyone from one screen: a card per member with their link, Reset PIN, Rename, Archive list and Deactivate, plus "Add a member" (with an optional picture and PIN) and "Create a list". A Lists tab shows every list.
> In code the member page is folded into `/admin`, member creation accepts a picture and a PIN, and the admin queries return what the cards need. Admin still never sees claims or planner data.

- **D82 · Members screen.** `/admin` (sky hero "Family admin": "Members, lists and owner PINs. Gift plans stay private."): a card per member with `MemberAvatar`, name, a pill (Active, Inactive, PIN not set), each non-archived list with its mono link and Copy link, and buttons Reset PIN (Set PIN, red, when none) / Rename / Archive list / Deactivate. Reset PIN and Rename open dialogs; Archive and Deactivate ask for confirmation.
  The Reset PIN dialog is the existing form and, after saving, shows the sign-in links from decision 0004 (name only, and with the PIN just set). `/admin/members/[memberId]` redirects to `/admin`.
- **D83 · Lists tab.** `/admin/lists` shows every list (active and archived) grouped by year with member, link, a Copy link button and Archive or Restore. The admin nav is Members and Lists, and a mobile tab bar with Members, Lists and Sign out (screen 11).
- **D84 · Adding members.** Sidebar "Add a member": display name, "Picture (optional)" (the eight avatar stickers as a radio group of buttons with labels such as "Gingerbread picture"), "Owner PIN" (optional; "6 or more digits. You can reset it later, but you can never see it.") and "Add member". "Create a list": member, occasion, year, "Each list gets its own private share link.".
  `createMember` takes `{ displayName, avatar?, pin? }`, `renameMember` takes an optional `avatar`; both validate with zod (avatar in `AVATAR_STICKERS`, PIN with the existing rule), keep their admin-only guard, and hash a PIN given at creation. The PIN is never returned or shown again.

### R7 · Polish and gates

> **R7 · task FG-701 · ~15 files: ~7 new, ~8 modified · packages P33–P35**
>
> Every screen has a hover, focus, disabled, loading, empty and error state in the same style, and every route is checked at phone and desktop width, by keyboard and for accessibility. Leftover old code is removed.
> In code there are shared empty and loading pieces, route-level `loading`, `error` and `not-found` pages, a sweep over every route, and the final clean-up.

- **D85 · States.** `Empty` (sticker, message, optional action) is used where a list can be empty (no gifts, no members, no planner entries, no lists). Buttons show a pending label while an action runs (existing `useTransition` patterns) and are disabled, never hidden. Errors from actions stay as notes next to the control (existing messages).
  Each route group has `loading.tsx` (a sticker and "One moment…" with `role="status"`), `error.tsx` ("Something went wrong" with Try again) and, for `/l/[slug]` and `/earlier/[year]`, the existing friendly `not-found`.
- **D86 · Gate.** The sweep covers every route in each of three roles at 375 px and 1280 px: no horizontal scroll, no serious or critical axe violation, every control reachable and operable by keyboard, reduced motion honoured. The isolation and secrets sweep (R4b) is extended to every new owner, admin and guest route.
  Dead code is removed: old icon files, `AppShell`, `PublicItemCard`, `PriorityChip`, `BudgetSheet`, `EntryNotes`, `PlannerGroup`, `TotalsPanel`, `SortFilterBar`, `ItemForm`, `OwnerItemList`, `BulkImportDialog`, `SaveAccessDialog`, `GuestWelcome`, `MemberForm`, `ListForm`, `LoginForms`, anything unused (ESLint and `tsc` show it).

## Non-goals

- Tailwind or shadcn, a second design system, dark mode, a rewrite of working server logic, new product features beyond what the screens show (the new behaviours here are the ones the screens imply: welcome screen, account menu, guest sign-out, last list, countdown, avatars, earlier years, per-gift import priority).
- Changes to permissions, claim rules, planner accounting, export formats, recovery token handling, rate limits, SSRF protection or the Amazon parser.
- Per-gift sticker choice by owners, uploading pictures, animations beyond the existing reduced-motion-safe transitions, a CSP.
- Showing the recovery link after it was first shown, reactivating deactivated members, editing list titles in admin (not drawn).
- Translating the mockups' sample data (Sarah, Alex, Nana, Mia, Uncle Dan, Jo) into seed data.

## Lanes

| Lane | Touched | Checks |
|---|---|---|
| `repo` (config, docs, dependencies) | yes | `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck` |
| `db` (`src/db/**`) | yes | `pnpm db:up && pnpm db:migrate && pnpm test:integration` |
| `server` (`src/lib/**`, `src/features/**/*.ts`, route handlers) | yes | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration` |
| `ui` (`src/app/**`, `src/components/**`, `src/features/**/components/**`, `src/theme/**`) | yes | `pnpm lint`, `pnpm typecheck`, `pnpm build` |
| `e2e` (`tests/e2e/**`) | yes | `pnpm test:e2e` (builds, starts the app and uses the test database) |

## Packages

Waves:

| Wave | Packages | Release | Note |
|---|---|---|---|
| 1 | P0 | R5a (FG-501) |  |
| 2 | P1 | R5a (FG-501) |  |
| 3 | P2 | R5b (FG-502) |  |
| 4 | P3 | R5b (FG-502) |  |
| 5 | P4 | R5b (FG-502) |  |
| 6 | P5 | R5c (FG-503) |  |
| 7 | P6 | R5c (FG-503) |  |
| 8 | P7 | R5c (FG-503) |  |
| 9 | P8 | R5c (FG-503) |  |
| 10 | P9 | R5d (FG-504) |  |
| 11 | P10 | R5d (FG-504) |  |
| 12 | P11 | R5d (FG-504) |  |
| 13 | P12 | R5d (FG-504) |  |
| 14 | P13 | R5e (FG-505) |  |
| 15 | P14 | R5e (FG-505) |  |
| 16 | P15 | R5e (FG-505) |  |
| 17 | P16 | R5e (FG-505) |  |
| 18 | P17 | R5e (FG-505) |  |
| 19 | P18 | R5f (FG-506) |  |
| 20 | P19 | R5f (FG-506) |  |
| 21 | P20 | R5f (FG-506) |  |
| 22 | P21 | R5f (FG-506) |  |
| 23 | P22 | R6a (FG-601) |  |
| 24 | P23 | R6a (FG-601) |  |
| 25 | P24 | R6a (FG-601) |  |
| 26 | P25 | R6b (FG-602) |  |
| 27 | P26 | R6b (FG-602) |  |
| 28 | P27 | R6b (FG-602) |  |
| 29 | P28 | R6b (FG-602) |  |
| 30 | P29 | R6c (FG-603) |  |
| 31 | P30 | R6c (FG-603) |  |
| 32 | P31 | R6c (FG-603) |  |
| 33 | P32 | R6c (FG-603) |  |
| 34 | P33 | R7 (FG-701) |  |
| 35 | P34 | R7 (FG-701) |  |
| 36 | P35 | R7 (FG-701) |  |

Packages that share a wave share no files.

Release sizes: R5b (31), R5d (33) and R5e (32) are a little over the ~30 file guide. The extras are deleted files and e2e specs that only need new locators, not code that is harder to review, so they are not split further.

Shared acceptance for every package:

- The lane checks pass for its files, measured against the baseline (180 unit, 135 integration, 84 e2e at the start).
- No test is deleted or skipped to pass a check. A test that finds things by text a package changes is updated in that package (or the e2e package of the same release), keeping what it proves.
- The branch passes the pre-PR audit (SKILL.md step 10) before a PR is raised: no unneeded changes, tests that exercise real cases, no DRY or SOLID defects.
- Shared resources (tokens, sticker names, components, strings) only through the package that owns them. A package that finds one missing reports `blocked`, and the spec is amended.
- Every new page works at 375 px with no horizontal scroll, by keyboard, with visible focus, and passes axe (no serious or critical violations) on every state it can show.
- Owner and admin code never imports `@/features/reservations/*` or `@/features/planner/*`, and never shows claim, interest, planner or recovery data (existing lint rule and sweep).
- Server actions keep their `require*` guard and zod validation; UI packages do not change them.

### P0 · ui: tokens, theme and fonts (R5a · FG-501, wave 1)
- Lane: `ui`
- ownedFiles:
  - `package.json`
  - `pnpm-lock.yaml`
  - `src/theme/tokens.ts` (new)
  - `src/theme/augment.d.ts` (new)
  - `src/theme/theme.ts`
  - `src/app/fonts.ts` (new)
  - `src/app/layout.tsx`
  - `tests/unit/theme-contrast.test.ts` (new)
  - `tests/unit/theme.test.ts` (new)
- Acceptance criteria:
  1. `tokens.ts` exports every token in D47 with the README values; `theme.ts` builds from it and nothing else holds a colour value.
  2. `theme.test.ts` asserts the palette mapping, the 860 px `md` breakpoint, the button `ghost` variant, and that `yellow`, `sky`, `pink`, `mint` are available as button and chip colours (type test with `@ts-expect-error` for an unknown colour).
  3. `theme-contrast.test.ts` computes WCAG ratios for every pairing listed in Background and fails if text pairs are under 4.5 or focus and border pairs under 3.
  4. Fonts load with `next/font/local` from `@fontsource` files with no network access at build time, and headings and buttons render in Lilita One, body text in Nunito Sans.
  5. `:focus-visible` shows a 3 px ink outline (cream on the red bar) on a button, a link, an input and a menu item.
  6. Every existing page still renders and the existing unit, integration and e2e suites pass with no assertion removed (locators may change only where a label itself changed, which this package does not do).

### P1 · repo: decision 0016 (R5a · FG-501, wave 2)
- Lane: `repo`
- ownedFiles:
  - `Docs/FamilyGifts/Decisions/0016-sticker-theme-on-mui.md` (new)
- Acceptance criteria:
  1. Decision 0016 exists with `Status: Agreed` and states D46 to D49 as built, including any token that had to change for contrast.

### P2 · ui: sticker pack and Sticker component (R5b · FG-502, wave 3)
- Lane: `ui`
- ownedFiles:
  - `public/stickers/*.png` (new, the 36 files)
  - `public/icons/` (deleted)
  - `src/components/ui/Sticker.tsx` (new)
  - `src/components/ui/sticker-names.ts` (new)
  - `src/components/ui/Icon.tsx` (deleted)
  - `src/components/ui/icon-names.ts` (deleted)
  - `src/components/layout/AppShell.tsx`
  - `src/features/reservations/components/StatusChip.tsx`
  - `src/features/wishlists/components/PublicItemCard.tsx`
  - `src/features/wishlists/components/PriorityChip.tsx`
  - `src/features/wishlists/components/OwnerItemList.tsx`
  - `src/app/(public)/page.tsx`
  - `tests/unit/icon.test.ts` (deleted)
  - `tests/unit/sticker.test.ts` (new)
- Acceptance criteria:
  1. `public/stickers/` holds the 36 PNGs byte-for-byte from `docs/family-gifts-design/icons/`, and `sticker-names.ts` lists exactly those 36 names with each file's width and height.
  2. `<Sticker name="tree" width={64} />` renders `next/image` with height from the table, `alt=""` by default, the given `alt` when set, and a name that is not in the pack is a type error (`@ts-expect-error` test).
  3. `sticker.test.ts` checks a file exists for every name and the stored dimensions match the PNG headers.
  4. No reference to `public/icons`, `Icon` or `icon-names` remains (search is clean) and every page still shows its sticker.
  5. The existing suites pass.

### P3 · ui: sticker components and helpers (R5b · FG-502, wave 4)
- Lane: `ui`
- ownedFiles:
  - `src/components/sticker/Pill.tsx` (new)
  - `src/components/sticker/Ribbon.tsx` (new)
  - `src/components/sticker/Note.tsx` (new)
  - `src/components/sticker/Hero.tsx` (new)
  - `src/components/sticker/Meter.tsx` (new)
  - `src/components/sticker/Stat.tsx` (new)
  - `src/components/sticker/Thumb.tsx` (new)
  - `src/components/sticker/GiftThumb.tsx` (new)
  - `src/components/sticker/MemberAvatar.tsx` (new)
  - `src/components/sticker/StickerCard.tsx` (new)
  - `src/components/sticker/TwoColumn.tsx` (new)
  - `src/components/sticker/SplitLayout.tsx` (new)
  - `src/components/sticker/PageWrap.tsx` (new)
  - `src/components/sticker/gift-sticker.ts` (new)
  - `src/components/sticker/tint.ts` (new)
  - `tests/unit/sticker-components.test.ts` (new)
  - `tests/unit/gift-sticker.test.ts` (new)
- Acceptance criteria:
  1. Each component renders the markup the matching `.pill`, `.rib`, `.note`, `.hero`, `.meter`, `.stat`, `.th`, `.av`, `.card`, `.two`, `.split` styles describe, using theme tokens only (no raw colours).
  2. `Meter` is `role="img"` with the caller's `aria-label`; `Ribbon` and `Pill` carry their meaning in text; `Hero` renders a back link as a real link.
  3. `stickerForGift` returns the keyword group for "Wool hiking socks" (`stocking`), "Nordic Winters cookbook" (`parcel`), "Scented candle set" (`sparkles`), "Cast-iron casserole dish" (`box`), "Jigsaw puzzle" (`presentgreen`); matches case-insensitively and on whole or partial words as D52 lists; and for an unknown title returns the same sticker for the same id every time, spread across the fallback set for different ids.
  4. `tintFor` is stable for an id and uses all four tints across a sample of ids.
  5. `GiftThumb` shows the picture when given a URL, the sticker when not, and the sticker again when the image errors (render test), with `alt=""` on the picture and `referrerPolicy="no-referrer"`.
  6. `MemberAvatar` shows the picture sticker when set, else the initial.

### P4 · repo: decision 0017 (R5b · FG-502, wave 5)
- Lane: `repo`
- ownedFiles:
  - `Docs/FamilyGifts/Decisions/0017-stickers-and-gift-pictures.md` (new)
  - `Docs/FamilyGifts/Decisions/0001-stack-and-layout.md`
- Acceptance criteria:
  1. Decision 0017 exists with `Status: Agreed` and states D50 to D53 as built, including that `Note` is not an MUI Alert and `Hero` is a client component.
  2. Decision 0001 is edited in place so its icon and installation statements match the code (stickers, and the font packages as the one later dependency change).

### P5 · server: guest sign-out and last-list helpers (R5c · FG-503, wave 6)
- Lane: `server`
- ownedFiles:
  - `src/features/authentication/guest-actions.ts`
  - `src/lib/last-list.ts` (new)
  - `tests/integration/guest-signout.test.ts` (new)
  - `tests/unit/last-list.test.ts` (new)
- Acceptance criteria:
  1. `signOutGuest` ends this browser's guest session and clears `fg_guest`, leaves the guest, claims, planner and recovery token intact, and leaves the guest's other sessions working; with no session it is a harmless no-op.
  2. After sign-out the guest can come back by exchanging a recovery token (existing route) and sees their reservations.
  3. `last-list.ts` exports the cookie name `fg_last_list` and `parseLastList(value)` that accepts only a 10 character `[0-9A-Za-z]` slug (unit test with `/`, `..`, spaces, an overlong string, an empty string and an absolute URL all returning null).

### P6 · ui: shells, tabs and account menu (R5c · FG-503, wave 7)
- Lane: `ui`
- ownedFiles:
  - `src/components/layout/TopBar.tsx` (new)
  - `src/components/layout/TabBar.tsx` (new)
  - `src/components/layout/AccountMenu.tsx` (new)
  - `src/components/layout/GuestShell.tsx` (new)
  - `src/components/layout/OwnerShell.tsx` (new)
  - `src/components/layout/AdminShell.tsx` (new)
  - `src/components/layout/ChangeNameDialog.tsx` (new)
  - `src/components/layout/RememberList.tsx` (new)
  - `src/components/layout/ShellFrame.tsx` (new)
  - `src/components/layout/nav.ts` (new)
  - `tests/unit/nav.test.ts` (new)
  - `src/components/layout/AppShell.tsx` (deleted)
  - `src/app/(public)/layout.tsx` (new)
  - `src/app/(owner)/layout.tsx` (new)
  - `src/app/(admin)/layout.tsx` (new)
  - `src/app/layout.tsx`
  - `src/app/(public)/l/[slug]/page.tsx`
  - `src/app/(owner)/owner/page.tsx`
  - `src/app/(admin)/admin/page.tsx`
  - `tests/e2e/helpers.ts`
  - `tests/e2e/planner.spec.ts`
  - `tests/e2e/planner-export.spec.ts`
  - `tests/e2e/recovery.spec.ts`
  - `tests/e2e/mobile-a11y.spec.ts`
  - `tests/e2e/owner-list.spec.ts`
- Acceptance criteria:
  1. Guest, owner and admin pages show their own shell as D54 and D55 describe, with the top links from 860 px and the tabs below it, never both, and `aria-current="page"` on the active item.
  2. The account menu opens from the chip, closes on Escape and outside click, returns focus to the chip, and has the guest and owner items of D56 in order; the guest "Change my name" dialog renames through `renameGuest`; "Save access" opens the existing dialog.
  3. "Sign out of this device" signs out straight away when a recovery link exists and asks first when none does (both paths work by keyboard), then lands on `/`.
  4. Opening a list writes `fg_last_list`; the Wishlist link then goes to it; a tampered cookie value is ignored.
  5. Signed-out owner and admin pages show the brand only and still redirect to sign-in where they did before.
  6. The existing suites pass after their locators are updated for the new nav (the sign-out buttons that sat on the owner and admin pages move into the shells; owner sign-out is now a menu item).

### P7 · e2e: navigation and account menu (R5c · FG-503, wave 8)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/navigation.spec.ts` (new)
- Acceptance criteria:
  1. At 375 px the tabs show and the top links do not; at 1280 px the reverse; the same destinations in both.
  2. A guest renames themselves from the menu and the new name shows beside their reservations.
  3. Sign-out without a recovery link asks first; after making a link and signing out, the link brings the guest back with the same reservation; the sign-out menu entry is not offered to an unnamed visitor.
  4. The Wishlist shortcut goes to the last list opened.
  5. The owner and admin menus and sign-out work, and an owner never sees a guest-only entry.
  6. The menu and sign-out dialog work by keyboard alone, and a visitor with no name sees no account menu and only the Family link.

### P8 · repo: decision 0018 (R5c · FG-503, wave 9)
- Lane: `repo`
- ownedFiles:
  - `Docs/FamilyGifts/Decisions/0018-role-shells-and-navigation.md` (new)
  - `Docs/FamilyGifts/Decisions/0001-stack-and-layout.md`
- Acceptance criteria:
  1. Decision 0018 exists with `Status: Agreed` and states D54 to D58 as built.
  2. Decision 0001's "Responsive shell" line is edited in place to match the code.

### P9 · server: safe return path and pasted-link parser (R5d · FG-504, wave 10)
- Lane: `server`
- ownedFiles:
  - `src/features/authentication/safe-next.ts` (new)
  - `src/features/authentication/recovery-link.ts` (new)
  - `tests/unit/safe-next.test.ts` (new)
  - `tests/unit/recovery-link.test.ts` (new)
- Acceptance criteria:
  1. `safeNext` returns the input for `/`, `/planner`, `/access` and `/l/<10 character slug>` (with an optional query) and `/` for everything else: `https://evil.example`, `//evil.example`, `/\evil`, `/l/short`, `/owner`, `javascript:alert(1)`, an empty string, a non-string, and a value over 300 characters.
  2. `tokenFromPastedLink` returns the token from `https://host/recover#t=<43 chars>`, from the path without a host, with surrounding spaces and line breaks, and from a bare 43 character token; it returns null for an empty string, a different fragment, a token of the wrong length or alphabet, and text with a token in the middle of prose.

### P10 · ui: welcome, sign-in frame and list prompt (R5d · FG-504, wave 11)
- Lane: `ui`
- ownedFiles:
  - `src/app/(welcome)/welcome/page.tsx` (new)
  - `src/app/(welcome)/owner/login/page.tsx` (moved from `src/app/(owner)/owner/login/page.tsx`)
  - `src/app/(welcome)/admin/login/page.tsx` (moved from `src/app/(admin)/admin/login/page.tsx`)
  - `src/app/(welcome)/recover/page.tsx` (moved from `src/app/(public)/recover/page.tsx`)
  - `src/features/authentication/components/GuestNameForm.tsx` (new)
  - `src/features/authentication/components/OwnerSignIn.tsx` (new)
  - `src/features/authentication/components/AdminSignIn.tsx` (new)
  - `src/features/authentication/components/RoleSwitch.tsx` (new)
  - `src/features/authentication/components/PasteRecoveryLink.tsx` (new)
  - `src/features/authentication/components/LoginForms.tsx` (deleted)
  - `src/features/reservations/components/GuestWelcome.tsx` (deleted)
  - `src/features/reservations/components/NamePrompt.tsx` (new)
  - `src/app/(public)/l/[slug]/page.tsx`
  - `src/components/layout/TopBar.tsx`
  - `src/components/layout/GuestShell.tsx`
  - `src/components/sticker/SplitLayout.tsx`
  - `src/features/authentication/exchange-token.ts` (new)
  - `src/features/authentication/components/RecoverExchange.tsx`
  - `src/theme/theme.ts`
  - `tests/unit/exchange-token.test.ts` (new)
  - `tests/e2e/helpers.ts`
  - `tests/e2e/claims.spec.ts`
  - `tests/e2e/admin-setup.spec.ts`
  - `tests/e2e/pin-links.spec.ts`
  - `tests/e2e/navigation.spec.ts`
- Acceptance criteria:
  1. `/welcome`, `/owner/login` and `/admin/login` render the split frame with no top bar or tabs, and the URLs are unchanged.
  2. A new visitor enters a name on `/welcome?next=/l/<slug>`, becomes a guest (throttle and one-guest-per-browser unchanged) and lands on the list; a hostile `next` lands on `/`; a named visitor is sent on without seeing the form.
  3. The unnamed visitor on a list page sees the list and a Note with a button to `/welcome?next=/l/<slug>`, and no Reserve or interest controls; `GuestWelcome` is gone and the account menu's "Pick your name" chip links to `/welcome`.
  4. "Use recovery link" reveals a field; a pasted valid link or bare token signs the browser in as the original guest and goes to `/planner`; an invalid or revoked one shows the generic failure; the field is emptied and the token appears in no URL, request log or console output.
  5. Owner sign-in shows member names as a radio group with arrow-key selection, one PIN field with the help text, the lock-out message, "Lost your PIN? Ask the family admin.", and still honours `?name=` and `?pin=` (address bar cleaned).
  6. Admin sign-in works on the frame, with the existing throttle and generic failure message.
  7. The `(welcome)` route group has no layout of its own (the pages bring their frame), so the pages stay chrome-free by living outside the shell groups.
  8. Recovery-token exchange is one helper (`exchangeRecoveryToken`) used by `/recover` and the pasted-link field, sending the token only in the request body.
  9. Floating text-field labels sit cleanly on the 3 px borders (the theme backs the label with white instead of notching the border).
  10. The existing suites pass after their sign-in and naming locators are updated.

### P11 · e2e: welcome and sign-in (R5d · FG-504, wave 12)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/welcome.spec.ts` (new)
  - `tests/e2e/mobile-a11y.spec.ts`
  - `tests/e2e/security.spec.ts`
  - `src/features/authentication/components/OwnerSignIn.tsx`
- Acceptance criteria:
  1. The welcome journey (list, prompt, name, back to the list, reserve), the Pick your name chip returning to the page the visitor was on, and the made-up return addresses, blank name and named-visitor skip each pass at both widths.
  2. Pasting a recovery link (and a bare token) brings the same guest back with the same reservation; bad text, a wrong token and a turned-off link show the right messages; the field is emptied; the token appears in no request address, console line or page text.
  3. Owner sign-in by tapping a name, a wrong PIN with the generic message, arrow-key selection and the links between the two doors pass; admin sign-in on the frame passes with a wrong and a right secret.
  4. The accessibility scan and the leak sweep now include `/welcome`, `/owner/login`, `/admin/login` and `/recover`, and the header checks for `/owner/login` and `/recover` (no referrer) still hold.
  5. The existing specs that sign in or name a guest pass against the new screens, with their assertions unchanged in meaning (their locators were updated with the screens in P10).

### P12 · repo: decision 0019 (R5d · FG-504, wave 13)
- Lane: `repo`
- ownedFiles:
  - `Docs/FamilyGifts/Decisions/0019-guest-entry-and-welcome.md` (new)
- Acceptance criteria:
  1. Decision 0019 exists with `Status: Agreed` and states D59 to D63 as built.

### P13 · db: member picture column (R5e · FG-505, wave 14)
- Lane: `db`
- ownedFiles:
  - `src/db/schema/identity.ts`
  - `src/db/migrations/0001_member_avatar.sql` (new)
  - `src/db/migrations/meta/_journal.json`
  - `src/db/migrations/meta/0001_snapshot.json` (new)
  - `tests/integration/schema.test.ts`
- Acceptance criteria:
  1. `member.avatar` is a nullable text column added by a checked-in migration that applies cleanly on top of the existing one and on a database that already has data, and existing rows read `null`.
  2. `pnpm db:generate` produces no further change, and `schema.test.ts` asserts the column exists, is nullable and has no check constraint.

### P14 · server: dashboard data, countdown and avatars (R5e · FG-505, wave 15)
- Lane: `server`
- ownedFiles:
  - `src/features/family/avatars.ts` (new)
  - `src/features/wishlists/views.ts`
  - `src/features/wishlists/public-queries.ts`
  - `src/features/wishlists/countdown.ts` (new)
  - `src/features/planner/queries.ts`
  - `tests/unit/countdown.test.ts` (new)
  - `tests/unit/avatars.test.ts` (new)
  - `tests/integration/public-views.test.ts`
  - `tests/integration/projection-isolation.test.ts`
  - `tests/integration/planner.test.ts`
- Acceptance criteria:
  1. `AVATAR_STICKERS` has the eight names of D64 and every one is a sticker file; the zod schema rejects anything else.
  2. `getFamilyDashboard` returns `giftCount` (excluding soft-deleted gifts) and `avatar`; `getEarlierYears` returns archived lists grouped by occasion and year with counts for active members only.
  3. Neither contains any claim, interest, guest, planner, recovery, token or hash key or value (the projection-isolation test extended to the new fields).
  4. `daysUntilChristmas`: 39 on 16 November 2026, 1 on 24 December, 0 on 25 December, null on 26 December, correct across the clock change in March and October and for a date late in the evening of 24 December in UTC and in London.
  5. A planner summary for the strip is available from `queries.ts` (planned, spent, budget total) and equals the planner page's totals for the same data.

### P15 · ui: family page, earlier years and shared pieces (R5e · FG-505, wave 16)
- Lane: `ui`
- ownedFiles:
  - `src/app/(public)/page.tsx`
  - `src/app/(public)/earlier/[year]/page.tsx` (new)
  - `src/app/(public)/earlier/[year]/not-found.tsx` (new)
  - `src/features/wishlists/components/MemberCard.tsx` (new)
  - `src/features/planner/components/PlannerStrip.tsx` (new)
  - `src/features/wishlists/components/GiftRow.tsx` (new)
  - `src/components/ui/LinkButton.tsx` (new)
  - `tests/unit/planner-strip.test.ts` (new)
  - `tests/e2e/owner-list.spec.ts`
  - `src/features/reservations/components/ClaimControls.tsx`
  - `src/features/reservations/components/StatusChip.tsx`
- Acceptance criteria:
  1. The family page matches screen 03 at 375 px and 1280 px: sky or yellow hero with greeting, the countdown only when D66 says so, cards in one, two or three columns with avatar, name, "Christmas 2026 · 5 gifts" and an Open button labelled "Open Sarah's list".
  2. The planner card shows only to a guest with a session and reads as D67 for the three cases; "Earlier years" appears only when archived lists exist.
  3. `/earlier/2025` lists that year's archived lists read-only, with the archived pill; an unknown year shows the friendly not-found page.
  4. `StatusChip` and `ClaimControls` use `Pill` and Button tones from the theme, keep every label, `aria-label` and behaviour, and tell state in text.
  5. `GiftRow` shows `GiftThumb`, title, price or "No price", the notes, the "View product" link (`rel="noopener noreferrer nofollow"`), the status pill and the claim controls, and takes a `canAct` flag.

### P16 · ui: list page and filters (R5e · FG-505, wave 17)
- Lane: `ui`
- ownedFiles:
  - `src/app/(public)/l/[slug]/page.tsx`
  - `src/features/wishlists/components/ListFilters.tsx` (new)
  - `src/features/wishlists/components/ListFilterDialog.tsx` (new)
  - `src/features/wishlists/components/SortFilterBar.tsx` (deleted)
  - `src/features/wishlists/components/PublicItemCard.tsx` (deleted)
  - `tests/e2e/ordering.spec.ts`
- Acceptance criteria:
  1. The list page matches screen 04: hero with back link and sticker, ribbons per priority in the owner's order, a `GiftRow` per gift, and the sidebar on desktop.
  2. Sort, priority, price and availability controls read and write the existing URL parameters through the existing pure functions; a copied filter link shows the same view; "Up to £N" at its maximum omits `max`; clearing restores a plain URL.
  3. On phones the chip row and "More filters" dialog expose the same controls, every one a labelled button or input with `aria-pressed` or a value, and the dialog traps focus and closes on Escape.
  4. A list with no gifts shows "Nothing on this list yet." and one where filters match nothing shows "No gifts match these filters." with a Clear filters link; archived lists show the notice and no claim buttons; an unnamed visitor sees the name Note (D60).
  5. The owner's order, claims, interest and sort behaviour are unchanged, and `RememberList` still runs.

### P17 · e2e: family and wishlist (R5e · FG-505, wave 18)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/family-page.spec.ts` (new)
  - `tests/e2e/helpers.ts`
  - `Docs/FamilyGifts/Decisions/0020-family-dashboard-and-countdown.md` (new)
  - `tests/e2e/ordering.spec.ts`
  - `tests/e2e/claims.spec.ts`
  - `tests/e2e/owner-list.spec.ts`
- Acceptance criteria:
  1. The family page shows each member's name, gift count and Open link, the planner card only for a named guest, and an archived list only under "Earlier years" (via `/earlier/<year>`).
  2. The list page shows ribbons and rows in the owner's order; a guest's sort and filter never change the owner's order; the slider and chips change the visible gifts and the URL; the phone filter dialog works by keyboard.
  3. Reserve, purchase, release and the two-guest race still pass; owners still see no claim state on their own pages.
  4. Decision 0020 exists with `Status: Agreed` and states D64 to D71 as built.

### P18 · server: planner meter, access status (R5f · FG-506, wave 19)
- Lane: `server`
- ownedFiles:
  - `src/features/planner/meter.ts` (new)
  - `src/features/authentication/recovery.ts`
  - `src/features/authentication/recovery-actions.ts`
  - `tests/unit/planner/meter.test.ts` (new)
  - `tests/integration/recovery.test.ts`
- Acceptance criteria:
  1. `meterSegments({ budgetMinor, spentMinor, plannedMinor })` returns spent and planned-not-spent shares of the budget, never over 100% in total, zero shares for zero spending, and null with no budget; planned below spent and a zero budget cannot produce a negative or non-finite share.
  2. `recoveryLinkStatus` returns `{ active, createdAt }` (`createdAt` null when no active link); the raw token is never returned by it.
  3. Existing recovery behaviour (hash only, one active link, 404 sameness, throttle, concurrency) is unchanged and its tests pass.

### P19 · ui: planner, budget and notes (R5f · FG-506, wave 20)
- Lane: `ui`
- ownedFiles:
  - `src/app/(public)/planner/page.tsx`
  - `src/app/(public)/planner/budget/page.tsx` (new)
  - `src/features/planner/components/RecipientCard.tsx` (new)
  - `src/features/planner/components/BudgetCard.tsx` (new)
  - `src/features/planner/components/BudgetForm.tsx` (new)
  - `src/features/planner/components/EntryDetailsForm.tsx` (new)
  - `src/features/planner/components/ExportMenu.tsx`
  - `src/features/planner/components/BudgetSheet.tsx` (deleted)
  - `src/features/planner/components/EntryNotes.tsx` (deleted)
  - `src/features/planner/components/PlannerGroup.tsx` (deleted)
  - `src/features/planner/components/TotalsPanel.tsx` (deleted)
- Acceptance criteria:
  1. The planner matches screen 05: mint hero, a card per recipient with ribbon, budget, rows with labelled checkboxes, pills, prices and paid amounts, a dashed private-note card with Edit note, the Shopping list card and the yellow total card with meter, three stats and the not-counted note.
  2. All totals equal `computePlan` for the same data (the existing planner e2e figures still hold), and the meter's `aria-label` states spent, planned and total in words.
  3. Export selection, copy, Markdown and CSV behave as before (existing export tests pass unchanged).
  4. `/planner/budget` saves total and per-person budgets, and with `?gift=` also the price paid and private note, through the existing actions; a gift that is not in this guest's planner or a malformed id ignores `gift`; Cancel discards.
  5. Someone without a guest session sees the existing "pick a name first" page on both routes; owners and admin cannot reach either route's data.

### P20 · ui: Save your access page (R5f · FG-506, wave 21)
- Lane: `ui`
- ownedFiles:
  - `src/app/(public)/access/page.tsx` (new)
  - `src/features/authentication/components/AccessPanel.tsx` (new)
  - `src/features/authentication/components/SaveAccessDialog.tsx` (deleted)
  - `src/components/layout/AccountMenu.tsx`
- Acceptance criteria:
  1. `/access` matches screen 07: sky hero with back link, status pill, the link card (only right after making a link), Copy link, Make a new link, Turn link off, the three-step "How it works" card, the warning note and the identity card.
  2. The link text appears only in the response to making it; reloading or leaving and returning shows the status and no link, and the help text says so; no link or token is in the server-rendered HTML.
  3. Making a new link switches the old one off; Turn link off switches the current one off; both update the status pill; a visitor without a guest session is sent to `/welcome?next=/access`.
  4. The account menu's Save access item goes to `/access` and the dialog is gone.

### P21 · e2e: planner, budget and access (R5f · FG-506, wave 22)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/planner.spec.ts`
  - `tests/e2e/planner-export.spec.ts`
  - `tests/e2e/recovery.spec.ts`
  - `tests/e2e/budget.spec.ts` (new)
  - `Docs/FamilyGifts/Decisions/0021-planner-budget-and-access-pages.md` (new)
- Acceptance criteria:
  1. The planning journey from the old planner spec (two recipients, budget, totals, privacy from owner and other guests, release removes an entry) passes on the new pages with the same figures.
  2. Budget and notes: set a total and per-person budgets, edit the price paid and private note for one gift, and see the planner update; Cancel changes nothing.
  3. Recovery passes through `/access`: make a link, open it in a fresh context and see the same planner, reservation and note with `/recover` clean in the address bar; a replaced or turned-off link fails with the same message; after reload the page shows no link.
  4. Decision 0021 exists with `Status: Agreed` and states D72 to D75 as built, including the "link shown once" difference from the mockup.

### P22 · ui: owner editor and gift form (R6a · FG-601, wave 23)
- Lane: `ui`
- ownedFiles:
  - `src/app/(owner)/owner/lists/[listId]/page.tsx`
  - `src/app/(owner)/owner/lists/[listId]/add/page.tsx` (new)
  - `src/app/(owner)/owner/lists/[listId]/gifts/[itemId]/page.tsx` (new)
  - `src/features/wishlists/components/OwnerGiftRow.tsx` (new)
  - `src/features/wishlists/components/GiftForm.tsx` (new)
  - `src/features/wishlists/components/GiftPreview.tsx` (new)
  - `src/features/wishlists/components/FoundChecklist.tsx` (new)
  - `src/features/wishlists/components/ReorderControls.tsx`
  - `src/features/wishlists/components/ItemForm.tsx` (deleted)
  - `src/features/wishlists/components/OwnerItemList.tsx` (deleted)
  - `src/features/wishlists/components/PriorityChip.tsx` (deleted; the owner list still uses it until here)
  - `src/features/imports/components/UrlImportPanel.tsx`
  - `src/components/layout/OwnerShell.tsx`
- Acceptance criteria:
  1. The editor matches screen 08: mint hero with count, ribbons, rows with up, down and edit, and the sidebar with share link, add shortcuts and the surprise note; up is disabled at the top of a group and down at the bottom, and reordering still persists and never changes another priority group.
  2. The add and edit pages match screen 09; both modes keep every field usable, a failed or blocked fetch shows the pink note and leaves the form usable, a successful one fills the fields and shows "What we found" with text and icons; the preview updates as the owner types.
  3. Saving, editing, validation messages next to their fields, the 20 lookups per 15 minutes throttle and the SSRF protections are unchanged; "Remove this gift" confirms and soft deletes.
  4. The owner nav has My list and Add a gift; an archived list is read-only with the notice and no add or edit links.
  5. Nothing on any owner page imports or shows reservation, interest or planner data.

### P23 · e2e: owner editor and gift form (R6a · FG-601, wave 24)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/owner-list.spec.ts`
  - `tests/e2e/ordering.spec.ts`
  - `tests/e2e/url-import.spec.ts`
  - `tests/e2e/owner-gift.spec.ts` (new)
- Acceptance criteria:
  1. An owner adds a gift by typing it in, edits its price and priority (it moves group), reorders by keyboard, and removes it, and a guest sees each change.
  2. The blocked-link cases (a local address, the metadata address, an `ftp:` link, 21 lookups) show the by-hand message and the manual path still saves a gift with its price.
  3. Owners still see no reservations, interest or buyer names on any owner page, and an owner cannot open another owner's editor, add page or edit page.

### P24 · repo: decision 0022 (R6a · FG-601, wave 25)
- Lane: `repo`
- ownedFiles:
  - `Docs/FamilyGifts/Decisions/0022-owner-pages.md` (new)
- Acceptance criteria:
  1. Decision 0022 exists with `Status: Agreed` and states D76 to D78 as built.

### P25 · server: bulk import with per-row priority (R6b · FG-602, wave 26)
- Lane: `server`
- ownedFiles:
  - `src/features/imports/bulk-actions.ts`
  - `tests/integration/bulk-import.test.ts`
- Acceptance criteria:
  1. A row's `priority` is accepted when it is one of the three values and defaults to `would_love` when absent; any other value is invalid and nothing is added.
  2. Rows are appended to the end of their own priority group in preview order, never disturbing existing items' order.
  3. All existing guarantees hold: owner only, archived lists refused, blank titles skipped, 100 rows maximum, all or nothing on an invalid row (test with a mixed batch).

### P26 · ui: import page and owner account (R6b · FG-602, wave 27)
- Lane: `ui`
- ownedFiles:
  - `src/app/(owner)/owner/lists/[listId]/import/page.tsx` (new)
  - `src/app/(owner)/owner/pin/page.tsx` (new)
  - `src/app/(owner)/owner/page.tsx`
  - `src/features/imports/components/ImportWizard.tsx` (new)
  - `src/features/imports/components/BulkImportDialog.tsx` (deleted)
  - `src/features/authentication/components/ChangePinForm.tsx`
  - `src/components/layout/OwnerShell.tsx`
  - `src/components/layout/AccountMenu.tsx`
- Acceptance criteria:
  1. The import page matches screen 10: steps card, paste box with Find gifts and Clear, the best-effort note, "WE FOUND N GIFTS", cards with checkbox, thumbnail, editable title, price or price input, state pill, priority select and Remove, and the "Ready to add" sidebar with correct counts.
  2. Duplicates start unchecked and show "Skipped"; a row with no price can be given one; only ticked rows with a title are sent; nothing is saved by Find gifts, Clear or Start over.
  3. Unreadable input and input over 500 KB show their messages and leave the Add a gift link usable; the owner nav gains Import.
  4. `/owner/pin` has the change-PIN form with its existing behaviour; the account menu links to it and to `/owner`; `/owner` lists all the owner's lists as cards.

### P27 · e2e: import and owner account (R6b · FG-602, wave 28)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/amazon-import.spec.ts`
  - `tests/e2e/pin-links.spec.ts`
- Acceptance criteria:
  1. The import journey passes: paste the basic fixture, untick one, change a priority and a title, add a missing price, add the rest, and the list shows exactly those gifts in their groups; the duplicate row is skipped; unreadable and oversize input show the fallback.
  2. The owner changes their PIN on `/owner/pin` (wrong current PIN refused, mismatched new PINs refused, other sessions ended) and the admin can still reset it afterwards.

### P28 · repo: decision 0023 (R6b · FG-602, wave 29)
- Lane: `repo`
- ownedFiles:
  - `Docs/FamilyGifts/Decisions/0023-bulk-import-selection.md` (new)
  - `Docs/FamilyGifts/Decisions/0014-amazon-import.md`
- Acceptance criteria:
  1. Decision 0023 exists with `Status: Agreed` and states D79 to D81 as built; decision 0014 is edited in place to describe per-row priority and selection.

### P29 · server: admin member and list queries and actions (R6c · FG-603, wave 30)
- Lane: `server`
- ownedFiles:
  - `src/features/family/actions.ts`
  - `src/features/family/schemas.ts`
  - `src/features/family/queries.ts`
  - `tests/integration/family.test.ts`
  - `tests/integration/projection-isolation.test.ts`
- Acceptance criteria:
  1. `createMember({ displayName, avatar?, pin? })` validates with zod (name rules unchanged, avatar in `AVATAR_STICKERS`, PIN 6 to 12 digits), stores the PIN only hashed, and with no PIN leaves it unset; `renameMember` accepts an optional avatar and can clear it.
  2. Admin queries return each member with `avatar`, `active`, whether a PIN is set (never the hash), and their lists with slug and archived state; a lists query returns every list with its member, year and archived state.
  3. Every action keeps `requireAdmin`; a non-admin or an owner session gets `UNAUTHORIZED` and nothing changes.
  4. Admin outputs still contain no claim, interest, guest, planner, recovery or hash data (isolation test updated).

### P30 · ui: admin members and lists (R6c · FG-603, wave 31)
- Lane: `ui`
- ownedFiles:
  - `src/app/(admin)/admin/page.tsx`
  - `src/app/(admin)/admin/lists/page.tsx` (new)
  - `src/app/(admin)/admin/members/[memberId]/page.tsx`
  - `src/features/family/components/AdminMemberCard.tsx` (new)
  - `src/features/family/components/AddMemberForm.tsx` (new)
  - `src/features/family/components/CreateListForm.tsx` (new)
  - `src/features/family/components/ResetPinDialog.tsx` (new)
  - `src/features/family/components/RenameDialog.tsx` (new)
  - `src/features/family/components/AvatarPicker.tsx` (new)
  - `src/features/family/components/PinResetForm.tsx`
  - `src/features/family/components/MemberForm.tsx` (deleted)
  - `src/features/family/components/ListForm.tsx` (deleted)
  - `src/components/layout/AdminShell.tsx`
- Acceptance criteria:
  1. `/admin` matches screen 11: cards with avatar, name, status pill, list links with Copy link, and the four buttons; Reset PIN becomes a red "Set PIN" when none is set; the sidebar has Add a member (with picture picker and optional PIN) and Create a list.
  2. Reset PIN and Rename open dialogs; Archive and Deactivate confirm; the reset dialog shows the sign-in links of decision 0004 after saving, and the PIN is never shown anywhere else.
  3. `/admin/lists` shows every list grouped by year with Copy link and Archive or Restore; the admin nav and mobile tabs are Members, Lists and Sign out.
  4. `/admin/members/[memberId]` redirects to `/admin`; the three copy-link buttons per card have distinct accessible names.
  5. Admin pages show no claims, interest, planner or guest data.

### P31 · e2e: admin (R6c · FG-603, wave 32)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/admin-setup.spec.ts`
  - `tests/e2e/pin-links.spec.ts`
  - `tests/e2e/mobile-a11y.spec.ts`
- Acceptance criteria:
  1. The admin adds a member with a picture and a PIN, creates a list, copies its link, and the member can sign in with that PIN; another member is added with no PIN and shows "PIN not set".
  2. Reset PIN, Rename (with a picture change), Archive then Restore, and Deactivate each work and show their confirmation, and the family page reflects the picture, archive and deactivation.
  3. The sign-in links shown after a reset fill the owner sign-in form (decision 0004) and the old PIN stops working.

### P32 · repo: decision 0024 (R6c · FG-603, wave 33)
- Lane: `repo`
- ownedFiles:
  - `Docs/FamilyGifts/Decisions/0024-admin-one-screen-and-avatars.md` (new)
- Acceptance criteria:
  1. Decision 0024 exists with `Status: Agreed` and states D82 to D84 as built.

### P33 · ui: states and clean-up (R7 · FG-701, wave 34)
- Lane: `ui`
- ownedFiles:
  - `src/components/sticker/Empty.tsx` (new)
  - `src/app/(public)/loading.tsx` (new)
  - `src/app/(public)/error.tsx` (new)
  - `src/app/(owner)/loading.tsx` (new)
  - `src/app/(owner)/error.tsx` (new)
  - `src/app/(admin)/loading.tsx` (new)
  - `src/app/(admin)/error.tsx` (new)
  - `src/app/(public)/l/[slug]/not-found.tsx`
  - `src/theme/theme.ts`
- Acceptance criteria:
  1. Every place a list can be empty uses `Empty`, with the wording the page had before (so existing text assertions still hold) and a sensible next action.
  2. `loading.tsx` shows a sticker and "One moment…" with `role="status"`; `error.tsx` shows "Something went wrong" and a Try again button and logs nothing sensitive.
  3. Hover, active, disabled and focus-visible states exist for button, ghost button, toggle button, chip, input, select, checkbox, slider, menu item and link, and each pair passes the contrast test.
  4. Search finds no use of a deleted component (the list in D86) anywhere in `src/` or `tests/`.

### P34 · e2e: route sweep (R7 · FG-701, wave 35)
- Lane: `e2e`
- ownedFiles:
  - `tests/e2e/mobile-a11y.spec.ts`
  - `tests/e2e/security.spec.ts`
  - `tests/e2e/helpers.ts`
- Acceptance criteria:
  1. For each of guest, owner and admin, every route in the app is visited at 375 px and 1280 px with no horizontal scroll and no serious or critical axe violation, including each dialog, the account menu open, the phone filter dialog and an error state.
  2. Reserve, mark purchased, add a gift, import and sign in complete by keyboard alone, and with reduced motion on no interactive element transitions or animates.
  3. The security sweep covers `/access`, `/planner/budget`, `/earlier/<year>`, `/welcome`, every owner route and every admin route: no guest, claim, interest, note, price-paid, token or secret string appears in any owner or admin page, any page or any script, and header expectations still hold.

### P35 · repo: manual testing, README and decision statuses (R7 · FG-701, wave 36)
- Lane: `repo`
- ownedFiles:
  - `Docs/FamilyGifts/Testing/MANUAL-TESTING-FG-002-sticker-book-design.md`
  - `README.md`
  - `Docs/FamilyGifts/Runbook.md`
- Acceptance criteria:
  1. The manual testing document covers every release with a case per screen at a real phone width and on a desktop, and the change checklist is ticked or annotated with what could not be run.
  2. The README links the design pack and the new decisions folder entries; the Runbook's first-deploy check mentions the new `/welcome` flow and `fg_last_list` cookie.
  3. Decisions 0016 to 0024 are listed in the decisions README with their statuses.

## Audit fixes after R5c

The branch review and the whole-repo audit after R5c found small defects, fixed outside any package: the sticker outline colours moved into `tokens.ts` and the colour guard test now covers all of `src/`; "My list" picks the newest open list (`newestOpenList`);
a long name is truncated in the account chip; the session and guest lookups are cached per request (`src/lib/auth/require.ts`, `guest-session.ts`); budgets save in one transaction; marking a gift purchased is refused on an archived list;
`clientIp` prefers `x-real-ip` and otherwise the last `x-forwarded-for` entry; e2e tests use their own database (`E2E_DATABASE_URL`); and `scripts/cleanup.sh` removes finished sessions and throttle rows.

## Follow-ups

- Owner-chosen stickers per gift, member pictures beyond the eight stickers, a CSP, dark mode, translations.
- Showing a per-list gift count that excludes reserved items for guests (not drawn).
- A real phone check of tap targets, font rendering and the bottom tabs with the iOS safe area (`padding-bottom` on the tab bar uses `env(safe-area-inset-bottom)`; only a real device can confirm it).

## Resolved questions

- **Q1 → D46.** Keep MUI and theme it; no Tailwind.
- **Q2 → releases R5 to R7.** Reskin plus the new flows the screens imply.
- **Q3 → D52.** Product picture when there is one, otherwise an automatic sticker by title keywords with a stable fallback by id.
- **Q4 → D64, D84.** Optional member picture (eight stickers) stored on the member, with initials as the fallback.

## Open questions

- None.
