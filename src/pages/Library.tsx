import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { runLuma } from "@/lib/luma";
import { libraryTabs } from "@/lib/nav";

export interface Profile {
  name: string;
  container?: string;
  mode?: string;
  container_mode?: string;
  video_codec?: string;
  video_profile?: string;
  pix_fmt?: string;
  crf?: number;
  bitrate_v?: string;
  audio_codec?: string;
  audio_mode?: string;
  audio_sample_rate?: number;
  audio_bitrate?: string;
  preserve_timecode?: boolean;
  extension?: string;
  [key: string]: unknown;
}

export interface Transform {
  name: string;
  type: "letterbox" | "zoom";
  target_aspect?: number | null;
  factor?: number | null;
}

export interface Lut {
  name: string;
  size?: number;
  modified?: string;
}

interface LibraryValue {
  profiles: Profile[];
  transforms: Transform[];
  luts: Lut[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const LibraryContext = createContext<LibraryValue | null>(null);

export function useLibrary(): LibraryValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within Library");
  return ctx;
}

export function Library() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [transforms, setTransforms] = useState<Transform[]>([]);
  const [luts, setLuts] = useState<Lut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pr, tr, lr] = await Promise.all([
        runLuma(["profiles", "list"], false).then((h) => h.done),
        runLuma(["transforms", "list"], false).then((h) => h.done),
        runLuma(["luts", "list"], false).then((h) => h.done),
      ]);
      if (pr.code && pr.code !== 0) {
        throw new Error(pr.logs.join("\n") || "Failed to load profiles");
      }
      if (tr.code && tr.code !== 0) {
        throw new Error(tr.logs.join("\n") || "Failed to load transforms");
      }
      if (lr.code && lr.code !== 0) {
        throw new Error(lr.logs.join("\n") || "Failed to load LUTs");
      }
      setProfiles((pr.payload as { profiles?: Profile[] })?.profiles ?? []);
      setTransforms((tr.payload as { transforms?: Transform[] })?.transforms ?? []);
      setLuts((lr.payload as { luts?: Lut[] })?.luts ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

return (
    <LibraryContext.Provider value={{ profiles, transforms, luts, loading, error, refresh }}>
      <div className="space-y-6">
        <PageHeader
          kicker="Library"
          title="Library"
          description="Reusable profiles, visual transforms and color LUTs for the pipeline."
          actions={<RefreshButton onRefresh={refresh} loading={loading} />}
        />

        {error && (
          <div className="rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex w-fit gap-1 rounded-lg border border-border bg-background/40 p-1">
          {libraryTabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>

        <Outlet />
      </div>
    </LibraryContext.Provider>
  );
}
