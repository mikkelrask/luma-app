#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# These paths contain generated build output or installed dependencies only.
clean_paths=(
  node_modules
  dist
  dist-ssr
  src-tauri/target
  src-tauri/binaries
  luma-backend/.venv
  luma-backend/build
  luma-backend/dist
)

for path in "${clean_paths[@]}"; do
  if [[ -e "$path" || -L "$path" ]]; then
    rm -rf -- "$path"
    printf 'Removed %s\n' "$path"
  fi
done

printf 'Clean complete. Rebuild with npm run setup.\n'
