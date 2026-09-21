import type { ComponentType, ReactNode } from "react";

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: ReactNode;
  compact?: boolean;
}

/**
 * Friendly placeholder for lists and sections with nothing to show.
 * `compact` renders an inline row (for cards / grid columns); the default is a
 * centered block for empty pages or large sections.
 */
export function EmptyState({ icon: Icon, title, hint, action, compact }: EmptyStateProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-background/40 px-3 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{title}</p>
          {hint && <p className="truncate text-xs text-muted-foreground/60">{hint}</p>}
        </div>
        {action}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-background/30 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}