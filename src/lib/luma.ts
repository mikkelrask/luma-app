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
  /** Client-generated token used to correlate this job's events. */
  token: string;
  /** Resolves when the sidecar process exits. */
  done: Promise<LumaResult>;
  /** Cancel: kills the running child process. */
  cancel: () => Promise<void>;
}

interface PendingJob {
  token: string;
  resolve: (r: LumaResult) => void;
  lastPayload: Record<string, unknown> | null;
  logs: string[];
  code: number | null;
  onEvent?: (value: Record<string, unknown>) => void;
  onLog?: (line: string) => void;
  settled: boolean;
}

let unlistenPromise: Promise<UnlistenFn> | null = null;
const jobListeners = new Map<string, PendingJob>();

function makeToken() {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function ensureListener() {
  if (unlistenPromise) return unlistenPromise;
  unlistenPromise = (async () => {
    const unjob = await listen<{ job?: string; data?: unknown }>("luma://job", (e) => {
      const token = e.payload?.job;
      if (typeof token !== "string" || typeof e.payload?.data !== "object" || e.payload?.data === null) return;
      const pending = jobListeners.get(token);
      if (!pending) return;
      pending.lastPayload = e.payload.data as Record<string, unknown>;
      pending.onEvent?.(e.payload.data as Record<string, unknown>);
    });
    const unexit = await listen<{ job?: string }>("luma://exit", (e) => {
      const token = e.payload?.job;
      if (typeof token !== "string") return;
      const pending = jobListeners.get(token);
      if (!pending) return;
      jobListeners.delete(token);
      pending.settled = true;
      pending.resolve({
        payload: pending.lastPayload,
        code: pending.code ?? 0,
        logs: pending.logs,
      });
    });
    const unterminated = await listen<
      { job?: string; code?: number | null } | null
    >("luma://terminated", (e) => {
      const payload = e.payload;
      if (!payload || typeof payload.job !== "string") return;
      const pending = jobListeners.get(payload.job);
      if (!pending) return;
      if (typeof payload.code === "number") {
        pending.code = payload.code;
      }
    });
    const unlog = await listen<{ job?: string; line?: string }>("luma://log", (e) => {
      const token = e.payload?.job;
      const line = e.payload?.line;
      if (typeof token !== "string" || typeof line !== "string" || !line) return;
      const pending = jobListeners.get(token);
      if (!pending) return;
      pending.logs.push(line);
      pending.onLog?.(line);
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
  onLog?: (line: string) => void,
): Promise<JobHandle> {
  await ensureListener();

  const token = makeToken();

  let resolveDone!: (r: LumaResult) => void;
  const done = new Promise<LumaResult>((resolve) => {
    resolveDone = resolve;
  });

  const pending: PendingJob = {
    token,
    resolve: resolveDone,
    lastPayload: null,
    logs: [],
    code: null,
    onEvent,
    onLog,
    settled: false,
  };
  // Register the listener BEFORE invoke so that a fast job cannot emit exit
  // before we are listening.
  jobListeners.set(token, pending);

  try {
    await invoke("run_luma", { args, progress, token });
  } catch (e) {
    jobListeners.delete(token);
    pending.settled = true;
    resolveDone({
      payload: null,
      code: -1,
      logs: [`Could not start sidecar: ${String(e)}`],
    });
  }

  const cancel = async () => {
    if (pending.settled) return;
    try {
      await invoke("kill_luma", { token });
    } catch {
      /* best-effort */
    }
    jobListeners.delete(token);
    pending.settled = true;
    resolveDone({ payload: pending.lastPayload, code: pending.code, logs: pending.logs });
  };

  return { token, done, cancel };
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
