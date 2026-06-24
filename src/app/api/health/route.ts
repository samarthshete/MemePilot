import { NextResponse } from "next/server";

// Liveness probe. No external calls, no secrets — just confirms the app responds.
export function GET() {
  return NextResponse.json({ ok: true });
}
