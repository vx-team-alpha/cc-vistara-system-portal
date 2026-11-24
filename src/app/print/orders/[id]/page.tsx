import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { calculateManufacturing, resolveFinishSelections } from "@/lib/manufacturing";
import { getOrderPrintData } from "@/server/orders/data";
import type { Json } from "@/types/supabase";

import { PrintActions } from "./print-actions";

import s from "./print.module.css";

export const metadata: Metadata = { title: "Works order" };

type Particular = {
  question: string;
  answer: string;
  original_name?: string;
  section?: string;
};

function object(value: Json | null | undefined): Record<string, Json> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json>)
    : {};
}

function string(value: Json | undefined, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function particulars(value: Json | undefined): Particular[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = object(entry);
    const question = string(row.question);
    if (!question) return [];
    return [
      {
        question,
        answer: string(row.answer, "-"),
        original_name: string(row.original_name) || undefined,
        section: string(row.section) || undefined,
      },
    ];
  });
}

function answerMap(rows: Particular[]) {
  return new Map(rows.map((row) => [row.question.trim().toLowerCase(), row.answer]));
}

function firstAnswer(answers: Map<string, string>, ...names: string[]) {
  for (const name of names) {
    const value = answers.get(name.toLowerCase());
    if (value && !/^(?:-|—|not selected)$/i.test(value)) return value;
  }
  return "-";
}

function printDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function printStatus(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function OrderPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const { order, business } = await getOrderPrintData(id);
  if (!order || !order.order_items.length) notFound();
  if (query.item && !z.uuid().safeParse(query.item).success) notFound();
  const selectedItems = query.item
    ? order.order_items.filter((item) => item.id === query.item)
    : order.order_items;
  if (!selectedItems.length) notFound();
  const customer = object(order.customer_snapshot);

  return (
    <main className={s.screen}>
      <PrintActions />
      <article className={s.document}>
        <header className={s.companyHeader}>
          {business?.logo_url && <img src={business.logo_url} alt="" className={s.logo} />}
          <div>
            <h1>{business?.business_name || "Vistara"}</h1>
            <p>
              {[business?.address, business?.city, business?.state, business?.zip_code]
                .filter(Boolean)
                .join(", ")}
            </p>
            {business?.phone && <p>Tel: {business.phone}</p>}
          </div>
        </header>

        <div className={s.titleBar}>
          <div>
            <span className={s.eyebrow}>Manufacturing document</span>
            <h2>WORKS ORDER</h2>
          </div>
          <dl className={s.jobMeta}>
            <dt>Job No.</dt>
            <dd>{order.order_number}</dd>
            <dt>Created</dt>
            <dd>{printDate(order.created_at)}</dd>
            <dt>Delivery</dt>
            <dd>{printDate(order.delivery_date)}</dd>
          </dl>
        </div>

        <section className={s.orderSummary}>
          <div>
            <h3>Customer</h3>
            <p>
              <strong>{string(customer.name, "-")}</strong>
            </p>
            <p>{string(customer.phone, "-")}</p>
            <p>
              {[customer.address, customer.city, customer.state, customer.zip_code]
                .map((value) => string(value))
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
          <div>
            <h3>Order details</h3>
            <p>
              <strong>Status:</strong> {printStatus(order.status)}
            </p>
            <p>
              <strong>Order note:</strong> {order.note || "No note"}
            </p>
          </div>
        </section>

        <h3 className={s.sectionIntro}>
          Manufacture the following {selectedItems.length === 1 ? "item" : "items"}:
        </h3>

        {selectedItems
          .toSorted((a, b) => a.line_number - b.line_number)
          .map((item) => {
            const config = object(item.configuration);
            const catalogue = object(item.catalogue_snapshot);
            const rows = particulars(config.particulars);
            const answers = answerMap(rows);
            const finishes = resolveFinishSelections(rows);
            const systemId =
              item.system === "rehau" ||
              string(config.system) === "rehau" ||
              string(config.profile_system) === "rehau" ||
              string(catalogue.system) === "rehau"
                ? "rehau"
                : "eurocell";
            const systemName = systemId === "rehau" ? "Rehau Total70" : "Eurocell Composite";
            const layoutName = string(catalogue.layout_name, `Door ${item.line_number}`);
            const selectedDoorDesign = firstAnswer(answers, "door design (door)", "door design");
            const designName =
              string(config.design_name) ||
              (selectedDoorDesign !== "-" ? selectedDoorDesign : "") ||
              "Composite door";
            const drawingMarkup = item.outside_drawing || item.inside_drawing || "";
            let manufacturing = null;
            try {
              manufacturing = calculateManufacturing({
                system: systemId,
                style: layoutName,
                designName,
                frame: {
                  width_mm: item.width_mm,
                  height_mm: item.height_mm,
                  quantity: item.quantity,
                  location: item.location,
                },
                particulars: rows,
              });
            } catch {
              manufacturing = null;
            }

            return (
              <section className={s.item} key={item.id}>
                <header className={s.itemHeader}>
                  Item {item.line_number} - {systemName} - {layoutName} - {item.width_mm}w x{" "}
                  {item.height_mm}h
                </header>
                <div className={s.itemBody}>
                  <figure className={s.preview}>
                    {drawingMarkup ? (
                      <div
                        className={s.previewDrawing}
                        dangerouslySetInnerHTML={{ __html: drawingMarkup }}
                      />
                    ) : (
                      <div className={s.previewMissing}>Door preview unavailable</div>
                    )}
                    <figcaption>
                      {item.outside_drawing ? "Outside view" : "Saved door view"}
                    </figcaption>
                  </figure>
                  <div className={s.specification}>
                    <dl>
                      <dt>Frame system</dt>
                      <dd>{systemName}</dd>
                      <dt>Frame colour</dt>
                      <dd>{finishes.profile.label}</dd>
                      <dt>Door design</dt>
                      <dd>{designName}</dd>
                      <dt>Door colour</dt>
                      <dd>{finishes.door.label}</dd>
                      <dt>Cill</dt>
                      <dd>{firstAnswer(answers, "cill", "sill")}</dd>
                      <dt>Cill colour</dt>
                      <dd>{finishes.cill.label}</dd>
                      <dt>Threshold</dt>
                      <dd>{firstAnswer(answers, "threshold")}</dd>
                      <dt>Drainage</dt>
                      <dd>{firstAnswer(answers, "drainage")}</dd>
                    </dl>
                    <dl>
                      <dt>Handle</dt>
                      <dd>{firstAnswer(answers, "handles", "door handle", "handle")}</dd>
                      <dt>Cylinder</dt>
                      <dd>{firstAnswer(answers, "cylinder", "security cylinder")}</dd>
                      <dt>Hinges</dt>
                      <dd>{firstAnswer(answers, "hinges", "hinge colour")}</dd>
                      <dt>Locking</dt>
                      <dd>{firstAnswer(answers, "locking", "lock")}</dd>
                      {firstAnswer(answers, "outer frame") !== "-" && (
                        <>
                          <dt>Outer frame</dt>
                          <dd>{firstAnswer(answers, "outer frame")}</dd>
                        </>
                      )}
                      {firstAnswer(answers, "restrictor") !== "-" && (
                        <>
                          <dt>Restrictor</dt>
                          <dd>{firstAnswer(answers, "restrictor")}</dd>
                        </>
                      )}
                      {firstAnswer(answers, "safe t bar") !== "-" && (
                        <>
                          <dt>Safe T bar</dt>
                          <dd>{firstAnswer(answers, "safe t bar")}</dd>
                        </>
                      )}
                      <dt>Location</dt>
                      <dd>{item.location || "-"}</dd>
                      <dt>Quantity</dt>
                      <dd>{item.quantity}</dd>
                    </dl>
                  </div>
                </div>

                <div className={s.measurements}>
                  <span>
                    <strong>Overall:</strong> {item.width_mm}w x {item.height_mm}h
                  </span>
                  {manufacturing && (
                    <>
                      <span>
                        <strong>Finished frame:</strong> {manufacturing.finishedFrameWidthMm}w x{" "}
                        {manufacturing.finishedFrameHeightMm}h
                      </span>
                      <span>
                        <strong>Check diagonal:</strong> {manufacturing.checkDiagonalMm} mm
                      </span>
                    </>
                  )}
                  <span>
                    <strong>Quantity:</strong> {item.quantity}
                  </span>
                </div>

                {manufacturing && (
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
                          <td>{part.partCode ? part.partCode : ""}</td>
                          <td>{part.description}</td>
                          <td>{part.totalQuantity ?? 1}</td>
                          <td>{part.widthMm ?? "-"}</td>
                          <td>{part.heightMm ?? "-"}</td>
                          <td>
                            {part.leftEndPrep === "none"
                              ? "-"
                              : `${part.leftEndPrep} / ${part.rightEndPrep}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {rows.length > 0 && (
                  <details className={s.allSelections}>
                    <summary>All selected options</summary>
                    <dl>
                      {rows.map((row, index) => (
                        <div key={`${row.question}-${index}`}>
                          <dt>{row.question}</dt>
                          <dd>{row.answer}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </section>
            );
          })}

        <section className={s.productionChecks}>
          <h3>Production checks</h3>
          <div>
            <span>Cut by:</span>
            <span>Assembled by:</span>
            <span>Checked by:</span>
            <span>Date:</span>
          </div>
        </section>
        <section className={s.notes}>
          <strong>Notes:</strong>
          <p>{order.note || ""}</p>
        </section>
        <footer>
          <span>{business?.pdf_footer || "Generated from the saved order specification."}</span>
          <span>{order.order_number}</span>
        </footer>
      </article>
    </main>
  );
}
