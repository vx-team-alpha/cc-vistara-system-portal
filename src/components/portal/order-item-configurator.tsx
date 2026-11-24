"use client";

import { useCallback, useState, useTransition } from "react";

import { saveOrderItemConfigurationAction } from "@/server/orders/actions";
import type { Configuration } from "@/server/portal/schemas";

import { Configurator } from "./configurator";

import s from "./portal.module.css";

type FrameDetails = Configuration["frame"];

export function OrderItemConfigurator({
  orderId,
  itemId,
  layoutId,
  frameDetails,
}: {
  orderId: string;
  itemId: string;
  layoutId: string;
  frameDetails: FrameDetails;
}) {
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [drawings, setDrawings] = useState({ outside: "", inside: "" });
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const onDrawingChange = useCallback((markup: string, internal: boolean) => {
    if (!markup) return;
    setDrawings((value) => ({ ...value, [internal ? "inside" : "outside"]: markup }));
  }, []);

  const save = () => {
    if (!configuration) return;
    setMessage("");
    startTransition(async () => {
      try {
        const result = await saveOrderItemConfigurationAction({
          order_id: orderId,
          item_id: itemId,
          configuration: { ...configuration, system: "eurocell", frame: frameDetails },
          outside_drawing: drawings.outside,
          inside_drawing: drawings.inside,
        });
        if (result && !result.ok) setMessage(result.error);
      } catch (error) {
        if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
        setMessage("Could not save the door questions. Please try again.");
      }
    });
  };

  return (
    <>
      {message && (
        <p className={s.notice} data-error role="alert">
          {message}
        </p>
      )}
      <Configurator
        configUrl={`/api/orders/${orderId}/catalogue/config`}
        layoutId={layoutId}
        frameDetails={frameDetails}
        onChange={setConfiguration}
        onDrawingChange={onDrawingChange}
        completionAction={
          <button
            type="button"
            className={`${s.btn} ${s.btnPrimary}`}
            disabled={pending || !configuration}
            onClick={save}
            data-test="save-door-configuration"
          >
            {pending ? "Saving door…" : "Save door"}
          </button>
        }
      />
    </>
  );
}
