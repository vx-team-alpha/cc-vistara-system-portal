"use client";

import { format, isValid, parse } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: string | Date | null;
  onChange?: (dateString: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  "aria-invalid"?: boolean;
  "data-test"?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  id,
  name,
  "aria-invalid": ariaInvalid,
  "data-test": dataTest,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Safely parse ISO string (YYYY-MM-DD) or Date instance into a valid Date
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    if (value instanceof Date) return isValid(value) ? value : undefined;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const parsed = parse(trimmed, "yyyy-MM-dd", new Date(0));
      if (isValid(parsed)) return parsed;
      const timestamp = Date.parse(trimmed);
      return Number.isNaN(timestamp) ? undefined : new Date(timestamp);
    }
    return undefined;
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    if (date && isValid(date)) {
      onChange?.(format(date, "yyyy-MM-dd"));
      setOpen(false);
    } else {
      onChange?.("");
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
  };

  return (
    <div className={cn("relative w-full", className)}>
      {name && (
        <input
          type="hidden"
          name={name}
          value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
        />
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={ariaInvalid}
            data-test={dataTest}
            className={cn(
              "h-[38px] w-full justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-left font-normal text-[var(--ink)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]",
              !selectedDate && "text-[var(--soft)]",
              ariaInvalid && "border-destructive text-destructive",
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <CalendarIcon className="h-4 w-4 shrink-0 text-[var(--soft)]" />
              <span>{selectedDate ? format(selectedDate, "PPP") : placeholder}</span>
            </div>
            {selectedDate && !disabled ? (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear date"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange?.("");
                  }
                }}
                className="ml-2 rounded-sm p-0.5 text-[var(--soft)] transition-colors hover:bg-[var(--fill)] hover:text-[var(--ink)]"
              >
                <XIcon className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="z-50 w-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 shadow-lg"
          align="start"
        >
          <Calendar mode="single" selected={selectedDate} onSelect={handleSelect} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
