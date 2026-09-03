import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100",
      "placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-600",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <label className={cn("mb-1 block text-sm font-medium text-zinc-300", className)}>
      {children}
    </label>
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100",
        "focus:outline-none focus:ring-2 focus:ring-cyan-600",
        className,
      )}
      {...props}
    />
  );
}
