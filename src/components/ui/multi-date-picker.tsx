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

function toDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function dayLabel(value: string): string {
  return format(parseISO(value), "d MMM yyyy")
}

export function MultiDatePicker({
  value,
  onChange,
  placeholder = "Select dates",
  className,
}: {
  value: string[]
  onChange: (dates: string[]) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 font-normal"
          >
            <CalendarIcon className="size-4 opacity-50" />
            {value.length > 0 ? (
              <span>
                {value.length} date{value.length === 1 ? "" : "s"} selected
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="multiple"
            selected={value.map(toDate)}
            onSelect={(dates) => {
              onChange(
                (dates ?? [])
                  .map((d) => format(d, "yyyy-MM-dd"))
                  .sort()
              )
            }}
          />
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {value.map((date) => (
            <span
              key={date}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
            >
              {dayLabel(date)}
              <button
                type="button"
                aria-label={`Remove ${dayLabel(date)}`}
                onClick={() => onChange(value.filter((d) => d !== date))}
                className="text-muted-foreground hover:text-foreground focus:outline-none"
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}