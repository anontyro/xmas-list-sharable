import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

const WINDOW = "15 minutes";

/** The one message for every failed or blocked login, so nothing leaks about which part was wrong. */
export const LOGIN_FAILED_MESSAGE = "Incorrect details or too many attempts. Try again later.";

/** True while the key is blocked. */
export async function isBlocked(key: string): Promise<boolean> {
  const rows = await getDb().execute<{ blocked: boolean }>(
    sql`select exists(select 1 from auth_limit where subject_key = ${key} and blocked_until > now()) as blocked`,
  );
  return rows[0].blocked;
}

/**
 * Counts one failure in a single atomic statement, so parallel requests cannot lose updates.
 * The `limit`th failure inside a 15 minute window blocks the key for 15 minutes.
 */
export async function recordFailure(key: string, limit = 5): Promise<void> {
  await getDb().execute(sql`
    insert into auth_limit (subject_key, window_start, attempt_count)
    values (${key}, now(), 1)
    on conflict (subject_key) do update set
      attempt_count = case when auth_limit.window_start < now() - interval '${sql.raw(WINDOW)}'
                           then 1 else auth_limit.attempt_count + 1 end,
      window_start = case when auth_limit.window_start < now() - interval '${sql.raw(WINDOW)}'
                          then now() else auth_limit.window_start end,
      blocked_until = case when (case when auth_limit.window_start < now() - interval '${sql.raw(WINDOW)}'
                                      then 1 else auth_limit.attempt_count + 1 end) >= ${limit}
                           then now() + interval '${sql.raw(WINDOW)}' else auth_limit.blocked_until end
  `);
}

export async function clearFailures(key: string): Promise<void> {
  await getDb().execute(sql`delete from auth_limit where subject_key = ${key}`);
}
