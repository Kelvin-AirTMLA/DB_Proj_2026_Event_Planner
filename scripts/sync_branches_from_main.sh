#!/usr/bin/env bash
# Copy latest slices from main into db_schema / backend / frontend branches.
# Do NOT use "git merge main" on those branches — it causes modify/delete conflicts.
#
# Usage (from repo root, with a clean working tree on main):
#   ./scripts/sync_branches_from_main.sh
#   ./scripts/sync_branches_from_main.sh db_schema   # one branch only

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Commit or stash changes on the current branch first." >&2
  git status -sb
  exit 1
fi

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Checkout main first, then run this script." >&2
  exit 1
fi

sync_db_schema() {
  git checkout db_schema
  git checkout main -- schema/ queries/
  if git diff --cached --quiet; then
    echo "db_schema: already up to date with main (schema + queries)."
  else
    git commit -m "Sync schema and queries from main."
    echo "db_schema: committed updates from main."
  fi
}

sync_backend() {
  git checkout backend
  git checkout main -- backend/ render.yaml
  if git diff --cached --quiet; then
    echo "backend: already up to date with main."
  else
    git commit -m "Sync backend and render.yaml from main."
    echo "backend: committed updates from main."
  fi
}

sync_frontend() {
  git checkout frontend
  git checkout main -- frontend/
  if git diff --cached --quiet; then
    echo "frontend: already up to date with main."
  else
    git commit -m "Sync frontend from main."
    echo "frontend: committed updates from main."
  fi
}

TARGET="${1:-all}"

case "$TARGET" in
  db_schema) sync_db_schema ;;
  backend) sync_backend ;;
  frontend) sync_frontend ;;
  all)
    sync_db_schema
    sync_backend
    sync_frontend
    ;;
  *)
    echo "Unknown target: $TARGET (use db_schema, backend, frontend, or all)" >&2
    exit 1
    ;;
esac

git checkout main
echo "Done. On main. Push with: git push origin db_schema backend frontend"
