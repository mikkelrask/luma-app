import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import type { ComponentType } from "react";

function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4">
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="10" className="opacity-40" />
    </svg>
  );
}

function windowAction(action: (win: ReturnType<typeof getCurrentWindow>) => void) {
  try {
    action(getCurrentWindow());
  } catch {
    // Not running inside a Tauri window (e.g. plain browser dev).
  }
}

interface TrafficLightProps {
  label: string;
  className: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick: () => void;
}

function TrafficLight({ label, className, icon: Icon, onClick }: TrafficLightProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      tabIndex={-1}
      onClick={onClick}
      className={`group grid size-3.5 place-items-center rounded-full transition-colors ${className}`}
    >
      <Icon
        className="size-2.5 text-black/55 opacity-0 transition-opacity group-hover:opacity-100"
        strokeWidth={3}
      />
    </button>
  );
}

export function TitleBar() {
  return (
    <header
      data-tauri-drag-region
      className="relative flex h-11 shrink-0 select-none items-center border-b border-border bg-card/60 px-4"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <TrafficLight
            label="Close"
            className="bg-[#ff5f57] hover:bg-[#ff5f57]/85"
            icon={X}
            onClick={() => windowAction((w) => w.close())}
          />
          <TrafficLight
            label="Minimize"
            className="bg-[#febc2e] hover:bg-[#febc2e]/85"
            icon={Minus}
            onClick={() => windowAction((w) => w.minimize())}
          />
          <TrafficLight
            label="Zoom"
            className="bg-[#28c840] hover:bg-[#28c840]/85"
            icon={Square}
            onClick={() => windowAction((w) => w.toggleMaximize())}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
            <BrandMark />
          </span>
          <div className="font-display text-[14px] font-semibold tracking-tight">
            luma<span className="ml-1 text-muted-foreground">/dit</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 text-center text-[11px] font-medium text-muted-foreground/50">
        digital imaging workflow
      </div>
    </header>
  );
}
