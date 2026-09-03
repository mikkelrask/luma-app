import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input, Label } from "../components/ui/input";
import { useLumaJob } from "../lib/useLumaJob";

export function Reports() {
  const [production, setProduction] = useState("");
  const [day, setDay] = useState("");

  const { ui, run } = useLumaJob(
    () => {
      const args = ["reports"];
      if (production) args.push("--production", production);
      if (day) args.push("--day", day);
      return args;
    },
    false,
  );

  const result = ui.result as { ok?: boolean; reports?: unknown[] } | null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>

      <Card>
        <CardHeader>
          <CardTitle>Re-generate ingest reports</CardTitle>
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
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => run()} disabled={ui.running}>
          {ui.running ? "Generating…" : "Generate reports"}
        </Button>
        {ui.running && <span className="text-sm text-zinc-400">{ui.message}</span>}
      </div>

      {ui.error && (
        <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
          {ui.error}
        </div>
      )}

      {result && !ui.running && (
        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-zinc-950 p-4 text-xs text-zinc-300">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
