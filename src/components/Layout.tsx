import { NavLink, Outlet } from "react-router-dom";
import { TaskPanel } from "@/components/TaskPanel";
import { useJobs } from "@/lib/jobs";
import type { JobKind } from "@/lib/jobs";

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-5">
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="10" className="opacity-40" />
    </svg>
  );
}

const links: Array<{ to: string; label: string; end?: boolean; kind?: JobKind | "any" }> = [
  { to: "/", label: "Dashboard", end: true, kind: "any" },
  { to: "/create", label: "Create", kind: "create" },
  { to: "/ingest", label: "Ingest", kind: "ingest" },
  { to: "/transcode", label: "Transcode", kind: "transcode" },
  { to: "/reports", label: "Reports", kind: "reports" },
  { to: "/profiles", label: "Profiles", kind: "profiles" },
  { to: "/config", label: "Config", kind: "config" },
];

export function Layout() {
  const { hasActive } = useJobs();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card bg-gradient-to-b from-white/[0.04] to-transparent">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid size-8 place-items-center rounded-lg border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
            <BrandMark />
          </span>
          <div className="font-display text-[17px] font-semibold tracking-tight">
            luma<span className="ml-1 text-muted-foreground">/dit</span>
          </div>
        </div>

        <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
          Workspace
        </p>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
          {links.map((l) => {
            const running = l.kind === "any" ? hasActive() : l.kind ? hasActive(l.kind) : false;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors ${
                    isActive
                      ? "font-medium text-foreground bg-white/[0.07]"
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
        </nav>

        <TaskPanel />

        <div className="border-t border-border px-5 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">luma DIT pipeline</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/60">digital imaging workflow · v0.1.0</p>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-10 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}