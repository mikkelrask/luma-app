import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";

export type JobKind =
  | "ingest"
  | "transcode"
  | "reports"
  | "create"
  | "config"
  | "profiles";

export type JobStatus = "running" | "done" | "error" | "cancelled";

export interface JobRecord {
  token: string;
  kind: JobKind;
  label: string;
  status: JobStatus;
  pct: number | null;
  message: string;
  file?: string;
  result?: Record<string, unknown> | null;
  error?: string | null;
  logs: string[];
  startedAt: number;
  finishedAt?: number;
}

export interface LogLine {
  id: number;
  token: string;
  label: string;
  line: string;
  ts: number;
}

const MAX_HISTORY = 10;
const MAX_RECORD_LOGS = 200;
const MAX_STREAM = 500;

interface JobsContextValue {
  running: JobRecord[];
  history: JobRecord[];
  orphans: boolean;
  debug: boolean;
  logStream: LogLine[];
  toggleDebug: () => void;
  clearLog: () => void;
  appendLog: (token: string, label: string, line: string) => void;
  register: (token: string, kind: JobKind, label: string) => void;
  patch: (token: string, patch: Partial<Pick<JobRecord, "pct" | "message" | "file">>) => void;
  finalize: (
    token: string,
    status: "done" | "error" | "cancelled",
    extra?: { result?: JobRecord["result"]; error?: string | null },
  ) => boolean;
  cancelJob: (token: string) => Promise<void>;
  killAllOrphans: () => Promise<void>;
  clearHistory: () => void;
  hasActive: (kind?: JobKind, label?: string) => boolean;
}

const JobsContext = createContext<JobsContextValue | null>(null);

function initialDebug(): boolean {
  try {
    if (import.meta.env.VITE_LUMA_DEBUG === "true") return true;
    return localStorage.getItem("luma.debug") === "1";
  } catch {
    return false;
  }
}

export function JobsProvider({ children }: { children: ReactNode }) {
  const [running, setRunning] = useState<JobRecord[]>([]);
  const [history, setHistory] = useState<JobRecord[]>([]);
  const [orphans, setOrphans] = useState(false);
  const [debug, setDebug] = useState(initialDebug);
  const [logStream, setLogStream] = useState<LogLine[]>([]);
  const runningRef = useRef<JobRecord[]>([]);
  const finalized = useRef<Set<string>>(new Set());
  const logId = useRef(0);

  runningRef.current = running;

  const toggleDebug = useCallback(() => {
    setDebug((d) => {
      const next = !d;
      try {
        localStorage.setItem("luma.debug", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const appendLog = useCallback((token: string, label: string, line: string) => {
    const id = ++logId.current;
    const entry: LogLine = { id, token, label, line, ts: Date.now() };
    setRunning((prev) =>
      prev.map((r) =>
        r.token === token
          ? { ...r, logs: [...r.logs, line].slice(-MAX_RECORD_LOGS) }
          : r,
      ),
    );
    setHistory((prev) =>
      prev.map((r) =>
        r.token === token
          ? { ...r, logs: [...r.logs, line].slice(-MAX_RECORD_LOGS) }
          : r,
      ),
    );
    setLogStream((prev) => [...prev, entry].slice(-MAX_STREAM));
  }, []);

  const clearLog = useCallback(() => setLogStream([]), []);

  const register = useCallback((token: string, kind: JobKind, label: string) => {
    finalized.current.delete(token);
    setRunning((prev) => [
      ...prev,
      {
        token,
        kind,
        label,
        status: "running",
        pct: null,
        message: "Starting…",
        logs: [],
        startedAt: Date.now(),
      },
    ]);
  }, []);

  const patch = useCallback(
    (token: string, p: Partial<Pick<JobRecord, "pct" | "message" | "file">>) => {
      setRunning((prev) => prev.map((r) => (r.token === token ? { ...r, ...p } : r)));
    },
    [],
  );

  const finalize = useCallback(
    (
      token: string,
      status: "done" | "error" | "cancelled",
      extra?: { result?: JobRecord["result"]; error?: string | null },
    ) => {
      if (finalized.current.has(token)) return false;
      finalized.current.add(token);
      let transitioned = false;
      setRunning((prev) => {
        const rec = prev.find((r) => r.token === token);
        if (!rec) return prev;
        transitioned = true;
        const finished: JobRecord = { ...rec, status, finishedAt: Date.now(), ...extra };
        setHistory((h) => [finished, ...h].slice(0, MAX_HISTORY));
        return prev.filter((r) => r.token !== token);
      });
      return transitioned;
    },
    [],
  );

  const cancelJob = useCallback(
    async (token: string) => {
      try {
        await invoke("kill_luma", { token });
      } catch {
        /* best-effort */
      }
      finalize(token, "cancelled");
    },
    [finalize],
  );

  const killAllOrphans = useCallback(async () => {
    try {
      await invoke("kill_all_luma");
    } catch {
      /* best-effort */
    }
    setOrphans(false);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const hasActive = useCallback(
    (kind?: JobKind, label?: string) => {
      return runningRef.current.some(
        (r) => (!kind || r.kind === kind) && (!label || r.label === label),
      );
    },
    [],
  );

  useEffect(() => {
    invoke<{ ok: boolean; message: string }>("luma_running")
      .then((r) => {
        if (r.ok && runningRef.current.length === 0) setOrphans(true);
      })
      .catch(() => {});
  }, []);

  return (
    <JobsContext.Provider
      value={{
        running,
        history,
        orphans,
        debug,
        logStream,
        toggleDebug,
        clearLog,
        appendLog,
        register,
        patch,
        finalize,
        cancelJob,
        killAllOrphans,
        clearHistory,
        hasActive,
      }}
    >
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobs must be used within a JobsProvider");
  return ctx;
}