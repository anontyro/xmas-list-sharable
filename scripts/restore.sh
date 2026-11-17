#!/usr/bin/env bash
# Usage: scripts/restore.sh <dump-file> <target-database-url>
# Restores into an EMPTY database and refuses anything that already has tables, so it can never overwrite live data.
set -euo pipefail
dump="${1:?usage: restore.sh <dump-file> <target-database-url>}"
target="${2:?usage: restore.sh <dump-file> <target-database-url>}"
[ -f "$dump" ] || { echo "No such dump file: $dump" >&2; exit 1; }
tables=$(psql "$target" -tAc "select count(*) from information_schema.tables where table_schema in ('public','drizzle')")
if [ "$tables" != "0" ]; then
  echo "Refusing to restore: the target database already has $tables tables. Use a new, empty database." >&2
  exit 1
fi
pg_restore --no-owner --no-privileges --exit-on-error --dbname "$target" "$dump"
echo "Restored $dump"
