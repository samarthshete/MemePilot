import { NextResponse } from "next/server";

/**
 * Liveness + deploy-parity probe. No auth, no secrets, no external calls — it
 * just confirms the app responds and exposes the deployed commit SHA so repo↔prod
 * parity is verifiable in one request (matches the SHA shown in the site footer).
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    deployed: new Date().toISOString(),
  });
}
