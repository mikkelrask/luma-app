import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { FilePicker } from "@/components/ui/file-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiDatePicker } from "@/components/ui/multi-date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLumaJob } from "@/lib/useLumaJob";
import { runLuma } from "@/lib/luma";

interface ConfigData {
  roots?: string[];
  profiles?: Array<{ name: string }>;
  transforms?: string[];
}

const NONE = "__none__";
const DEFAULT = "__default__";

export function Create() {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [offDays, setOffDays] = useState<string[]>([]);
  const [extraDays, setExtraDays] = useState<string[]>([]);
  const [weekend, setWeekend] = useState("");
  const [dailies, setDailies] = useState("");
  const [proxy, setProxy] = useState("");
  const [proxyPath, setProxyPath] = useState("");
  const [lut, setLut] = useState("");
  const [transform, setTransform] = useState("");
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    runLuma(["config"], false)
      .then(async (h) => {
        const r = await h.done;
        if (r.code && r.code !== 0) {
          setConfigError(r.logs.join("\n") || "Failed to load configuration");
          return;
        }
        setConfig((r.payload as ConfigData) ?? null);
      })
      .catch((e) => setConfigError(String(e)));
  }, []);

  const { ui, run } = useLumaJob(
    () => {
      const args = ["create"];
      if (name) args.push("--name", name);
      if (startDate) args.push("--start-date", startDate);
      if (endDate) args.push("--end-date", endDate);
      if (offDays.length > 0) args.push("--off-days", offDays.join(","));
      if (extraDays.length > 0) args.push("--extra-days", extraDays.join(","));
      if (weekend) args.push("--weekend", weekend);
      if (dailies) args.push("--dailies", dailies);
      if (proxy) args.push("--proxy", proxy);
      if (proxyPath) args.push("--proxy-path", proxyPath);
      if (lut) args.push("--lut", lut);
      if (transform) args.push("--transform", transform);
      return args;
    },
    {
      progress: false,
      kind: "create",
      label: `Create production · ${name || "New production"}`,
    },
  );

  const profileNames = config?.profiles?.map((p) => p.name) ?? [];

  const result = ui.result as
    | {
        production?: string;
        created_paths?: string[];
        production_days?: Array<string | { day: string; date: string }>;
      }
    | null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New Production</h1>

      {configError && (
        <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
          {configError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Production</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production title" />
          </div>
          <hr className="col-span-2" />
          <div className=" space-y-2">
            <Label>Production dates</Label>
            <DateRangePicker
              from={startDate}
              to={endDate}
              onChange={(from, to) => {
                setStartDate(from);
                setEndDate(to);
              }}
              placeholder="Pick start and end dates"
            />
          </div>
          <div className="space-y-2">
            <Label>Weekends are production days?</Label>
            <Select value={weekend || DEFAULT} onValueChange={(v) => setWeekend(v === DEFAULT ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT}>Default</SelectItem>
                <SelectItem value="y">Yes</SelectItem>
                <SelectItem value="n">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Off days</Label>
            <MultiDatePicker
              value={offDays}
              onChange={setOffDays}
              placeholder="Pick any dates that are not production days (need not be adjacent)"
            />
          </div>
          <div className="space-y-2">
            <Label>Extra days</Label>
            <MultiDatePicker
              value={extraDays}
              onChange={setExtraDays}
              placeholder="Pick any extra shoot days outside the normal schedule"
            />
          </div>
          <hr className="col-span-2" />
          <div className="space-y-2">
            <Label>Dailies profile</Label>
            <Select value={dailies || NONE} onValueChange={(v) => setDailies(v === NONE ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {profileNames.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Proxy profile</Label>
            <Select value={proxy || NONE} onValueChange={(v) => setProxy(v === NONE ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {profileNames.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Proxy path</Label>
            <FilePicker
              directory
              value={proxyPath}
              onChange={setProxyPath}
              placeholder="/path/to/proxy"
            />
          </div>
          <div className="space-y-2">
            <Label>LUT (.cube)</Label>
            <FilePicker
              extensions={["cube"]}
              value={lut}
              onChange={setLut}
              placeholder="/path/to/lut.cube"
            />
          </div>
          <div className="space-y-2">
            <Label>Transform</Label>
            <Select value={transform || NONE} onValueChange={(v) => setTransform(v === NONE ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {(config?.transforms ?? []).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="default" onClick={() => run()} disabled={ui.running || !name}>
          {ui.running ? "Creating…" : "Create production"}
        </Button>
        {ui.running && <span className="text-sm text-muted-foreground">{ui.message}</span>}
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
              <div className="text-sm font-medium text-muted-foreground mb-1">Production days</div>
              <div className="flex flex-wrap gap-1">
                {(result.production_days ?? []).map((d) => {
                  const label = typeof d === "string" ? d : `${d.day} · ${d.date}`;
                  const key = typeof d === "string" ? d : (d as { day: string }).day;
                  return (
                    <span key={key} className="rounded bg-muted px-2 py-0.5 text-xs">{label}</span>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Created paths</div>
              <ul className="space-y-1">
                {(result.created_paths ?? []).map((p) => (
                  <li key={p} className="rounded bg-background px-2 py-1 text-xs text-muted-foreground">{p}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
