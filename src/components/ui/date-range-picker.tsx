import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "cn"

function parse(value: string): Date | undefined {
  return value ? parseISO(value) : undefined
}

function shortLabel(value: string): string {
  return format(parseISO(value), "d MMM yyyy")
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Pick a date range",
  className,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const fromDate = parse(from)
  const toDate = parse(to)

  const label = fromDate && toDate
    ? `${shortLabel(from)} – ${shortLabel(to)}`
    : fromDate
      ? `From ${shortLabel(from)}`
      : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-start gap-2 font-normal", className)}
        >
          <CalendarIcon className="size-4 opacity-50" />
          <span className={cn(!fromDate && "text-muted-foreground")}>{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          min={2}
          selected={{ from: fromDate, to: toDate }}
          onSelect={(range) => {
            if (!range?.from) {
              onChange("", "")
              return
            }
            if (range.to) {
              onChange(format(range.from, "yyyy-MM-dd"), format(range.to, "yyyy-MM-dd"))
              setOpen(false)
            } else {
              onChange(format(range.from, "yyyy-MM-dd"), "")
            }
          }}
        />
        {(fromDate || toDate) && (
          <div className="flex justify-end border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("", "")}
            >
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}