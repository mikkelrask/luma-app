import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/create", label: "Create" },
  { to: "/ingest", label: "Ingest" },
  { to: "/transcode", label: "Transcode" },
  { to: "/reports", label: "Reports" },
  { to: "/profiles", label: "Profiles" },
  { to: "/config", label: "Config" },
];

export function Layout() {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/40">
        <div className="px-5 py-5 text-xl font-bold tracking-tight">
          <span className="text-cyan-500">luma</span>
          <span className="ml-1 text-zinc-500">/dit</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-cyan-600/15 text-cyan-300 font-medium"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 text-xs text-zinc-600">luma DIT pipeline</div>
      </aside>
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
