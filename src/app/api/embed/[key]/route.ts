import { NextResponse } from "next/server";
import { z } from "zod";

import { validateConfiguration } from "@/lib/configurator/runtime/validate.js";
import { calculateManufacturing } from "@/lib/manufacturing";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadPublicCatalogue } from "@/server/portal/catalogue";
import { PublicSubmissionSchema } from "@/server/portal/schemas";
import type { Json } from "@/types/supabase";
export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!z.uuid().safeParse(key).success)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (Number(request.headers.get("content-length")) > 64000)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 64000)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = PublicSubmissionSchema.safeParse(input);
  if (!parsed.success)
    return NextResponse.json({ error: "Please check your details" }, { status: 400 });
  const db = getSupabaseAdminClient();
  const { data: w, error: widgetError } = await db
    .from("embed_widgets")
    .select("id,account_id,configurator_type_id,website_url")
    .eq("public_key", key)
    .eq("enabled", true)
    .maybeSingle();
  if (widgetError) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  if (!w) return NextResponse.json({ error: "Component unavailable" }, { status: 404 });
  const payload = parsed.data;
  if (payload.kind === "quote") {
    const { count, error: countError } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("widget_id", w.id)
      .gte("created_at", new Date(Date.now() - 60000).toISOString());
    if (countError) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    if ((count || 0) >= 30)
      return NextResponse.json({ error: "Please try again shortly" }, { status: 429 });
    const { data: layout, error } = await db
      .from("layouts")
      .select("id,name,slug,features,product_ranges!inner(name,active,configurator_type_id)")
      .eq("id", payload.layout_id)
      .eq("active", true)
      .eq("features->>kind", "layout")
      .eq("product_ranges.active", true)
      .eq("product_ranges.configurator_type_id", w.configurator_type_id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    if (!layout) return NextResponse.json({ error: "Product unavailable" }, { status: 400 });
    let configuration: Json | null = null;
    let manufacturing: Json | null = null;
    const submittedSystem = payload.configuration?.system;
    const systemLabel =
      submittedSystem === "eurocell"
        ? "Eurocell Composite"
        : submittedSystem === "rehau"
          ? "REHAU AGILA"
          : "DoorCo";
    if (payload.configuration) {
      const { system, frame, ...catalogueConfiguration } = payload.configuration;
      try {
        const runtime = await loadPublicCatalogue(layout.id, w.configurator_type_id);
        if (!runtime) return NextResponse.json({ error: "Product unavailable" }, { status: 400 });
        const validated = await validateConfiguration(runtime, catalogueConfiguration);
        configuration = JSON.parse(JSON.stringify({ ...validated, system, frame })) as Json;
        const snapshot = calculateManufacturing({
          system,
          style: /Door (Left|Right) Hand/i.test(layout.name) ? "Style 1" : layout.name,
          designName: validated.design_name || layout.name,
          frame,
          particulars: Array.isArray(validated.particulars) ? validated.particulars : [],
        });
        manufacturing = snapshot ? (JSON.parse(JSON.stringify(snapshot)) as Json) : null;
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Please review your configuration" },
          { status: 400 },
        );
      }
    }
    const features = layout.features as Record<string, Json>;
    const result = await db.from("leads").insert({
      account_id: w.account_id,
      widget_id: w.id,
      session_id: payload.session_id,
      layout_id: layout.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone || null,
      source_url: w.website_url || null,
      spec: {
        version: 2,
        configuration,
        product: layout.name,
        range: layout.product_ranges.name,
        system: systemLabel,
        layout_id: layout.id,
        layout_slug: layout.slug,
        dimensions: payload.configuration?.frame || features.dimensions || null,
        manufacturing,
        message: payload.message,
        preview: configuration ? "Configured indicative elevation" : "captured catalogue elevation",
      },
    });
    // A retry never changes an existing immutable specification.
    if (result.error && result.error.code !== "23505")
      return NextResponse.json({ error: "Could not save enquiry" }, { status: 503 });
  }
  const { error: viewError } = await db
    .from("widget_views")
    .upsert(
      { widget_id: w.id, account_id: w.account_id, session_id: payload.session_id },
      { onConflict: "widget_id,session_id", ignoreDuplicates: true },
    );
  if (viewError && payload.kind === "view")
    return NextResponse.json({ error: "Could not track session" }, { status: 503 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
