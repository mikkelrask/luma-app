import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ProductionOption } from "./useProductions";

const STORAGE_KEY = "luma.sessionProduction";

interface SessionValue {
  production: string;
  setProduction: (name: string) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

function readStored(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Holds the production selected for the current working session. The value is
 * shared across the sidebar and every page and persists across app restarts via
 * localStorage.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [production, setProduction] = useState<string>(readStored);

  const update = (name: string) => {
    setProduction(name);
    try {
      if (name) localStorage.setItem(STORAGE_KEY, name);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — session-only is fine */
    }
  };

  return (
    <SessionContext.Provider value={{ production, setProduction: update }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}

interface LinkedProduction {
  production: string;
  setProduction: (name: string) => void;
}

/**
 * Links a page's local production selection to the session: preselects the
 * session value, follows it when it changes elsewhere, and writes back on local
 * change. Falls back to empty if the stored value no longer exists.
 */
export function useLinkedProduction(opts: {
  productions: ProductionOption[];
  loading: boolean;
}): LinkedProduction {
  const { production: sessionProduction, setProduction: setSessionProduction } =
    useSession();
  const [production, setProduction] = useState<string>(sessionProduction);

  useEffect(() => {
    if (opts.loading) return;
    if (!sessionProduction) return;
    if (opts.productions.some((p) => p.name === sessionProduction)) {
      setProduction(sessionProduction);
    } else {
      setSessionProduction("");
    }
  }, [sessionProduction, opts.productions, opts.loading, setSessionProduction]);

  const setLinked = (name: string) => {
    setProduction(name);
    setSessionProduction(name);
  };

  return { production, setProduction: setLinked };
}