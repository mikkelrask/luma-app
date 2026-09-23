import { useEffect, useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { FilePicker } from "@/components/ui/file-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PathListPicker } from "@/components/ui/path-list-picker";
import { FieldHint } from "@/components/ui/field-hint";
import { useLumaJob } from "../lib/useLumaJob";
import { runLuma } from "../lib/luma";
import { useJobs } from "@/lib/jobs";
import { detectAccent, getThemePref, setThemePref, type ThemePref } from "../lib/theme";

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
  const { debug, toggleDebug } = useJobs();
  const [loaded, setLoaded] = useState(false);
  const [roots, setRoots] = useState<string[]>([]);
  const [template, setTemplate] = useState("");
  const [rawDir, setRawDir] = useState("02_RAW");
  const [configs, setConfigs] = useState("");
  const [reports, setReports] = useState("");
  const [dropbox, setDropbox] = useState("");
  const [proxyPath, setProxyPath] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [themePref, setTheme] = useState<ThemePref>(getThemePref);
  const [accent, setAccent] = useState<{ code: number; name: string } | null>(null);

  useEffect(() => {
    let last = -2;
    const check = async () => {
      const a = await detectAccent();
      const code = a ? a.code : -2;
      if (code !== last) {
        last = code;
        setAccent(a);
      }
    };
    void check();
    const t = window.setInterval(check, 2000);
    return () => window.clearInterval(t);
  }, []);

  const themeOptions: Array<{ value: ThemePref; label: string }> = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  const load = async () => {
    setLoadError(null);
    setBusy(true);
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
    } finally {
      setBusy(false);
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
      <PageHeader
        kicker="Manage"
        title="Settings"
        description="Paths and defaults used across the pipeline."
        actions={<RefreshButton onRefresh={load} loading={busy} disabled={!loaded} />}
      />

      {loadError && (
        <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
          {loadError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Follows macOS by default, including your accent color.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-background/40 p-1">
              {themeOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setTheme(o.value);
                    setThemePref(o.value);
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    themePref === o.value
                      ? "bg-primary font-medium text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <FieldHint>System matches the macOS appearance setting</FieldHint>
          </div>
          <div className="space-y-2">
            <Label>Accent color</Label>
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background/40 px-3 py-2">
              <span
                className="size-4 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.2)]"
                style={{ background: "var(--primary)" }}
              />
              <span className="text-sm">{accent ? accent.name : "Blue"}</span>
              <span className="ml-auto text-xs text-muted-foreground/70">from macOS</span>
            </div>
            <FieldHint>Change it in System Settings → Appearance</FieldHint>
          </div>
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle>Advanced</CardTitle>
          <CardDescription>Debug and diagnostics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label>Debug logging</Label>
              <FieldHint>Raw backend NDJSON is shown in the task console while enabled.</FieldHint>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={debug}
              onClick={toggleDebug}
              className={cn(
                "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none",
                debug ? "bg-primary" : "bg-border",
              )}
            >
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 size-5 rounded-full bg-foreground transition-transform",
                  debug && "translate-x-5",
                )}
              />
            </button>
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