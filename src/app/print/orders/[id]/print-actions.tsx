"use client";

import { Printer, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintActions() {
  return (
    <div className="mx-auto mb-3 flex w-[210mm] max-w-full items-center justify-end gap-2 px-2 sm:px-0 print:hidden">
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="gap-1.5"
        onClick={() => window.print()}
        data-test="print-works-order"
      >
        <Printer className="size-3.5" />
        <span>Print</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => window.close()}
      >
        <X className="size-3.5" />
        <span>Close</span>
      </Button>
    </div>
  );
}
