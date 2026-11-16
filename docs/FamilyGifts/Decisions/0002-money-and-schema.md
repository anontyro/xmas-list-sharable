# 0002 · The whole PRD schema lands in one migration, and money is integer pence

**Status:** Agreed · **Work items:** FG-102 · **Spec:** `Docs/FamilyGifts/Specs/2026-11-15-FG-001-family-gifts.md` D8, D9, D10, D11

Every table from PRD §7 is created by the first migration, so later releases only add code. Prices are whole pence in integer columns, never floats.

- **Constraints.** Enum-like columns are `text` with `check` constraints (priority, claim status, session principal type); prices and budgets must be null or non-negative.
- **One active claim.** `item_claim_one_active_per_item` is a partial unique index on `item_id` where `released_at is null`. A purchased claim stays active until released.
- **One active recovery link.** `recovery_token_one_active_per_guest` is the same pattern on `guest_id` where `revoked_at is null`.
- **Member names.** Unique per household among active members only, so a deactivated name can be reused.
- **Money.** `parsePoundsToMinor` accepts `12`, `12.5`, `12.50`, up to £999,999.99, and returns null for anything else. `formatGBP` renders pence as pounds.
- **Connections.** `src/db/client.ts` uses `prepare: false` so it works through Supabase's transaction-mode pooler. Tests use `TEST_DATABASE_URL`, migrate once per run and truncate every table before each test.

## Why

The database, not application code, must decide who wins a reservation, so the rule is an index. Creating all tables once avoids a migration in every release. Floats cannot represent prices exactly, so budgets and totals would drift.

## Consequences

- Tables for later releases sit empty until their release.
- Changing a constraint later needs a new migration; the first migration is never edited once deployed.
