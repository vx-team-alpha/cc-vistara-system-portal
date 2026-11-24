"use client";

import { useCallback, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { saveOrderItemConfigurationAction } from "@/server/orders/actions";
import type { Configuration } from "@/server/portal/schemas";

import { Configurator } from "./configurator";

type FrameDetails = Configuration["frame"];

export function OrderItemConfigurator({
  orderId,
  itemId,
  layoutId,
  frameDetails,
  system = "eurocell",
  revision,
  initialConfiguration,
  initialDrawings,
}: {
  orderId: string;
  itemId: string;
  layoutId: string;
  frameDetails: FrameDetails;
  system?: "eurocell" | "rehau";
  revision: number;
  initialConfiguration: Configuration;
  initialDrawings: { outside: string; inside: string };
}) {
  const [configuration, setConfiguration] = useState<Configuration | null>(initialConfiguration);
  const [drawings, setDrawings] = useState(initialDrawings);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const configWithSystem = useMemo(
    () => ({
      ...initialConfiguration,
      system,
      frame: frameDetails,
    }),
    [initialConfiguration, system, frameDetails],
  );

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
          revision,
          configuration: {
            ...configuration,
            system,
            frame: frameDetails,
          },
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

  const saveButton = (label: string) => (
    <Button
      type="button"
      variant="primary"
      size="sm"
      disabled={pending || !configuration}
      onClick={save}
      data-test="save-door-configuration"
    >
      {pending ? "Saving…" : label}
    </Button>
  );

  return (
    <>
      {message && (
        <p className="mb-4 text-sm font-medium text-destructive" role="alert">
          {message}
        </p>
      )}
      <Configurator
        configUrl={`/api/orders/${orderId}/catalogue/config`}
        layoutId={layoutId}
        initialConfiguration={configWithSystem}
        frameDetails={frameDetails}
        onChange={setConfiguration}
        onDrawingChange={onDrawingChange}
        completionAction={saveButton("Save and finish door")}
        headerAction={saveButton("Save configuration")}
      />
    </>
  );
}
