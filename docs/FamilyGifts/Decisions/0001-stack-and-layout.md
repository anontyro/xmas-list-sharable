# 0001 · Next.js App Router with MUI, Drizzle and pnpm, with every dependency installed up front

**Status:** Agreed · **Work items:** FG-101 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D2, D3

The app is one Next.js App Router project in strict TypeScript, managed with pnpm, styled with MUI and backed by Postgres through Drizzle.
All libraries the whole project needs are installed in the first release, so later releases do not edit `package.json`. The one exception is the two font packages added by the Sticker Book theme (decision 0016).

- **Layout.** Code lives under `src/`: routes in `src/app` (route groups `(public)`, `(owner)`, `(admin)`), server logic in `src/features/<area>` and `src/lib`, shared UI in `src/components`, theme in `src/theme`.
- **Environment.** `src/lib/env.ts` validates `DATABASE_URL`, `ADMIN_SECRET` and `SESSION_SECRET` with zod on first use, not at import, so a build that does not read them still succeeds.
- **Stickers.** The 36 Sticker Book icons live in `public/stickers/` and are used only through `<Sticker name="tree" />`, whose `name` is a typed union (decision 0017). Stickers are decorative (`alt=""`) unless given an alt.
- **Tooling.** TypeScript is pinned to 5.x because `typescript-eslint` does not support 7.0 yet. `pnpm-workspace.yaml` allows the `esbuild` install script, which pnpm 11 otherwise blocks.
- **Responsive shell.** `AppShell` shows links inline from the `sm` breakpoint and in a labelled menu below it.

## Why

MUI replaces the PRD's Tailwind/shadcn because the owner chose it. Installing everything once keeps the lockfile out of most packages' ownership, so packages in the same wave cannot conflict on it.

## Consequences

- Dependencies for later releases (Drizzle, Argon2, cheerio, Playwright) sit unused until then.
- Upgrading TypeScript to 7 waits for `typescript-eslint` support.
