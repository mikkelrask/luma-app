import { NavLink, Outlet } from "react-router-dom";
import { TaskPanel } from "@/components/TaskPanel";
import { TitleBar } from "@/components/TitleBar";
import { useJobs } from "@/lib/jobs";
import type { JobKind } from "@/lib/jobs";
import { useProductions } from "@/lib/useProductions";
import { useSession } from "@/lib/session";
import { Combobox } from "@/components/ui/combobox";

interface NavLinkDef {
  to: string;
  label: string;
  end?: boolean;
  kind?: JobKind | "any";
}

const navSections: Array<{ label?: string; links: NavLinkDef[] }> = [
  {
    label: "Work",
    links: [
      { to: "/", label: "Dashboard", end: true, kind: "any" },
      { to: "/ingest", label: "Ingest", kind: "ingest" },
      { to: "/transcode", label: "Transcode", kind: "transcode" },
      { to: "/reports", label: "Reports", kind: "reports" }
    ],
  },
  {
    label: "Manage",
    links: [
      { to: "/create", label: "Add Production", kind: "create" },
      { to: "/profiles", label: "Profiles", kind: "profiles" },
      { to: "/config", label: "Settings", kind: "config" },
    ],
  },
];

export function Layout() {
  const { hasActive } = useJobs();
  const { production, setProduction } = useSession();
  const { productions } = useProductions();
  const productionOptions = productions.map((p) => ({
    value: p.name,
    label: p.name + (p.is_archived ? " (archived)" : ""),
  }));

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="relative flex w-56 shrink-0 flex-col border-r border-border bg-card/40 bg-gradient-to-b from-white/[0.045] to-transparent">
          <div className="space-y-1.5 px-4 pb-2 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              Working on
            </p>
            <Combobox
              value={production}
              onChange={setProduction}
              options={productionOptions}
              placeholder="Select production…"
              emptyText="No productions found."
            />
          </div>

          <nav className="flex flex-col gap-0.5 overflow-y-auto px-3 pb-3">
            {navSections.map((section) => (
              <div key={section.label ?? "top"} className="flex flex-col gap-0.5">
                {section.label && (
                  <div className="flex items-center gap-2 px-4 pb-1 pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/60">
                      {section.label}
                    </p>
                    <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                )}
                {section.links.map((l) => {
                  const running =
                    l.kind === "any" ? hasActive() : l.kind ? hasActive(l.kind) : false;
                  return (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      end={l.end}
                      className={({ isActive }) =>
                        `group relative flex items-center justify-between overflow-hidden rounded-lg px-3 py-2 text-[13px] transition-colors ${
                          isActive
                            ? "font-medium text-foreground bg-gradient-to-r from-primary/15 via-white/[0.05] to-transparent before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-0.5 before:rounded-full before:bg-primary before:shadow-[0_0_10px_1px_var(--primary)]"
                            : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                        }`
                      }
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className={`size-1.5 rounded-full transition-colors ${
                            running ? "bg-primary" : "bg-transparent group-hover:bg-white/20"
                          }`}
                          aria-hidden="true"
                        />
                        <span>{l.label}</span>
                      </span>
                      {running && (
                        <span className="ml-2 text-[10px] text-primary" aria-label="job running">
                          ●
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="mt-auto">
              <TaskPanel />
            </div>
          </div>

          <div className="border-t border-border px-4 py-3">
            <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
              <span className="size-1.5 shrink-0 rounded-full bg-foreground/70 shadow-[0_0_8px_2px_rgba(255,255,255,0.2)]" />
              <div className="min-w-0">
                <p className="truncate text-[10px] font-medium text-muted-foreground">
                  pipeline online
                </p>
                <p className="truncate text-[9px] text-muted-foreground/50">
                  digital imaging workflow
                </p>
              </div>
              <span className="ml-auto font-mono text-[9px] text-muted-foreground/40">v0.1.0</span>
            </div>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-10 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
