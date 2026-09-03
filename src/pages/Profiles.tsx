import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input, Label, Select } from "../components/ui/input";
import { useLumaJob } from "../lib/useLumaJob";
import { runLuma } from "../lib/luma";

interface Profile {
  name: string;
  container?: string;
  mode?: string;
  video_codec?: string;
  video_profile?: string;
  pix_fmt?: string;
  crf?: number;
  audio_codec?: string;
  extension?: string;
  [key: string]: unknown;
}

const emptyForm = {
  name: "",
  container: "",
  mode: "single_file",
  container_mode: "op1a",
  video_codec: "",
  video_profile: "",
  pix_fmt: "",
  crf: "",
  bitrate_v: "",
  audio_codec: "",
  audio_mode: "",
  audio_sample_rate: "",
  audio_bitrate: "",
  extension: "",
};

export function Profiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const load = async () => {
    const h = await runLuma(["profiles", "list"], false);
    const r = await h.done;
    setProfiles((r.payload as { profiles?: Profile[] })?.profiles ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const createJob = useLumaJob(
    () => {
      const args = ["profiles", "create", "--name", form.name];
      if (form.container) args.push("--container", form.container);
      if (form.mode) args.push("--mode", form.mode);
      if (form.container_mode) args.push("--container-mode", form.container_mode);
      if (form.video_codec) args.push("--video-codec", form.video_codec);
      if (form.video_profile) args.push("--video-profile", form.video_profile);
      if (form.pix_fmt) args.push("--pix-fmt", form.pix_fmt);
      if (form.crf) args.push("--crf", form.crf);
      if (form.bitrate_v) args.push("--bitrate-v", form.bitrate_v);
      if (form.audio_codec) args.push("--audio-codec", form.audio_codec);
      if (form.audio_mode) args.push("--audio-mode", form.audio_mode);
      if (form.audio_sample_rate) args.push("--audio-sample-rate", form.audio_sample_rate);
      if (form.audio_bitrate) args.push("--audio-bitrate", form.audio_bitrate);
      if (form.extension) args.push("--extension", form.extension);
      return args;
    },
    false,
  );

  const deleteJob = useLumaJob(() => ["profiles", "delete", "--name", deleteName, "--yes"], false);
  const [deleteName, setDeleteName] = useState("");

  const handleCreate = async () => {
    await createJob.run();
    load();
  };

  const handleDelete = async () => {
    await deleteJob.run();
    load();
  };

  const renderValue = (v: unknown) =>
    v === null || v === undefined || v === "" ? "—" : String(v);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profiles</h1>
        <Button variant="outline" onClick={load}>Refresh</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Dailies 4K" />
            </div>
            <div>
              <Label>Container</Label>
              <Select value={form.container} onChange={(e) => set("container", e.target.value)}>
                <option value="">…</option>
                <option value="mp4">mp4</option>
                <option value="mov">mov</option>
                <option value="mxf">mxf</option>
              </Select>
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={form.mode} onChange={(e) => set("mode", e.target.value)}>
                <option value="single_file">single_file</option>
                <option value="multi_file">multi_file</option>
              </Select>
            </div>
            <div>
              <Label>Container mode</Label>
              <Select value={form.container_mode} onChange={(e) => set("container_mode", e.target.value)}>
                <option value="op1a">OP1a</option>
                <option value="opatom">OP-Atom</option>
              </Select>
            </div>
            <div>
              <Label>Video codec</Label>
              <Input value={form.video_codec} onChange={(e) => set("video_codec", e.target.value)} placeholder="h264" />
            </div>
            <div>
              <Label>Video profile</Label>
              <Input value={form.video_profile} onChange={(e) => set("video_profile", e.target.value)} placeholder="high" />
            </div>
            <div>
              <Label>Pixel format</Label>
              <Input value={form.pix_fmt} onChange={(e) => set("pix_fmt", e.target.value)} placeholder="yuv420p" />
            </div>
            <div>
              <Label>CRF</Label>
              <Input value={form.crf} onChange={(e) => set("crf", e.target.value)} placeholder="18" />
            </div>
            <div>
              <Label>Video bitrate</Label>
              <Input value={form.bitrate_v} onChange={(e) => set("bitrate_v", e.target.value)} placeholder="50M" />
            </div>
            <div>
              <Label>Audio codec</Label>
              <Input value={form.audio_codec} onChange={(e) => set("audio_codec", e.target.value)} placeholder="aac" />
            </div>
            <div>
              <Label>Audio mode</Label>
              <Input value={form.audio_mode} onChange={(e) => set("audio_mode", e.target.value)} placeholder="stereo" />
            </div>
            <div>
              <Label>Audio sample rate</Label>
              <Input value={form.audio_sample_rate} onChange={(e) => set("audio_sample_rate", e.target.value)} placeholder="48000" />
            </div>
            <div>
              <Label>Audio bitrate</Label>
              <Input value={form.audio_bitrate} onChange={(e) => set("audio_bitrate", e.target.value)} placeholder="192k" />
            </div>
            <div>
              <Label>Extension</Label>
              <Input value={form.extension} onChange={(e) => set("extension", e.target.value)} placeholder=".mp4" />
            </div>
          </CardContent>
          <Card className="mx-5 mb-5 flex flex-row items-center gap-2 border-0 bg-transparent p-0 shadow-none">
            <Button variant="primary" className="flex-1" onClick={handleCreate} disabled={createJob.ui.running || !form.name}>
              {createJob.ui.running ? "Creating…" : "Create"}
            </Button>
          </Card>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved profiles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {profiles.length === 0 && <p className="text-sm text-zinc-500">No profiles yet.</p>}
              {profiles.map((p) => (
                <div key={p.name} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-zinc-500">{p.container} · {p.mode}</span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {renderValue(p.video_codec)} · {renderValue(p.extension)}
                    {p.pix_fmt ? ` · ${p.pix_fmt}` : ""}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delete profile</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Profile name</Label>
                <Select value={deleteName} onChange={(e) => setDeleteName(e.target.value)}>
                  <option value="">Select…</option>
                  {profiles.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteJob.ui.running || !deleteName}>
                Delete
              </Button>
            </CardContent>
          </Card>

          {createJob.ui.error && (
            <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">{createJob.ui.error}</div>
          )}
          {deleteJob.ui.error && (
            <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">{deleteJob.ui.error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
