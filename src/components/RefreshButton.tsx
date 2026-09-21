import { RefreshCw } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

export function RefreshButton({
  onRefresh,
  loading = false,
  disabled = false,
  label = "Refresh",
}: RefreshButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onRefresh}
      disabled={disabled || loading}
      title={label}
      aria-label={label}
    >
      <RefreshCw className={cn(loading && "animate-spin")} />
    </Button>
  );
}