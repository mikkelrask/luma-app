# luma

Lumafilm's internal DIT pipeline — a desktop app for managing productions, ingesting
card media, transcoding, and generating delivery reports. It is a native macOS app
built with Tauri 2, a React frontend, and a Python CLI ("luma") bundled as a Rust
sidecar process.

## Features

- **Productions** — scaffold a consistent structure for every show (Dashboard, Create).
- **Card ingest** — discover volumes, match source media, sync with MD5 verification,
  and produce a PDF report with start/mid/end thumbnails and an explicit failure section.
- **Transcoding** — ffmpeg-based delivery profiles (ProRes, H.264, MXF/OP-Atom, ...)
  with reusable visual transforms (letterbox, zoom) and preset timecode handling.
- **Reports** — regenerate ingest PDF and JSON reports at any time without re-indexing media.
- **Profiles & config** — manage technical standards and paths from wizards in the app
  (no manual INI editing needed).
- **Background jobs** — long-running work executes in a bundled Python sidecar that
  streams progress as newline-delimited JSON; a job panel shows live logs and a debug
  console for inspecting every event.

## Install (Apple Silicon only)

The app is distributed unsigned, so macOS Gatekeeper can flag it as "damaged" if the
quarantine attribute survives. Homebrew installs handle this automatically.

```bash
brew tap mikkelrask/luma
brew install --cask mikkelrask/luma/luma
```

If macOS ever reports the app as damaged, clear the quarantine flag once:

```bash
xattr -cr /Applications/luma.app
```

You can also download the `.zip`/`.dmg` directly from the latest
[GitHub Release](https://github.com/mikkelrask/luma-app/releases) — run the same
`xattr -cr` after copying the app into `/Applications` if Gatekeeper blocks first
launch.

## Architecture

| Layer     | Tech                                                                  |
|-----------|-----------------------------------------------------------------------|
| Frontend  | React 19, Vite, TypeScript, Tailwind CSS 4, Radix/shadcn-style UI |
| Shell     | Tauri 2 (Rust). Sidecar process management, dialogs, notifications     |
| Backend   | `luma` Python CLI (`luma-backend` submodule): argparse, rich, questionary, weasyprint, ffmpeg |

At runtime the Rust layer spawns the sidecar (`luma-sidecar --progress-json`), parses
its stdout line-by-line on the frontend side, and registers each invocation under a
job token. Jobs can be cancelled (child process killed), and orphaned jobs are
cleaned up on app relaunch.
The Python sidecar is bundled with PyInstaller, so the shipped app does not require a
system Python, ffmpeg, or weasyprint/GTK libraries.

## Repository layout

```
├── src/                  # React frontend (pages: Dashboard, Create, Ingest,
│                         #   Transcode, Reports, Profiles, Config)
│   └── lib/              # sidecar job client, productions, notifications
├── src-tauri/            # Tauri 2 shell (Rust)
│   ├── src/lib.rs        # sidecar spawn/kill commands, event streaming
│   ├── build.rs          # stages the onedir payload next to the dev sidecar
│   └── binaries/         # built sidecar launcher + _internal payload
├── luma-backend/         # git submodule — the luma Python CLI
└── .github/workflows/    # CI build & release pipeline
```

> Both `package-lock.json` (used by CI and docs here) and `pnpm-lock.yaml` are tracked
> in the repo; CI installs with npm.

## Requirements (macOS)

- Apple Silicon Mac — Intel build targets have been dropped (GitHub's hosted
  `macos-13` runners are being retired).
- [Node.js](https://nodejs.org/) 22+ and npm
- [Rust](https://rustup.rs/) stable toolchain
- [uv](https://docs.astral.sh/uv/) for the Python backend
- [Homebrew](https://brew.sh/), then `brew install pango gdk-pixbuf`
  (weasyprint system libraries)
- Static `ffmpeg` / `ffprobe` binaries (the build uses
  [evermeet.cx](https://evermeet.cx/ffmpeg/))

## Build the sidecar

The backend lives in the `luma-backend` git submodule:

```bash
git submodule update --init --recursive
cd luma-backend
uv sync --frozen
uv pip install pyinstaller
brew install pango gdk-pixbuf

# static ffmpeg/ffprobe for bundling
mkdir -p /tmp/ffbin
for b in ffmpeg ffprobe; do
  curl -fsSL "https://evermeet.cx/ffmpeg/getrelease/$b/zip" -o "/tmp/ffbin/$b.zip"
  unzip -oq "/tmp/ffbin/$b.zip" -d /tmp/ffbin
done

./build_macos.sh arm64
cd ..
```

This runs PyInstaller and places `luma-sidecar-aarch64-apple-darwin` plus its
`_internal` payload under `src-tauri/binaries/`. The sidecar and payload must match
the target architecture — rebuild after any backend change.

## Develop

```bash
npm install
npm run tauri dev        # Tauri window + hot-reloaded frontend (sidecar available)
```

Frontend-only workflows (`npm run dev`, `npm run build`) work in a plain browser but
have no sidecar, so be careful with job-driven pages there. The debug console can be
enabled with the `VITE_LUMA_DEBUG=true` environment variable or `luma.debug=1` in
`localStorage`.

## Build a release bundle manually

```bash
npm run tauri build
```

This produces an (ad-hoc signed) `luma.app` in `src-tauri/target/release/bundle/`.
If you package the app by hand, remember that the PyInstaller onedir bootloader
resolves its payload from `Contents/Frameworks` when run inside a `.app`, so copy the
`_internal` payload there — see the CI "Inject sidecar payload" step.

## Continuous integration & releases

`.github/workflows/build.yml` runs on pushes to `main`, pull requests, and
`workflow_dispatch`. It builds the sidecar and the Tauri bundle on an Apple Silicon
runner, injects the payload into the app bundle, ad-hoc signs the sidecar launcher,
and uploads `luma-darwin-arm64.dmg`/`.zip` as build artifacts. Pushing a `v*` tag
drafts a GitHub Release from those artifacts.

The workflow pins the `luma-backend` submodule at a specific commit and reads it via
the private-repo URL — update the pinned submodule revision when you change the
backend, and make sure the backend commits are pushed before relying on CI.

Release binaries are rolled out through the [homebrew-luma tap](https://github.com/mikkelrask/homebrew-luma)
(`mikkelrask/luma/luma`). A `release` workflow downloads the release's
`luma-darwin-arm64.zip`, recomputes its sha256, and bumps the cask's `version` and
`sha256` automatically. It needs a `TAP_PAT` secret (a fine-grained PAT with read/write
contents access on the tap repo) configured on this repository; until then it skips
with a warning and the cask has to be updated by hand.

To cut a new release:

```bash
npm run release -- minor   # patch | minor | major
```

## Contributing

- Branch from `main` and open a pull request; CI runs for every PR.
- **Backend** (`luma-backend`): follow `luma-backend/AGENTS.md`. Run
  `ruff check .`, `ruff format .`, `mypy luma/`, and `pytest`.
- **Frontend**: keep TypeScript strict and type-safe (`npm run build` runs `tsc`);
  prefer the existing Radix-based `src/components/ui` components over new ad-hoc ones.
- **Sidecar protocol**: keep the NDJSON progress/event contract stable, or version it —
  both the Rust spawner (`src-tauri/src/lib.rs`) and the frontend client
  (`src/lib/luma.ts`, `src/lib/useLumaJob.ts`) depend on it.
- Never instruct users to edit `config.ini` / `profiles.ini` by hand — always point
  them at `luma config` / `luma profiles` / the in-app Config page.