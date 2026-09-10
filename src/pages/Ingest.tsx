import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLumaJob } from "@/lib/useLumaJob";
import { runLuma } from "@/lib/luma";
import { useProductions } from "@/lib/useProductions";

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

  const { productions, daysFor } = useProductions();

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
    {
      progress: true,
      kind: "ingest",
      label: `Ingest · ${production || "?"}${day ? ` · Day ${day}` : ""} (${mediaType})`,
    },
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

  const productionOptions = productions.map((p) => ({
    value: p.name,
    label: p.name + (p.is_archived ? " (archived)" : ""),
  }));

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
            <p className="text-sm text-muted-foreground">No card readers found.</p>
          )}
          <Select value={volume} onValueChange={setVolume}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select volume…" />
            </SelectTrigger>
            <SelectContent>
              {volumes.map((v) => (
                <SelectItem key={v.path} value={v.path}>
                  {v.name} — {v.size_gb} GB
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            {volumes.map((v) => (
              <Badge
                key={v.path}
                className={
                  v.is_removable
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-white/[0.05] text-muted-foreground"
                }
              >
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
          <div className="space-y-2">
            <Label>Production</Label>
            <Combobox
              value={production}
              onChange={(v) => {
                setProduction(v);
                setDay("");
              }}
              options={productionOptions}
              placeholder="Select production…"
              emptyText="No productions found."
            />
          </div>
          <div className="space-y-2">
            <Label>Day</Label>
            <Combobox
              value={day}
              onChange={setDay}
              options={daysFor(production).map((d) => ({ value: d, label: `Day ${d}` }))}
              placeholder="Select day…"
              emptyText="No days for this production."
            />
          </div>
          <div className="space-y-2">
            <Label>Media type</Label>
            <Select value={mediaType} onValueChange={setMediaType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
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
        <Button variant="default" onClick={() => run()} disabled={ui.running || !production || !day}>
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
            <div className="text-sm text-muted-foreground">
              {report.production} · day {report.day}
              {report.report_path ? ` · ${report.report_path}` : ""}
            </div>
            {Array.isArray(report.failures) && report.failures.length > 0 && (
              <div className="rounded-md border border-red-700 bg-red-950/40 p-3">
                <div className="text-sm font-medium text-red-300 mb-1">Failures</div>
                <pre className="overflow-x-auto text-xs text-red-200">{JSON.stringify(report.failures, null, 2)}</pre>
              </div>
            )}
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(report, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}