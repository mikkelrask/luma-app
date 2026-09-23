import { useState } from "react";
import { PencilIcon, PlusIcon, SlidersHorizontalIcon, Trash2Icon } from "lucide-react";
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
import { runLuma } from "@/lib/luma";
import { useLibrary, type Profile } from "@/pages/Library";

const CONTAINERS = [
  { value: "mp4", label: "MP4" },
  { value: "mov", label: "MOV (QuickTime)" },
  { value: "mxf", label: "MXF" },
];

const MODES = [
  { value: "single_file", label: "Single file" },
  { value: "multi_file", label: "Multi-file (OP-Atom MXF)" },
];

const CONTAINER_MODES = [
  { value: "op1a", label: "OP-1a" },
  { value: "opatom", label: "OP-Atom" },
];

const VIDEO_CODECS = [
  { value: "libx264", label: "H.264" },
  { value: "libx265", label: "H.265 / HEVC" },
  { value: "prores_ks", label: "Apple ProRes" },
  { value: "dnxhd", label: "DNxHD / DNxHR" },
  { value: "libvpx-vp9", label: "VP9" },
  { value: "libaom-av1", label: "AV1" },
];

const VIDEO_PROFILES: Record<string, { value: string; label: string }[]> = {
  libx264: [
    { value: "baseline", label: "Baseline" },
    { value: "main", label: "Main" },
    { value: "high", label: "High" },
  ],
  libx265: [
    { value: "main", label: "Main" },
    { value: "main10", label: "Main 10-bit" },
    { value: "main-intra", label: "Main intra" },
  ],
  prores_ks: [
    { value: "0", label: "ProRes Proxy" },
    { value: "1", label: "ProRes 422 LT" },
    { value: "2", label: "ProRes 422" },
    { value: "3", label: "ProRes 422 HQ" },
    { value: "4", label: "ProRes 4444" },
    { value: "5", label: "ProRes 4444 XQ" },
  ],
  dnxhd: [
    { value: "dnxhr_lb", label: "DNxHR LB" },
    { value: "dnxhr_sq", label: "DNxHR SQ" },
    { value: "dnxhr_hq", label: "DNxHR HQ" },
    { value: "dnxhr_444", label: "DNxHR 444" },
  ],
};

const PIX_FORMATS = [
  { value: "yuv420p", label: "4:2:0 8-bit" },
  { value: "yuv420p10le", label: "4:2:0 10-bit" },
  { value: "yuv422p", label: "4:2:2 8-bit" },
  { value: "yuv422p10le", label: "4:2:2 10-bit" },
];

const QUALITY_OPTIONS = [
  { value: "crf", label: "CRF (constant quality)" },
  { value: "bitrate", label: "Target bitrate" },
  { value: "none", label: "Codec defaults" },
] as const;

type Quality = (typeof QUALITY_OPTIONS)[number]["value"];

const BITRATES = [
  { value: "10M", label: "10 Mbps" },
  { value: "25M", label: "25 Mbps" },
  { value: "50M", label: "50 Mbps" },
  { value: "100M", label: "100 Mbps" },
];

const AUDIO_CODECS = [
  { value: "aac", label: "AAC" },
  { value: "pcm_s16le", label: "PCM 16-bit" },
  { value: "pcm_s24le", label: "PCM 24-bit" },
  { value: "libopus", label: "Opus" },
  { value: "libmp3lame", label: "MP3" },
];

const LOSSLESS_AUDIO = new Set(["pcm_s16le", "pcm_s24le"]);

const AUDIO_MODES = [
  { value: "passthrough", label: "Keep original" },
  { value: "split_streams", label: "Split streams (multi-channel)" },
  { value: "split_mono", label: "Split into mono files" },
  { value: "downmix_stereo", label: "Downmix to stereo" },
];

const SAMPLE_RATES = [
  { value: "44100", label: "44.1 kHz" },
  { value: "48000", label: "48 kHz" },
  { value: "96000", label: "96 kHz" },
];

const AUDIO_BITRATES = [
  { value: "128k", label: "128 kbps" },
  { value: "192k", label: "192 kbps" },
  { value: "256k", label: "256 kbps" },
  { value: "320k", label: "320 kbps" },
];

const NONE_BITRATE = "__default__";

const emptyForm = {
  name: "",
  container: "mp4",
  mode: "single_file",
  container_mode: "op1a",
  video_codec: "libx264",
  video_profile: "high",
  pix_fmt: "yuv420p",
  bitrate_v: "50M",
  audio_codec: "aac",
  audio_mode: "passthrough",
  audio_sample_rate: "48000",
  audio_bitrate: "",
  preserve_timecode: "true",
};

function useProfileForm(initial?: Profile | null) {
  const init = initial
    ? {
        name: initial.name ?? "",
        container: initial.container ?? "mp4",
        mode: initial.mode ?? "single_file",
        container_mode: initial.container_mode ?? "op1a",
        video_codec: initial.video_codec ?? "libx264",
        video_profile: initial.video_profile ?? "",
        pix_fmt: initial.pix_fmt ?? "yuv420p",
        bitrate_v: initial.bitrate_v ?? "50M",
        audio_codec: initial.audio_codec ?? "aac",
        audio_mode: initial.audio_mode ?? "passthrough",
        audio_sample_rate: String(initial.audio_sample_rate ?? 48000),
        audio_bitrate: initial.audio_bitrate ?? "",
        preserve_timecode: String(
          initial.preserve_timecode === undefined
            ? true
            : Boolean(initial.preserve_timecode),
        ),
      }
    : { ...emptyForm };

  const [form, setForm] = useState(init);
  const [crf, setCrf] = useState<number>(typeof initial?.crf === "number" ? initial.crf : 18);
  const [quality, setQuality] = useState<Quality>(
    initial?.crf != null ? "crf" : initial?.bitrate_v ? "bitrate" : "none",
  );

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const buildArgs = (name: string): string[] => {
    const args = ["profiles", "create", "--name", name];
    if (form.container) args.push("--container", form.container);
    if (form.mode) args.push("--mode", form.mode);
    if (
      form.container === "mxf" &&
      form.mode === "multi_file" &&
      form.container_mode
    ) {
      args.push("--container-mode", form.container_mode);
    }
    if (form.video_codec) args.push("--video-codec", form.video_codec);
    if (form.video_profile) args.push("--video-profile", form.video_profile);
    if (form.pix_fmt) args.push("--pix-fmt", form.pix_fmt);
    if (quality === "crf") args.push("--crf", String(crf));
    if (quality === "bitrate") args.push("--bitrate-v", form.bitrate_v);
    if (form.audio_codec) args.push("--audio-codec", form.audio_codec);
    if (form.audio_mode) args.push("--audio-mode", form.audio_mode);
    if (form.audio_sample_rate) {
      args.push("--audio-sample-rate", form.audio_sample_rate);
    }
    if (
      form.audio_codec &&
      !LOSSLESS_AUDIO.has(form.audio_codec) &&
      form.audio_bitrate
    ) {
      args.push("--audio-bitrate", form.audio_bitrate);
    }
    if (form.preserve_timecode) {
      args.push("--preserve-timecode", form.preserve_timecode);
    }
    return args;
  };

  const reset = () => {
    setForm({ ...emptyForm });
    setCrf(18);
    setQuality("crf");
  };

  return { form, crf, quality, set, setCrf, setQuality, buildArgs, reset };
}

type ProfileForm = ReturnType<typeof useProfileForm>;

function ProfileFields({ c }: { c: ProfileForm }) {
  const { form, crf, quality, set, setCrf, setQuality } = c;

  const codecOptions = VIDEO_CODECS.some((o) => o.value === form.video_codec)
    ? VIDEO_CODECS
    : [...VIDEO_CODECS, { value: form.video_codec, label: form.video_codec }];

  const profileBase = VIDEO_PROFILES[form.video_codec] ?? [];
  const profileOptions =
    form.video_profile && !profileBase.some((o) => o.value === form.video_profile)
      ? [...profileBase, { value: form.video_profile, label: form.video_profile }]
      : profileBase;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 space-y-2">
        <Label>Name *</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Dailies 4K H.264" />
      </div>

      <hr className="col-span-2" />
      <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Output
      </span>
      <div className="space-y-2">
        <Label>Container</Label>
        <Select value={form.container} onValueChange={(v) => set("container", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTAINERS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Mode</Label>
        <Select value={form.mode} onValueChange={(v) => set("mode", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {form.container === "mxf" && form.mode === "multi_file" && (
        <div className="col-span-2 space-y-2">
          <Label>MXF container mode</Label>
          <Select value={form.container_mode} onValueChange={(v) => set("container_mode", v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTAINER_MODES.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <hr className="col-span-2" />
      <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Video
      </span>
      <div className={profileOptions.length === 0 ? "col-span-2 space-y-2" : "space-y-2"}>
        <Label>Video codec</Label>
        <Select
          value={form.video_codec}
          onValueChange={(v) => {
            set("video_codec", v);
            const next = VIDEO_PROFILES[v] ?? [];
            set("video_profile", next[0]?.value ?? "");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {codecOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {profileOptions.length > 0 && (
        <div className="space-y-2">
          <Label>Video profile</Label>
          <Select value={form.video_profile} onValueChange={(v) => set("video_profile", v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profileOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldHint>Profile presets vary per codec</FieldHint>
        </div>
      )}
      <div className="space-y-2">
        <Label>Pixel format</Label>
        <Select value={form.pix_fmt} onValueChange={(v) => set("pix_fmt", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIX_FORMATS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Quality</Label>
        <Select value={quality} onValueChange={(v) => setQuality(v as Quality)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUALITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {quality === "crf" && (
        <div className="col-span-2 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">CRF — lower is higher quality</span>
            <span className="font-medium tabular-nums">{crf}</span>
          </div>
          <Slider min={0} max={51} step={1} value={[crf]} onValueChange={(v) => setCrf(v[0])} />
          <FieldHint>Lower values give better quality and larger files; 18–23 is a good range</FieldHint>
        </div>
      )}
      {quality === "bitrate" && (
        <div className="col-span-2 space-y-2">
          <Label>Target bitrate</Label>
          <Select value={form.bitrate_v} onValueChange={(v) => set("bitrate_v", v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BITRATES.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <hr className="col-span-2" />
      <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Audio
      </span>
      <div className="space-y-2">
        <Label>Audio codec</Label>
        <Select value={form.audio_codec} onValueChange={(v) => set("audio_codec", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIO_CODECS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Audio mode</Label>
        <Select value={form.audio_mode} onValueChange={(v) => set("audio_mode", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIO_MODES.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldHint>How the original audio tracks are handled</FieldHint>
      </div>
      <div className="space-y-2">
        <Label>Sample rate</Label>
        <Select value={form.audio_sample_rate} onValueChange={(v) => set("audio_sample_rate", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SAMPLE_RATES.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!LOSSLESS_AUDIO.has(form.audio_codec) && (
        <div className="space-y-2">
          <Label>Audio bitrate</Label>
          <Select
            value={form.audio_bitrate || NONE_BITRATE}
            onValueChange={(v) => set("audio_bitrate", v === NONE_BITRATE ? "" : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_BITRATE}>Codec default</SelectItem>
              {AUDIO_BITRATES.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="col-span-2 space-y-2">
        <Label>Preserve timecode</Label>
        <Select value={form.preserve_timecode} onValueChange={(v) => set("preserve_timecode", v)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
        <FieldHint>Keep the source timecode in the transcoded files</FieldHint>
      </div>
    </div>
  );
}

function CreateProfileDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const c = useProfileForm(null);
  const createJob = useLumaJob(
    () => c.buildArgs(c.form.name),
    {
      progress: false,
      kind: "profiles",
      label: `Add profile · ${c.form.name || "Unnamed"}`,
    },
  );

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
          <DialogTitle>Add profile</DialogTitle>
          <DialogDescription>
            Saved transcode settings the Create page can reuse.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <ProfileFields c={c} />
        </div>
        {createJob.ui.error && (
          <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">{createJob.ui.error}</div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createJob.ui.running}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createJob.ui.running || !c.form.name}>
            {createJob.ui.running ? "Creating…" : "Add profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditProfileDialog({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const c = useProfileForm(profile);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!c.form.name) return;
    setSaving(true);
    setSaveError(null);
    try {
      const d = await runLuma(["profiles", "delete", "--name", profile.name, "--yes"], false);
      const dr = await d.done;
      if (dr.code && dr.code !== 0) {
        throw new Error(dr.logs.join("\n") || "Failed to update profile");
      }
      const cj = await runLuma(c.buildArgs(c.form.name), false);
      const cr = await cj.done;
      if (cr.code && cr.code !== 0) {
        throw new Error(cr.logs.join("\n") || "Failed to update profile");
      }
      onSaved();
      onClose();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Editing "{profile.name}" — the stored profile is replaced when you save.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <ProfileFields c={c} />
        </div>
        {saveError && (
          <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">{saveError}</div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !c.form.name}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProfilesTab() {
  const { profiles, refresh } = useLibrary();
  const [deleteName, setDeleteName] = useState("");
  const [editing, setEditing] = useState<Profile | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const deleteJob = useLumaJob(
    () => ["profiles", "delete", "--name", deleteName, "--yes"],
    {
      progress: false,
      kind: "profiles",
      label: `Delete profile · ${deleteName || "?"}`,
    },
  );

  const confirmDelete = async () => {
    await deleteJob.run((s) => {
      if (!s.error) setDeleteName("");
    });
    refresh();
  };

  const renderValue = (v: unknown) =>
    v === null || v === undefined || v === "" ? "—" : String(v);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Profiles</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setProfileDialogOpen(true)}>
              <PlusIcon className="size-4" /> Add profile
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {profiles.length === 0 && (
            <EmptyState
              compact
              icon={SlidersHorizontalIcon}
              title="No profiles yet"
              hint="Create your first transcode preset."
              action={null}
            />
          )}
          {profiles.map((p) => (
            <div key={p.name} className="flex flex-1 basis-72 flex-col rounded-lg border border-border bg-background/60 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{p.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground/70">{p.container} · {p.mode}</span>
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    aria-label={`Edit ${p.name}`}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
                  >
                    <PencilIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteName(p.name)}
                    aria-label={`Delete ${p.name}`}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-950/40 hover:text-red-300"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {renderValue(p.video_codec)} · {renderValue(p.extension)}
                {p.pix_fmt ? ` · ${p.pix_fmt}` : ""}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={deleteName !== ""} onOpenChange={(open) => { if (!open) setDeleteName(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete profile?</DialogTitle>
            <DialogDescription>
              "{deleteName}" will be removed permanently. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteJob.ui.error && (
            <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">{deleteJob.ui.error}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteName("")}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteJob.ui.running || !deleteName}>
              {deleteJob.ui.running ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && (
        <EditProfileDialog
          profile={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}

      {profileDialogOpen && (
        <CreateProfileDialog
          onClose={() => setProfileDialogOpen(false)}
          onCreated={refresh}
        />
      )}
    </div>
  );
}
