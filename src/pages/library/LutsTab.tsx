import { useState } from "react";
import { LayersIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { useLumaJob } from "@/lib/useLumaJob";
import { useLibrary } from "@/pages/Library";

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

export function LutsTab() {
  const { luts, refresh } = useLibrary();
  const [addLutPath, setAddLutPath] = useState("");
  const [addLutOpen, setAddLutOpen] = useState(false);
  const [deleteLutName, setDeleteLutName] = useState("");

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
    refresh();
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
    refresh();
  };

  return (
    <div className="space-y-4">
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