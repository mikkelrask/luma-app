#!/usr/bin/env bash
# Creates a v* release tag for the luma app, keeping every version field in sync.
#
# Usage:
#   ./scripts/tag-release.sh                     tag the current version (no bump)
#   ./scripts/tag-release.sh patch               bump patch level and tag
#   ./scripts/tag-release.sh minor               bump minor level and tag
#   ./scripts/tag-release.sh major               bump major level and tag
#   ./scripts/tag-release.sh 0.2.0              set an explicit version and tag
#   ./scripts/tag-release.sh patch --dry-run     show what would happen
#   ./scripts/tag-release.sh --watch             also gh run watch the CI build
#
# Version sources kept in sync:
#   package.json / package-lock.json   (via npm version --no-git-tag-version)
#   src-tauri/tauri.conf.json          (node edit)
#   src-tauri/Cargo.toml [package]     (node edit)
#   src-tauri/Cargo.lock               (cargo update -w)
#
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

WATCH=0
DRY_RUN=0
BUMPSPEC=
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --watch) WATCH=1 ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) BUMPSPEC="$arg" ;;
  esac
done

log() { printf '\033[1;36m%s\033[0m\n' "$*"; }
die() { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# --- preflight -------------------------------------------------------------
command -v npm  >/dev/null || die "npm not found"
command -v node >/dev/null || die "node not found"
command -v cargo >/dev/null || die "cargo not found"

[[ "$(git branch --show-current)" == "main" ]] || die "run this on the main branch"
[[ -z "$(git status --porcelain)" ]] || die "working tree is not clean; commit or stash first"
git fetch origin main >/dev/null 2>&1 || true
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] || die "local main is not up to date with origin/main"

CUR_VER="$(node -p "require('./package.json').version")"

case "$BUMPSPEC" in
  "") NEW_VER="$CUR_VER" ;;
  patch|minor|major)
    NEW_VER="$(node -e '
      const [maj, min, pat] = process.argv[1].split(".").map(Number);
      const kind = process.argv[2];
      const next = kind === "major" ? [maj + 1, 0, 0]
                 : kind === "minor" ? [maj, min + 1, 0]
                 : [maj, min, pat + 1];
      console.log(next.join("."));
    ' "$CUR_VER" "$BUMPSPEC")"
    ;;
  *)
    [[ "$BUMPSPEC" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "invalid version spec: '$BUMPSPEC'"
    NEW_VER="$BUMPSPEC"
    ;;
esac

TAG="v$NEW_VER"
git rev-parse "$TAG" >/dev/null 2>&1 && die "tag $TAG already exists"

log "tagging  $TAG  (current version: $CUR_VER)"

run() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "  [dry-run] $*"
  else
    printf '\033[1;35m$ %s\033[0m\n' "$*" >&2
    "$@"
  fi
}

if [[ "$NEW_VER" != "$CUR_VER" ]]; then
  # npm bumps package.json + package-lock.json (--no-git-tag-version so it
  # does not tag on its own).
  run npm version "$NEW_VER" --no-git-tag-version
  run node -e '
    const fs = require("fs");
    const ver = process.argv[1];
    const conf = JSON.parse(fs.readFileSync("src-tauri/tauri.conf.json", "utf8"));
    conf.version = ver;
    fs.writeFileSync("src-tauri/tauri.conf.json", JSON.stringify(conf, null, 2) + "\n");
    let toml = fs.readFileSync("src-tauri/Cargo.toml", "utf8");
    toml = toml.replace(/^(\[package\][\s\S]*?^version = ")[\d.]+(?=")/m, "$1" + ver);
    fs.writeFileSync("src-tauri/Cargo.toml", toml);
  ' "$NEW_VER"
  run cargo update -w --manifest-path src-tauri/Cargo.toml
fi

run git add -A
if [[ -n "$(git diff --cached --name-only)" ]]; then
  run git commit -q -m "release: $TAG"
fi
run git tag "$TAG"
run git push -q origin main
run git push -q origin "$TAG"

if [[ "$WATCH" == "1" && "$DRY_RUN" == "0" ]]; then
  log "watching CI build for $TAG..."
  sleep 6
  RUN_ID="$(gh run list --branch "$TAG" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
  if [[ -z "$RUN_ID" ]]; then
    RUN_ID="$(gh run list --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
  fi
  if [[ -n "$RUN_ID" ]]; then
    gh run watch "$RUN_ID" --exit-status -i 20 || true
  else
    log "could not find the triggered run; check: gh run list"
  fi
fi

log "done: $TAG"