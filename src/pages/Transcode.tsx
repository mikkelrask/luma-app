import { useState } from "react";
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
import { useProductions } from "@/lib/useProductions";

export function Transcode() {
  const [production, setProduction] = useState("");
  const [day, setDay] = useState("");
  const [mediaType, setMediaType] = useState("both");

  const { productions, daysFor } = useProductions();

  const { ui, run, cancel } = useLumaJob(
    () => {
      const args = ["transcode"];
      if (production) args.push("--production", production);
      if (day) args.push("--day", day);
      if (mediaType) args.push("--media-type", mediaType);
      return args;
    },
    {
      progress: true,
      kind: "transcode",
      label: `Transcode · ${production || "?"}${day ? ` · Day ${day}` : " · All days"} (${mediaType})`,
    },
  );

  const summary = ui.result as { event?: string; ok?: boolean } | null;

  const productionOptions = productions.map((p) => ({
    value: p.name,
    label: p.name + (p.is_archived ? " (archived)" : ""),
  }));

  const dayOptions = [
    { value: "__all__", label: "All days" },
    ...daysFor(production).map((d) => ({ value: d, label: `Day ${d}` })),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transcode</h1>

      <Card>
        <CardHeader>
          <CardTitle>Transcode job</CardTitle>
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
              value={day === "" ? "__all__" : day}
              onChange={(v) => {
                setDay(v === "__all__" ? "" : v);
              }}
              options={dayOptions}
              placeholder="Select day…"
              emptyText="No days for this production."
            />
          </div>
          <div className="space-y-2">
            <Label>What to transcode</Label>
            <Select value={mediaType} onValueChange={setMediaType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both</SelectItem>
                <SelectItem value="dailies">Dailies</SelectItem>
                <SelectItem value="proxy">Proxy</SelectItem>
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
        <Button variant="default" onClick={() => run()} disabled={ui.running || !production}>
          {ui.running ? "Transcoding…" : "Start transcode"}
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

      {summary && !ui.running && (
        <Card>
          <CardHeader>
            <CardTitle>{summary.ok ? "Complete" : "Result"}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(summary, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}