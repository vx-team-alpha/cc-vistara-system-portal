"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useSyncExternalStore } from "react";

import {
  calculateManufacturing,
  resolveFinishSelections,
  type FrameDetails,
} from "@/lib/manufacturing";

import s from "./print.module.css";

type Particular = {
  question: string;
  answer: string;
  original_name?: string;
  section?: string;
};
type DeliveryNoteData = {
  brandName: string;
  brandPhone: string;
  system: string;
  systemId: "doorco" | "eurocell" | "rehau";
  frame: FrameDetails;
  range: string;
  layoutName: string;
  designName: string;
  particulars: Particular[];
  svgMarkup: string;
};

const subscribeToStorage = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
};

const getServerQuote = () => null;

function DeliveryNoteContent() {
  const params = useSearchParams();
  const printId = params.get("print_id");
  const storedQuote = useSyncExternalStore(
    subscribeToStorage,
    () => {
      try {
        return printId ? localStorage.getItem(`frontage:print-quote:${printId}`) : null;
      } catch {
        return null;
      }
    },
    getServerQuote,
  );
  const hasPrintData = useMemo(() => {
    if (!storedQuote) return false;
    try {
      const payload = JSON.parse(storedQuote);
      return Number.isFinite(payload.frame?.width_mm) && Number.isFinite(payload.frame?.height_mm);
    } catch {
      return false;
    }
  }, [storedQuote]);
  const queryBrandName = params.get("brand") || "Excel Composite Doors Ltd";
  const queryBrandPhone = params.get("brand_phone") || "";
  const querySystem = params.get("system") || "Eurocell Composite (NEW)";
  const queryRange = params.get("range") || "ORiGINAL";
  const queryLayoutName = params.get("layout_name") || "Door Left Hand";

  const data = useMemo<DeliveryNoteData>(() => {
    const fallback: DeliveryNoteData = {
      brandName: queryBrandName,
      brandPhone: queryBrandPhone,
      system: querySystem,
      systemId: querySystem.toLowerCase().includes("eurocell")
        ? "eurocell"
        : querySystem.toLowerCase().includes("rehau")
          ? "rehau"
          : "doorco",
      frame: {
        width_mm: Number(params.get("width_mm")),
        height_mm: Number(params.get("height_mm")),
        quantity: Number(params.get("quantity")),
        location: params.get("location") || "",
      },
      range: queryRange,
      layoutName: queryLayoutName,
      designName: "Carnoustie",
      particulars: [],
      svgMarkup: "",
    };

    if (!storedQuote) return fallback;

    try {
      const parsed = JSON.parse(storedQuote);
      const config = parsed.config || {};
      return {
        ...fallback,
        brandName: parsed.brand || fallback.brandName,
        brandPhone: parsed.brand_phone || fallback.brandPhone,
        system: parsed.system || fallback.system,
        systemId: config.system || fallback.systemId,
        frame: parsed.frame || config.frame || fallback.frame,
        range: parsed.range || fallback.range,
        layoutName: parsed.layout_name || fallback.layoutName,
        designName: config.design_name || config.style || fallback.designName,
        particulars: Array.isArray(config.particulars) ? config.particulars : [],
        svgMarkup: parsed.drawing || fallback.svgMarkup,
      };
    } catch {
      return fallback;
    }
  }, [
    params,
    queryBrandName,
    queryBrandPhone,
    queryLayoutName,
    queryRange,
    querySystem,
    storedQuote,
  ]);

  useEffect(() => {
    if (!hasPrintData) return;
    const id = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(id);
  }, [hasPrintData]);

  // Map particulars into quick lookup
  const specMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of data.particulars) {
      if (!p.question) continue;
      map.set(p.question.trim().toLowerCase(), p.answer);
    }
    return map;
  }, [data.particulars]);

  const finishes = resolveFinishSelections(data.particulars);
  const frameColour = finishes.profile.label;
  const cillColour = finishes.cill.label;
  const cill = specMap.get("cill") || specMap.get("sill") || "150mm cill";
  const threshold = specMap.get("threshold") || "80mm PVCu threshold";
  const drainage = specMap.get("drainage") || "Concealed drainage";
  const handles =
    specMap.get("handles") ||
    specMap.get("door handle") ||
    specMap.get("handle") ||
    "Chrome Lever/pad handles";
  const cylinder =
    specMap.get("cylinder") || specMap.get("security cylinder") || "3* Thumbturn cylinder";
  const keyAlike = specMap.get("key-alike") || specMap.get("keyed alike") || "No";
  const hinges = specMap.get("hinges") || specMap.get("hinge colour") || "VBH hinges";
  const locking = specMap.get("locking") || specMap.get("lock") || "ERA Lock";
  const glass = specMap.get("glass design") || specMap.get("glass") || "";

  // Dimensions formatted
  const width = String(data.frame.width_mm);
  const height = String(data.frame.height_mm);

  // System label formatting e.g. "Eurocell Composite (NEW)"
  const systemDisplay = data.system.toLowerCase().includes("eurocell")
    ? "Eurocell Composite (NEW)"
    : data.system.toLowerCase().includes("rehau")
      ? "Rehau Composite Door"
      : `${data.system} Composite`;

  // Slab line e.g. "Carnoustie slab (Black/Black)"
  const slabColour = finishes.door.label;
  const slabName = data.designName || "Carnoustie";
  let manufacturing = null;
  try {
    manufacturing = calculateManufacturing({
      system: data.systemId,
      style: "Style 1",
      designName: slabName,
      frame: data.frame,
      particulars: data.particulars,
    });
  } catch {
    manufacturing = null;
  }

  if (!hasPrintData) {
    return (
      <div className={s.page}>
        Print details are unavailable. Return to the designer and open the PDF again.
      </div>
    );
  }

  return (
    <div className={s.page}>
      {/* ── Company Header ── */}
      <header className={s.companyHeader}>
        <h1 className={s.companyName}>{data.brandName}</h1>
        <p className={s.companyAddress}>Unit 3, Elland Terrace, Leeds, West Yorkshire. LS11 9NW</p>
        <p className={s.companyEmail}>Email : orders@excelcompositedoors.com</p>
        <p className={s.companyReg}>VAT Reg. No. : 461924777 &nbsp; Company Reg. No. : 14205367</p>
      </header>

      {/* ── Title & Reference Bar ── */}
      <div className={s.docTitleBar}>
        <span className={s.customerCode}>AJK</span>
        <h2 className={s.docTitle}>WORKS ORDER</h2>
        <div className={s.jobMeta}>
          <div>Job No: EXCELRETAIL021522</div>
          <div>Ref: HUSSAIN</div>
        </div>
      </div>

      <div className={s.sectionIntro}>Manufacture the following item:-</div>

      {/* ── Main Door Item Card ── */}
      <div className={s.itemCard}>
        <div className={s.itemHeader}>
          Item 1 - {slabColour} {systemDisplay} Open IN composite door Style 1 - {width}w x {height}
          h
        </div>
        <div className={s.itemContent}>
          {/* Elevation Visual */}
          <div className={s.doorVisual}>
            {data.svgMarkup ? (
              <div className={s.svgFrame} dangerouslySetInnerHTML={{ __html: data.svgMarkup }} />
            ) : (
              <div className={s.previewUnavailable}>Door preview unavailable</div>
            )}
          </div>

          {/* Two-Column Specification */}
          <div className={s.specColumns}>
            <div className={s.specColumn}>
              <table className={s.specTable}>
                <tbody>
                  <tr className={s.specRow}>
                    <td className={s.specKey}>Frame colour</td>
                    <td className={s.specVal}>{frameColour}</td>
                  </tr>
                  <tr className={s.specRow}>
                    <td className={s.specKey}>Cill colour</td>
                    <td className={s.specVal}>{cillColour}</td>
                  </tr>
                  <tr className={s.specRow}>
                    <td className={s.specKey}>Cill</td>
                    <td className={s.specVal}>{cill}</td>
                  </tr>
                  <tr className={s.specRow}>
                    <td className={s.specKey}>Threshold</td>
                    <td className={s.specVal}>{threshold}</td>
                  </tr>
                  <tr className={s.specRow}>
                    <td className={s.specKey}>Drainage</td>
                    <td className={s.specVal}>{drainage}</td>
                  </tr>
                  <tr className={s.specRow}>
                    <td className={s.specKey}>Handles</td>
                    <td className={s.specVal}>{handles}</td>
                  </tr>
                  <tr className={s.specRow}>
                    <td className={s.specKey}>Cylinder</td>
                    <td className={s.specVal}>{cylinder}</td>
                  </tr>
                  {keyAlike && keyAlike !== "No" && (
                    <tr className={s.specRow}>
                      <td className={s.specKey}>Key-alike</td>
                      <td className={s.specVal}>{keyAlike}</td>
                    </tr>
                  )}
                  {glass && (
                    <tr className={s.specRow}>
                      <td className={s.specKey}>Glass</td>
                      <td className={s.specVal}>{glass}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={s.specColumn}>
              <table className={s.specTable}>
                <tbody>
                  <tr className={s.specRow}>
                    <td className={s.specKey}>Hinges</td>
                    <td className={s.specVal}>{hinges}</td>
                  </tr>
                  <tr className={s.specRow}>
                    <td className={s.specKey}>Locking</td>
                    <td className={s.specVal}>{locking}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Slab Description Line */}
        <div className={s.slabLine}>
          {slabName} slab ({slabColour})
        </div>
      </div>

      {manufacturing ? (
        <section className={s.manufacturingSection}>
          <div className={s.manufacturingMeta}>
            <span>
              <strong>Overall:</strong> {manufacturing.overallWidthMm}w ×{" "}
              {manufacturing.overallHeightMm}h
            </span>
            <span>
              <strong>Finished frame:</strong> {manufacturing.finishedFrameWidthMm}w ×{" "}
              {manufacturing.finishedFrameHeightMm}h
            </span>
            <span>
              <strong>Check diagonal:</strong> {manufacturing.checkDiagonalMm} mm
            </span>
            <span>
              <strong>Quantity:</strong> {manufacturing.quantity}
            </span>
            {manufacturing.location && (
              <span>
                <strong>Location:</strong> {manufacturing.location}
              </span>
            )}
          </div>
          <table className={s.partsTable}>
            <thead>
              <tr>
                <th>Part code</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Width</th>
                <th>Height</th>
                <th>End preps</th>
              </tr>
            </thead>
            <tbody>
              {manufacturing.parts.map((part) => (
                <tr key={part.lineId}>
                  <td>{part.partCode || "—"}</td>
                  <td>{part.description}</td>
                  <td>{part.totalQuantity}</td>
                  <td>{part.widthMm ?? "—"}</td>
                  <td>{part.heightMm ?? "—"}</td>
                  <td>
                    {part.leftEndPrep === "none"
                      ? "—"
                      : `${part.leftEndPrep} / ${part.rightEndPrep}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {manufacturing.warnings.map((warning) => (
            <p className={s.manufacturingWarning} key={warning}>
              {warning}
            </p>
          ))}
        </section>
      ) : (
        <p className={s.manufacturingWarning}>
          Manufacturing rules for this profile system have not been configured yet.
        </p>
      )}

      {/* ── Signature Block ── */}
      <div className={s.signBox}>
        <div className={s.signTitle}>Production checks</div>
        <div className={s.signField}>Cut by:</div>
        <div className={s.signField}>Assembled by:</div>
        <div className={s.signField}>Checked by:</div>
        <div className={s.signField}>Date:</div>
      </div>

      {/* ── Notes Box ── */}
      <div className={s.notesBox}>
        <div className={s.notesTitle}>Notes:</div>
        <p className={s.notesContent}>
          {cill.toUpperCase()} - {cillColour.toUpperCase()} / {cillColour.toUpperCase()} -{" "}
          {manufacturing?.parts.find((part) => part.lineId === "cill")?.widthMm || "CHECK SIZE"}
        </p>
      </div>

      {/* ── Document Footer ── */}
      <footer className={s.docFooter}>
        <span>
          Vistara manufacturing rules · {manufacturing?.ruleSetId || "not configured"} v
          {manufacturing?.ruleSetVersion || "—"}
        </span>
        <span>Page - 1 of 1</span>
      </footer>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense>
      <DeliveryNoteContent />
    </Suspense>
  );
}
