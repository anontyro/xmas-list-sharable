#!/usr/bin/env bash
# Usage: scripts/row-counts.sh <database-url>   Prints "table count" for every table, for comparing a backup with its restore.
set -euo pipefail
psql "${1:?usage: row-counts.sh <database-url>}" -tAF ' ' -c "
  select table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text
  from information_schema.tables where table_schema in ('public','drizzle') and table_type = 'BASE TABLE' order by 1"
