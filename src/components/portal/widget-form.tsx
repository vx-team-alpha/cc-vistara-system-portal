"use client";
import { ImageUploadIcon } from "@hugeicons/core-free-icons";
import Image, { type ImageLoaderProps } from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { createWidget, updateWidget } from "@/server/portal/actions";
import { WidgetSchema, UpdateWidgetSchema } from "@/server/portal/schemas";

import { Icon } from "./icon";

import s from "./portal.module.css";

const MAX_LOGO_BYTES = 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function directImageLoader({ src }: ImageLoaderProps) {
  return src;
}

type Widget = {
  id: string;
  name: string;
  public_key: string;
  website_url: string;
  enabled: boolean;
  brand_name: string;
  brand_logo_url: string;
  brand_phone: string;
  brand_primary_color: string;
  brand_background_color: string;
  brand_text_color: string;
};
export function WidgetForm({
  widget,
  initialType = "door",
}: {
  widget?: Widget;
  initialType?: "door" | "window";
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [created, setCreated] = useState<string>();
  const [logoUrl, setLogoUrl] = useState(widget?.brand_logo_url || "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(widget?.brand_logo_url || "");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDragging, setLogoDragging] = useState(false);
  const [logoMessage, setLogoMessage] = useState("");
  const [logoError, setLogoError] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  function openPreview() {
    setPreviewOpen(true);
    requestAnimationFrame(() => previewDialogRef.current?.showModal());
  }

  function closePreview() {
    previewDialogRef.current?.close();
    setPreviewOpen(false);
  }

  function stageLogo(file: File) {
    setLogoDragging(false);
    setLogoMessage("");
    setLogoError(false);

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      setLogoFile(null);
      setLogoPreviewUrl(logoUrl);
      setLogoError(true);
      setLogoMessage("Choose a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size === 0 || file.size > MAX_LOGO_BYTES) {
      setLogoFile(null);
      setLogoPreviewUrl(logoUrl);
      setLogoError(true);
      setLogoMessage("Logo files must be 1 MB or smaller.");
      return;
    }

    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    setLogoMessage("Ready to upload when you save.");
  }

  async function uploadLogo(file: File) {
    const body = new FormData();
    body.set("file", file);
    body.set("widgetId", widget?.id || "");
    const response = await fetch("/api/portal/widget-logo", { method: "POST", body });
    const result = (await response.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (!response.ok || !result.url) {
      throw new Error(result.error || "The logo could not be uploaded.");
    }
    return result.url;
  }

  function submit(form: FormData) {
    const fields = {
      name: String(form.get("name") || ""),
      website_url: String(form.get("website_url") || ""),
      brand_name: String(form.get("brand_name") || ""),
      brand_logo_url: logoUrl || (logoFile ? "https://pending.invalid/logo" : ""),
      brand_phone: String(form.get("brand_phone") || ""),
      brand_primary_color: String(form.get("brand_primary_color") || ""),
      brand_background_color: String(form.get("brand_background_color") || ""),
      brand_text_color: String(form.get("brand_text_color") || ""),
    };
    const parsed = widget
      ? UpdateWidgetSchema.safeParse({
          ...fields,
          id: widget.id,
          enabled: form.get("enabled") === "true",
        })
      : WidgetSchema.safeParse({ ...fields, type: form.get("type") });
    if (!parsed.success) {
      setError(true);
      setMessage(parsed.error.issues[0].message);
      return;
    }
    startTransition(async () => {
      let logoWasUploaded = false;
      try {
        setMessage("");
        setError(false);
        setLogoError(false);
        setLogoUploading(Boolean(logoFile));
        const savedLogoUrl = logoFile ? await uploadLogo(logoFile) : logoUrl;
        if (logoFile) {
          logoWasUploaded = true;
          setLogoUrl(savedLogoUrl);
          setLogoFile(null);
          setLogoPreviewUrl(savedLogoUrl);
        }
        const savedInput = { ...parsed.data, brand_logo_url: savedLogoUrl };
        const result = widget ? await updateWidget(savedInput) : await createWidget(savedInput);
        setError(!result.ok);
        setMessage(
          result.ok
            ? widget
              ? "Changes saved."
              : "Your component is ready. Open its settings to copy the embed code."
            : result.error,
        );
        if (logoWasUploaded) {
          setLogoMessage(
            result.ok ? "Logo uploaded and saved." : "Logo uploaded. Save again to apply it.",
          );
        }
        if (result.ok && "id" in result && typeof result.id === "string") setCreated(result.id);
      } catch (saveError) {
        const saveMessage =
          saveError instanceof Error
            ? saveError.message
            : "Something went wrong. Please try again.";
        setError(true);
        setLogoError(Boolean(logoFile) && !logoWasUploaded);
        setLogoMessage(logoWasUploaded ? "Logo uploaded. Save again to apply it." : saveMessage);
        setMessage(saveMessage);
      } finally {
        setLogoUploading(false);
      }
    });
  }
  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(new FormData(event.currentTarget));
        }}
      >
        <div className={s.field}>
          <label className={s.label} htmlFor="widget-name">
            Component name
          </label>
          <input
            className={s.input}
            id="widget-name"
            name="name"
            required
            maxLength={80}
            defaultValue={widget?.name}
            placeholder="e.g. Main website doors"
          />
        </div>
        {!widget && (
          <div className={s.field}>
            <label className={s.label} htmlFor="widget-type">
              Product type
            </label>
            <select id="widget-type" name="type" className={s.select} defaultValue={initialType}>
              <option value="door">Doors</option>
              <option value="window">Windows</option>
            </select>
            <span className={s.hint}>Door and window components have separate embed codes.</span>
          </div>
        )}
        <div className={s.field}>
          <label className={s.label} htmlFor="widget-website">
            Website URL <span className={s.hint}>(optional)</span>
          </label>
          <input
            className={s.input}
            type="url"
            id="widget-website"
            name="website_url"
            defaultValue={widget?.website_url}
            placeholder="https://your-website.com"
            maxLength={500}
          />
          <span className={s.hint}>
            For your records. This does not restrict where the component can be embedded.
          </span>
        </div>
        <fieldset className={s.brandingFields}>
          <legend>Component branding</legend>
          <p className={s.hint}>
            These settings only affect this component, so every embed can match the website where it
            appears.
          </p>
          <div className={s.field}>
            <label className={s.label} htmlFor="widget-brand-name">
              Brand name
            </label>
            <input
              className={s.input}
              id="widget-brand-name"
              name="brand_name"
              required
              maxLength={80}
              defaultValue={widget?.brand_name}
              placeholder="Your company"
            />
          </div>
          <div className={s.logoField}>
            <span className={s.label}>Logo</span>
            <label
              className={s.logoDropzone}
              data-dragging={logoDragging || undefined}
              data-uploading={pending || undefined}
              htmlFor="widget-brand-logo"
              onDragEnter={(event) => {
                event.preventDefault();
                setLogoDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setLogoDragging(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setLogoDragging(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files[0];
                if (file) stageLogo(file);
              }}
            >
              <input
                className={s.fileInput}
                type="file"
                id="widget-brand-logo"
                accept="image/png,image/jpeg,image/webp"
                required={!logoUrl && !logoFile}
                disabled={pending}
                aria-describedby="widget-brand-logo-help widget-brand-logo-status"
                data-test="upload-widget-logo"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) stageLogo(file);
                }}
              />
              {logoPreviewUrl ? (
                <span className={s.logoPreview}>
                  <Image
                    loader={directImageLoader}
                    unoptimized
                    width={180}
                    height={72}
                    src={logoPreviewUrl}
                    alt=""
                  />
                </span>
              ) : (
                <span className={s.logoUploadIcon}>
                  <Icon icon={ImageUploadIcon} size={20} />
                </span>
              )}
              <span className={s.logoDropCopy}>
                <strong>
                  {logoUploading
                    ? "Uploading logo…"
                    : logoFile
                      ? "Logo ready to save"
                      : logoUrl
                        ? "Replace logo"
                        : "Choose a logo"}
                </strong>
                <span>{logoDragging ? "Drop it here" : "or drag and drop"}</span>
              </span>
            </label>
            <input type="hidden" name="brand_logo_url" value={logoUrl} />
            <div className={s.logoUploadFoot}>
              <span className={s.hint} id="widget-brand-logo-help">
                PNG, JPG or WebP · 1 MB maximum
              </span>
            </div>
            {logoMessage && (
              <p
                id="widget-brand-logo-status"
                className={s.logoStatus}
                data-error={logoError || undefined}
                role={logoError ? "alert" : "status"}
              >
                {logoMessage}
              </p>
            )}
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="widget-brand-phone">
              Phone number
            </label>
            <input
              className={s.input}
              id="widget-brand-phone"
              name="brand_phone"
              type="tel"
              required
              maxLength={50}
              autoComplete="tel"
              defaultValue={widget?.brand_phone}
              placeholder="e.g. 0113 460 2305"
              aria-describedby="widget-brand-phone-help"
            />
            <span className={s.hint} id="widget-brand-phone-help">
              Shown in the component header so visitors can call for help.
            </span>
          </div>
          <div className={s.brandColors}>
            <ColorField
              id="widget-brand-primary"
              name="brand_primary_color"
              label="Action colour"
              defaultValue={widget?.brand_primary_color || "#191919"}
            />
            <ColorField
              id="widget-brand-background"
              name="brand_background_color"
              label="Background"
              defaultValue={widget?.brand_background_color || "#f5f5f5"}
            />
            <ColorField
              id="widget-brand-text"
              name="brand_text_color"
              label="Text"
              defaultValue={widget?.brand_text_color || "#191919"}
            />
          </div>
        </fieldset>
        {widget && (
          <div className={s.field}>
            <label className={s.label} htmlFor="widget-enabled">
              Availability
            </label>
            <select
              className={s.select}
              id="widget-enabled"
              name="enabled"
              defaultValue={String(widget.enabled)}
            >
              <option value="true">Live — accept visitors and enquiries</option>
              <option value="false">Paused — hide the public component</option>
            </select>
          </div>
        )}
        {message && (
          <p className={s.notice} data-error={error || undefined} role="status">
            {message}
          </p>
        )}
        <div className={s.actions}>
          <button
            className={`${s.btn} ${s.btnPrimary}`}
            type="submit"
            disabled={pending}
            data-test="save-widget"
          >
            {logoUploading
              ? "Uploading logo…"
              : pending
                ? "Saving…"
                : widget
                  ? "Save changes"
                  : "Create component"}
          </button>
          {widget && (
            <button
              type="button"
              className={s.btn}
              onClick={openPreview}
              data-test="preview-widget"
            >
              Preview
            </button>
          )}
          {created && (
            <Link href={`/home/widgets/${created}`} className={s.btn}>
              Open component
            </Link>
          )}
        </div>
      </form>
      {widget && (
        <dialog
          ref={previewDialogRef}
          className={`${s.adminDialog} ${s.previewDialog}`}
          onClose={() => setPreviewOpen(false)}
          onClick={(event) => {
            if (event.target === previewDialogRef.current) closePreview();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closePreview();
          }}
        >
          <div className={s.previewDialogInner}>
            <header className={s.adminDialogHead}>
              <div>
                <h2 className={s.cardTitle}>Component preview</h2>
                <p className={s.hint}>
                  Live product options, elevations, and enquiry flow for this component.
                </p>
              </div>
              <button
                type="button"
                className={s.iconBtn}
                aria-label="Close preview"
                onClick={closePreview}
              >
                ✕
              </button>
            </header>
            {previewOpen && (
              <iframe
                className={s.previewDialogFrame}
                src={`/embed/${widget.public_key}`}
                title={`${widget.name} preview`}
              />
            )}
          </div>
        </dialog>
      )}
    </>
  );
}

function ColorField({
  id,
  name,
  label,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <label className={s.colorField} htmlFor={id}>
      <span className={s.label}>{label}</span>
      <span className={s.colorControl}>
        <input
          id={id}
          name={name}
          type="color"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <span>{value.toUpperCase()}</span>
      </span>
    </label>
  );
}
