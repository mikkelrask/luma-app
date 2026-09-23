import { useEffect, useState } from "react";
import { openPath } from "@tauri-apps/plugin-opener";
import { FileText, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { RefreshButton } from "@/components/RefreshButton";
import { useLumaJob } from "@/lib/useLumaJob";
import { useProductions } from "@/lib/useProductions";
import { useLinkedProduction } from "@/lib/session";
import { runLuma } from "@/lib/luma";

interface ReportFile {
  filename: string;
  json: string;
  pdf: string | null;
  log: string | null;
  mtime: number;
  label: string;
}

interface ProductionReports {
  name: string;
  reports: ReportFile[];
}

interface ReportsListPayload {
  ok: boolean;
  error?: string;
  reports_root: string;
  productions: ProductionReports[];
}

export function Reports() {
  const [day, setDay] = useState("");
  const [list, setList] = useState<ReportsListPayload | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  const { productions, daysFor, loading } = useProductions();
  const { production, setProduction } = useLinkedProduction({ productions, loading });

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

  const loadList = async () => {
    setListLoading(true);
    try {
      const h = await runLuma(["reports", "list"], false);
      const r = await h.done;
      if (r.code && r.code !== 0) {
        setList(null);
        setListError(r.logs.join("\n") || "Could not load previously generated reports.");
        return;
      }
      const payload = r.payload as ReportsListPayload | null;
      if (payload?.ok === false) {
        setList(null);
        setListError(payload.error ?? "Could not load previously generated reports.");
        return;
      }
      setList(payload);
      setListError(payload ? null : "Could not load previously generated reports.");
    } catch (e) {
      setList(null);
      setListError(e instanceof Error ? e.message : "Could not load previously generated reports.");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    void loadList();
  }, []);

  const openReport = async (file: ReportFile) => {
    const target = file.pdf ?? file.json;
    try {
      await openPath(target);
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : `Could not open ${target}.`);
    }
  };

  const openReportsDir = async () => {
    if (!list?.reports_root) return;
    try {
      await openPath(list.reports_root);
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : "Could not open the reports directory.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Deliverables"
        title="Reports"
        description="Rebuild PDF and JSON ingest reports from saved data."
        actions={<RefreshButton onRefresh={loadList} loading={listLoading} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Re-generate ingest reports</CardTitle>
          <CardDescription>Rebuild PDF and JSON ingest reports from saved data</CardDescription>
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
        <Button
          variant="default"
          onClick={() => {
            void run(() => void loadList());
          }}
          disabled={ui.running || !production}
        >
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

      <Card>
        <CardHeader>
          <CardTitle>Previously generated reports</CardTitle>
          <CardDescription>Reports already saved on disk, grouped by production.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {listError ? (
            <p className="text-sm text-muted-foreground">{listError}</p>
          ) : !list?.reports_root ? (
            <p className="text-sm text-muted-foreground">
              No reports directory is configured yet. Generate a report or configure a reports path to see saved
              reports here.
            </p>
          ) : list.productions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports generated yet.</p>
          ) : (
            list.productions.map((prod) => (
              <div key={prod.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{prod.name}</h4>
                  <Button variant="ghost" size="sm" onClick={() => void openReportsDir()}>
                    <FolderOpen />
                    Open directory
                  </Button>
                </div>
                <ul className="space-y-1">
                  {prod.reports.map((report) => (
                    <li key={report.filename}>
                      <button
                        type="button"
                        onClick={() => void openReport(report)}
                        title={report.filename}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                      >
                        <FileText className="shrink-0 text-muted-foreground" />
                        <span className="min-w-0 truncate">{report.label || report.filename}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {format(new Date(report.mtime * 1000), "d LLL yyyy, HH:mm")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          {openError && <p className="text-sm text-red-300">{openError}</p>}
        </CardContent>
      </Card>
    </div>
  );
}