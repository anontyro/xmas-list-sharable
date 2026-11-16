# Sourced by the other scripts: loads .env when DATABASE_URL isn't already set, so a value passed on the command line wins.
set -euo pipefail
if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then set -a; . ./.env; set +a; fi
