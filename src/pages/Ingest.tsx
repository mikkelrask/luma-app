import { useEffect, useId, useState } from "react";
import { CheckIcon, Usb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { EmptyState } from "@/components/EmptyState";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLumaJob } from "@/lib/useLumaJob";
import { runLuma } from "@/lib/luma";
import { useProductions } from "@/lib/useProductions";
import { useLinkedProduction } from "@/lib/session";

interface Volume {
  name: string;
  path: string;
  size_gb: number;
  is_removable: boolean;
  is_network: boolean;
}

function formatGb(gb: number): string {
  if (gb <= 0) return "Unknown size";
  if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`;
  return `${gb % 1 === 0 ? gb : gb.toFixed(1)} GB`;
}

function VolumeIcon({ network, selected }: { network: boolean; selected: boolean }) {
  const uid = useId();
  const bodyId = `${uid}-body`;
  const topLight = network ? "#93c5fd" : "#f4f4f5";
  const topDark = network ? "#2563eb" : "#a1a1aa";
  const led = selected ? (network ? "#22d3ee" : "#22c55e") : "#d4d4d8";

  return (
    <svg viewBox="0 0 64 64" className="size-12" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={topLight} />
          <stop offset="1" stopColor={topDark} />
        </linearGradient>
      </defs>
      <rect x="10" y="16" width="44" height="34" rx="8" fill={`url(#${bodyId})`} />
      <rect x="10" y="16" width="44" height="11" rx="8" fill="rgba(255,255,255,0.22)" />
      <rect x="17" y="38" width="30" height="3" rx="1.5" fill="rgba(0,0,0,0.28)" />
      <rect x="17" y="43" width="30" height="3" rx="1.5" fill="rgba(0,0,0,0.28)" />
      <circle cx="48" cy="27" r="2.6" fill={led} />
    </svg>
  );
}

export function Ingest() {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [volume, setVolume] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [volumesLoading, setVolumesLoading] = useState(false);
  const [day, setDay] = useState("");
  const [mediaType, setMediaType] = useState("video");

  const { productions, daysFor, loading } = useProductions();
  const { production, setProduction } = useLinkedProduction({ productions, loading });

  const refreshVolumes = async (includeAll: boolean) => {
    setVolumesLoading(true);
    try {
      const h = await runLuma(
        ["ingest", "--list-volumes", ...(includeAll ? ["--all-volumes"] : [])],
        false,
      );
      const r = await h.done;
      const list = (r.payload as { volumes?: Volume[] })?.volumes ?? [];
      setVolumes(list);
    } finally {
      setVolumesLoading(false);
    }
  };

  useEffect(() => {
    refreshVolumes(showAll);
  }, [showAll]);

  const { ui, run, cancel } = useLumaJob(
    () => {
      const args = ["ingest"];
      if (production) args.push("--production", production);
      if (day) args.push("--day", day);
      if (mediaType) args.push("--media-type", mediaType);
      if (volume) args.push("--volume", volume);
      return args;
    },
    {
      progress: true,
      kind: "ingest",
      label: `Ingest · ${production || "?"}${day ? ` · Day ${day}` : ""} (${mediaType})`,
    },
  );

  const report = ui.result as
    | {
        production_name?: string;
        day?: string;
        media_type?: string;
        files_copied?: number;
        files_verified?: number;
        files_failed?: number;
        report_files?: Record<string, string>;
        failed_files?: Array<{ file: string; error: string }>;
        status?: string;
      }
    | null;

  const productionOptions = productions.map((p) => ({
    value: p.name,
    label: p.name + (p.is_archived ? " (archived)" : ""),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Capture"
        title="Ingest"
        description="Offload and verify camera cards into the selected production."
        actions={<RefreshButton onRefresh={() => refreshVolumes(showAll)} loading={volumesLoading} />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Card readers</span>
            <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Removable only" : "View all"}
            </Button>
          </CardTitle>
          <CardDescription>{showAll ? "Removable, network and other mounted volumes" : "Removable volumes on this machine"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {volumes.length === 0 && (
            <EmptyState
              compact
              icon={Usb}
              title={showAll ? "No volumes found" : "No card readers found"}
              hint={
                showAll
                  ? "Nothing is mounted on this machine right now."
                  : "Insert a card reader, then refresh."
              }
            />
          )}
          <div className="grid grid-cols-4 gap-3">
            {volumes.map((v) => {
              const active = volume === v.path;
              return (
                <button
                  key={v.path}
                  type="button"
                  onClick={() => setVolume(v.path)}
                  aria-pressed={active}
                  className={`group relative flex flex-col items-center gap-2 overflow-hidden rounded-xl border px-3 py-5 text-center transition-all ${
                    active
                      ? "border-primary/70 bg-gradient-to-b from-primary/15 to-primary/[0.03] shadow-[0_18px_40px_-28px_var(--primary)]"
                      : "border-border bg-background/50 hover:-translate-y-0.5 hover:border-white/20 hover:bg-background"
                  }`}
                >
                  {active && (
                    <>
                      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                      <span className="absolute right-2 top-2 rounded-full bg-primary p-0.5 shadow-[0_0_10px_1px_var(--primary)]">
                        <CheckIcon className="size-3 text-primary-foreground" />
                      </span>
                    </>
                  )}
                  <VolumeIcon network={v.is_network} selected={active} />
                  <span
                    className={`max-w-full truncate text-sm ${
                      active ? "font-medium text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {v.name}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground/70">
                    {formatGb(v.size_gb)}
                  </span>
                  {v.is_network && (
                    <Badge variant="secondary" className="text-[10px]">network</Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingest job</CardTitle>
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
              value={day}
              onChange={setDay}
              options={daysFor(production).map((d) => ({ value: d, label: `Day ${d}` }))}
              placeholder="Select day…"
              emptyText="No days for this production."
            />
          </div>
          <div className="space-y-2">
            <Label>Media type</Label>
            <Select value={mediaType} onValueChange={setMediaType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
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
        <Button variant="default" onClick={() => run()} disabled={ui.running || !production || !day}>
          {ui.running ? "Ingesting…" : "Start ingest"}
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

      {report && !ui.running && (
        <Card>
          <CardHeader>
            <CardTitle>Ingest report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {report.production_name} · day {report.day}
              {report.media_type ? ` · ${report.media_type}` : ""}
              {report.status ? ` · ${report.status}` : ""}
            </div>
            <div className="text-sm text-muted-foreground">
              {report.files_copied ?? 0} copied · {report.files_verified ?? 0} verified
              {report.files_failed ? ` · ${report.files_failed} failed` : ""}
            </div>
            {report.report_files && Object.keys(report.report_files).length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Reports: </span>
                <span className="font-mono text-xs">
                  {Object.entries(report.report_files)
                    .map(([kind, p]) => `${kind} → ${p}`)
                    .join("\n")}
                </span>
              </div>
            )}
            {Array.isArray(report.failed_files) && report.failed_files.length > 0 && (
              <div className="rounded-md border border-red-700 bg-red-950/40 p-3">
                <div className="text-sm font-medium text-red-300 mb-1">Failures</div>
                <pre className="overflow-x-auto text-xs text-red-200">{JSON.stringify(report.failed_files, null, 2)}</pre>
              </div>
            )}
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(report, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}