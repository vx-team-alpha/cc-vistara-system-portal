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
import { updateOrderStatusAction } from "@/server/orders/actions";

import s from "./portal.module.css";

const statuses = [
  ["draft", "Draft"],
  ["issued", "Issued"],
  ["confirmed", "Confirmed"],
  ["in_production", "In production"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;

const nextStatuses: Record<string, readonly string[]> = {
  draft: ["issued", "cancelled"],
  issued: ["confirmed", "cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function OrderStatusForm({
  orderId,
  currentStatus,
  revision,
}: {
  orderId: string;
  currentStatus: string;
  revision: number;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const available = statuses.filter(
    ([value]) => value === currentStatus || nextStatuses[currentStatus]?.includes(value),
  );

  return (
    <form
      className={s.statusForm}
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("");
        startTransition(async () => {
          try {
            const result = await updateOrderStatusAction({ order_id: orderId, revision, status });
            setMessage(result.ok ? "Status updated." : result.error);
          } catch {
            setMessage("Could not update the order status.");
          }
        });
      }}
      data-test="order-status-form"
    >
      <Label className={s.label} htmlFor="order-status">
        Order status
      </Label>
      <div className={s.statusControls}>
        <Select
          value={status}
          onValueChange={setStatus}
          disabled={pending || available.length <= 1}
        >
          <SelectTrigger
            id="order-status"
            className="h-9 min-w-[180px] bg-background"
            data-test="order-status-select"
          >
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent position="popper">
            {available.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={pending || status === currentStatus || available.length === 1}
          data-test="update-order-status"
        >
          {pending ? "Updating…" : "Update status"}
        </Button>
      </div>
      {message && (
        <p className={resultClass(message)} role="status">
          {message}
        </p>
      )}
    </form>
  );
}

function resultClass(message: string) {
  return message === "Status updated." ? s.successText : s.fieldError;
}
