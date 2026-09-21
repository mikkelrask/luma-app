import type { ReactNode } from "react";
import { cn } from "cn";

interface PageHeaderProps {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-6", className)}>
      <div className="space-y-2">
        {kicker && (
          <div className="flex items-center gap-2.5">
            <span className="h-px w-7 bg-gradient-to-r from-highlight to-transparent" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-highlight/90">
              {kicker}
            </span>
          </div>
        )}
        <h1 className="font-display text-[28px] font-semibold leading-none tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2 pb-0.5">{actions}</div>
      )}
    </div>
  );
}
