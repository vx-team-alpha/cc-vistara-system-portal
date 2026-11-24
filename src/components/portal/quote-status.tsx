"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateQuoteStatus } from "@/server/portal/actions";
import { QuoteStatusSchema } from "@/server/portal/schemas";

import s from "./portal.module.css";

export function QuoteStatus({ id, status: initialStatus }: { id: string; status: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = QuoteStatusSchema.safeParse({ id, status });
    if (!parsed.success) {
      setMessage("Choose a valid status.");
      return;
    }
    start(async () => {
      try {
        const result = await updateQuoteStatus(parsed.data);
        setMessage(result.ok ? "Status updated." : result.error);
      } catch {
        setMessage("Could not update the status. Please try again.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Label className={s.label} htmlFor="quote-status">
        Query status
      </Label>
      <div className={s.actions}>
        <Select value={status} onValueChange={setStatus} disabled={pending}>
          <SelectTrigger id="quote-status" className="h-9 min-w-[160px] bg-background">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={pending || status === initialStatus}
        >
          {pending ? "Saving…" : "Update status"}
        </Button>
      </div>
      {message && (
        <p role="status" className={s.notice}>
          {message}
        </p>
      )}
    </form>
  );
}
