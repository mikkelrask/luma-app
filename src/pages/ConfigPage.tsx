import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "../components/ui/card";
import { Input, Label } from "../components/ui/input";
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
  const [roots, setRoots] = useState("");
  const [template, setTemplate] = useState("");
  const [rawDir, setRawDir] = useState("02_RAW");
  const [configs, setConfigs] = useState("");
  const [reports, setReports] = useState("");
  const [dropbox, setDropbox] = useState("");
  const [proxyPath, setProxyPath] = useState("");
  const [transformList, setTransformList] = useState<string[]>([]);
  const [profileList, setProfileList] = useState<string[]>([]);

  const load = async () => {
    const h = await runLuma(["config"], false);
    const r = await h.done;
    const c = (r.payload as ConfigData) ?? {};
    setRoots((c.roots ?? []).join(", "));
    setTemplate(c.template ?? "");
    setRawDir(c.raw_dir ?? "02_RAW");
    setConfigs(c.configs ?? "");
    setReports(c.reports ?? "");
    setDropbox(c.dropbox ?? "");
    setProxyPath(c.proxy_path ?? "");
    setTransformList(c.transforms ?? []);
    setProfileList((c.profiles ?? []).map((p) => p.name));
    setLoaded(true);
  };

  useEffect(() => {
    load();
  }, []);

  const applyJob = useLumaJob(
    () => {
      const args = ["config"];
      if (roots) args.push("--roots", roots);
      if (template) args.push("--template", template);
      if (rawDir) args.push("--raw-dir", rawDir);
      if (configs) args.push("--configs", configs);
      if (reports) args.push("--reports", reports);
      if (dropbox) args.push("--dropbox", dropbox);
      if (proxyPath) args.push("--proxy-path", proxyPath);
      args.push("--apply");
      return args;
    },
    false,
  );

  const row = (label: string, value: string, onChange: (v: string) => void, ph: string) => (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Configuration</h1>
        <Button variant="outline" onClick={load} disabled={!loaded}>Reload</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {profileList.map((p) => (
          <Badge key={p} className="bg-zinc-700/40 text-zinc-300">{p}</Badge>
        ))}
        {transformList.map((t) => (
          <Badge key={t} className="bg-cyan-600/15 text-cyan-300">{t}</Badge>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environmental settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {row("Production roots (comma-separated)", roots, setRoots, "/Volumes/luma/productions")}
          {row("Template directory", template, setTemplate, "/path/to/template")}
          {row("Raw/ingest folder name", rawDir, setRawDir, "02_RAW")}
          {row("Production configs path", configs, setConfigs, "/path/to/configs")}
          {row("Reports path", reports, setReports, "/path/to/reports")}
          {row("Dailies dropbox path", dropbox, setDropbox, "/path/to/dropbox")}
          {row("Proxy path", proxyPath, setProxyPath, "/path/to/proxy")}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => applyJob.run()} disabled={applyJob.ui.running}>
          {applyJob.ui.running ? "Saving…" : "Save configuration"}
        </Button>
        {applyJob.ui.running && <span className="text-sm text-zinc-400">{applyJob.ui.message}</span>}
      </div>

      {applyJob.ui.error && (
        <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
          {applyJob.ui.error}
        </div>
      )}
    </div>
  );
}
