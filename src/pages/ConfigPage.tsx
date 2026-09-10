import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePicker } from "@/components/ui/file-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PathListPicker } from "@/components/ui/path-list-picker";
import { useLumaJob } from "../lib/useLumaJob";
import { runLuma } from "../lib/luma";

interface ConfigData {
  roots?: string[];
  template?: string;
  raw_dir?: string;
  configs?: string;
  reports?: string;
  dropbox?: string;
  proxy_path?: string;
  profiles?: Array<{ name: string }>;
  transforms?: string[];
}

export function ConfigPage() {
  const [loaded, setLoaded] = useState(false);
  const [roots, setRoots] = useState<string[]>([]);
  const [template, setTemplate] = useState("");
  const [rawDir, setRawDir] = useState("02_RAW");
  const [configs, setConfigs] = useState("");
  const [reports, setReports] = useState("");
  const [dropbox, setDropbox] = useState("");
  const [proxyPath, setProxyPath] = useState("");
  const [transformList, setTransformList] = useState<string[]>([]);
  const [profileList, setProfileList] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoadError(null);
    try {
      const h = await runLuma(["config"], false);
      const r = await h.done;
      if (r.code && r.code !== 0) {
        setLoadError(r.logs.join("\n") || "Failed to load configuration");
        return;
      }
      const c = (r.payload as ConfigData) ?? {};
      setRoots(c.roots ?? []);
      setTemplate(c.template ?? "");
      setRawDir(c.raw_dir ?? "02_RAW");
      setConfigs(c.configs ?? "");
      setReports(c.reports ?? "");
      setDropbox(c.dropbox ?? "");
      setProxyPath(c.proxy_path ?? "");
      setTransformList(c.transforms ?? []);
      setProfileList((c.profiles ?? []).map((p) => p.name));
      setLoaded(true);
    } catch (e) {
      setLoadError(String(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const applyJob = useLumaJob(
    () => {
      const args = ["config"];
      if (roots.length > 0) args.push("--roots", roots.join(","));
      if (template) args.push("--template", template);
      if (rawDir) args.push("--raw-dir", rawDir);
      if (configs) args.push("--configs", configs);
      if (reports) args.push("--reports", reports);
      if (dropbox) args.push("--dropbox", dropbox);
      if (proxyPath) args.push("--proxy-path", proxyPath);
      args.push("--apply");
      return args;
    },
    {
      progress: false,
      kind: "config",
      label: "Save configuration",
    },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Configuration</h1>
        <Button variant="outline" onClick={load} disabled={!loaded}>Reload</Button>
      </div>

      {loadError && (
        <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
          {loadError}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {profileList.map((p) => (
          <Badge key={p} className="bg-secondary text-secondary-foreground">{p}</Badge>
        ))}
        {transformList.map((t) => (
          <Badge key={t} className="bg-primary/15 text-primary">{t}</Badge>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environmental settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Production roots</Label>
            <PathListPicker
              value={roots}
              onChange={setRoots}
              placeholder="/Volumes/luma/productions"
            />
          </div>
          <div className="space-y-2">
            <Label>Template directory</Label>
            <FilePicker
              directory
              value={template}
              onChange={setTemplate}
              placeholder="/path/to/template"
            />
          </div>
          <div className="space-y-2">
            <Label>Raw/ingest folder name</Label>
            <Input value={rawDir} onChange={(e) => setRawDir(e.target.value)} placeholder="02_RAW" />
          </div>
          <div className="space-y-2">
            <Label>Production configs path</Label>
            <FilePicker
              directory
              value={configs}
              onChange={setConfigs}
              placeholder="/path/to/configs"
            />
          </div>
          <div className="space-y-2">
            <Label>Reports path</Label>
            <FilePicker
              directory
              value={reports}
              onChange={setReports}
              placeholder="/path/to/reports"
            />
          </div>
          <div className="space-y-2">
            <Label>Dailies dropbox path</Label>
            <FilePicker
              directory
              value={dropbox}
              onChange={setDropbox}
              placeholder="/path/to/dropbox"
            />
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
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="default" onClick={() => applyJob.run()} disabled={applyJob.ui.running}>
          {applyJob.ui.running ? "Saving…" : "Save configuration"}
        </Button>
        {applyJob.ui.running && <span className="text-sm text-muted-foreground">{applyJob.ui.message}</span>}
      </div>

      {applyJob.ui.error && (
        <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
          {applyJob.ui.error}
        </div>
      )}
    </div>
  );
}