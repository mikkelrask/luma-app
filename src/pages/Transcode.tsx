import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input, Label, Select } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import { useLumaJob } from "../lib/useLumaJob";

export function Transcode() {
  const [production, setProduction] = useState("");
  const [day, setDay] = useState("");
  const [mediaType, setMediaType] = useState("both");

  const { ui, run, cancel } = useLumaJob(
    () => {
      const args = ["transcode"];
      if (production) args.push("--production", production);
      if (day) args.push("--day", day);
      if (mediaType) args.push("--media-type", mediaType);
      return args;
    },
    true,
  );

  const summary = ui.result as { event?: string; ok?: boolean } | null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Transcode</h1>

      <Card>
        <CardHeader>
          <CardTitle>Transcode job</CardTitle>
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
            <Label>What to transcode</Label>
            <Select value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
              <option value="both">Both</option>
              <option value="dailies">Dailies</option>
              <option value="proxy">Proxy</option>
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
        <Button variant="primary" onClick={() => run()} disabled={ui.running || !production}>
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
            <pre className="overflow-x-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-300">
              {JSON.stringify(summary, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
