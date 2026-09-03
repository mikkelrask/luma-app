import { useEffect, useState } from "react";
import { runLuma } from "../lib/luma";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "../components/ui/card";
import { Button } from "../components/ui/button";

interface Production {
  name: string;
  [key: string]: unknown;
}

const statusColor: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  upcoming: "bg-amber-500/15 text-amber-300",
  archived: "bg-zinc-600/20 text-zinc-400",
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
      setStatus(sr.payload as Record<string, Production[]> | null);

      const st = await runLuma(["storage"], false);
      const str = await st.done;
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
                  <p className="text-sm text-zinc-500">None</p>
                )}
                {items.map((p) => (
                  <div
                    key={p.name as string}
                    className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2"
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
            <pre className="overflow-x-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-300">
              {JSON.stringify(storage, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-zinc-500">No storage data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
