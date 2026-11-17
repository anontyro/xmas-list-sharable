# Family Gifts — design handoff (Sticker Book direction)

Target stack (per `PRD.md`): Next.js + TypeScript, Tailwind/shadcn, Supabase/Drizzle. This pack is the visual and behavioural spec, not production code.

## Contents
- `reference/NN-name.html` — one static, openable HTML file per screen (open in a browser, resize across 860px to see mobile vs desktop). They load `../styles/sticker.css`, `../icons/*.png` and Google Fonts (Lilita One, Nunito Sans).
- `styles/sticker.css` — the whole design system as plain CSS (tokens, layout helpers, components). Port to Tailwind theme + components; class names below map 1:1 to components.
- `icons/` — 36 cut-out sticker PNGs (transparent). Convert to WebP/SVG sprite as you like; the white outline + shadow is a CSS filter (`.stk`), not baked in.
- `PRD.md` — source requirements.

## Design tokens
| Token | Value | Use |
|---|---|---|
| ink | `#1F2A44` | text, all borders, hard shadows |
| cream | `#FFF4D6` | page bg (with 26px dot grid, `rgba(31,42,68,.08)`) |
| red | `#D32F34` | primary actions, top bar (white text passes AA; don't use `#E5383B`) |
| green | `#1F7A45` | success, "purchased", secondary buttons |
| yellow | `#FFC93C` | active tab/nav, priority |
| pink / sky / mint | `#FFB3C1` / `#BDE0FE` / `#7ED9A5` | card and note tints, avatars |
| muted text | `#4A5570` | help text, prices |

Fonts: **Lilita One** (headings, buttons, numbers), **Nunito Sans** 600/700/800 (body). Look: 3px ink borders, radius 12–18px, hard offset shadows (`4px 4px 0 ink` on cards, `0 3px 0 ink` on buttons), ribbons rotated -1.5deg. Tap targets >= 44px. Dashed borders = secondary/ghost.

## Responsive rules
Mobile first. At `min-width:860px`: top-bar links appear and bottom tabs hide; `.two` becomes content + 360px sidebar (sidebar is first on mobile); grids go 2/3 columns; Welcome/Login become a split screen (red brand panel left, 560px form right). Max content width 1120px.

## Screens
| File | Screen | Who | Notes |
|---|---|---|---|
| 01-welcome | Guest name entry | guest | First visit to a shared list link; creates guest identity (random ID + display name, household-wide) |
| 02-login | Owner PIN login | owner | Single `type=password inputmode=numeric` field (no per-digit boxes, no keypad). **PIN minimum 6 digits** (PRD). Rate-limit wrong tries and show the pause message |
| 03-family | Family dashboard | guest | Member cards with list counts, planner strip, earlier years |
| 04-wishlist | A member's list | guest | Filter/sort sidebar on desktop; interest / reserve / purchased states; exclusive claim, show conflict feedback |
| 05-planner | Cross-list planner | guest | Budget card in sidebar, per-recipient cards, export (copy / Markdown / CSV) |
| 06-sheet | Budget and notes | guest | Budget, personal notes, actual cost |
| 07-recovery | Recovery link | guest | Create / copy / revoke. Per guest, one active token; never store raw token |
| 08-editor | Owner list editor | owner | Up/down reorder, edit, remove. Owner views must never show claim/interest state |
| 09-addgift | Add / edit gift | owner | URL paste -> metadata prefill; manual entry must never be blocked by import failure |
| 10-import | Amazon paste import | owner | Paste -> parsed preview -> confirm; best effort |
| 11-admin | Admin management | admin | Members, set/reset PIN (never viewable), create list. No access to claim/planner data |
| 12-menu | Account menu (open) | guest | Dropdown from the top-right name chip |

## Account menu (top-right chip)
Button with `aria-haspopup="menu"`, toggles `aria-expanded`; panel is `role="menu"`, right-aligned under the chip, 290px, closes on Escape / outside click, focus returns to the chip.
- Guest: header (name, "Shopping on this device"), Change my name, **Save access (recovery link)**, My planner, I own a list (PIN), divider, **Sign out of this device** (red) with the warning "You'll need your recovery link to get back in." Consider confirming sign-out if no recovery link was ever created, since the identity is lost.
- Owner: My list, Sign out (not drawn open in the mockups; same panel).
- Mobile bottom tabs: Family / Wishlist / Planner only. Sign out and Recovery live in the menu.
- Admin keeps its own Sign out button (desktop) and tab (mobile).

## Implementation notes
- Reference HTML uses static sample data (Sam = guest, Sarah/Alex = owners/members, Christmas 2026). Replace with real data; icon per gift/category is a design choice, not required by the PRD.
- Visually hidden state is not conveyed by colour alone: keep the pills (Reserved / Purchased / Interested) with text.
- Icons are decorative (`alt=""`) unless they stand alone as the only label.
- Suggested component split: AppBar (brand, links, AccountMenu), TabBar, Hero, Card, Button (variants red/yel/grn/sky/pnk/mnt/gho; sizes sm/xl), Pill, Ribbon, Note, Field (label/input/help), Meter, Stat, GiftRow, MemberCard, SplitLayout.
- Contrast: white on `#D32F34` and `#1F7A45` passes; ink on the pastel tints passes.
- Mockup limits: no hover/focus/error/empty/loading states drawn. Build them from the same tokens (focus ring: 3px sky outline offset 2px suggested).
