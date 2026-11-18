import { NextResponse } from "next/server";
import { z } from "zod";

import { authRoute } from "@/server/auth-wrapper";

const MAX_LOGO_BYTES = 1024 * 1024;
const BUCKET = "brand-logos";

const UploadSchema = z.object({
  widgetId: z.union([z.uuid(), z.literal("")]),
  file: z.instanceof(File),
});

type DetectedImage = {
  contentType: "image/png" | "image/jpeg" | "image/webp";
  extension: "png" | "jpg" | "webp";
};

function detectImage(bytes: Uint8Array): DetectedImage | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}

export const POST = authRoute(async ({ request, user, supabase }) => {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_LOGO_BYTES + 128 * 1024) {
    return NextResponse.json({ error: "Logo files must be 1 MB or smaller." }, { status: 413 });
  }

  const form = await request.formData();
  const { widgetId, file } = UploadSchema.parse({
    widgetId: String(form.get("widgetId") || ""),
    file: form.get("file"),
  });

  if (file.size === 0 || file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: "Logo files must be 1 MB or smaller." }, { status: 413 });
  }

  if (widgetId) {
    const { data: widget, error } = await supabase
      .from("embed_widgets")
      .select("id")
      .eq("id", widgetId)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: "The component could not be checked." }, { status: 503 });
    }
    if (!widget) {
      return NextResponse.json({ error: "Component not found." }, { status: 404 });
    }
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImage(bytes);
  if (!detected) {
    return NextResponse.json({ error: "Choose a PNG, JPG, or WebP image." }, { status: 415 });
  }

  const scope = widgetId || "draft";
  const path = `${user.id}/${scope}/${crypto.randomUUID()}.${detected.extension}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    cacheControl: "31536000",
    contentType: detected.contentType,
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: "The logo could not be uploaded." }, { status: 503 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
});
