import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { requireEnvString } from "@/lib/required-env";
import { refreshSensitiveSiteOsmCache } from "@/lib/sensitive-site-cache-refresh";

function isAuthorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;

  const provided = Buffer.from(header.slice(prefix.length));
  const expected = Buffer.from(requireEnvString("INTERNAL_CRON_SECRET"));
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/**
 * Triggered by a host-level cron job on the production server (1-2x/day),
 * not by anything in the app itself, since the standalone Docker runtime
 * has no scripts/tsx available to run scripts/refresh-sensitive-site-cache.ts
 * directly.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshSensitiveSiteOsmCache();
  if (result.status === "error") {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result, { status: 200 });
}
