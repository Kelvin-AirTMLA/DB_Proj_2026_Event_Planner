#!/usr/bin/env bash
# Copy your slice-branch work into main (paths only — no git merge).
#
# Work on db_schema / backend / frontend / docs, commit there, then:
#   git checkout main
#   ./scripts/integrate_slice_to_main.sh docs
#   ./scripts/sync_branches_from_main.sh    # refresh every slice from main
#
# Usage:
#   ./scripts/integrate_slice_to_main.sh <db_schema|backend|frontend|docs>

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SLICE="${1:-}"
if [[ -z "$SLICE" ]]; then
  echo "Usage: $0 <db_schema|backend|frontend|docs>" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Commit or stash changes on the current branch first." >&2
  git status -sb
  exit 1
fi

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Checkout main first, then run this script." >&2
  exit 1
fi

if ! git rev-parse --verify "$SLICE" &>/dev/null; then
  echo "Local branch '$SLICE' not found." >&2
  exit 1
fi

SLICE_SHA="$(git rev-parse --short "$SLICE")"

integrate_paths() {
  git checkout "$SLICE" -- "$@"
}

case "$SLICE" in
  db_schema)
    integrate_paths \
      schema/ queries/ docs/ README.md \
      scripts/bootstrap_remote_db.sh scripts/cleanup_repo.sh
    ;;
  backend)
    integrate_paths backend/ render.yaml docs/ README.md
    ;;
  frontend)
    integrate_paths frontend/ docs/ README.md
    ;;
  docs)
    integrate_paths docs/ README.md
    ;;
  *)
    echo "Unknown slice: $SLICE (use db_schema, backend, frontend, or docs)" >&2
    exit 1
    ;;
esac

git add -A
if git diff --cached --quiet; then
  echo "No changes to integrate from $SLICE ($SLICE_SHA) — main already matches those paths."
  exit 0
fi

git commit -m "Integrate ${SLICE} slice into main (${SLICE_SHA})."
echo ""
echo "Integrated $SLICE → main. Next, refresh all slice branches:"
echo "  ./scripts/sync_branches_from_main.sh"
echo "  git push origin main"
echo "  git push --force-with-lease origin db_schema backend frontend docs"
