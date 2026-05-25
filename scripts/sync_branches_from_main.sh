#!/usr/bin/env bash
# Rebuild slice branches from main (reset + prune paths). Keeps slices 0 behind main.
# Do NOT "git merge main" on slice branches — use this script instead.
#
# Slice branches are mirrors for grading/review. They must NOT use GitHub PRs into main
# (merging a slice PR would delete backend/frontend/schema from main).
#
# Usage (from repo root, clean working tree on main):
#   ./scripts/sync_branches_from_main.sh
#   ./scripts/sync_branches_from_main.sh db_schema

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

MAIN_SHA="$(git rev-parse --short main)"

write_sync_marker() {
  local path="$1"
  printf '%s\n' \
    "# Updated by scripts/sync_branches_from_main.sh — do not edit by hand." \
    "main_commit=${MAIN_SHA}" \
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

# Remove tracked paths if present (after reset --hard main).
git_rm_if_present() {
  for path in "$@"; do
    if git ls-files --error-unmatch "$path" &>/dev/null; then
      git rm -rf "$path"
    elif [[ -e "$path" ]]; then
      rm -rf "$path"
      git add -A
    fi
  done
}

commit_slice() {
  local label="$1"
  write_sync_marker "$2"
  git add -A
  if git diff --cached --quiet; then
    echo "${label}: tree already matches slice (no new commit)."
  else
    git commit -m "Slice ${label} synced from main (${MAIN_SHA})."
    echo "${label}: committed slice on top of main."
  fi
}

sync_db_schema() {
  git checkout db_schema
  git reset --hard main
  prune_junk
  git_rm_if_present \
    AGENTS.md backend frontend render.yaml \
    scripts/sync_branches_from_main.sh scripts/export_presentation.sh
  commit_slice db_schema .sync-from-main
}

sync_backend() {
  git checkout backend
  git reset --hard main
  prune_junk
  git_rm_if_present \
    AGENTS.md frontend schema queries scripts render.yaml
  commit_slice backend backend/.sync-from-main
}

sync_frontend() {
  git checkout frontend
  git reset --hard main
  prune_junk
  git rm -r --cached frontend/node_modules 2>/dev/null || true
  git_rm_if_present \
    AGENTS.md backend schema queries scripts render.yaml
  commit_slice frontend frontend/.sync-from-main
}

sync_docs() {
  git checkout docs
  git reset --hard main
  prune_junk
  git_rm_if_present \
    AGENTS.md backend frontend schema queries scripts render.yaml
  commit_slice docs .sync-from-main
}

TARGET="${1:-all}"

case "$TARGET" in
  db_schema) sync_db_schema ;;
  backend) sync_backend ;;
  frontend) sync_frontend ;;
  docs) sync_docs ;;
  all)
    sync_db_schema
    sync_backend
    sync_frontend
    sync_docs
    ;;
  *)
    echo "Unknown target: $TARGET (use db_schema, backend, frontend, docs, or all)" >&2
    exit 1
    ;;
esac

git checkout main
echo ""
echo "Done. Slice branches are 0 commits behind main (1 slice commit ahead)."
echo "Push (slice branches need --force-with-lease after history rewrite):"
echo "  git push origin main"
echo "  git push --force-with-lease origin db_schema backend frontend docs"
