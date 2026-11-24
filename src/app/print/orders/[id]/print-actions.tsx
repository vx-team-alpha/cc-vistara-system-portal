"use client";

import s from "./print.module.css";

export function PrintActions() {
  return (
    <div className={s.screenActions}>
      <button type="button" onClick={() => window.print()} data-test="print-works-order">
        Print
      </button>
      <button type="button" onClick={() => window.close()}>
        Close
      </button>
    </div>
  );
}
