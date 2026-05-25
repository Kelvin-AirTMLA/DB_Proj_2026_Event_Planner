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

write_sync_marker() {
  local path="$1"
  local main_sha
  main_sha="$(git rev-parse --short main)"
  printf '%s\n' \
    "# Updated by scripts/sync_branches_from_main.sh — do not edit by hand." \
    "main_commit=${main_sha}" \
    "synced_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    >"$path"
}

prune_junk() {
  find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
  find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
  find . -name .DS_Store -delete 2>/dev/null || true
  find . -type f \( -name '* 2.*' -o -name '* 3.*' \) \
    ! -path './.git/*' ! -path './backend/.venv/*' ! -path './.venv/*' \
    ! -path './frontend/node_modules/*' -delete 2>/dev/null || true
}

sync_db_schema() {
  git checkout db_schema
  git checkout main -- schema/ queries/ docs/ README.md scripts/bootstrap_remote_db.sh scripts/cleanup_repo.sh
  write_sync_marker .sync-from-main
  prune_junk
  git add schema/ queries/ docs/ README.md scripts/bootstrap_remote_db.sh scripts/cleanup_repo.sh .sync-from-main
  if git diff --cached --quiet; then
    echo "db_schema: no file changes vs main."
  else
    git commit -m "Sync schema, queries, and docs from main ($(git rev-parse --short main))."
    echo "db_schema: committed updates from main."
  fi
}

sync_backend() {
  git checkout backend
  git checkout main -- backend/ render.yaml docs/ README.md
  write_sync_marker backend/.sync-from-main
  prune_junk
  git rm -r --cached backend/app/__pycache__ backend/.DS_Store 2>/dev/null || true
  git add backend/ render.yaml docs/ README.md backend/.sync-from-main
  if git diff --cached --quiet; then
    echo "backend: no file changes vs main."
  else
    git commit -m "Sync backend, render.yaml, and docs from main ($(git rev-parse --short main))."
    echo "backend: committed updates from main."
  fi
}

sync_frontend() {
  git checkout frontend
  git checkout main -- frontend/ docs/ README.md
  write_sync_marker frontend/.sync-from-main
  prune_junk
  git rm -r --cached frontend/node_modules 2>/dev/null || true
  git add frontend/ docs/ README.md frontend/.sync-from-main
  if git diff --cached --quiet; then
    echo "frontend: no file changes vs main."
  else
    git commit -m "Sync frontend and docs from main ($(git rev-parse --short main))."
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
