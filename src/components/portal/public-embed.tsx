"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
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
  const [step, setStep] = useState<"category" | "layout" | "questions">("category");
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
          configuration,
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
    setStep("category");
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
                    {step === "category" ? "Choose your product range" : "Choose your layout"}
                  </h2>
                  <p className={s.note}>
                    {step === "category"
                      ? "Select a category to explore the available layouts."
                      : `${ranges.find((r) => r.id === range)?.name || ""} · Select a layout to start designing.`}
                  </p>
                </div>
                {step === "layout" && (
                  <button type="button" className={s.btn} onClick={() => setStep("category")}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    All categories
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
                            setStep("layout");
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
              {step === "layout" && (
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
                        setStep("questions");
                      }}
                    >
                      <span className={s.embedLayoutImage}>
                        <LayoutPreview src={p.image} />
                      </span>
                      <span className={s.embedLayoutName}>
                        <span>{p.name}</span>
                        <span className={s.embedCardAction}>
                          Choose this design
                          <ArrowRight size={18} aria-hidden="true" />
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
          {step === "questions" && product && (
            <Configurator
              key={product.id}
              publicKey={publicKey}
              layoutId={product.id}
              onChange={setConfiguration}
              headerAction={
                <button type="button" className={s.btn} onClick={() => setStep("layout")}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  Change layout
                </button>
              }
              completionAction={
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnPrimary}`}
                    disabled={!configuration}
                    data-test="submit-configuration"
                  >
                    Submit
                  </button>
                </DialogTrigger>
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
