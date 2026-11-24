"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteOrderAction } from "@/server/orders/actions";

export function OrderDeleteDialog({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const ready = confirmation === orderNumber && reason.trim().length >= 5;

  function submit() {
    if (!ready) return;
    setMessage("");
    startTransition(async () => {
      try {
        const result = await deleteOrderAction({
          order_id: orderId,
          order_number: orderNumber,
          confirmation,
          reason,
        });
        if (result && !result.ok) setMessage(result.error);
      } catch (error) {
        if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
        setMessage("Could not permanently delete this order.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          data-test="delete-order"
        >
          <Trash2 className="size-3.5" />
          <span>Delete order</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h3 font-bold text-destructive">
            Permanently delete {orderNumber}?
          </DialogTitle>
          <DialogDescription className="text-subtitle text-brand-txt-secondary">
            Doors, documents, and activity history cannot be recovered.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="delete-confirmation"
              className="text-subtitle font-medium text-brand-txt-primary"
            >
              Type <strong className="font-bold text-foreground">{orderNumber}</strong> to confirm
            </Label>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              placeholder={orderNumber}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="delete-reason"
              className="text-subtitle font-medium text-brand-txt-primary"
            >
              Deletion reason (at least 5 characters)
            </Label>
            <Textarea
              id="delete-reason"
              value={reason}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why is this order being removed?"
              className="resize-none text-sm"
              rows={3}
            />
          </div>

          {message && (
            <p className="text-subtitle text-destructive" role="alert">
              {message}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!ready || pending}
            onClick={submit}
            data-test="confirm-delete-order"
          >
            {pending ? "Deleting permanently…" : "Delete permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
