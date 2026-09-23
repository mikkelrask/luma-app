# Agent Guidelines for luma-app

Guidelines for agentic coding agents working on the luma desktop app. Read
[`README.md`](./README.md) for the product overview and
[`luma-backend/AGENTS.md`](./luma-backend/AGENTS.md) for backend CLI conventions,
because the frozen `luma` CLI is the only backend surface the app talks to.

## Repo layout — it's really two repos

- **This repo** (`mikkelrask/luma-app`): Tauri 2 shell (`src-tauri/`) + React/TS
  frontend (`src/`), GitHub Actions CI, release scripts.
- **`luma-backend/`** is a **git submodule** (remote `techmikkel/luma-cli`): the
  Python `luma` CLI. Its shas are pinned by this repo. The thing users run is a
  PyInstaller-frozen build of this CLI, so a backend commit only reaches users
  once: (1) it's pushed to the backend remote, (2) the submodule pointer in this
  repo is bumped to it, and (3) CI rebuilds the sidecar from that pinned commit.

## Working protocol (how features actually get built here)

1. **Ticket-driven, in this repo.** The user asks for "tickets" → create GitHub
   issues first (`gh issue create` in `mikkelrask/luma-app`). Issue bodies split
   backend vs frontend scope, cite exact file/line locations, and state
   acceptance criteria. Work that lands later references the issue number
   (commit message / PR title).
2. **Backend first.** Implement CLI behavior in `luma-backend/`, verify it in
   frozen form (see below), push the backend, then bump the pinned commit in the
   parent and update the frontend.
3. **Frontend next.** `npm run build` (runs `tsc`) must be green before commit.
4. **Commit + push.** The user stages changes themselves and asks for the commit.
   Always rebase onto `origin/main` (or rebase the branch) before pushing —
   direct pushes are rejected otherwise. Never force-push.
5. **Never edit INI by hand** (`config.ini`, `profiles.ini`, production INIs):
   always route through `luma config` / `luma profiles` / `luma create` / the
   in-app pages.
6. Close an issue only after its acceptance criteria are proven (usually by the
   merged PR that implements it).

## Sidecar plumbing (what you'd otherwise get wrong)

- Frontend → Rust → CLI: `runLuma(args, progress)` (`src/lib/luma.ts`) invokes
  Tauri's `run_luma` (`src-tauri/src/lib.rs`), which spawns the bundled
  `luma-sidecar` with `--json` or `--progress-json` **injected before the
  subcommand** (build_argv). Do NOT pass those flags yourself. Rust parses each
  stdout line: JSON lines → `luma://job` events; non-JSON → `luma://log`; exit →
  `luma://terminated` then `luma://exit`. Progress UI uses `useLumaJob`
  (`src/lib/useLumaJob.ts`) + the global jobs store (`src/lib/jobs.ts`).
- In `--json`/`--progress-json` mode the CLI's stdout must be **valid NDJSON**
  (one JSON object per line); the frontend reads the **last** JSON line as the
  result payload. Interactive (questionary) branches are inert in JSON mode.
- Global flags order: `luma --json <subcommand> …` — always before the verb.

## Two Python bundles (the PDF architecture)

- `luma-sidecar` — one-dir (onedir) PyInstaller bundle: launcher + `_internal/`.
  Contains everything except weasyprint PDF rendering. Spec:
  `luma-sidecar-onedir.spec` + `runtime_hook_libpath.py`.
- `pdfworker` — a separate, tiny onedir bundle that renders PDFs (weasyprint
  only). Spec `pdfworker.spec`, sources `pdfworker_app.py` + `worker_weasy.py`.
- **Why it exists (hard-won):** weasyprint's font shaping **SIGBUSes (exit 138)**
  in the frozen interpreter whenever rich/prompt_toolkit — or the whole sidecar
  bundle — is mapped into the same process. So PDF rendering always happens in
  the worker subprocess, never in the sidecar process itself. Do NOT fold
  `worker_weasy`/weasyprint back into the sidecar spec's hidden imports.
- Frozen render (`luma/ingest/reports.py` `_render_pdf`): write the rendered
  HTML to `<report>.pdf.render.html`, spawn
  `<sidecar-dir>/pdfworker/<triple>/pdfworker <html> <pdf>` with
  `DYLD_LIBRARY_PATH`, `DYLD_FALLBACK_LIBRARY_PATH`, `PYTHONHOME` **stripped**
  from the child env (leaking the big bundle's dyld/search paths into the worker
  crashes harfbuzz), 300s timeout, then delete the temp HTML.
- Worker location: `Path(sys.executable).parent / "pdfworker" / <triple> / "pdfworker"`
  where `<triple>` = `aarch64-apple-darwin` (arm64) or `x86_64-apple-darwin`,
  chosen from `platform.machine()`.
- In dev (**unfrozen** `uv run luma …`) reports render weasyprint inline — no
  worker involved. The worker path only matters for the frozen sidecar.

## Building the sidecar + app

- One-command local build: `npm run setup` → `scripts/build-app.sh`
  (`dev` | `backend` | `app` modes; `--arch`; `--pull-backend`). Backend-only:
  `cd luma-backend && ./build_macos.sh arm64`. Requires: `uv`, `pyinstaller`
  (in the backend venv), static `ffmpeg`/`ffprobe` (evermeet.cx).
- `build_macos.sh` temporarily copies `ffmpeg`/`ffprobe` from `FFMPEG_DIR` into
  the backend repo root (trap removes them on exit). Running PyInstaller specs
  standalone outside the script fails with `ERROR: Unable to find …/ffmpeg`
  unless those symlinks exist.
- Sidecar binaries (`src-tauri/binaries/*`) are **gitignored** — never commit
  them; CI builds its own.
- Keep onedir, not onefile: one-file bumps cold-start to ~7s (unpacks ~140MB to
  temp every invocation); onedir starts in ~0.2s.
- `src-tauri/tauri.conf.json` `externalBin: ["binaries/luma-sidecar"]` only
  bundles the launcher (Tauri strips the `-<triple>` suffix). `src-tauri/build.rs`
  stages `_internal/` next to the **dev** sidecar so `tauri dev` works — but it
  does **NOT** stage `pdfworker/`. PDF via the frozen sidecar under `tauri dev`
  therefore fails unless you copy `binaries/pdfworker` → `target/debug/pdfworker`
  yourself.

## Packaging the `.app` (CI does this; `build.yml` is the source of truth)

Right after `cargo` builds the bundle, `build.yml` must:
1. `cp -R src-tauri/binaries/_internal/. → luma.app/Contents/Frameworks/` — the
   PyInstaller onedir bootloader resolves `_MEIPASS` there inside a `.app`.
2. `cp -R src-tauri/binaries/pdfworker/<triple>/. → Contents/MacOS/pdfworker/<triple>/`
   (launcher + its own `_internal` beside it).
3. `codesign --force --sign - Contents/MacOS/luma-sidecar` — ad-hoc sign **only
   the launcher**. Never code-sign the whole bundle: it recurses into the Python
   framework payload and fails.
4. Smoke-test: run the sidecar and render a real PDF through the in-bundle
   worker (`file out.pdf` must say `PDF document`).

Only arm64 is supported (GitHub `macos-14` runners).

## Verification checklist

- Backend lint/type: `cd luma-backend && uv run ruff check . && uv run mypy --explicit-package-bases luma/` (also `ruff format .`).
- Frozen sidecar smoke: `src-tauri/binaries/luma-sidecar-aarch64-apple-darwin --json profiles list`.
- PDF worker alone: `src-tauri/binaries/pdfworker/aarch64-apple-darwin/pdfworker in.html out.pdf` → valid PDF, exit 0.
- Frontend: `npm run build` (tsc + vite). No dedicated frontend test suite.
- Backend has no tests yet (`pytest` collects nothing).

## Frontend conventions

- React 19 + Vite + strict TS + Tailwind 4 + shadcn-style Radix UI. Reuse
  `src/components/ui` primitives; add pages in `src/pages/`.
- List-style pages do a single page-level refresh (`Profiles.tsx` `refreshAll()`)
  instead of per-card reload buttons; dialogs/comboboxes are the pattern for
  create/edit/settings forms. LUT pickers read `<configs>/luts/` (populated by
  `luma create --lut`), exposed via `luma config --json`.

## Releases

- `npm run release -- <patch|minor|major>` → `scripts/tag-release.sh` tags `vX.Y.Z`
  and lets CI draft the GitHub release from DMG/ZIP artifacts. Homebrew cask
  (`mikkelrask/homebrew-luma`) is auto-bumped by `update-cask.yml` when a
  `TAP_PAT` secret is configured.