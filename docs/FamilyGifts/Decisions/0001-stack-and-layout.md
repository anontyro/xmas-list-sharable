# 0001 · Next.js App Router with MUI, Drizzle and pnpm, with every dependency installed up front

**Status:** Agreed · **Work items:** FG-101 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D2, D3

The app is one Next.js App Router project in strict TypeScript, managed with pnpm, styled with MUI and backed by Postgres through Drizzle.
All libraries the whole project needs are installed in the first release, so later releases never edit `package.json`.

- **Layout.** Code lives under `src/`: routes in `src/app` (route groups `(public)`, `(owner)`, `(admin)`), server logic in `src/features/<area>` and `src/lib`, shared UI in `src/components`, theme in `src/theme`.
- **Environment.** `src/lib/env.ts` validates `DATABASE_URL`, `ADMIN_SECRET` and `SESSION_SECRET` with zod on first use, not at import, so a build that does not read them still succeeds.
- **Icons.** The 36 transparent PNGs from the icon pack live in `public/icons/<group>/` and are used only through `<Icon name="group/name" />`, whose `name` is a typed union. Icons are decorative (`alt=""`) unless given an alt.
- **Tooling.** TypeScript is pinned to 5.x because `typescript-eslint` does not support 7.0 yet. `pnpm-workspace.yaml` allows the `esbuild` install script, which pnpm 11 otherwise blocks.
- **Responsive shell.** `AppShell` shows links inline from the `sm` breakpoint and in a labelled menu below it.

## Why

MUI replaces the PRD's Tailwind/shadcn because the owner chose it. Installing everything once keeps the lockfile out of every later package's ownership, so packages in the same wave cannot conflict on it.

## Consequences

- Dependencies for later releases (Drizzle, Argon2, cheerio, Playwright) sit unused until then.
- Upgrading TypeScript to 7 waits for `typescript-eslint` support.
