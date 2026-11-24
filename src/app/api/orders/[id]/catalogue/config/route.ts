import { NextResponse } from "next/server";
import { z } from "zod";

import { authRoute } from "@/server/auth-wrapper";
import { loadPublicCatalogue } from "@/server/portal/catalogue";

const QuerySchema = z.object({ layout: z.uuid() });

export const GET = authRoute(
  async ({ params, supabase, account }, input) => {
    const orderId = z.uuid().parse(params.id);
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,status")
      .eq("id", orderId)
      .eq("account_id", account.id)
      .maybeSingle();
    if (orderError) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }
    if (!order || order.status !== "draft") {
      return NextResponse.json({ error: "Draft order unavailable" }, { status: 404 });
    }

    const { data: type, error: typeError } = await supabase
      .from("configurator_types")
      .select("id")
      .eq("slug", "door")
      .maybeSingle();
    if (typeError || !type) {
      return NextResponse.json({ error: "Door catalogue unavailable" }, { status: 503 });
    }

    try {
      const config = await loadPublicCatalogue(input.layout, type.id);
      if (!config) return NextResponse.json({ error: "Door style unavailable" }, { status: 404 });
      return NextResponse.json(
        { kind: config.kind, source: config.source, paths: config.paths, urls: config.urls },
        { headers: { "Cache-Control": "private, max-age=300" } },
      );
    } catch {
      return NextResponse.json({ error: "The door catalogue is not ready." }, { status: 503 });
    }
  },
  { schema: QuerySchema },
);
