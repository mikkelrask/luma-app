import { useEffect, useState } from "react";
import { runLuma } from "../lib/luma";
import { Archive, Clock, Film, HardDrive } from "lucide-react";
import { RefreshButton } from "@/components/RefreshButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";

interface Production {
  name: string;
  [key: string]: unknown;
}

interface StorageData {
  productions: Record<string, Record<string, number | null>>;
}

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

  const groups: Array<{ key: string; label: string }> = [
    { key: "active", label: "Active" },
    { key: "upcoming", label: "Upcoming" },
    { key: "archived", label: "Archived" },
  ];

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
                  <span className="font-display text-3xl font-semibold tabular-nums">
                    {items.length}
                  </span>
                </div>
              </CardHeader>
              <div className={`mx-5 h-px bg-gradient-to-r ${meta.rule} to-transparent`} />
              <CardContent className="space-y-1.5 px-5">
                {items.length === 0 && (
                  <p className="py-1 text-sm text-muted-foreground/50">Nothing here yet.</p>
                )}
                {items.map((p) => (
                  <div
                    key={p.name as string}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-1.5"
                  >
                    <span className="truncate text-sm">{p.name as string}</span>
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
            <p className="text-sm text-muted-foreground/70">No storage data.</p>
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
          <p className="text-sm text-muted-foreground/70">No storage data.</p>
        )}
      </div>
    </div>
  );
}
