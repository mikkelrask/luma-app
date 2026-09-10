import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

export function FilePicker({
  value,
  onChange,
  placeholder,
  directory = false,
  extensions,
  className,
}: {
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  directory?: boolean;
  extensions?: string[];
  className?: string;
}) {
  const browse = async () => {
    const selected = await open({
      directory,
      multiple: false,
      filters: extensions ? [{ name: "Allowed files", extensions }] : undefined,
    });
    if (typeof selected === "string") onChange(selected);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <Button
        variant="outline"
        type="button"
        onClick={browse}
        className="shrink-0"
      >
        {directory ? "Choose folder…" : "Browse…"}
      </Button>
    </div>
  );
}