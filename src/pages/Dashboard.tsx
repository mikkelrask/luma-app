import { useEffect, useState } from "react";
import { runLuma } from "../lib/luma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Production {
  name: string;
  [key: string]: unknown;
}

const statusColor: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  upcoming: "bg-amber-500/15 text-amber-300",
  archived: "bg-white/[0.06] text-muted-foreground",
};

export function Dashboard() {
  const [status, setStatus] = useState<Record<string, Production[]> | null>(null);
  const [storage, setStorage] = useState<Record<string, unknown> | null>(null);
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
      setStorage(str.payload as Record<string, unknown> | null);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {groups.map((g) => {
          const items = status?.[g.key] ?? [];
          return (
            <Card key={g.key}>
              <CardHeader>
                <CardTitle>{g.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground/70">None</p>
                )}
                {items.map((p) => (
                  <div
                    key={p.name as string}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2"
                  >
                    <span className="text-sm">{p.name as string}</span>
                    <Badge className={statusColor[g.key]}>{g.label}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storage</CardTitle>
        </CardHeader>
        <CardContent>
          {storage ? (
            <pre className="overflow-x-auto rounded-lg bg-background/60 p-4 text-xs text-muted-foreground">
              {JSON.stringify(storage, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground/70">No storage data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
