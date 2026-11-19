"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useSyncExternalStore } from "react";

import s from "./print.module.css";

type Particular = { question: string; answer: string };
type DeliveryNoteData = {
  brandName: string;
  brandPhone: string;
  system: string;
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

const getStoredQuote = () => sessionStorage.getItem("frontage:print-quote");
const getStoredDrawing = () => sessionStorage.getItem("frontage:last-door-drawing") || "";
const getServerQuote = () => null;
const getServerDrawing = () => "";

function DeliveryNoteContent() {
  const params = useSearchParams();
  const storedQuote = useSyncExternalStore(subscribeToStorage, getStoredQuote, getServerQuote);
  const drawing = useSyncExternalStore(subscribeToStorage, getStoredDrawing, getServerDrawing);
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
      range: queryRange,
      layoutName: queryLayoutName,
      designName: "Carnoustie",
      particulars: [],
      svgMarkup: drawing,
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
        range: parsed.range || fallback.range,
        layoutName: parsed.layout_name || fallback.layoutName,
        designName: config.design_name || config.style || fallback.designName,
        particulars: Array.isArray(config.particulars) ? config.particulars : [],
      };
    } catch {
      return fallback;
    }
  }, [
    drawing,
    queryBrandName,
    queryBrandPhone,
    queryLayoutName,
    queryRange,
    querySystem,
    storedQuote,
  ]);

  useEffect(() => {
    const id = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(id);
  }, []);

  // Map particulars into quick lookup
  const specMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of data.particulars) {
      if (!p.question) continue;
      map.set(p.question.trim().toLowerCase(), p.answer);
    }
    return map;
  }, [data.particulars]);

  const frameColour = specMap.get("frame colour") || specMap.get("outer frame colour") || "Black";
  const cillColour = specMap.get("cill colour") || frameColour || "Black";
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
  const width = specMap.get("overall width") || "950";
  const height = specMap.get("overall height") || "2100";

  // System label formatting e.g. "Eurocell Composite (NEW)"
  const systemDisplay = data.system.toLowerCase().includes("eurocell")
    ? "Eurocell Composite (NEW)"
    : data.system.toLowerCase().includes("rehau")
      ? "REHAU AGILA Composite"
      : `${data.system} Composite`;

  // Slab line e.g. "Carnoustie slab (Black/Black)"
  const slabColour = specMap.get("door colour") || specMap.get("external door colour") || "Black";
  const slabName = data.designName || "Carnoustie";

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
        <h2 className={s.docTitle}>DELIVERY NOTE</h2>
        <div className={s.jobMeta}>
          <div>Job No: EXCELRETAIL021522</div>
          <div>Ref: HUSSAIN</div>
        </div>
      </div>

      <div className={s.sectionIntro}>Received the following items:-</div>

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
              <div style={{ width: 100, height: 210, background: "#1a1a1a", borderRadius: 2 }} />
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
          {slabName} slab ({slabColour}/{slabColour})
        </div>
      </div>

      {/* ── Signature Block ── */}
      <div className={s.signBox}>
        <div className={s.signTitle}>Received the above items</div>
        <div className={s.signField}>Signed:</div>
        <div className={s.signField}>Print Name:</div>
        <div className={s.signField}>Date:</div>
        <div className={s.signField}>Paid:</div>
      </div>

      {/* ── Notes Box ── */}
      <div className={s.notesBox}>
        <div className={s.notesTitle}>Notes:</div>
        <p className={s.notesContent}>
          {cill.toUpperCase()} - {cillColour.toUpperCase()} / {cillColour.toUpperCase()} - 1050
        </p>
      </div>

      {/* ── Document Footer ── */}
      <footer className={s.docFooter}>
        <span>Focus v10.64J © Windowlink Ltd 2000-2020 Revision:1.00.01</span>
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
