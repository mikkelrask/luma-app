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

/**
 * Loads the list of productions (with their production days) from the bundled
 * sidecar's `production list` command. Used to populate production/day
 * dropdowns across the app.
 */
export function useProductions(): UseProductions {
  const [productions, setProductions] = useState<ProductionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const h = await runLuma(["production", "list"], false);
      const r = await h.done;
      if (r.code && r.code !== 0) {
        setError(r.logs.join("\n") || "Could not load productions");
      } else {
        setProductions(
          (r.payload as { productions?: ProductionOption[] })?.productions ?? [],
        );
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
