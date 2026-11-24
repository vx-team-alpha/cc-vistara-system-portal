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
      const parsed = parse(trimmed, "yyyy-MM-dd", new Date());
      if (isValid(parsed)) return parsed;
      const fallback = new Date(trimmed);
      return isValid(fallback) ? fallback : undefined;
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
              "w-full justify-between text-left font-normal h-[38px] px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)] transition-colors",
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
                className="ml-2 rounded-sm p-0.5 text-[var(--soft)] hover:bg-[var(--fill)] hover:text-[var(--ink)] transition-colors"
              >
                <XIcon className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 z-50 bg-[var(--surface)] border border-[var(--border)] shadow-lg rounded-xl"
          align="start"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
