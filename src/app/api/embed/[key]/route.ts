import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    {
      success: false,
      code: "EMBED_RETIRED",
      message: "Embedded components are no longer available.",
    },
    { status: 410 },
  );
}
