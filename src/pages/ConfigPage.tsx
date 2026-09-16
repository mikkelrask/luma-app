import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePicker } from "@/components/ui/file-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PathListPicker } from "@/components/ui/path-list-picker";
import { FieldHint } from "@/components/ui/field-hint";
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoadError(null);
    try {
      const h = await runLuma(["config"], false);
      const r = await h.done;
      if (r.code && r.code !== 0) {
        setLoadError(r.logs.join("\n") || "Failed to load settings");
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
      label: "Save settings",
    },
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Button variant="outline" onClick={load} disabled={!loaded}>Reload</Button>
      </div>

      {loadError && (
        <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
          {loadError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>New productions</CardTitle>
          <CardDescription>Where new productions are created</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Production roots</Label>
            <PathListPicker
              value={roots}
              onChange={setRoots}
              placeholder="/Volumes/luma/productions"
            />
            <FieldHint>The volumes where new productions are created</FieldHint>
          </div>
          <div className="space-y-2">
            <Label>Template directory</Label>
            <FilePicker
              directory
              value={template}
              onChange={setTemplate}
              placeholder="/path/to/template"
            />
            <FieldHint>The folder structure copied for every new production</FieldHint>
          </div>
          <div className="space-y-2">
            <Label>Raw/ingest folder name</Label>
            <Input value={rawDir} onChange={(e) => setRawDir(e.target.value)} placeholder="02_RAW" />
            <FieldHint>The folder in the structure that holds raw footage</FieldHint>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exports</CardTitle>
          <CardDescription>Where dailies and proxies are exported</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Dailies location</Label>
            <FilePicker
              directory
              value={dropbox}
              onChange={setDropbox}
              placeholder="/path/to/dailies"
            />
          </div>
          <div className="space-y-2">
            <Label>Proxy location</Label>
            <FilePicker
              directory
              value={proxyPath}
              onChange={setProxyPath}
              placeholder="/path/to/proxy"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Luma files</CardTitle>
          <CardDescription>Where luma keeps configurations and reports</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Production configs location</Label>
            <FilePicker
              directory
              value={configs}
              onChange={setConfigs}
              placeholder="/path/to/configs"
            />
            <FieldHint>Where luma stores per-production settings files</FieldHint>
          </div>
          <div className="space-y-2">
            <Label>Reports location</Label>
            <FilePicker
              directory
              value={reports}
              onChange={setReports}
              placeholder="/path/to/reports"
            />
            <FieldHint>Where ingest PDF and JSON reports are saved</FieldHint>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="default" onClick={() => applyJob.run()} disabled={applyJob.ui.running}>
          {applyJob.ui.running ? "Saving…" : "Save settings"}
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