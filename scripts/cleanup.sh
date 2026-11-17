#!/usr/bin/env bash
# Deletes what only ever piles up: sessions that expired or were revoked over 30 days ago, revoked recovery links older than that,
# and throttle counters whose window and block have passed. Safe to run any time; run it now and then (see the Runbook).
. "$(dirname "$0")/_env.sh"
: "${DATABASE_URL:?DATABASE_URL is not set}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "delete from session where expires_at < now() - interval '30 days' or revoked_at < now() - interval '30 days'" \
  -c "delete from recovery_token where revoked_at < now() - interval '30 days'" \
  -c "delete from auth_limit where window_start < now() - interval '1 day' and (blocked_until is null or blocked_until < now())"
