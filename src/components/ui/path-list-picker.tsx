import { open } from "@tauri-apps/plugin-dialog";
import { FolderPlus } from "lucide-react"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

export function PathListPicker({
  value,
  onChange,
  placeholder,
  directory = true,
  extensions,
  className,
}: {
  value: string[]
  onChange: (paths: string[]) => void
  placeholder?: string
  directory?: boolean
  extensions?: string[]
  className?: string
}) {
  const addPaths = async () => {
    const selected = await open({
      directory,
      multiple: true,
      filters: extensions ? [{ name: "Allowed files", extensions }] : undefined,
    })
    if (!selected) return
    const additions = Array.isArray(selected) ? selected : [selected]
    const merged = [...new Set([...value, ...additions])]
    onChange(merged)
  }

  const removePath = (path: string) => {
    onChange(value.filter((p) => p !== path))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <Input
          value={value.join(", ")}
          readOnly
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          variant="outline"
          type="button"
          onClick={addPaths}
          size={directory ? "icon" : "default"}
          className="shrink-0"
          aria-label={directory ? "Add folder" : undefined}
          title={directory ? "Add folder" : undefined}
        >
          {directory ? <FolderPlus aria-hidden="true" /> : "Add file…"}
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((path) => (
            <span
              key={path}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
            >
              <span className="max-w-64 truncate" title={path}>{path}</span>
              <button
                type="button"
                aria-label={`Remove ${path}`}
                onClick={() => removePath(path)}
                className="text-muted-foreground hover:text-foreground focus:outline-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}