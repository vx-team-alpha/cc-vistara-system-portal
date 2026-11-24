"use client";

import { useRef, useState, useTransition } from "react";

import { deleteOrderAction } from "@/server/orders/actions";

import s from "./portal.module.css";

export function OrderDeleteDialog({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
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
    <>
      <button
        type="button"
        className={`${s.btn} ${s.btnDanger}`}
        onClick={() => dialog.current?.showModal()}
        data-test="delete-order"
      >
        Delete order
      </button>
      <dialog
        ref={dialog}
        className={s.adminDialog}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className={s.confirmDialog}>
          <header className={s.adminDialogHead}>
            <div>
              <h2 className={s.cardTitle}>Permanently delete {orderNumber}?</h2>
              <p className={s.hint}>Doors, documents, and activity history cannot be recovered.</p>
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
            <label className={s.field}>
              <span className={s.label}>Type {orderNumber} to confirm</span>
              <input
                className={s.input}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>Deletion reason</span>
              <textarea
                className={s.textarea}
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Why is this order being removed?"
              />
            </label>
            {message && (
              <p className={s.notice} data-error role="alert">
                {message}
              </p>
            )}
            <div className={s.actions}>
              <button
                type="button"
                className={`${s.btn} ${s.btnDangerSolid}`}
                disabled={!ready || pending}
                onClick={submit}
                data-test="confirm-delete-order"
              >
                {pending ? "Deleting permanently…" : "Delete permanently"}
              </button>
              <button type="button" className={s.btn} onClick={() => dialog.current?.close()}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
