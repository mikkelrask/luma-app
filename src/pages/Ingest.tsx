import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "../components/ui/card";
import { Input, Label, Select } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import { useLumaJob } from "../lib/useLumaJob";
import { runLuma } from "../lib/luma";

interface Volume {
  name: string;
  path: string;
  size_gb: number;
  is_removable: boolean;
  is_network: boolean;
}

export function Ingest() {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [volume, setVolume] = useState("");
  const [production, setProduction] = useState("");
  const [day, setDay] = useState("");
  const [mediaType, setMediaType] = useState("video");

  const refreshVolumes = async () => {
    const h = await runLuma(["ingest", "--list-volumes"], false);
    const r = await h.done;
    const list = (r.payload as { volumes?: Volume[] })?.volumes ?? [];
    setVolumes(list);
    if (list.length > 0 && !volume) setVolume(list[0].path);
  };

  useEffect(() => {
    refreshVolumes();
  }, []);

  const { ui, run, cancel } = useLumaJob(
    () => {
      const args = ["ingest"];
      if (production) args.push("--production", production);
      if (day) args.push("--day", day);
      if (mediaType) args.push("--media-type", mediaType);
      if (volume) args.push("--volume", volume);
      return args;
    },
    true,
  );

  const report = ui.result as
    | {
        production?: string;
        day?: string;
        report_path?: string;
        files?: unknown[];
        failures?: unknown[];
      }
    | null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Ingest</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Card readers</span>
            <Button variant="ghost" size="sm" onClick={refreshVolumes}>Refresh</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {volumes.length === 0 && (
            <p className="text-sm text-zinc-500">No card readers found.</p>
          )}
          <Select value={volume} onChange={(e) => setVolume(e.target.value)}>
            <option value="">Select volume…</option>
            {volumes.map((v) => (
              <option key={v.path} value={v.path}>
                {v.name} — {v.size_gb} GB
              </option>
            ))}
          </Select>
          <div className="flex flex-wrap gap-2">
            {volumes.map((v) => (
              <Badge key={v.path} className={v.is_removable ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-700/40 text-zinc-300"}>
                {v.name}{v.is_removable ? " (removable)" : v.is_network ? " (network)" : ""}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingest job</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Production</Label>
            <Input value={production} onChange={(e) => setProduction(e.target.value)} placeholder="Show name" />
          </div>
          <div>
            <Label>Day</Label>
            <Input value={day} onChange={(e) => setDay(e.target.value)} placeholder="01" />
          </div>
          <div>
            <Label>Media type</Label>
            <Select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {ui.pct !== null && ui.running && (
        <Card>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{ui.message}</span>
              <span>{Math.round(ui.pct)}%</span>
            </div>
            <Progress value={ui.pct} />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => run()} disabled={ui.running || !production || !day}>
          {ui.running ? "Ingesting…" : "Start ingest"}
        </Button>
        {ui.running && (
          <Button variant="destructive" onClick={cancel}>Cancel</Button>
        )}
      </div>

      {ui.error && (
        <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
          {ui.error}
        </div>
      )}

      {report && !ui.running && (
        <Card>
          <CardHeader>
            <CardTitle>Ingest report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-zinc-400">
              {report.production} · day {report.day}
              {report.report_path ? ` · ${report.report_path}` : ""}
            </div>
            {Array.isArray(report.failures) && report.failures.length > 0 && (
              <div className="rounded-md border border-red-700 bg-red-950/40 p-3">
                <div className="text-sm font-medium text-red-300 mb-1">Failures</div>
                <pre className="overflow-x-auto text-xs text-red-200">{JSON.stringify(report.failures, null, 2)}</pre>
              </div>
            )}
            <pre className="overflow-x-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-300">
              {JSON.stringify(report, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
