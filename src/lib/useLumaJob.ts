import { useRef, useState } from "react";
import { runLuma, progressFromEvent, type JobHandle } from "../lib/luma";

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

/**
 * Runs a luma job and mirrors its progress / result into React state that the
 * page can render. `buildArgs` should return only the post-`luma` arguments.
 */
export function useLumaJob(buildArgs: () => string[], progress = true) {
  const [ui, setUi] = useState<JobUiState>(idle);
  const handleRef = useRef<JobHandle | null>(null);

  const run = async (onFinal?: (result: JobUiState) => void) => {
    if (ui.running) return;
    setUi({ ...idle, running: true, message: "Starting…" });
    handleRef.current = await runLuma(buildArgs(), progress, (value) => {
      setUi((prev) => {
        const p = progressFromEvent(value);
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
          message: p ? p.file ?? `Processing…` : (value.message as string) ?? "",
          pct: p ? p.pct : prev.pct,
          error: null,
          result: prev.result,
        };
      });
    });

    const res = await handleRef.current.done;
    const finalState: JobUiState = {
      running: false,
      message: "",
      pct: 100,
      error: res.code && res.code !== 0 ? res.logs.join("\n") || "Job failed" : null,
      result: res.payload,
    };
    setUi(finalState);
    onFinal?.(finalState);
  };

  const cancel = async () => {
    await handleRef.current?.cancel();
  };

  return { ui, run, cancel };
}
