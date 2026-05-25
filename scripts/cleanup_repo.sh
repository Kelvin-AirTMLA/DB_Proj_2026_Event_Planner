#!/usr/bin/env bash
# Remove macOS duplicate files, caches, and other local junk (safe to re-run).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
find . -name .DS_Store -delete 2>/dev/null || true
rm -rf backend/my_env 2>/dev/null || true
find . -type f \( -name '* 2.*' -o -name '* 3.*' \) \
  ! -path './.git/*' ! -path './backend/.venv/*' ! -path './.venv/*' \
  ! -path './frontend/node_modules/*' -print -delete 2>/dev/null || true

echo "Cleanup done (macOS copies, caches, my_env). Use backend/.venv for Python."
