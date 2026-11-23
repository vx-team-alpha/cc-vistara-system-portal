"use client";

import { ArrowLeft, ArrowRight, Printer } from "lucide-react";
import Image, { type ImageLoaderProps } from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Configuration } from "@/server/portal/schemas";

import { Configurator } from "./configurator";
import { LayoutPreview } from "./layout-preview";

import s from "./portal.module.css";

type DoorSystem = "rehau" | "eurocell" | "doorco";
type FrameDetails = Configuration["frame"];
const SYSTEMS: { id: "rehau" | "eurocell"; label: string; subtitle: string; badge: string }[] = [
  {
    id: "rehau",
    label: "Rehau Composite Door",
    subtitle: "REHAU 70mm composite door outer frame and profile system",
    badge: "REHAU",
  },
  {
    id: "eurocell",
    label: "Eurocell Composite",
    subtitle: "Eurocell 70mm composite door outer frame and profile system",
    badge: "Eurocell",
  },
];

type Product = { id: string; name: string; range_id: string; image: string };
export type EmbedBranding = {
  name: string;
  logoUrl: string;
  phone: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
};

type BrandStyle = CSSProperties & {
  "--brand-primary": string;
  "--brand-background": string;
  "--brand-text": string;
  "--on-primary": string;
};

function foregroundFor(background: string) {
  const channels = background
    .slice(1)
    .match(/.{2}/g)
    ?.map((value) => Number.parseInt(value, 16)) || [25, 25, 25];
  const luminance = channels.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * luminance[0] + 0.7152 * luminance[1] + 0.0722 * luminance[2] > 0.42
    ? "#191919"
    : "#ffffff";
}

function directImageLoader({ src }: ImageLoaderProps) {
  return src;
}

const WIZARD_STEPS = [
  { id: "style", label: "1. Door Style" },
  { id: "system", label: "2. Frame System" },
  { id: "details", label: "3. Frame Details" },
  { id: "questions", label: "4. Door Options" },
] as const;

export function PublicEmbed({
  publicKey,
  ranges,
  products,
  trackViews = true,
  branding,
}: {
  publicKey: string;
  ranges: { id: string; name: string }[];
  products: Product[];
  trackViews?: boolean;
  branding?: EmbedBranding;
}) {
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [doorDrawing, setDoorDrawing] = useState("");
  const [step, setStep] = useState<
    "style" | "layout" | "system" | "details" | "questions" | "category"
  >("style");
  const [system, setSystem] = useState<DoorSystem>("eurocell");
  const [frame, setFrame] = useState<FrameDetails>({
    width_mm: 900,
    height_mm: 2100,
    quantity: 1,
    location: "",
  });
  const [frameErrors, setFrameErrors] = useState<{
    width?: string;
    height?: string;
    quantity?: string;
  }>({});
  const stepHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    stepHeading.current?.focus();
  }, [step]);
  const [range, setRange] = useState(ranges[0]?.id || "");
  const available = products.filter((p) => p.range_id === range);
  const [selected, setSelected] = useState(products.find((p) => p.range_id === range)?.id || "");
  const product = available.find((p) => p.id === selected) || available[0];
  const session = useRef("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContainer, setDialogContainer] = useState<HTMLDivElement | null>(null);
  const embedRoot = useRef<HTMLDivElement | null>(null);

  const brandStyle = branding
    ? ({
        "--brand-primary": branding.primaryColor,
        "--brand-background": branding.backgroundColor,
        "--brand-text": branding.textColor,
        "--on-primary": foregroundFor(branding.primaryColor),
      } as BrandStyle)
    : undefined;
  const supportPhone = branding?.phone.trim() || "";
  const supportPhoneHref = supportPhone.replace(/[^\d+]/g, "");

  useEffect(() => {
    if (window.parent === window || !embedRoot.current) return;
    embedRoot.current.dataset.embedded = "";
    const root = embedRoot.current.closest<HTMLElement>("[data-embed-root]") || embedRoot.current;
    const dialog = dialogOpen
      ? embedRoot.current.querySelector<HTMLElement>("[data-slot='dialog-content']")
      : null;
    let frame = 0;
    const publishHeight = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const contentHeight = Math.ceil(root.getBoundingClientRect().height);
        const dialogHeight = dialog ? dialog.scrollHeight + 48 : 0;
        window.parent.postMessage(
          {
            type: "vistara:resize",
            key: publicKey,
            height: Math.max(contentHeight, dialogHeight),
          },
          "*",
        );
      });
    };
    const observer = new ResizeObserver(publishHeight);
    observer.observe(root);
    if (dialog) observer.observe(dialog);
    publishHeight();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [dialogOpen, publicKey]);

  useEffect(() => {
    let id = crypto.randomUUID() as string;
    try {
      const key = `frontage-session:${publicKey}`;
      id = sessionStorage.getItem(key) || id;
      sessionStorage.setItem(key, id);
    } catch {}
    session.current = id;
    if (!trackViews) return;
    void fetch(`/api/embed/${publicKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "view", session_id: id }),
    }).catch(() => {});
  }, [publicKey, trackViews]);

  async function submit(form: FormData) {
    if (!product || !configuration || pending || done) return;
    if (!session.current) session.current = crypto.randomUUID();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/embed/${publicKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "quote",
          session_id: session.current,
          layout_id: product.id,
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone") || "",
          message: form.get("message") || "",
          company: form.get("company") || "",
          configuration: configuration ? { ...configuration, system, frame } : undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Your enquiry could not be sent.");
      }
      setDone(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Your enquiry could not be sent. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  function resetExperience() {
    const initialRange = ranges.find((r) => products.some((p) => p.range_id === r.id))?.id || "";
    const nextSession = crypto.randomUUID();

    setConfiguration(null);
    setDoorDrawing("");
    setStep("style");
    setSystem("eurocell");
    setFrame({ width_mm: 900, height_mm: 2100, quantity: 1, location: "" });
    setRange(initialRange);
    setSelected(products.find((p) => p.range_id === initialRange)?.id || "");
    setMessage("");
    setDone(false);
    session.current = nextSession;

    try {
      sessionStorage.setItem(`frontage-session:${publicKey}`, nextSession);
    } catch {}

    if (trackViews) {
      void fetch(`/api/embed/${publicKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "view", session_id: nextSession }),
      }).catch(() => {});
    }
  }

  function printPdf() {
    if (!product || !configuration) return;
    const selectedSystem = SYSTEMS.find((sys) => sys.id === system);
    const rangeName = ranges.find((r) => r.id === range)?.name || "";
    const drawing = doorDrawing;
    const systemName =
      selectedSystem?.label || (system === "rehau" ? "Rehau Composite Door" : "Eurocell Composite");
    const printPayload = {
      layout_id: product.id,
      layout_name: product.name,
      range: rangeName,
      system: systemName,
      systemId: system,
      brand: branding?.name || "Excel Composite Doors Ltd",
      brand_phone: branding?.phone || "",
      config: { ...configuration, system, frame },
      drawing,
      frame,
    };
    const printId = crypto.randomUUID();
    try {
      localStorage.setItem(`frontage:print-quote:${printId}`, JSON.stringify(printPayload));
    } catch {}
    const params = new URLSearchParams({
      print_id: printId,
      layout_name: product.name,
      range: rangeName,
      system: systemName,
      brand: branding?.name || "Excel Composite Doors Ltd",
      width_mm: String(frame.width_mm),
      height_mm: String(frame.height_mm),
      quantity: String(frame.quantity),
      location: frame.location,
    });
    window.open(`/print/quote?${params.toString()}`, "_blank", "noopener");
  }

  if (!products.length)
    return (
      <section className={s.empty}>
        <h1>No products available</h1>
        <p>Please contact the website owner for help.</p>
      </section>
    );

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (pending) return;
        setDialogOpen(open);
        if (open) setMessage("");
        if (!open && done) resetExperience();
      }}
    >
      <div
        ref={(node) => {
          embedRoot.current = node;
          setDialogContainer(node);
        }}
        className={`${s.embedExperience} ${branding ? s.embedTheme : ""}`}
        style={brandStyle}
      >
        <header className={s.embedBrand}>
          <span className={s.embedBrandIdentity}>
            {branding?.logoUrl ? (
              <Image
                loader={directImageLoader}
                unoptimized
                width={320}
                height={88}
                src={branding.logoUrl}
                alt={branding.name ? `${branding.name} logo` : "Company logo"}
              />
            ) : (
              <strong>{branding?.name || "Vistara"}</strong>
            )}
          </span>
          {supportPhone && (
            <a className={s.embedSupport} href={`tel:${supportPhoneHref}`}>
              <span>Need help?</span>
              <span>
                Call us on <strong>{supportPhone}</strong>
              </span>
            </a>
          )}
        </header>
        <div className={s.stack}>
          <nav className={s.embedStepper} aria-label="Configuration progress">
            {WIZARD_STEPS.map((ws, idx) => {
              const isCurrent =
                ws.id === step || (ws.id === "style" && (step === "layout" || step === "category"));
              const stepOrder = ["style", "system", "details", "questions"];
              const currentIdx = stepOrder.indexOf(
                step === "layout" || step === "category" ? "style" : step,
              );
              const isPast = idx < currentIdx;
              return (
                <span key={ws.id} className={s.embedStepWrapper}>
                  {idx > 0 && (
                    <span className={s.embedStepDivider} aria-hidden="true">
                      /
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={!isPast}
                    className={`${s.embedStepItem} ${isCurrent ? s.embedStepItemActive : ""} ${isPast ? s.embedStepItemClickable : ""}`}
                    onClick={() => {
                      if (isPast) {
                        setStep(ws.id === "style" ? "style" : (ws.id as any));
                      }
                    }}
                  >
                    {ws.label}
                  </button>
                </span>
              );
            })}
          </nav>
          {step !== "questions" && (
            <section aria-labelledby="embed-step-heading">
              <div className={s.toolbar}>
                <div>
                  <h2
                    id="embed-step-heading"
                    ref={stepHeading}
                    tabIndex={-1}
                    className={s.embedHeading}
                  >
                    {step === "category"
                      ? "Choose your product range"
                      : step === "system"
                        ? "Select Profile/Frame System"
                        : step === "details"
                          ? "Frame Details"
                          : "Choose the Door Style"}
                  </h2>
                  <p className={s.note}>
                    {step === "category"
                      ? "Select a category to explore the available door styles."
                      : step === "system"
                        ? `${product?.name || "Door"} · Select Rehau or Eurocell composite door frame system.`
                        : step === "details"
                          ? "Set the overall manufacturing size, quantity, and optional location."
                          : `${ranges.find((r) => r.id === range)?.name ? `${ranges.find((r) => r.id === range)?.name} · ` : ""}Select a door style to start designing.`}
                  </p>
                </div>
                {(step === "style" || step === "layout") && ranges.length > 1 && (
                  <button type="button" className={s.btn} onClick={() => setStep("category")}>
                    All categories
                  </button>
                )}
                {step === "category" && (
                  <button type="button" className={s.btn} onClick={() => setStep("style")}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    Back to styles
                  </button>
                )}
                {step === "system" && (
                  <button type="button" className={s.btn} onClick={() => setStep("style")}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    Change door style
                  </button>
                )}
                {step === "details" && (
                  <button type="button" className={s.btn} onClick={() => setStep("system")}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    Change frame system
                  </button>
                )}
              </div>
              {step === "category" && (
                <div className={s.embedCategories}>
                  {ranges
                    .filter((r) => products.some((p) => p.range_id === r.id))
                    .map((r) => {
                      const count = products.filter((p) => p.range_id === r.id).length;
                      const preview = products.find((p) => p.range_id === r.id);
                      return (
                        <button
                          type="button"
                          key={r.id}
                          className={s.embedCategory}
                          onClick={() => {
                            if (r.id !== range) {
                              setConfiguration(null);
                              setRange(r.id);
                              setSelected(products.find((p) => p.range_id === r.id)?.id || "");
                            }
                            setStep("style");
                          }}
                        >
                          <span className={s.embedCategoryImage}>
                            {preview && <LayoutPreview src={preview.image} />}
                          </span>
                          <span className={s.embedCategoryBody}>
                            <span className={s.embedCategoryName}>{r.name}</span>
                            <span className={s.embedCategoryDescription}>
                              {count} {count === 1 ? "design" : "designs"} available
                            </span>
                            <span className={s.embedCardAction}>
                              Explore {r.name}
                              <ArrowRight size={18} aria-hidden="true" />
                            </span>
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}
              {(step === "style" || step === "layout") && (
                <div>
                  {ranges.length > 1 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      {ranges.map((r) => (
                        <button
                          type="button"
                          key={r.id}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            background: r.id === range ? "var(--primary)" : "var(--surface)",
                            color: r.id === range ? "var(--on-primary)" : "var(--ink)",
                            cursor: "pointer",
                            fontWeight: 500,
                            fontSize: "14px",
                          }}
                          onClick={() => {
                            setRange(r.id);
                            const firstIn = products.find((p) => p.range_id === r.id);
                            if (firstIn) setSelected(firstIn.id);
                          }}
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={s.embedLayouts}>
                    {available.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        className={s.embedLayout}
                        onClick={() => {
                          if (selected !== p.id) {
                            setConfiguration(null);
                            setSelected(p.id);
                          }
                          setStep("system");
                        }}
                      >
                        <span className={s.embedLayoutImage}>
                          <LayoutPreview src={p.image} />
                        </span>
                        <span className={s.embedLayoutName}>
                          <span>{p.name}</span>
                          <span className={s.embedCardAction}>
                            Choose this style
                            <ArrowRight size={18} aria-hidden="true" />
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {step === "system" && (
                <div className={s.embedSystems}>
                  {SYSTEMS.map((sys) => (
                    <button
                      type="button"
                      key={sys.id}
                      className={`${s.embedSystemCard} ${system === sys.id ? s.embedSystemCardActive : ""}`}
                      onClick={() => {
                        setSystem(sys.id);
                        setStep("details");
                      }}
                    >
                      <span className={s.embedSystemBadge}>{sys.badge}</span>
                      <span className={s.embedSystemLabel}>{sys.label}</span>
                      <span className={s.embedSystemSub}>{sys.subtitle}</span>
                      <span className={s.embedCardAction}>
                        Select {sys.label}
                        <ArrowRight size={18} aria-hidden="true" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {step === "details" && (
                <form
                  className={s.frameDetails}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const errors: typeof frameErrors = {};
                    if (
                      !Number.isInteger(frame.width_mm) ||
                      frame.width_mm < 300 ||
                      frame.width_mm > 2800
                    )
                      errors.width = "Enter a whole number from 300 to 2800 mm.";
                    if (
                      !Number.isInteger(frame.height_mm) ||
                      frame.height_mm < 1750 ||
                      frame.height_mm > 2500
                    )
                      errors.height = "Enter a whole number from 1750 to 2500 mm.";
                    if (
                      !Number.isInteger(frame.quantity) ||
                      frame.quantity < 1 ||
                      frame.quantity > 999
                    )
                      errors.quantity = "Enter a whole number from 1 to 999.";
                    setFrameErrors(errors);
                    if (Object.keys(errors).length) return;
                    setStep("questions");
                  }}
                >
                  <div className={s.frameDetailsGrid}>
                    <label className={s.field}>
                      <span className={s.label}>Overall width (mm)</span>
                      <input
                        className={s.input}
                        type="number"
                        min={300}
                        max={2800}
                        step={1}
                        required
                        value={frame.width_mm}
                        aria-invalid={Boolean(frameErrors.width)}
                        onChange={(event) => {
                          const value = event.currentTarget.valueAsNumber;
                          setFrame((previous) => ({ ...previous, width_mm: value }));
                          setFrameErrors((previous) => ({ ...previous, width: undefined }));
                        }}
                      />
                      {frameErrors.width && (
                        <span className={s.fieldError}>{frameErrors.width}</span>
                      )}
                    </label>
                    <label className={s.field}>
                      <span className={s.label}>Overall height (mm)</span>
                      <input
                        className={s.input}
                        type="number"
                        min={1750}
                        max={2500}
                        step={1}
                        required
                        value={frame.height_mm}
                        aria-invalid={Boolean(frameErrors.height)}
                        onChange={(event) => {
                          const value = event.currentTarget.valueAsNumber;
                          setFrame((previous) => ({ ...previous, height_mm: value }));
                          setFrameErrors((previous) => ({ ...previous, height: undefined }));
                        }}
                      />
                      {frameErrors.height && (
                        <span className={s.fieldError}>{frameErrors.height}</span>
                      )}
                    </label>
                    <label className={s.field}>
                      <span className={s.label}>Quantity</span>
                      <input
                        className={s.input}
                        type="number"
                        min={1}
                        max={999}
                        step={1}
                        required
                        value={frame.quantity}
                        aria-invalid={Boolean(frameErrors.quantity)}
                        onChange={(event) => {
                          const value = event.currentTarget.valueAsNumber;
                          setFrame((previous) => ({ ...previous, quantity: value }));
                          setFrameErrors((previous) => ({ ...previous, quantity: undefined }));
                        }}
                      />
                      {frameErrors.quantity && (
                        <span className={s.fieldError}>{frameErrors.quantity}</span>
                      )}
                    </label>
                    <label className={s.field}>
                      <span className={s.label}>Location (optional)</span>
                      <input
                        className={s.input}
                        maxLength={120}
                        value={frame.location}
                        placeholder="e.g. Front entrance"
                        onChange={(event) =>
                          setFrame((value) => ({ ...value, location: event.currentTarget.value }))
                        }
                      />
                    </label>
                  </div>
                  <p className={s.note}>Allowed size: 300–2800 mm wide and 1750–2500 mm high.</p>
                  <button type="submit" className={`${s.btn} ${s.btnPrimary}`}>
                    Continue to door options
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </form>
              )}
            </section>
          )}
          {step === "questions" && product && (
            <Configurator
              key={product.id}
              publicKey={publicKey}
              layoutId={product.id}
              onChange={setConfiguration}
              onDrawingChange={setDoorDrawing}
              frameDetails={frame}
              headerAction={
                <button type="button" className={s.btn} onClick={() => setStep("details")}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  Change frame details
                </button>
              }
              completionAction={
                <div className={s.completionActions}>
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnPrimary}`}
                    disabled={!configuration}
                    onClick={printPdf}
                    data-test="print-pdf"
                  >
                    <Printer size={16} aria-hidden="true" />
                    Print PDF
                  </button>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className={s.btn}
                      disabled={!configuration}
                      data-test="submit-configuration"
                    >
                      Submit enquiry
                    </button>
                  </DialogTrigger>
                </div>
              }
            />
          )}
        </div>
        <p className={s.hint}>Powered by Vistara</p>
        <DialogContent
          container={dialogContainer}
          className={s.enquiryDialog}
          overlayClassName={s.enquiryOverlay}
          showCloseButton={!pending}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          <DialogHeader className={s.enquiryHeader}>
            <DialogTitle>
              {done ? "Thank you for your enquiry" : "Enquire about your configuration"}
            </DialogTitle>
            <DialogDescription>
              {done
                ? "The team has your product selection and contact details. They’ll be in touch to discuss the next steps."
                : "Add your contact details so the team can follow up about your selected product."}
            </DialogDescription>
          </DialogHeader>
          <div className={s.cardBody}>
            {done ? (
              <div role="status" aria-live="polite">
                <p className={s.notice}>Your enquiry was sent successfully.</p>
                <DialogClose asChild>
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnPrimary}`}
                    data-test="close-enquiry-success"
                  >
                    Done
                  </button>
                </DialogClose>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit(new FormData(event.currentTarget));
                }}
                aria-busy={pending}
              >
                <fieldset className={s.enquiryFields} disabled={pending}>
                  <div className={s.field}>
                    <label className={s.label} htmlFor="contact-name">
                      Your name
                    </label>
                    <input
                      className={s.input}
                      id="contact-name"
                      name="name"
                      required
                      maxLength={120}
                      autoComplete="name"
                    />
                  </div>
                  <div className={s.field}>
                    <label className={s.label} htmlFor="contact-email">
                      Email address
                    </label>
                    <input
                      className={s.input}
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="email"
                    />
                  </div>
                  <div className={s.field}>
                    <label className={s.label} htmlFor="contact-phone">
                      Phone <span className={s.hint}>(optional)</span>
                    </label>
                    <input
                      className={s.input}
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      maxLength={50}
                      autoComplete="tel"
                    />
                  </div>
                  <div className={s.field}>
                    <label className={s.label} htmlFor="contact-message">
                      Anything else? <span className={s.hint}>(optional)</span>
                    </label>
                    <textarea
                      className={s.input}
                      id="contact-message"
                      name="message"
                      maxLength={2000}
                      rows={3}
                    />
                  </div>
                  <div className={s.honeypot} aria-hidden="true">
                    <label>
                      Company
                      <input name="company" tabIndex={-1} autoComplete="off" />
                    </label>
                  </div>
                </fieldset>
                <p className={s.hint}>
                  By sending this enquiry, you agree that the team can contact you about your
                  selected product.
                </p>
                {message && (
                  <p className={s.notice} data-error role="alert">
                    {message}
                  </p>
                )}
                <div className={s.actions}>
                  <button
                    type="submit"
                    className={`${s.btn} ${s.btnPrimary}`}
                    disabled={pending || !configuration}
                    data-test="send-quote-enquiry"
                  >
                    {pending ? "Sending…" : "Send quote enquiry"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </div>
    </Dialog>
  );
}
