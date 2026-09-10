import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import {
  Ban,
  ChevronDown,
  CircleCheck,
  CircleX,
  Clapperboard,
  FileText,
  FolderPlus,
  Repeat2,
  Settings2,
  Terminal,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { useJobs, type JobKind, type JobRecord } from "@/lib/jobs";

const kindIcons: Record<JobKind, typeof Clapperboard> = {
  ingest: Clapperboard,
  transcode: Repeat2,
  reports: FileText,
  create: FolderPlus,
  config: Settings2,
  profiles: UserCog,
};

function duration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function StatusIcon({ job }: { job: JobRecord }) {
  if (job.status === "done") return <CircleCheck className="size-3.5 text-emerald-400" />;
  if (job.status === "error") return <CircleX className="size-3.5 text-red-400" />;
  if (job.status === "cancelled") return <Ban className="size-3.5 text-muted-foreground" />;
  return (
    <span className="relative flex size-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-primary" />
    </span>
  );
}

function ProgressBar({ job }: { job: JobRecord }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-primary/20">
      {job.pct === null ? (
        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
      ) : (
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${Math.min(100, job.pct)}%` }}
        />
      )}
    </div>
  );
}

function RunningJob({ job }: { job: JobRecord }) {
  const { cancelJob } = useJobs();
  const Icon = kindIcons[job.kind];
  return (
    <div className="space-y-1 rounded-lg border border-border bg-background/50 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-primary" />
        <span className="flex-1 truncate text-xs text-foreground" title={job.label}>
          {job.label}
        </span>
        <button
          type="button"
          aria-label={`Cancel ${job.label}`}
          onClick={() => cancelJob(job.token)}
          className="shrink-0 text-muted-foreground hover:text-red-400 focus:outline-none"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">{job.message}</span>
        {job.pct !== null && <span className="shrink-0 text-[10px] text-muted-foreground">{Math.round(job.pct)}%</span>}
      </div>
      <ProgressBar job={job} />
    </div>
  );
}

function LogConsole() {
  const { logStream, clearLog } = useJobs();
  const scrollRef = useRef<HTMLPreElement>(null);
  const lines = logStream.slice(-80);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border bg-black/50">
      <div className="flex items-center justify-between border-b border-border px-2 py-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Console
        </span>
        <button
          type="button"
          onClick={clearLog}
          className="text-[10px] text-muted-foreground/70 hover:text-foreground focus:outline-none"
        >
          Clear
        </button>
      </div>
      <pre
        ref={scrollRef}
        className="max-h-44 overflow-y-auto px-2 py-1.5 font-mono text-[10px] leading-4 text-zinc-300"
      >
        {lines.length === 0 && (
          <span className="text-zinc-600">Waiting for job output…</span>
        )}
        {lines.map((l) => (
          <span key={l.id} className="block whitespace-pre-wrap break-all">
            <span className="text-zinc-600">[{l.label}]</span> {l.line}
          </span>
        ))}
      </pre>
    </div>
  );
}

function DebugToggle() {
  const { debug, toggleDebug } = useJobs();
  return (
    <button
      type="button"
      onClick={toggleDebug}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide transition-colors focus:outline-none",
        debug
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground/70 hover:bg-white/[0.04] hover:text-foreground",
      )}
      title="Log raw backend output for every job"
    >
      <Terminal className="size-3" />
      {debug ? "Debug on" : "Debug off"}
    </button>
  );
}

export function TaskPanel() {
  const { running, history, orphans, killAllOrphans, clearHistory, debug } = useJobs();
  const [showRecent, setShowRecent] = useState(true);

  return (
    <div className="space-y-2 border-t border-border px-3 py-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Tasks
        </span>
        <DebugToggle />
      </div>

      {orphans && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-800/60 bg-amber-950/40 px-2 py-1.5 text-[10px] text-amber-300">
          <span>Some jobs survived a reload and lost their UI.</span>
          <button
            type="button"
            onClick={killAllOrphans}
            className="shrink-0 rounded bg-amber-600/30 px-1.5 py-0.5 hover:bg-amber-600/50 focus:outline-none"
          >
            Kill all
          </button>
        </div>
      )}

      {running.length === 0 ? (
        <p className="px-2 text-[11px] text-muted-foreground/70">No tasks running.</p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            {running.length} task{running.length > 1 ? "s" : ""}
          </div>
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {running.map((job) => (
              <RunningJob key={job.token} job={job} />
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <button
              type="button"
              onClick={() => setShowRecent((s) => !s)}
              className="flex items-center gap-1.5 hover:text-foreground focus:outline-none"
            >
              <ChevronDown className={`size-3 transition-transform ${showRecent ? "" : "-rotate-90"}`} />
              Recent ({history.length})
            </button>
            <button
              type="button"
              aria-label="Clear recent jobs"
              onClick={clearHistory}
              className="ml-auto text-muted-foreground/70 hover:text-foreground focus:outline-none"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
          {showRecent && (
            <div className="mt-1 max-h-40 space-y-0.5 overflow-y-auto">
              {history.map((job) => (
                <div
                  key={job.token}
                  className="flex items-center gap-1.5 px-2 text-[10px] text-muted-foreground"
                  title={job.label}
                >
                  <StatusIcon job={job} />
                  <span className="min-w-0 flex-1 truncate">{job.label}</span>
                  <span className="shrink-0 text-muted-foreground/70">
                    {job.finishedAt ? duration(job.finishedAt - job.startedAt) : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {debug && <LogConsole />}
    </div>
  );
}