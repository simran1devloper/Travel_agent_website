import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, X } from "lucide-react";

export type { DateRange };

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  label?: string;
  className?: string;
}

export function DateRangePicker({ value, onChange, label, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const fmt = (d?: Date) =>
    d?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) ?? "";

  const displayLabel = value?.from
    ? value.to
      ? `${fmt(value.from)} – ${fmt(value.to)}`
      : `From ${fmt(value.from)}`
    : "Not planned yet";

  return (
    <div className={className}>
      {label && <p className="mb-2 text-sm font-bold text-foreground/60">{label}</p>}
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-white/70 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-accent"
            >
              <CalendarDays className="size-4 shrink-0 text-accent" />
              <span className={value?.from ? "text-foreground" : "text-muted-foreground"}>
                {displayLabel}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={value}
              onSelect={onChange}
              disabled={{ before: new Date() }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        {value?.from && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label="Clear dates"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-white text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function formatDateRange(range: DateRange | undefined): string {
  if (!range?.from) return "";
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return range.to ? `${fmt(range.from)} – ${fmt(range.to)}` : fmt(range.from);
}
