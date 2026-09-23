import { useState } from "react";
import { cn } from "cn";
import { CropIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldHint } from "@/components/ui/field-hint";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useLumaJob } from "@/lib/useLumaJob";
import { useLibrary, type Transform } from "@/pages/Library";

const ASPECT_PRESETS = [
  { value: "2.39", label: "2.39:1" },
  { value: "1.85", label: "1.85:1" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1.33", label: "1.33:1" },
];
const CUSTOM_ASPECT = "__custom__";

function formatTransformValue(t: Transform): string {
  if (t.type === "letterbox") {
    const a = t.target_aspect;
    if (a == null || a <= 0) return "—";
    return `${Number(a.toFixed(2))}:1`;
  }
  const f = t.factor;
  if (f == null || f <= 1) return "—";
  return `${Number(f.toFixed(2))}x`;
}

function AddTransformDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"letterbox" | "zoom">("letterbox");
  const [aspect, setAspect] = useState(ASPECT_PRESETS[0].value);
  const [customAspect, setCustomAspect] = useState("");
  const [factor, setFactor] = useState(1.5);

  const createJob = useLumaJob(
    () => {
      const args = ["transforms", "create", "--name", name, "--type", type];
      if (type === "letterbox") {
        args.push("--target-aspect", aspect === CUSTOM_ASPECT ? customAspect : aspect);
      } else {
        args.push("--factor", String(factor));
      }
      return args;
    },
    {
      progress: false,
      kind: "transforms",
      label: `Add transform · ${name || "Unnamed"}`,
    },
  );

  const aspectValue = aspect === CUSTOM_ASPECT ? customAspect : aspect;
  const valid = name.trim() !== "" && (type === "zoom" || aspectValue.trim() !== "");

  const handleCreate = async () => {
    await createJob.run((s) => {
      if (!s.error) {
        onCreated();
        onClose();
      }
    });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add transform</DialogTitle>
          <DialogDescription>
            A visual transform (letterbox or zoom) that transcode/ingest can apply.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cinematic" />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["letterbox", "zoom"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    type === t
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {t === "letterbox" ? "Letterbox" : "Zoom"}
                </button>
              ))}
            </div>
            <FieldHint>
              {type === "letterbox"
                ? "Pad the frame to a target aspect ratio"
                : "Crop into the frame by a zoom factor"}
            </FieldHint>
          </div>
          {type === "letterbox" ? (
            <div className="col-span-2 space-y-2">
              <Label>Target aspect ratio</Label>
              <Select value={aspect} onValueChange={setAspect}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_PRESETS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_ASPECT}>Custom…</SelectItem>
                </SelectContent>
              </Select>
              {aspect === CUSTOM_ASPECT && (
                <Input
                  value={customAspect}
                  onChange={(e) => setCustomAspect(e.target.value)}
                  placeholder="e.g. 2.39, 16:9"
                />
              )}
              <FieldHint>Common theatrical ratios; custom accepts decimals or W:H</FieldHint>
            </div>
          ) : (
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Zoom factor — must be greater than 1</span>
                <span className="font-medium tabular-nums">{typeof factor === "number" ? `${factor.toFixed(2)}x` : "—"}</span>
              </div>
              <Slider min={1.05} max={3} step={0.05} value={[factor]} onValueChange={(v) => setFactor(v[0] ?? 1.5)} />
              <FieldHint>Crop into the frame; 1.5x is a typical punch-in</FieldHint>
            </div>
          )}
        </div>
        {createJob.ui.error && (
          <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">{createJob.ui.error}</div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createJob.ui.running}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createJob.ui.running || !valid}>
            {createJob.ui.running ? "Creating…" : "Add transform"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TransformsTab() {
  const { transforms, refresh } = useLibrary();
  const [transformDeleteName, setTransformDeleteName] = useState("");
  const [transformDialogOpen, setTransformDialogOpen] = useState(false);

  const transformDeleteJob = useLumaJob(
    () => ["transforms", "delete", "--name", transformDeleteName, "--yes"],
    {
      progress: false,
      kind: "transforms",
      label: `Delete transform · ${transformDeleteName || "?"}`,
    },
  );

  const confirmTransformDelete = async () => {
    await transformDeleteJob.run((s) => {
      if (!s.error) setTransformDeleteName("");
    });
    refresh();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Visual transforms</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setTransformDialogOpen(true)}>
              <PlusIcon className="size-4" /> Add transform
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {transforms.length === 0 && (
            <EmptyState
              compact
              icon={CropIcon}
              title="No visual transforms yet"
              hint="Add a letterbox or zoom preset — no manual INI edits."
              action={null}
            />
          )}
          {transforms.map((t) => (
            <div key={t.name} className="flex flex-1 basis-72 flex-col rounded-lg border border-border bg-background/60 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t.name}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary">{t.type === "letterbox" ? "Letterbox" : "Zoom"}</Badge>
                  <button
                    type="button"
                    onClick={() => setTransformDeleteName(t.name)}
                    aria-label={`Delete ${t.name}`}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-950/40 hover:text-red-300"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{formatTransformValue(t)}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={transformDeleteName !== ""} onOpenChange={(open) => { if (!open) setTransformDeleteName(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete transform?</DialogTitle>
            <DialogDescription>
              "{transformDeleteName}" will be removed permanently. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {transformDeleteJob.ui.error && (
            <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">{transformDeleteJob.ui.error}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransformDeleteName("")}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmTransformDelete} disabled={transformDeleteJob.ui.running || !transformDeleteName}>
              {transformDeleteJob.ui.running ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {transformDialogOpen && (
        <AddTransformDialog
          onClose={() => setTransformDialogOpen(false)}
          onCreated={refresh}
        />
      )}
    </div>
  );
}