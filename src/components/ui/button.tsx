import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type Variant = "default" | "primary" | "outline" | "ghost" | "destructive";

const variants: Record<Variant, string> = {
  primary:
    "bg-cyan-600 text-white hover:bg-cyan-700 focus-visible:ring-cyan-500",
  default:
    "bg-zinc-900 text-zinc-100 hover:bg-zinc-800 border border-zinc-700 focus-visible:ring-zinc-500",
  outline:
    "border border-zinc-600 bg-transparent text-zinc-200 hover:bg-zinc-800",
  ghost: "text-zinc-300 hover:bg-zinc-800",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-9 px-4 text-sm",
        size === "lg" && "h-11 px-6 text-sm",
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
