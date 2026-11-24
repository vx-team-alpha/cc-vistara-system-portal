"use client";

import { Copy, Edit3, MoreVertical, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteOrderItemAction, duplicateOrderItemAction } from "@/server/orders/actions";

export function OrderItemActions({
  orderId,
  revision,
  item,
  editable,
}: {
  orderId: string;
  revision: number;
  item: { id: string; line_number: number; location: string };
  editable: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function run(action: "duplicate" | "delete") {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await (action === "duplicate"
          ? duplicateOrderItemAction({
              order_id: orderId,
              item_id: item.id,
              revision,
            })
          : deleteOrderItemAction({
              order_id: orderId,
              item_id: item.id,
              revision,
            }));
        if (result && !result.ok) setMessage(result.error);
      } catch (error) {
        if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
        setMessage(`Could not ${action} this door.`);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-brand-txt-secondary hover:bg-black/5 hover:text-brand-txt-primary focus-visible:ring-2 focus-visible:ring-brand-accent1"
            aria-label={`Actions for Door ${item.line_number}`}
            data-test={`door-actions-${item.line_number}`}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 rounded-xl p-1 shadow-md">
          <DropdownMenuItem
            asChild
            className="cursor-pointer gap-2 rounded-lg py-2 text-xs font-medium"
          >
            <Link
              href={`/print/orders/${orderId}?item=${item.id}`}
              target="_blank"
              rel="noreferrer"
              data-test={`print-door-${item.line_number}`}
            >
              <Printer className="size-3.5 text-brand-txt-secondary" />
              <span>Print PDF</span>
            </Link>
          </DropdownMenuItem>
          {editable && (
            <>
              <DropdownMenuItem
                asChild
                className="cursor-pointer gap-2 rounded-lg py-2 text-xs font-medium"
              >
                <Link
                  href={`/home/quotes/${orderId}/items/${item.id}/edit`}
                  data-test={`edit-door-${item.line_number}`}
                >
                  <Edit3 className="size-3.5 text-brand-txt-secondary" />
                  <span>Edit</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={pending}
                onClick={() => run("duplicate")}
                className="cursor-pointer gap-2 rounded-lg py-2 text-xs font-medium"
                data-test={`duplicate-door-${item.line_number}`}
              >
                <Copy className="size-3.5 text-brand-txt-secondary" />
                <span>{pending ? "Duplicating…" : "Duplicate"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                variant="destructive"
                disabled={pending}
                onClick={() => setDeleteOpen(true)}
                className="cursor-pointer gap-2 rounded-lg py-2 text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
                data-test={`delete-door-${item.line_number}`}
              >
                <Trash2 className="size-3.5 text-destructive" />
                <span>Delete</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {message && (
        <p className="text-xs text-destructive" role="alert">
          {message}
        </p>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl p-6 sm:max-w-md">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-title-2 font-bold text-brand-txt-primary">
              Delete Door {item.line_number}?
            </DialogTitle>
            <DialogDescription className="text-subtitle text-brand-txt-secondary">
              This permanently removes its saved configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm text-brand-txt-secondary">
            <p>
              Door {item.line_number}
              {item.location ? ` · ${item.location}` : ""} will be removed. Existing door numbers
              will not change.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Keep door
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setDeleteOpen(false);
                run("delete");
              }}
              data-test="confirm-delete-door"
            >
              {pending ? "Deleting…" : "Delete door"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
