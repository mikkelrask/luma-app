import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { useLumaJob } from "@/lib/useLumaJob";
import { useProductions } from "@/lib/useProductions";

export function Reports() {
  const [production, setProduction] = useState("");
  const [day, setDay] = useState("");

  const { productions, daysFor } = useProductions();

  const { ui, run } = useLumaJob(
    () => {
      const args = ["reports"];
      if (production) args.push("--production", production);
      if (day) args.push("--day", day);
      return args;
    },
    {
      progress: false,
      kind: "reports",
      label: `Report · ${production || "?"}${day ? ` · Day ${day}` : " · All days"}`,
    },
  );

  const result = ui.result as { ok?: boolean; reports?: unknown[] } | null;

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
      <h1 className="text-2xl font-semibold">Reports</h1>

      <Card>
        <CardHeader>
          <CardTitle>Re-generate ingest reports</CardTitle>
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
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="default" onClick={() => run()} disabled={ui.running || !production}>
          {ui.running ? "Generating…" : "Generate reports"}
        </Button>
        {ui.running && <span className="text-sm text-muted-foreground">{ui.message}</span>}
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
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}