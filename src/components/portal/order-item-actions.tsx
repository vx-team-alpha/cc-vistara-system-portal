"use client";

import { MoreVerticalIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { deleteOrderItemAction, duplicateOrderItemAction } from "@/server/orders/actions";

import { Icon } from "./icon";

import s from "./portal.module.css";

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
  const dialog = useRef<HTMLDialogElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  useEffect(() => {
    function closeMenu(event: PointerEvent) {
      if (menu.current?.open && !menu.current.contains(event.target as Node)) {
        menu.current.removeAttribute("open");
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.removeAttribute("open");
        menu.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function run(action: "duplicate" | "delete") {
    menu.current?.removeAttribute("open");
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
      <details className={s.actionMenu} ref={menu}>
        <summary
          className={s.iconBtn}
          aria-label={`Actions for Door ${item.line_number}`}
          data-test={`door-actions-${item.line_number}`}
        >
          <Icon icon={MoreVerticalIcon} size={18} />
        </summary>
        <div className={s.actionMenuPanel}>
          <Link
            className={s.actionMenuItem}
            href={`/print/orders/${orderId}?item=${item.id}`}
            target="_blank"
            rel="noreferrer"
            data-test={`print-door-${item.line_number}`}
          >
            Print PDF
          </Link>
          {editable && (
            <>
              <Link
                className={s.actionMenuItem}
                href={`/home/quotes/${orderId}/items/${item.id}/edit`}
                data-test={`edit-door-${item.line_number}`}
              >
                Edit
              </Link>
              <button
                type="button"
                className={s.actionMenuItem}
                disabled={pending}
                onClick={() => run("duplicate")}
                data-test={`duplicate-door-${item.line_number}`}
              >
                {pending ? "Duplicating…" : "Duplicate"}
              </button>
              <button
                type="button"
                className={`${s.actionMenuItem} ${s.actionMenuDanger}`}
                disabled={pending}
                onClick={() => {
                  menu.current?.removeAttribute("open");
                  dialog.current?.showModal();
                }}
                data-test={`delete-door-${item.line_number}`}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </details>
      {message && (
        <p className={s.fieldError} role="alert">
          {message}
        </p>
      )}
      <dialog
        ref={dialog}
        className={s.adminDialog}
        onKeyDown={(event) => {
          if (event.key === "Escape") dialog.current?.close();
        }}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className={s.confirmDialog}>
          <header className={s.adminDialogHead}>
            <div>
              <h2 className={s.cardTitle}>Delete Door {item.line_number}?</h2>
              <p className={s.hint}>This permanently removes its saved configuration.</p>
            </div>
            <button
              type="button"
              className={s.iconBtn}
              aria-label="Close delete confirmation"
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
          </header>
          <div className={s.confirmDialogBody}>
            <p>
              Door {item.line_number}
              {item.location ? ` · ${item.location}` : ""} will be removed. Existing door numbers
              will not change.
            </p>
            <div className={s.actions}>
              <button
                type="button"
                className={`${s.btn} ${s.btnDangerSolid}`}
                disabled={pending}
                onClick={() => run("delete")}
                data-test="confirm-delete-door"
              >
                {pending ? "Deleting…" : "Delete door"}
              </button>
              <button type="button" className={s.btn} onClick={() => dialog.current?.close()}>
                Keep door
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
