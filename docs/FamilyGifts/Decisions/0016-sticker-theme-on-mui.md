# 0016 · The Sticker Book look is an MUI theme built from design tokens, with an ink focus ring that passes contrast

**Status:** Agreed · **Work items:** FG-501 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-17-FG-002-sticker-book-design.md` D46, D47, D48, D49

The design pack (`docs/family-gifts-design/`) is built on the existing MUI app as a theme plus a small set of components. It is not Tailwind and not a rewrite, and no new styling library is added. A page that has not been redone yet simply picks up the theme.

- **Tokens.** `src/theme/tokens.ts` is the only place a colour value is written: ink `#1F2A44`, cream `#FFF4D6`, red `#D32F34`, green `#1F7A45`, yellow `#FFC93C`, pink `#FFB3C1`, sky `#BDE0FE`, mint `#7ED9A5`, muted `#4A5570`, white, and `danger` `#B3262B` (the sign-out red). It also holds the hard shadows (cards `4px 4px 0`, buttons `0 3px 0`), the cream dot grid, the 860 px breakpoint and the `fg-bar` class name. All values are the README's; none had to change for contrast.
- **Palette.** `primary` is red, `secondary` green, `text.primary` ink, `text.secondary` muted, `background.default` cream, `background.paper` white. `yellow`, `sky`, `pink` and `mint` are added to the palette (`src/theme/augment.d.ts`), so they work as `Button` and `Chip` colours and an unknown colour is a type error. Alerts take the design's note tints: success mint, info sky, warning yellow, error pink, all with ink text.
- **Breakpoints.** `xs 0, sm 600, md 860, lg 1200, xl 1536`. 860 is where the design swaps bottom tabs for top links and adds the sidebar.
- **Buttons.** Every button is a sticker: a 3 px ink border, radius 14, a `0 3px 0` shadow that flattens on hover and press, Lilita One, 40 / 44 / 54 px tall for small / medium / large. `contained` takes the colour; `outlined`, `text` and `color="inherit"` are the plain white button with ink text; `variant="ghost"` is transparent with a dashed border and no shadow. No ripple.
- **Surfaces and fields.** Paper and Card get a 3 px border, radius 18 and a `4px 4px 0` shadow (menus and dialogs included); the app bar is red with a 4 px ink bottom border and cream text. Text fields have a 3 px ink border, radius 12, white fill and 700 weight; chips have a 2 px border and radius 12; links are always underlined (decided in the hardening release).
- **Focus.** `:focus-visible` is a 3 px solid ink outline, 2 px off, on everything, including MUI's button-based controls. Text fields draw it on the whole field, not on the bare input. On the red top bar the ring is cream.
- **Contrast.** `tests/unit/theme-contrast.test.ts` computes WCAG ratios for every pairing the design uses and fails below 4.5 for text and 3 for focus rings and borders. It also records why the ring is not the README's sky: sky is 1.4:1 on white and 1.3:1 on cream, and ink is only 2.9:1 on red.
- **Fonts.** Lilita One (headings, buttons, numbers) and Nunito Sans 600, 700 and 800 (body) are self-hosted with `next/font/local` from the `@fontsource` packages (dev dependencies), as CSS variables `--font-display` and `--font-body`, `display: swap`, with the system font stack as fallback. Only the Latin subset is bundled. A build never needs the network.
- **Motion.** The rule from the first release stays: animation and transitions are off under `prefers-reduced-motion`.

## Why

The app is built, tested at two widths and mostly accessible on MUI, so porting the design's CSS into a theme keeps every working page and all of the end-to-end tests. Switching to Tailwind, as the design README assumes, would mean replacing every component and rewriting most test locators for a look that a theme can deliver. The README's suggested sky focus ring fails the contrast minimum for focus indicators, so the ring is ink (cream on the red bar), and a test keeps it that way.

## Consequences

- Until the shells are rebuilt, the existing top bar shows its links as white sticker buttons on the red bar.
- Characters outside the Latin subset (for example some non-English names) show in the system font.
- Changing a token means changing `tokens.ts` and running the contrast test; nothing else holds a colour value.
- Component-level pieces (stickers, ribbons, pills, hero, meter) are added in the next release, not here.
