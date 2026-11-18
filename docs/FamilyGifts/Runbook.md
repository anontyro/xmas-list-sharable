# Family Gifts runbook

How to run, deploy, back up and restore Family Gifts. Decisions behind it: `Decisions/`. Spec: `Specs/`.

## Environment variables

| Name | What it is |
|---|---|
| `DATABASE_URL` | Postgres connection string. In production use the Supabase **pooled (transaction mode)** URL; the app already turns off prepared statements for it. |
| `ADMIN_SECRET` | The admin sign-in secret, at least 12 characters. The app refuses to start without it. |
| `SESSION_SECRET` | At least 32 characters. `openssl rand -base64 32` makes one. |
| `TEST_DATABASE_URL` | Tests only. Must be a different database from `DATABASE_URL`. |

Never commit `.env`. Set the same names in Vercel under Project → Settings → Environment Variables.

## Deploy (Vercel)

1. Import the repository in Vercel. Framework: Next.js. Package manager: pnpm (taken from `packageManager`).
2. Set the three environment variables above for Production.
3. **Run migrations as a deliberate step**, never on every deploy. From a checkout with the production `DATABASE_URL` (use the **direct** connection, not the pooler, for migrations):
   `DATABASE_URL=<direct url> pnpm db:migrate`
4. Seed the household once: `DATABASE_URL=<direct url> pnpm db:seed` (no `--demo` in production).
5. Deploy, open `/admin/login`, sign in with `ADMIN_SECRET`, add family members, set their PINs and create their lists. Share each list's `/l/<slug>` link.

Check after the first deploy: cookies `fg_admin`, `fg_owner`, `fg_guest` are HttpOnly and Secure, and the response headers on `/` include `X-Frame-Options: DENY`.
Then, in a private window: open a list link and check it goes to `/welcome` and, after a name is entered, back to the list; open `/l/<slug>` once and check the `fg_last_list` cookie is set (it only remembers a path, and the Wishlist tab uses it); open `/owner/login` and `/admin/login` and check both use the same sign-in frame.

## Supabase free tier

The free tier **pauses a project after about a week of no activity**, and a paused database makes the whole app fail. Before launch:
- Check the project's current pause policy in the Supabase dashboard.
- Open the app at least weekly in the run-up to Christmas, or upgrade the project for the season.
- If it is paused, press Restore in the dashboard and wait a minute or two. No data is lost by a pause.

## Backup

`scripts/backup.sh` writes a timestamped custom-format dump of `DATABASE_URL` into `backups/` (or `$BACKUP_DIR`) and prints the path. It needs `pg_dump` (Postgres client tools). `backups/` is git-ignored: **copy dumps somewhere safe**.
Take one before every migration and after the family has finished adding gifts. Use the direct connection URL for backups.

## Restore

`scripts/restore.sh <dump-file> <target-database-url>` restores into an **empty** database and refuses one that already has tables, so it can never overwrite live data.

To go back to a backup: create a new empty database (a new Supabase project, or `create database`), restore into it, then point `DATABASE_URL` at it and redeploy.

### Restore test

Prove a backup works before you need it:

```sh
createdb_url=postgres://…/postgres                       # a maintenance connection
psql "$createdb_url" -c "create database family_gifts_restore_test"
scripts/backup.sh                                         # prints backups/family-gifts-<time>.dump
scripts/restore.sh backups/family-gifts-<time>.dump postgres://…/family_gifts_restore_test
scripts/row-counts.sh "$DATABASE_URL" > a.txt
scripts/row-counts.sh postgres://…/family_gifts_restore_test > b.txt
diff a.txt b.txt && echo "counts match"
```

**Result of the last run (2026-11-16, local Docker Postgres 16, 14 tables):** every table's row count matched
(`guest 1, household 1, member 2, wishlist 2, wishlist_item 6`, the rest 0), and restoring again into the same database, or into the source database, was refused ("already has 14 tables"). Not yet run against a Supabase project.

## If a guest loses their recovery link

The link is shown once and only a hash is stored, so it cannot be looked up. If the guest still has a browser that is signed in, they open **Save access** and make a new link (this turns the old one off). If they have no signed-in browser left, their plans can't be recovered: they pick their name again as a new guest and the owner's lists are unaffected.
If a link was shared by mistake, **Save access → Turn off link** stops it working.

## Housekeeping

Sessions, revoked recovery links and throttle counters are only ever added to. `scripts/cleanup.sh` removes the ones that are finished with (sessions that expired or were revoked over 30 days ago, old revoked links, and throttle counters whose window has passed) and touches nothing in use. Run it with the session-pooler `DATABASE_URL` every few months, or from a Supabase scheduled job.
It needs `psql` (Postgres client tools).

## Hosting and the visitor's address

The login, naming and recovery throttles count attempts per address. The app reads the address from `x-real-ip`, else the **last** `x-forwarded-for` entry. Vercel sets both itself, so that is safe there. Behind any other proxy, make sure it overwrites those headers; otherwise a caller who invents their own would get a fresh throttle on every try and could guess PINs without limit.

## Other things that go wrong

- **Admin can't sign in:** too many tries blocks the address for 15 minutes. Wait, or clear the `auth_limit` row for `admin:<ip>`.
- **A member forgets their PIN:** Admin → the member's card → Reset PIN (or Set PIN) → the dialog also shows a sign-in link to send them.
- **Everyone suddenly sees errors:** check the database is not paused (above) and that `DATABASE_URL` is the pooled URL.
