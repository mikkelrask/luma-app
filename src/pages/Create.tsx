import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input, Label, Select } from "../components/ui/input";
import { useLumaJob } from "../lib/useLumaJob";
import { runLuma } from "../lib/luma";

interface ConfigData {
  roots?: string[];
  profiles?: Array<{ name: string }>;
  transforms?: string[];
}

export function Create() {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [offDays, setOffDays] = useState("");
  const [extraDays, setExtraDays] = useState("");
  const [weekend, setWeekend] = useState("");
  const [dailies, setDailies] = useState("");
  const [proxy, setProxy] = useState("");
  const [proxyPath, setProxyPath] = useState("");
  const [lut, setLut] = useState("");
  const [transform, setTransform] = useState("");
  const [config, setConfig] = useState<ConfigData | null>(null);

  useEffect(() => {
    runLuma(["config"], false).then((h) =>
      h.done.then((r) => setConfig((r.payload as ConfigData) ?? null)),
    );
  }, []);

  const { ui, run } = useLumaJob(() => {
    const args = ["create"];
    if (name) args.push("--name", name);
    if (startDate) args.push("--start-date", startDate);
    if (endDate) args.push("--end-date", endDate);
    if (offDays) args.push("--off-days", offDays);
    if (extraDays) args.push("--extra-days", extraDays);
    if (weekend) args.push("--weekend", weekend);
    if (dailies) args.push("--dailies", dailies);
    if (proxy) args.push("--proxy", proxy);
    if (proxyPath) args.push("--proxy-path", proxyPath);
    if (lut) args.push("--lut", lut);
    if (transform) args.push("--transform", transform);
    return args;
  }, false);

  const profileNames = config?.profiles?.map((p) => p.name) ?? [];

  const result = ui.result as
    | { production?: string; created_paths?: string[]; production_days?: string[] }
    | null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Production</h1>

      <Card>
        <CardHeader>
          <CardTitle>Production details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Show name" />
          </div>
          <div>
            <Label>Start date</Label>
            <Input value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <Label>End date</Label>
            <Input value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <Label>Weekends are production days?</Label>
            <Select value={weekend} onChange={(e) => setWeekend(e.target.value)}>
              <option value="">Default</option>
              <option value="y">Yes</option>
              <option value="n">No</option>
            </Select>
          </div>
          <div>
            <Label>Off days (comma-separated)</Label>
            <Input value={offDays} onChange={(e) => setOffDays(e.target.value)} placeholder="YYYY-MM-DD,YYYY-MM-DD" />
          </div>
          <div>
            <Label>Extra days (comma-separated)</Label>
            <Input value={extraDays} onChange={(e) => setExtraDays(e.target.value)} placeholder="YYYY-MM-DD,YYYY-MM-DD" />
          </div>
          <div>
            <Label>Dailies profile</Label>
            <Select value={dailies} onChange={(e) => setDailies(e.target.value)}>
              <option value="">None</option>
              {profileNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Proxy profile</Label>
            <Select value={proxy} onChange={(e) => setProxy(e.target.value)}>
              <option value="">None</option>
              {profileNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Proxy path</Label>
            <Input value={proxyPath} onChange={(e) => setProxyPath(e.target.value)} placeholder="/path/to/proxy" />
          </div>
          <div>
            <Label>LUT (.cube)</Label>
            <Input value={lut} onChange={(e) => setLut(e.target.value)} placeholder="/path/to/lut.cube" />
          </div>
          <div>
            <Label>Transform</Label>
            <Select value={transform} onChange={(e) => setTransform(e.target.value)}>
              <option value="">None</option>
              {(config?.transforms ?? []).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => run()} disabled={ui.running || !name}>
          {ui.running ? "Creating…" : "Create production"}
        </Button>
        {ui.running && <span className="text-sm text-zinc-400">{ui.message}</span>}
      </div>

      {ui.error && (
        <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
          {ui.error}
        </div>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Created {result.production}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium text-zinc-400 mb-1">Production days</div>
              <div className="flex flex-wrap gap-1">
                {(result.production_days ?? []).map((d) => (
                  <span key={d} className="rounded bg-zinc-800 px-2 py-0.5 text-xs">{d}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-400 mb-1">Created paths</div>
              <ul className="space-y-1">
                {(result.created_paths ?? []).map((p) => (
                  <li key={p} className="rounded bg-zinc-950 px-2 py-1 text-xs text-zinc-300">{p}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
