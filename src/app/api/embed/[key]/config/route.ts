import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    { error: "Embedded components are no longer available." },
    { status: 410 },
  );
}
