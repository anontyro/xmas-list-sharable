# Family Gifts

A private family wishlist and gift-coordination app (Next.js, MUI, Drizzle, Postgres).
Requirements: `docs/family-gifts-prd-v1.md`. Build plan: `docs/FamilyGifts/Specs/`. Rules and why: `docs/FamilyGifts/Decisions/` (0001 to 0024). Design pack (the Sticker Book screens): `docs/family-gifts-design/`. Manual testing: `docs/FamilyGifts/Testing/`.

## Setup

```sh
pnpm install
cp .env.example .env   # then fill in ADMIN_SECRET and SESSION_SECRET (see comments)
pnpm db:up && pnpm db:migrate && pnpm db:seed --demo   # local Postgres in Docker
pnpm dev
```

If your Docker volume predates `docker/init-test-db.sql`, create the test databases once:
`docker compose exec db psql -U family -d family_gifts -c "create database family_gifts_test" -c "create database family_gifts_e2e"`.
Integration tests use `TEST_DATABASE_URL` and e2e tests use `E2E_DATABASE_URL`; both empty their database before every test, so never point them at the same one if you run them at the same time.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` / `build` / `start` | Run the app in development, build it, serve the build |
| `pnpm lint` / `typecheck` | ESLint and TypeScript checks |
| `pnpm test` | Unit tests |
| `pnpm test:integration` | Database tests (need `pnpm db:up` and `TEST_DATABASE_URL`) |
| `pnpm test:e2e` | Browser tests at 375 px and 1280 px (builds the app first) |
| `pnpm db:up` / `db:down` | Start or stop local Postgres in Docker |
| `pnpm db:generate` / `db:migrate` | Create or apply schema migrations |
| `pnpm db:seed` | Create the household (`--demo` adds sample members and lists) |
| `scripts/backup.sh`, `restore.sh`, `row-counts.sh` | Back up, restore and compare the database (see the runbook) |

Running, deploying, backing up and restoring: `docs/FamilyGifts/Runbook.md`.
