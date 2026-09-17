import { useCallback, useEffect, useState } from "react";
import { runLuma } from "../lib/luma";

export interface ProductionOption {
  name: string;
  days: string[];
  is_archived: boolean;
}

interface UseProductions {
  productions: ProductionOption[];
  loading: boolean;
  error: string | null;
  daysFor: (name: string) => string[];
  refresh: () => Promise<void>;
}

const STORAGE_KEY = "luma.productions";
/**
 * How long a cached production list is considered fresh. While fresh, every
 * consumer reuses it instead of spawning another sidecar `production list`.
 */
const TTL_MS = 60_000;

interface Shared {
  productions: ProductionOption[];
  loadedAt: number;
}

function readStorage(): Shared | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      at?: number;
      productions?: ProductionOption[];
    };
    if (!Array.isArray(parsed.productions)) return null;
    return { productions: parsed.productions, loadedAt: parsed.at ?? 0 };
  } catch {
    return null;
  }
}

/**
 * Production list is shared process-wide: fetched once per app run (and once on
 * warm restarts via localStorage) so the sidebar picker and every page reuse
 * the same data instead of each spawning the sidecar.
 */
let shared: Shared | null = readStorage();
let inflight: Promise<void> | null = null;
const subscribers = new Set<() => void>();

function publish() {
  for (const fn of subscribers) fn();
}

function isFresh(s: Shared, now: number): boolean {
  return now - s.loadedAt < TTL_MS;
}

async function fetchProductions(): Promise<ProductionOption[]> {
  const h = await runLuma(["production", "list"], false);
  const r = await h.done;
  if (r.code && r.code !== 0) {
    throw new Error(r.logs.join("\n") || "Could not load productions");
  }
  return (r.payload as { productions?: ProductionOption[] })?.productions ?? [];
}

function setShared(productions: ProductionOption[]) {
  shared = { productions, loadedAt: Date.now() };
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ at: shared.loadedAt, productions }),
    );
  } catch {
    /* storage unavailable */
  }
  publish();
}

function startFetch(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    const prods = await fetchProductions();
    setShared(prods);
  })();
  return inflight;
}

/**
 * Loads the list of productions (with their production days) from the bundled
 * sidecar's `production list` command. Used to populate production/day
 * dropdowns across the app.
 */
export function useProductions(): UseProductions {
  const [productions, setProductions] = useState<ProductionOption[]>(
    () => shared?.productions ?? [],
  );
  const [loading, setLoading] = useState(!shared);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(() => {
    if (shared) setProductions(shared.productions);
  }, []);

  useEffect(() => {
    subscribers.add(apply);
    return () => {
      subscribers.delete(apply);
    };
  }, [apply]);

  useEffect(() => {
    if (shared && isFresh(shared, Date.now())) {
      setError(null);
      apply();
      setLoading(false);
      return;
    }
    if (!shared) setLoading(true);
    startFetch()
      .then(() => setError(null))
      .catch((e) => setError(String(e)))
      .finally(() => {
        inflight = null;
        setLoading(false);
      });
  }, [apply]);

  const refresh = useCallback(() => {
    return startFetch()
      .then(() => setError(null))
      .catch((e) => setError(String(e)))
      .finally(() => {
        inflight = null;
        setLoading(false);
      });
  }, []);

  const active = productions
    .filter((p) => !p.is_archived)
    .sort((a, b) => a.name.localeCompare(b.name));
  const archived = productions
    .filter((p) => p.is_archived)
    .sort((a, b) => a.name.localeCompare(b.name));

  const daysFor = (name: string): string[] =>
    productions.find((p) => p.name === name)?.days ?? [];

  return {
    productions: [...active, ...archived],
    loading,
    error,
    daysFor,
    refresh,
  };
}