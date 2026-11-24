"use client";

import { ImageUploadIcon } from "@hugeicons/core-free-icons";
import Image, { type ImageLoaderProps } from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWidget, updateWidget } from "@/server/portal/actions";
import { WidgetSchema, UpdateWidgetSchema } from "@/server/portal/schemas";

import { Icon } from "./icon";

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
  const [widgetType, setWidgetType] = useState(initialType);
  const [enabledValue, setEnabledValue] = useState(String(widget?.enabled ?? true));

  useEffect(() => {
    return () => {
      if (logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  function openPreview() {
    setPreviewOpen(true);
  }

  function stageLogo(file: File) {
    setLogoDragging(false);
    setLogoMessage("");
    setLogoError(false);

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      setLogoError(true);
      setLogoMessage("Only PNG, JPG or WebP images are supported.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError(true);
      setLogoMessage("Logo must be 1 MB or smaller.");
      return;
    }

    if (logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    setLogoMessage("Logo ready to save.");
  }

  async function uploadLogo(file: File): Promise<string> {
    const body = new FormData();
    body.append("logo", file);
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
        className="space-y-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="widget-name" className="text-subtitle font-medium text-brand-txt-primary">
            Component name
          </Label>
          <Input
            id="widget-name"
            name="name"
            required
            maxLength={80}
            defaultValue={widget?.name}
            placeholder="e.g. Main website doors"
          />
        </div>

        {!widget && (
          <div className="space-y-1.5">
            <Label
              htmlFor="widget-type"
              className="text-subtitle font-medium text-brand-txt-primary"
            >
              Product type
            </Label>
            <Select
              value={widgetType}
              onValueChange={(val) => setWidgetType(val as "door" | "window")}
            >
              <SelectTrigger id="widget-type" className="h-9 w-full bg-background">
                <SelectValue placeholder="Select product type" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="door">Doors</SelectItem>
                <SelectItem value="window">Windows</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="type" value={widgetType} />
            <p className="text-xs text-muted-foreground">
              Door and window components have separate embed codes.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label
            htmlFor="widget-website"
            className="text-subtitle font-medium text-brand-txt-primary"
          >
            Website URL <span className="text-xs text-muted-foreground">(optional)</span>
          </Label>
          <Input
            type="url"
            id="widget-website"
            name="website_url"
            defaultValue={widget?.website_url}
            placeholder="https://your-website.com"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            For your records. This does not restrict where the component can be embedded.
          </p>
        </div>

        <fieldset className="space-y-4 rounded-xl border border-border/60 p-4">
          <legend className="text-subtitle font-semibold text-brand-txt-primary">
            Component branding
          </legend>
          <p className="text-xs text-muted-foreground">
            These settings only affect this component, so every embed can match the website where it
            appears.
          </p>

          <div className="space-y-1.5">
            <Label
              htmlFor="widget-brand-name"
              className="text-subtitle font-medium text-brand-txt-primary"
            >
              Brand name
            </Label>
            <Input
              id="widget-brand-name"
              name="brand_name"
              required
              maxLength={80}
              defaultValue={widget?.brand_name}
              placeholder="Your company"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-subtitle font-medium text-brand-txt-primary">Logo</Label>
            <label
              className="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-brand-accent1 hover:bg-brand-backgroundSecondary/50"
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
                className="sr-only"
                type="file"
                id="widget-brand-logo"
                accept="image/png,image/jpeg,image/webp"
                required={!logoUrl && !logoFile}
                disabled={pending}
                data-test="upload-widget-logo"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) stageLogo(file);
                }}
              />
              {logoPreviewUrl ? (
                <span className="mb-2 block">
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
                <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-brand-accent3 text-brand-txt-secondary">
                  <Icon icon={ImageUploadIcon} size={20} />
                </span>
              )}
              <span className="flex flex-col text-sm text-brand-txt-secondary">
                <strong className="font-semibold text-brand-txt-primary">
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
            <p className="text-xs text-muted-foreground" id="widget-brand-logo-help">
              PNG, JPG or WebP · 1 MB maximum
            </p>
            {logoMessage && (
              <p
                id="widget-brand-logo-status"
                className={`text-xs ${logoError ? "text-destructive" : "text-success"}`}
                role={logoError ? "alert" : "status"}
              >
                {logoMessage}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="widget-brand-phone"
              className="text-subtitle font-medium text-brand-txt-primary"
            >
              Phone number
            </Label>
            <Input
              id="widget-brand-phone"
              name="brand_phone"
              type="tel"
              required
              maxLength={50}
              autoComplete="tel"
              defaultValue={widget?.brand_phone}
              placeholder="e.g. 0113 460 2305"
            />
            <p className="text-xs text-muted-foreground">
              Shown in the component header so visitors can call for help.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <div className="space-y-1.5">
            <Label
              htmlFor="widget-enabled"
              className="text-subtitle font-medium text-brand-txt-primary"
            >
              Availability
            </Label>
            <Select value={enabledValue} onValueChange={setEnabledValue}>
              <SelectTrigger id="widget-enabled" className="h-9 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="true">Live — accept visitors and enquiries</SelectItem>
                <SelectItem value="false">Paused — hide the public component</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="enabled" value={enabledValue} />
          </div>
        )}

        {message && (
          <p
            className={`text-subtitle font-medium ${error ? "text-destructive" : "text-success"}`}
            role="status"
          >
            {message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={pending} data-test="save-widget">
            {logoUploading
              ? "Uploading logo…"
              : pending
                ? "Saving…"
                : widget
                  ? "Save changes"
                  : "Create component"}
          </Button>
          {widget && (
            <Button
              type="button"
              variant="outline"
              onClick={openPreview}
              data-test="preview-widget"
            >
              Preview
            </Button>
          )}
          {created && (
            <Button variant="outline" asChild>
              <Link href={`/home/widgets/${created}`}>Open component</Link>
            </Button>
          )}
        </div>
      </form>

      {widget && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-h3 font-bold text-brand-txt-primary">
                Component preview
              </DialogTitle>
              <DialogDescription className="text-subtitle text-brand-txt-secondary">
                Live product options, elevations, and enquiry flow for this component.
              </DialogDescription>
            </DialogHeader>
            {previewOpen && (
              <iframe
                className="h-[650px] w-full rounded-xl border border-border"
                src={`/embed/${widget.public_key}`}
                title={`${widget.name} preview`}
              />
            )}
          </DialogContent>
        </Dialog>
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
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-subtitle font-medium text-brand-txt-primary">
        {label}
      </Label>
      <div className="flex items-center gap-2 rounded-lg border border-input bg-background p-1.5">
        <input
          id={id}
          name={name}
          type="color"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="size-7 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <span className="font-mono text-xs font-semibold">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}
