import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * The final result of a luma job.
 * `payload` is the JSON object emitted by the CLI (ingest report, transcode
 * summary, status list, ...). `event` is the terminal event tag.
 */
export interface LumaResult {
  /** Raw JSON object emitted by the CLI (the last meaningful line). */
  payload: Record<string, unknown> | null;
  /** Exit code of the sidecar if it terminated cleanly, else null. */
  code: number | null;
  /** Any non-JSON log lines captured from stdout/stderr. */
  logs: string[];
}

export interface JobHandle {
  /** Resolves when the sidecar process exits. */
  done: Promise<LumaResult>;
  /** Cancel: kills the running child process. */
  cancel: () => Promise<void>;
}

interface PendingJob {
  resolve: (r: LumaResult) => void;
  lastPayload: Record<string, unknown> | null;
  logs: string[];
  code: number | null;
  onEvent?: (value: Record<string, unknown>) => void;
}

let unlistenPromise: Promise<UnlistenFn> | null = null;
let jobListeners = new Set<PendingJob>();

async function ensureListener() {
  if (unlistenPromise) return unlistenPromise;
  unlistenPromise = (async () => {
    const unjob = await listen<unknown>("luma://job", (e) => {
      if (typeof e.payload !== "object" || e.payload === null) return;
      const value = e.payload as Record<string, unknown>;
      for (const job of jobListeners) {
        job.lastPayload = value;
        job.onEvent?.(value);
      }
    });
    const unexit = await listen<unknown>("luma://exit", () => {
      for (const job of jobListeners) {
        job.code = job.code ?? 0;
        jobListeners.delete(job);
        job.resolve({
          payload: job.lastPayload,
          code: job.code,
          logs: job.logs,
        });
      }
    });
    const unterminated = await listen<number | { code?: number } | null>(
      "luma://terminated",
      (e) => {
        for (const job of jobListeners) {
          if (typeof e.payload === "number") {
            job.code = e.payload;
          } else if (e.payload && typeof e.payload === "object") {
            job.code = (e.payload as { code?: number }).code ?? null;
          }
        }
      },
    );
    const unlog = await listen<string>("luma://log", (e) => {
      const line = String(e.payload ?? "");
      if (!line) return;
      for (const job of jobListeners) {
        job.logs.push(line);
      }
    });
    return () => {
      unjob();
      unexit();
      unterminated();
      unlog();
    };
  })();
  return unlistenPromise;
}

/**
 * Run a luma CLI job as the bundled sidecar.
 *
 * @param args  Everything after `luma` (e.g. `["ingest", "--production", "X"]`).
 *              Do NOT include `--json` / `--progress-json`; those are injected.
 * @param progress  Whether to run with `--progress-json` (streaming progress).
 * @param onEvent   Optional callback for every parsed JSON line (including each
 *                  progress event). Useful for live progress bars.
 */
export async function runLuma(
  args: string[],
  progress = false,
  onEvent?: (value: Record<string, unknown>) => void,
): Promise<JobHandle> {
  await ensureListener();

  let resolveDone!: (r: LumaResult) => void;
  const done = new Promise<LumaResult>((resolve) => {
    resolveDone = resolve;
  });

  const job: PendingJob = {
    resolve: resolveDone,
    lastPayload: null,
    logs: [],
    code: null,
    onEvent,
  };
  jobListeners.add(job);

  await invoke("run_luma", { args, progress });

  const cancel = async () => {
    try {
      await invoke("kill_luma");
    } catch {
      /* best-effort */
    }
    jobListeners.delete(job);
    resolveDone({ payload: job.lastPayload, code: job.code, logs: job.logs });
  };

  return { done, cancel };
}

interface ProgressState {
  done: number;
  total: number;
  pct: number;
  file?: string;
  speed?: number;
}

/** Extract a numeric progress snapshot from a job event, if present. */
export function progressFromEvent(
  value: Record<string, unknown>,
): ProgressState | null {
  const pct = Number(value.pct);
  if (Number.isNaN(pct)) return null;
  return {
    done: Number(value.done ?? 0),
    total: Number(value.total ?? 0),
    pct,
    file: value.file as string | undefined,
    speed: value.speed as number | undefined,
  };
}
