# Setting up Supabase and Vercel for Family Gifts

A first-time setup guide: a Supabase Postgres database, the app on Vercel, and the exact values to put in Vercel.
For day-to-day running (backups, restore, housekeeping) see `Runbook.md`.

> **Status:** written from the code and Supabase's documented behaviour. It has **not** been run against a real Supabase project yet. Do the steps once and note anything that differs.

## What the app needs

Only three values. The app reads nothing else, and nothing starts with `NEXT_PUBLIC_`.

| Name | Used for | Rule |
|---|---|---|
| `DATABASE_URL` | Every database query | Supabase **transaction pooler** URL (port 6543). The app already turns off prepared statements for it. |
| `ADMIN_SECRET` | Admin sign-in at `/admin/login` | At least 12 characters. The app refuses to start without it. |
| `SESSION_SECRET` | Signs session cookies | At least 32 characters. |

You also use a **second** database URL, only on your own computer, to run migrations and the seed (step 4).
`TEST_DATABASE_URL` and `E2E_DATABASE_URL` are for tests only. Never set them in Vercel.

## Step 1. Create the Supabase project

1. Sign in at supabase.com and choose **New project**.
2. Pick the **region closest to your family** (for the UK, London `eu-west-2`). You will match Vercel to it in step 5.
3. Set a **database password**. Use a long one made of letters and digits only. A password with `@`, `:`, `/`, `#` or `?` must be URL-encoded when it goes into a connection string, and a plain one avoids that.
4. Wait for the project to finish creating (a minute or two).
5. Save the password in your password manager. Supabase can reset it but never show it again.

## Step 2. Get the two connection strings

Open the project, then **Connect** (top of the dashboard), and choose the **ORM / Connection string** view. Copy two URLs and put your password in place of `[YOUR-PASSWORD]`:

| | Use it for | Looks like | Port |
|---|---|---|---|
| **Transaction pooler** | The app on Vercel (`DATABASE_URL` in Vercel) | `postgres://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres` | **6543** |
| **Session pooler** (or **Direct connection**) | Migrations, seed, backup and restore, from your computer | Session: same host as above but port **5432**. Direct: `postgres://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres` | **5432** |

Which one for migrations:
- **Direct connection** is the simplest, but it is IPv6-only unless you buy the IPv4 add-on. If your network cannot reach it ("could not translate host name" or a timeout), use the **session pooler** instead. It is IPv4 and behaves the same for our purposes.
- **Never run migrations through the transaction pooler.**

Add `?sslmode=require` to the end of both URLs to force an encrypted connection, for example:

```
postgres://postgres.abcdefgh:MyLongPassword123@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?sslmode=require
```

## Step 3. Make the three secrets

On your computer:

```sh
openssl rand -base64 32     # SESSION_SECRET (this gives 44 characters)
openssl rand -base64 24     # ADMIN_SECRET (32 characters; or choose a long passphrase)
```

Keep both in your password manager. `ADMIN_SECRET` is what you type to sign in as admin. Changing `SESSION_SECRET` later signs everyone out.

## Step 4. Create the tables and the household (once, from your computer)

Use the **session pooler or direct** URL here, not the transaction one.

```sh
# 1. a local .env must exist (copy .env.example). Its values are overridden below.
cp .env.example .env

# 2. create the tables
DATABASE_URL='<session or direct url>?sslmode=require' pnpm db:migrate

# 3. create the single household row (no --demo in production)
DATABASE_URL='<session or direct url>?sslmode=require' pnpm db:seed
```

You should see `Seed complete`. In Supabase, **Table Editor** now shows `household`, `member`, `wishlist`, `wishlist_item`, `guest`, `session` and the rest.

Run `pnpm db:migrate` again after any deploy that adds a migration (the next one after `0001_member_avatar`). Migrations are a deliberate step, never part of the deploy.

## Step 5. Lock the tables away from Supabase's public API

This app talks to Postgres directly. It does **not** use Supabase's REST API, but Supabase turns that API on by default, and the project's public "anon" key can read any table that has Row Level Security (RLS) off. The tables here hold guest names, who reserved what, and private notes, so close it.

Do **both** of these in the Supabase dashboard:

1. **Settings → API → Data API:** turn the Data API **off** if your plan lets you. Nothing in this app uses it.
2. **SQL Editor:** turn RLS on for every table, with no policies. The app connects as the `postgres` role, which bypasses RLS, so it keeps working; the public key then sees nothing.

```sql
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
```

Check it worked:

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';   -- every row should say true
```

Run the `do $$` block again after any migration that creates a new table.

## Step 6. Create the Vercel project

1. In Vercel choose **Add New → Project** and import the GitHub repository.
2. Framework: **Next.js** (detected). Package manager: **pnpm** (taken from `packageManager` in `package.json`). Leave the build and install commands on their defaults.
3. Open **Settings → Functions → Function Region** and choose the region next to your Supabase one (London `lhr1` for `eu-west-2`). Each page makes several queries, so keeping them close matters.

## Step 7. The values to add in Vercel

**Settings → Environment Variables.** Add exactly these three, with the environment **Production** ticked:

| Name | Value | Sensitive |
|---|---|---|
| `DATABASE_URL` | the **transaction pooler** URL (port **6543**) from step 2, with your password and `?sslmode=require` | Yes |
| `ADMIN_SECRET` | the value from step 3 | Yes |
| `SESSION_SECRET` | the value from step 3 | Yes |

Notes:
- **Preview deployments:** leave Preview **unticked** for `DATABASE_URL`. A preview that points at the production database lets anyone with a preview link change real data. Either leave previews without a database (they will fail to start, which is safe), or make a second Supabase project and give Preview its own `DATABASE_URL`, `ADMIN_SECRET` and `SESSION_SECRET`.
- **Do not add** Supabase's `anon` key, `service_role` key, project URL or JWT secret. The app does not use them, and the `service_role` key bypasses all protection.
- **Skip the Vercel–Supabase integration.** It adds `POSTGRES_*` and `SUPABASE_*` variables the app ignores. Using the three above keeps it clear what the app depends on.
- After changing any variable, **redeploy**; running deployments keep the old values.

## Step 8. Deploy and set up the family

1. Press **Deploy** (or push to the main branch).
2. Open `https://<your-domain>/admin/login` and sign in with `ADMIN_SECRET`.
3. On **Members**, add each family member (with an optional picture and a first PIN), then **Create a list** for each. The **Copy link** button gives each list's private address to share.
4. For anyone you left without a PIN, use **Set PIN**; the dialog also shows a sign-in link you can send them.

## Step 9. Check it all works

In a private browser window:

- `/` loads the family page and the members you added appear.
- Open a list link: you are sent to `/welcome`, enter a name, and land on the list. Reserve a gift.
- `/owner/login`: a member signs in with their PIN. A wrong PIN shows "Incorrect details or too many attempts."
- Browser dev tools → Application → Cookies: `fg_admin`, `fg_owner` and `fg_guest` (after you use each) are **HttpOnly** and **Secure**.
- Response headers on `/` include `X-Frame-Options: DENY`.
- In Supabase **Table Editor**, open `guest` or `item_claim`: you can see the reservation you just made. (This view uses your dashboard login, not the public key.)
- **RLS check:** in a terminal, `curl -s -H "apikey: <your anon key>" "https://<project-ref>.supabase.co/rest/v1/guest?select=*"` should return an error or `[]`, never rows.

## If something goes wrong

| Symptom | Likely cause and fix |
|---|---|
| Vercel build or page fails with an error about `DATABASE_URL`, `ADMIN_SECRET` or `SESSION_SECRET` | A variable is missing, or too short (admin 12, session 32), or only set for another environment. Fix it and **redeploy**. |
| Pages fail with "password authentication failed" | Wrong password in the URL, or a special character that was not URL-encoded. Reset the password in Supabase (Settings → Database) and update the URL. |
| Pages fail with "prepared statement does not exist", or intermittent errors under load | `DATABASE_URL` is the session or direct URL instead of the transaction pooler (port 6543). The app is built for 6543. |
| `pnpm db:migrate` hangs or says "could not translate host name" | The direct URL is IPv6-only. Use the session pooler (port 5432) URL instead. |
| `pnpm db:migrate` fails partway or says a relation already exists | A migration was run through the transaction pooler, or run twice by hand. Use the session or direct URL and check the `drizzle.__drizzle_migrations` table. |
| Everything fails after a quiet week | The free tier pauses a project after about a week of no activity. Press **Restore** in the Supabase dashboard, wait a minute or two. No data is lost. See `Runbook.md`. |
| You can sign in to admin locally but not on Vercel | The Vercel `ADMIN_SECRET` differs from your `.env`. Check for stray spaces or quotes when pasting. |
| Everyone was signed out | `SESSION_SECRET` changed. That is expected, and people simply sign in again. |

## Keeping it healthy

- Back up before every migration and after the family has finished adding gifts: `scripts/backup.sh` (use the **direct or session** URL). Details and a restore test are in `Runbook.md`.
- Run `scripts/cleanup.sh` every few months to clear finished sessions and throttle rows.
- Rotate the database password in Supabase if it is ever exposed, then update `DATABASE_URL` in Vercel and redeploy.
- Never commit `.env`.

## Not checked

This guide has not been tested against a real Supabase project or a real Vercel deployment. In particular, confirm: the exact labels in the Supabase **Connect** panel (they change), that the free tier allows turning the Data API off, that `?sslmode=require` is accepted as written, and that Vercel's preview behaviour matches the note in step 7.
