import { cn } from "../../lib/utils";

export function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-zinc-800", className)}
    >
      <div
        className="h-full rounded-full bg-cyan-600 transition-[width] duration-150"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
