#!/usr/bin/env bash
# Writes a timestamped custom-format dump of DATABASE_URL to backups/ (or $BACKUP_DIR) and prints its path.
. "$(dirname "$0")/_env.sh"
: "${DATABASE_URL:?DATABASE_URL is not set}"
dir="${BACKUP_DIR:-backups}"
mkdir -p "$dir"
out="$dir/family-gifts-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --format=custom --no-owner --no-privileges --file "$out" "$DATABASE_URL"
echo "$out"
