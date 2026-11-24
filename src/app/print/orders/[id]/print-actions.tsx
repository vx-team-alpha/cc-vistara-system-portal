"use client";

import { Printer, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import s from "./print.module.css";

export function PrintActions() {
  return (
    <div className={s.screenActions}>
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
