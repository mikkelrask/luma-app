import { useEffect, useState } from "react";
import { runLuma } from "../lib/luma";
import { useProductions } from "../lib/useProductions";
import { useSession } from "../lib/session";
import { Archive, Clock, Film, HardDrive, Trash2Icon, Undo2 } from "lucide-react";
import { RefreshButton } from "@/components/RefreshButton";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Production {
  name: string;
  current_day?: number | null;
  num_days?: number | null;
  start_date?: string;
  [key: string]: unknown;
}

interface StorageData {
  productions: Record<string, Record<string, number | null>>;
}

interface DeleteEntry {
  path: string;
  size: number;
  kind: string;
}

type Busy =
  | { op: "archive" | "restore" | "delete"; name: string }
  | { op: "purge"; name: string };

const storageLabel: Record<string, string> = {
  dailies: "Dailies",
  proxies: "Proxies",
};

function storageLabelFor(key: string): string {
  if (storageLabel[key]) return storageLabel[key];
  const match = key.match(/^root_(\d+)$/);
  return match ? `Root ${match[1]}` : key;
}

function formatBytes(size: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

const groupMeta: Record<
  string,
  { label: string; icon: typeof Film; accent: string; dot: string; rule: string }
> = {
  active: {
    label: "Active",
    icon: Film,
    accent: "text-foreground",
    dot: "bg-foreground shadow-[0_0_8px_2px_rgba(255,255,255,0.25)]",
    rule: "from-foreground/50",
  },
  upcoming: {
    label: "Upcoming",
    icon: Clock,
    accent: "text-muted-foreground",
    dot: "bg-muted-foreground/70",
    rule: "from-muted-foreground/40",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    accent: "text-muted-foreground/60",
    dot: "bg-white/20",
    rule: "from-white/20",
  },
};

export function Dashboard() {
  const [status, setStatus] = useState<Record<string, Production[]> | null>(null);
  const [storage, setStorage] = useState<StorageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { refresh: refreshProductions } = useProductions();
  const { production: sessionProduction, setProduction: setSessionProduction } =
    useSession();

  const [archiveName, setArchiveName] = useState<string | null>(null);
  const [restoreName, setRestoreName] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [deletePreview, setDeletePreview] = useState<DeleteEntry[] | null>(null);
  const [deletedBytes, setDeletedBytes] = useState<number | null>(null);
  const [busy, setBusy] = useState<Busy | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await runLuma(["status"], false);
      const sr = await s.done;
      if (sr.code && sr.code !== 0) {
        setError(sr.logs.join("\n") || "Failed to load status");
        return;
      }
      setStatus(sr.payload as Record<string, Production[]> | null);

      const st = await runLuma(["storage", "--all"], false);
      const str = await st.done;
      if (str.code && str.code !== 0) {
        setError(str.logs.join("\n") || "Failed to load storage");
        return;
      }
      setStorage(str.payload as StorageData | null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runQuick = async (args: string[]): Promise<void> => {
    const h = await runLuma(args, false);
    const r = await h.done;
    if (r.code && r.code !== 0) {
      throw new Error(r.logs.join("\n") || `Command failed: ${args.join(" ")}`);
    }
  };

  const refreshAll = async () => {
    await refreshProductions();
    await load();
  };

  const clearSessionIfLinked = (name: string) => {
    if (name === sessionProduction) setSessionProduction("");
  };

  const openDelete = async (name: string) => {
    setDeleteName(name);
    setDeletePreview(null);
    setDeletedBytes(null);
    setActionError(null);
    try {
      const h = await runLuma(
        ["production", "delete", "--name", name, "--mode", "remove_media", "--dry-run"],
        false,
      );
      const r = await h.done;
      if (r.code && r.code !== 0) throw new Error(r.logs.join("\n") || "Could not preview deletion");
      const payload = r.payload as {
        removed_paths?: DeleteEntry[];
        freed_bytes?: number;
      } | null;
      setDeletePreview(
        (payload?.removed_paths ?? []).filter((e) => e.kind !== "config"),
      );
      setDeletedBytes(payload?.freed_bytes ?? 0);
    } catch (e) {
      setActionError(String(e));
    }
  };

  const confirmArchive = async () => {
    if (!archiveName) return;
    setBusy({ op: "archive", name: archiveName });
    setActionError(null);
    try {
      await runQuick(["production", "archive", "--name", archiveName]);
      setArchiveName(null);
      await refreshAll();
    } catch (e) {
      setActionError(String(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmRestore = async () => {
    if (!restoreName) return;
    setBusy({ op: "restore", name: restoreName });
    setActionError(null);
    try {
      await runQuick(["production", "unarchive", "--name", restoreName]);
      setRestoreName(null);
      await refreshAll();
    } catch (e) {
      setActionError(String(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteName) return;
    setBusy({ op: "delete", name: deleteName });
    setActionError(null);
    try {
      await runQuick([
        "production",
        "delete",
        "--name",
        deleteName,
        "--mode",
        "remove_media",
        "--yes",
      ]);
      setDeleteName(null);
      clearSessionIfLinked(deleteName);
      await refreshAll();
    } catch (e) {
      setActionError(String(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmDeleteConfigOnly = async () => {
    if (!deleteName) return;
    setBusy({ op: "delete", name: deleteName });
    setActionError(null);
    try {
      await runQuick([
        "production",
        "delete",
        "--name",
        deleteName,
        "--mode",
        "config_only",
        "--yes",
      ]);
      setDeleteName(null);
      clearSessionIfLinked(deleteName);
      await refreshAll();
    } catch (e) {
      setActionError(String(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmPurge = async () => {
    setBusy({ op: "purge", name: "" });
    setActionError(null);
    try {
      await runQuick(["production", "purge"]);
      await refreshAll();
    } catch (e) {
      setActionError(String(e));
    } finally {
      setBusy(null);
    }
  };

  const active = status?.active ?? [];
  const endedCount = active.filter(
    (p) =>
      typeof p.num_days === "number" &&
      p.num_days > 0 &&
      typeof p.current_day === "number" &&
      p.current_day >= p.num_days,
  ).length;

  const groups: Array<{ key: string; label: string }> = [
    { key: "active", label: "Active" },
    { key: "upcoming", label: "Upcoming" },
    { key: "archived", label: "Archived" },
  ];

  const renderRowActions = (p: Production, archived: boolean) => (
    <div
      className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      onClick={(e) => e.stopPropagation()}
    >
      {archived ? (
        <button
          type="button"
          onClick={() => {
            setRestoreName(p.name as string);
          }}
          aria-label={`Restore ${p.name}`}
          title="Restore to active"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
        >
          <Undo2 className="size-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setArchiveName(p.name as string)}
          aria-label={`Archive ${p.name}`}
          title="Archive"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
        >
          <Archive className="size-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => void openDelete(p.name as string)}
        aria-label={`Delete ${p.name}`}
        title="Delete"
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-950/40 hover:text-red-300"
      >
        <Trash2Icon className="size-3.5" />
      </button>
    </div>
  );

  const renderDayChip = (p: Production) => {
    if (typeof p.num_days === "number" && p.num_days > 0) {
      const day = typeof p.current_day === "number" ? p.current_day : null;
      const overdue = day !== null && day >= p.num_days;
      return (
        <span
          className={`shrink-0 rounded-md border px-1.5 py-0.5 font-display text-[11px] font-medium tabular-nums ${
            overdue
              ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
              : "border-white/10 bg-white/[0.04] text-muted-foreground"
          }`}
        >
          {day !== null ? `Day ${day} / ${p.num_days}` : `${p.num_days} days`}
        </span>
      );
    }
    if (p.start_date) {
      return (
        <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-display text-[11px] font-medium tabular-nums text-muted-foreground">
          Starts {p.start_date}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Overview"
        title="Dashboard"
        description="Production status and storage at a glance."
        actions={<RefreshButton onRefresh={load} loading={loading} />}
      />

      {error && (
        <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {groups.map((g) => {
          const meta = groupMeta[g.key];
          const Icon = meta.icon;
          const items = status?.[g.key] ?? [];
          return (
            <Card key={g.key} className="gap-4 py-5">
              <CardHeader className="px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`grid size-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] ${meta.accent}`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.key === "active" && endedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void confirmPurge()}
                        disabled={busy !== null}
                        className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground disabled:opacity-50"
                      >
                        {busy?.op === "purge" ? "Archiving…" : `Archive ended (${endedCount})`}
                      </button>
                    )}
                    <span className="font-display text-3xl font-semibold tabular-nums">
                      {items.length}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <div className={`mx-5 h-px bg-gradient-to-r ${meta.rule} to-transparent`} />
              <CardContent className="space-y-1.5 px-5">
                {items.length === 0 && (
                  <EmptyState
                    compact
                    icon={Icon}
                    title={`No ${meta.label.toLowerCase()} productions`}
                    hint={
                      g.key === "active"
                        ? "Archive or create to manage here"
                        : g.key === "archived"
                          ? "Finished shows land here"
                          : "Scheduled shows appear here"
                    }
                  />
                )}
                {items.map((p) => (
                  <div
                    key={p.name as string}
                    className="group flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-1.5"
                  >
                    <span className="truncate text-sm">{p.name as string}</span>
                    {g.key !== "archived" && renderDayChip(p)}
                    {renderRowActions(p, g.key === "archived")}
                    <span className={`size-1.5 shrink-0 rounded-full ${meta.dot}`} />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-primary">
            <HardDrive className="size-3.5" />
          </span>
          <h2 className="font-display text-lg font-semibold tracking-tight">Storage</h2>
        </div>

        {storage?.productions ? (
          Object.keys(storage.productions).length === 0 ? (
            <EmptyState
              icon={HardDrive}
              title="No storage yet"
              hint="Ingest or transcode a production to start filling media folders."
            />
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(storage.productions).map(([prodName, sizes]) => {
                const total = Object.values(sizes).reduce<number>(
                  (sum, size) => sum + (size ?? 0),
                  0,
                );
                const max = Math.max(
                  ...Object.values(sizes).filter((n): n is number => n !== null),
                  0,
                );
                return (
                  <Card key={prodName} className="gap-4 py-5">
                    <CardHeader className="px-5 pb-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <CardTitle className="truncate text-base">{prodName}</CardTitle>
                        <span className="shrink-0 font-display text-sm font-semibold tabular-nums text-primary">
                          {formatBytes(total)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2.5 px-5">
                      {Object.entries(sizes).map(([key, size]) => {
                        const label = storageLabelFor(key);
                        const pct =
                          size === null || max === 0
                            ? 0
                            : Math.max(2, Math.round((size / max) * 100));
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="tabular-nums">
                                {size === null ? (
                                  <span className="text-muted-foreground/50">not found</span>
                                ) : (
                                  formatBytes(size)
                                )}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                              {size === null ? (
                                <div className="h-full w-full bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.12)_0_4px,transparent_4px_8px)]" />
                              ) : (
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          <EmptyState
            icon={HardDrive}
            title="No storage data"
            hint="Configure production roots in Settings to see storage usage."
          />
        )}
      </div>

      {/* Archive confirm */}
      <Dialog
        open={archiveName !== null}
        onOpenChange={(open) => {
          if (!open && busy?.op !== "archive") setArchiveName(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive "{archiveName}"?</DialogTitle>
            <DialogDescription>
              The production moves to Archived. Media stays on disk and it can be
              restored at any time.
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
              {actionError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArchiveName(null)}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void confirmArchive()}
              disabled={busy !== null || !archiveName}
            >
              {busy?.op === "archive" ? "Archiving…" : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirm */}
      <Dialog
        open={restoreName !== null}
        onOpenChange={(open) => {
          if (!open && busy?.op !== "restore") setRestoreName(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore "{restoreName}"?</DialogTitle>
            <DialogDescription>
              The production moves back to the active/upcoming lists.
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
              {actionError}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreName(null)}
              disabled={busy !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void confirmRestore()}
              disabled={busy !== null || !restoreName}
            >
              {busy?.op === "restore" ? "Restoring…" : "Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog (two modes) */}
      <Dialog
        open={deleteName !== null}
        onOpenChange={(open) => {
          if (!open && busy?.op !== "delete") {
            setDeleteName(null);
            setDeletePreview(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{deleteName}"?</DialogTitle>
            <DialogDescription>
              Choose what to remove for this production.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
              {actionError}
            </div>
          )}

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Remove from app</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void confirmDeleteConfigOnly()}
                  disabled={busy !== null || !deleteName}
                >
                  {busy?.op === "delete" ? "Removing…" : "Remove entry"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Only the production entry is removed. Media (roots, dailies,
                proxies) stays on disk — e.g. for editors still working on the
                server.
              </p>
            </div>

            <div className="rounded-lg border border-red-700/30 bg-red-950/20 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-red-300">Remove from system</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void confirmDelete()}
                  disabled={busy !== null || !deleteName || deletePreview === null}
                >
                  {busy?.op === "delete"
                    ? "Deleting…"
                    : deletePreview === null
                      ? "Scanning…"
                      : "Delete everything"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Removes the production media folders and the entry. This cannot
                be undone.
              </p>
              {deletePreview === null ? (
                !actionError && (
                  <p className="mt-2 text-xs text-muted-foreground/70">
                    Scanning folders for size…
                  </p>
                )
              ) : (
                <div className="mt-2 space-y-1">
                  {deletePreview.length === 0 ? (
                    <p className="text-xs text-muted-foreground/70">
                      No media folders found — only the entry exists.
                    </p>
                  ) : (
                    <>
                      {deletePreview.map((e) => (
                        <div
                          key={e.path}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="truncate text-muted-foreground">
                            {storageLabelFor(e.kind)} · {e.path}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {formatBytes(e.size)}
                          </span>
                        </div>
                      ))}
                      <p className="pt-1 text-xs font-medium tabular-nums text-red-300">
                        Will free {formatBytes(deletedBytes ?? 0)} on disk
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteName(null);
                setActionError(null);
              }}
              disabled={busy !== null}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}