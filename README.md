# Family Gifts

A private family wishlist and gift-coordination app (Next.js, MUI, Drizzle, Postgres).
Requirements: `docs/family-gifts-prd-v1.md`. Build plan: `docs/FamilyGifts/Specs/`.

## Setup

```sh
pnpm install
cp .env.example .env   # then fill in ADMIN_SECRET and SESSION_SECRET (see comments)
pnpm dev
```

## Scripts

`dev` `build` `start` `lint` `typecheck` `test` `test:integration` `test:e2e` `db:up` `db:down` `db:generate` `db:migrate` `db:seed`

The `db:*`, integration and e2e scripts need the database and migrations added in later releases.
