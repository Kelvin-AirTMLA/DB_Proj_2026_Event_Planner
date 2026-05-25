#!/usr/bin/env bash
# Export docs/DEFENSE_PRESENTATION.md → PDF + HTML via Marp CLI
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/docs/DEFENSE_PRESENTATION.md"

if ! command -v marp >/dev/null 2>&1; then
  echo "Install Marp CLI: brew install marp-cli" >&2
  echo "Or: npm install -g @marp-team/marp-cli" >&2
  exit 1
fi

marp "$SRC" --no-stdin --allow-local-files \
  -o "$ROOT/docs/DEFENSE_PRESENTATION.pdf"
marp "$SRC" --no-stdin --allow-local-files \
  -o "$ROOT/docs/DEFENSE_PRESENTATION.html"

echo "Wrote:"
echo "  docs/DEFENSE_PRESENTATION.pdf"
echo "  docs/DEFENSE_PRESENTATION.html"
