#!/usr/bin/env bash
# Apply schema + seed to a remote Postgres (Render, Neon, Supabase, etc.)
# Usage: DATABASE_URL='postgresql://...' ./scripts/bootstrap_remote_db.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Set DATABASE_URL to your hosted Postgres connection string." >&2
  exit 1
fi

URL="${DATABASE_URL/postgres:\/\//postgresql:\/\/}"

echo "Applying DDL..."
psql "$URL" -f "$ROOT/schema/01_ddl.sql"
echo "Applying seed..."
psql "$URL" -f "$ROOT/schema/02_seed.sql"
echo "Done. Demo logins: guest alex.m@student.edu / organizer hello@nlevents.eu — password demo123"
