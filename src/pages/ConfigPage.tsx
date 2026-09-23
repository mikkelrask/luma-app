import { useEffect, useState } from "react";
import { LayersIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilePicker } from "@/components/ui/file-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PathListPicker } from "@/components/ui/path-list-picker";
import { FieldHint } from "@/components/ui/field-hint";
import { useLumaJob } from "../lib/useLumaJob";
import { runLuma } from "../lib/luma";
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

interface Lut {
  name: string;
  size?: number;
  modified?: string;
}

function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatModified(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
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
  const [luts, setLuts] = useState<Lut[]>([]);
  const [lutsLoading, setLutsLoading] = useState(false);
  const [addLutPath, setAddLutPath] = useState("");
  const [addLutOpen, setAddLutOpen] = useState(false);
  const [deleteLutName, setDeleteLutName] = useState("");
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

  const loadLuts = async () => {
    setLutsLoading(true);
    try {
      const h = await runLuma(["luts", "list"], false);
      const r = await h.done;
      if (r.code && r.code !== 0) {
        setLoadError(r.logs.join("\n") || "Failed to load LUTs");
        return;
      }
      setLuts((r.payload as { luts?: Lut[] })?.luts ?? []);
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setLutsLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([load(), loadLuts()]);
  };

  const addLutJob = useLumaJob(
    () => ["luts", "add", addLutPath],
    {
      progress: false,
      kind: "luts",
      label: `Import LUT · ${addLutPath.split(/[\\/]/).pop() || "?"}`,
    },
  );

  const confirmAddLut = async () => {
    await addLutJob.run((s) => {
      if (!s.error) {
        setAddLutPath("");
        setAddLutOpen(false);
      }
    });
    loadLuts();
  };

  const deleteLutJob = useLumaJob(
    () => ["luts", "delete", "--name", deleteLutName, "--yes"],
    {
      progress: false,
      kind: "luts",
      label: `Delete LUT · ${deleteLutName || "?"}`,
    },
  );

  const confirmDeleteLut = async () => {
    await deleteLutJob.run((s) => {
      if (!s.error) setDeleteLutName("");
    });
    loadLuts();
  };

  useEffect(() => {
    load();
    loadLuts();
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
        actions={<RefreshButton onRefresh={refreshAll} loading={busy || lutsLoading} disabled={!loaded} />}
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
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>LUTs</CardTitle>
              <CardDescription>In-app color LUTs available to productions</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAddLutOpen(true)}>
              <PlusIcon className="size-4" /> Add LUT
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {luts.length === 0 && (
            <EmptyState
              compact
              icon={LayersIcon}
              title="No LUTs yet"
              hint="Import a .cube file to make it available to new productions."
              action={null}
            />
          )}
          {luts.map((lut) => (
            <div
              key={lut.name}
              className="flex flex-1 basis-72 flex-col rounded-lg border border-border bg-background/60 px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{lut.name}</span>
                <button
                  type="button"
                  onClick={() => setDeleteLutName(lut.name)}
                  aria-label={`Delete ${lut.name}`}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-950/40 hover:text-red-300"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatSize(lut.size)}
                {lut.modified ? ` · ${formatModified(lut.modified)}` : ""}
              </div>
            </div>
          ))}
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

      <Dialog open={addLutOpen} onOpenChange={(open) => { if (!open) setAddLutOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add LUT</DialogTitle>
            <DialogDescription>
              Import a .cube color LUT so it can be used by new productions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>LUT file (.cube)</Label>
            <FilePicker
              value={addLutPath}
              onChange={setAddLutPath}
              placeholder="/path/to/lut.cube"
              extensions={["cube"]}
            />
          </div>
          {addLutJob.ui.error && (
            <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
              {addLutJob.ui.error}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLutOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={confirmAddLut} disabled={addLutJob.ui.running || !addLutPath}>
              {addLutJob.ui.running ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteLutName !== ""} onOpenChange={(open) => { if (!open) setDeleteLutName(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete LUT?</DialogTitle>
            <DialogDescription>
              "{deleteLutName}" will be removed from the app. Productions that reference it will not be able to use it.
            </DialogDescription>
          </DialogHeader>
          {deleteLutJob.ui.error && (
            <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
              {deleteLutJob.ui.error}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteLutName("")}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteLut} disabled={deleteLutJob.ui.running || !deleteLutName}>
              {deleteLutJob.ui.running ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}