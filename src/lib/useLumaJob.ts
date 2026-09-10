import { useRef, useState } from "react";
import { runLuma, progressFromEvent, type JobHandle } from "../lib/luma";
import { useJobs, type JobKind } from "../lib/jobs";
import { notifyJobDone } from "../lib/notify";

export interface JobUiState {
  running: boolean;
  message: string;
  pct: number | null;
  error: string | null;
  result: Record<string, unknown> | null;
}

const idle: JobUiState = {
  running: false,
  message: "",
  pct: null,
  error: null,
  result: null,
};

interface LumaJobOptions {
  progress?: boolean;
  kind?: JobKind;
  label?: string;
}

/**
 * Runs a luma job and mirrors its progress / result into React state that the
 * page can render. `buildArgs` should return only the post-`luma` arguments.
 *
 * When `kind` / `label` are provided the job is also registered with the global
 * job store (sidebar panel + notifications) and a second active job with the
 * same kind + label is refused.
 */
export function useLumaJob(buildArgs: () => string[], opts: boolean | LumaJobOptions = {}) {
  const options: LumaJobOptions = typeof opts === "boolean" ? { progress: opts } : opts;
  const { progress = true, kind, label } = options;
  const jobs = useJobs();
  const [ui, setUi] = useState<JobUiState>(idle);
  const handleRef = useRef<JobHandle | null>(null);

  const run = async (onFinal?: (result: JobUiState) => void) => {
    if (ui.running) return;
    if (kind && label && jobs.hasActive(kind, label)) {
      const err = `A "${label}" job is already running. Wait for it to finish or cancel it first.`;
      setUi({ ...ui, error: err });
      return;
    }
    setUi({ ...idle, running: true, message: "Starting…" });
    const handle = await runLuma(
      buildArgs(),
      progress,
      (value) => {
        const token = handleRef.current?.token;
        const p = progressFromEvent(value);
        const message = p ? p.file ?? `Processing…` : (value.message as string) ?? "";
        setUi((prev) => {
          const event = value.event;
          if (event === "done") {
            return {
              running: true,
              message: "Finishing…",
              pct: 100,
              error: null,
              result: prev.result,
            };
          }
          return {
            running: prev.running,
            message,
            pct: p ? p.pct : prev.pct,
            error: null,
            result: prev.result,
          };
        });
        if (kind && token) {
          if (jobs.debug) jobs.appendLog(token, label ?? kind, JSON.stringify(value));
          const fields: { message: string; pct?: number; file?: string } = { message };
          if (p) {
            fields.pct = p.pct;
            fields.file = p.file;
          }
          jobs.patch(token, fields);
        }
      },
      (line) => {
        const token = handleRef.current?.token;
        if (kind && token) jobs.appendLog(token, label ?? kind, line);
      },
    );
    handleRef.current = handle;
    if (kind && label) jobs.register(handle.token, kind, label);

    const res = await handle.done;
    const ok = !res.code || res.code === 0;
    const finalState: JobUiState = {
      running: false,
      message: "",
      pct: 100,
      error: ok ? null : res.logs.join("\n") || "Job failed",
      result: res.payload,
    };

    if (kind) {
      const transitioned = jobs.finalize(handle.token, ok ? "done" : "error", {
        result: res.payload,
        error: finalState.error,
      });
      if (label && transitioned) void notifyJobDone(label, ok);
    }

    setUi(finalState);
    onFinal?.(finalState);
  };

  const cancel = async () => {
    if (!handleRef.current) return;
    if (kind) await jobs.cancelJob(handleRef.current.token);
    await handleRef.current.cancel();
  };

  return { ui, run, cancel };
}