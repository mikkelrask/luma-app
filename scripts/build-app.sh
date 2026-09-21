#!/usr/bin/env bash
# One-command local build for the luma app: ensures the luma-backend submodule
# is pulled to the commit this checkout expects, builds the PyInstaller sidecar,
# and then either packages or runs the Tauri app.
#
# Usage:
#   ./scripts/build-app.sh                     build backend sidecar + tauri build
#   ./scripts/build-app.sh dev                 build backend sidecar + tauri dev
#   ./scripts/build-app.sh backend             build the sidecar only
#   ./scripts/build-app.sh app                 tauri build only (sidecar already built)
#   ./scripts/build-app.sh --pull-backend      also fetch the latest backend from origin
#   ./scripts/build-app.sh --arch x86_64       build for a different target arch
#   ./scripts/build-app.sh --help
#
# Notes:
#   - The sidecar is built from the submodule's current tree. The backend is
#     only synchronized to the pinned commit when it has no local changes, so
#     in-progress backend edits are never clobbered.
#   - "--pull-backend" checks out the backend's main branch and fast-forwards it
#     to origin. This diverges from the commit pinned by this repo (which the
#     app was built/tested against), so it is opt-in.
#   - Requires: uv, rust (cargo/rustc), npm, and ffmpeg/ffprobe (see README).
#
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

log() { printf '\033[1;36m%s\033[0m\n' "$*"; }
step() { printf '\033[1;35m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

MODE="build"
PULL_BACKEND=0
ARCH="arm64"

for arg in "$@"; do
  case "$arg" in
    dev) MODE="dev" ;;
    backend) MODE="backend" ;;
    app) MODE="app" ;;
    --pull-backend) PULL_BACKEND=1 ;;
    --arch) die "--arch requires an argument (arm64|x86_64|both)" ;;
    --arch=*) ARCH="${arg#--arch=}" ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    -*) die "unknown option: $arg" ;;
    *) die "unknown command: $arg" ;;
  esac
done

case "$ARCH" in
  arm64|x86_64|both) ;;
  *) die "invalid --arch '$ARCH' (expected arm64|x86_64|both)" ;;
esac

# --- preflight -------------------------------------------------------------
command -v git >/dev/null   || die "git not found"
command -v node >/dev/null  || die "node not found"
command -v npm  >/dev/null  || die "npm not found"
command -v uv   >/dev/null  || die "uv not found (brew install uv)"
command -v cargo >/dev/null || die "cargo not found (rustup)"
command -v rustc >/dev/null || die "rustc not found (rustup)"

# --- backend: pull ---------------------------------------------------------
ensure_backend() {
  step "backend: ensuring luma-backend submodule is pulled"

  # A submodule's git metadata lives in a `.git` *file* (gitlink into the
  # parent's .git/modules), so test for existence, not directory-ness.
  if [[ ! -e luma-backend/.git ]]; then
    log "initializing backend submodule (luma-backend)..."
    git submodule update --init --recursive
  elif [[ -n "$(git -C luma-backend status --porcelain)" ]]; then
    # The sidecar is always built from the submodule's CURRENT tree, so never
    # reset it underneath an in-progress backend edit.
    log "backend has local changes — leaving as-is (building from current tree)"
  else
    log "syncing backend to the commit pinned by this checkout..."
    git submodule update --recursive
  fi

  log "backend at: $(git -C luma-backend rev-parse --short HEAD)"

  if [[ "$PULL_BACKEND" == "1" ]] && [[ -z "$(git -C luma-backend status --porcelain)" ]]; then
    log "pulling latest backend from origin/main (--pull-backend)..."
    git -C luma-backend fetch origin
    git -C luma-backend checkout -B main origin/main 2>/dev/null || git -C luma-backend checkout main >/dev/null 2>&1 || true
    git -C luma-backend pull --ff-only >/dev/null 2>&1 || true
  fi
}

# --- backend: build --------------------------------------------------------
build_backend() {
  ensure_backend

  # Static ffmpeg/ffprobe are bundled into the sidecar.
  if [[ -z "${FFMPEG_DIR:-}" ]]; then
    if command -v ffmpeg >/dev/null; then
      FFMPEG_DIR="$(dirname "$(command -v ffmpeg)")"
      command -v ffprobe >/dev/null || die "ffprobe not found (expected next to ffmpeg)"
    else
      die "ffmpeg/ffprobe not found. Install e.g. 'brew install ffmpeg' or set FFMPEG_DIR=/path/to/static/binaries"
    fi
  fi
  export FFMPEG_DIR

  step "backend: syncing Python deps (uv sync)"
  if ! (cd luma-backend && uv sync --frozen); then
    log "uv sync --frozen failed (lockfile out of date?) — retrying with a plain 'uv sync'"
    (cd luma-backend && uv sync)
  fi

  step "backend: ensuring pyinstaller"
  (cd luma-backend && uv pip install pyinstaller >/dev/null)

  step "backend: building luma-sidecar ($ARCH)"
  export PATH="$PWD/luma-backend/.venv/bin:$PATH"
  (cd luma-backend && ./build_macos.sh "$ARCH")

  if [[ -f "src-tauri/binaries/luma-sidecar-aarch64-apple-darwin" ]]; then
    log "sidecar smoke test:"
    "src-tauri/binaries/luma-sidecar-aarch64-apple-darwin" --json profiles list >/dev/null || \
      die "built sidecar failed to run — rebuild the backend (see README)"
  fi
}

# --- app -------------------------------------------------------------------
preflight_app() {
  [[ -d node_modules ]] || { step "installing npm dependencies"; npm install; }
}

run_app() {
  preflight_app
  if [[ "$MODE" == "dev" ]]; then
    step "app: tauri dev (backend sidecar available)"
    npm run tauri dev
  else
    step "app: tauri build"
    npm run tauri build
  fi
}

case "$MODE" in
  backend) build_backend ;;
  app) ensure_backend; preflight_app; run_app ;;
  *) build_backend; run_app ;;
esac

log "done. Artifacts: src-tauri/binaries/ and src-tauri/target/"