import { createHmac, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requireEnvNumber } from "@/lib/required-env";

export const REPORTER_IDENTITY_COOKIE = "aw_rid";

export function hashSignal(ip: string): string {
  const secret = process.env.REPORTER_SIGNAL_SECRET;
  if (!secret) {
    throw new Error("REPORTER_SIGNAL_SECRET is not set");
  }
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function getOrCreateReporterIdentity(
  request: Request
): Promise<{ token: string }> {
  const cookieToken = readCookie(request, REPORTER_IDENTITY_COOKIE);

  if (cookieToken) {
    const existing = await prisma.reporterIdentity.findUnique({
      where: { token: cookieToken },
    });
    if (existing) return { token: existing.token };
  }

  const signalHash = hashSignal(getClientIp(request));
  const cooldownMinutes = Math.max(1, requireEnvNumber("REPORTER_IDENTITY_ISSUANCE_COOLDOWN_MINUTES"));
  const cutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000);

  const recent = await prisma.reporterIdentity.findFirst({
    where: { signalHash, lastIssuedAt: { gte: cutoff } },
    orderBy: { lastIssuedAt: "desc" },
  });
  if (recent) return { token: recent.token };

  const token = randomBytes(24).toString("base64url");
  await prisma.reporterIdentity.create({
    data: { token, signalHash },
  });
  return { token };
}

export function reporterIdentityCookieHeader(token: string): string {
  const oneYearSeconds = 60 * 60 * 24 * 365;
  return `${REPORTER_IDENTITY_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${oneYearSeconds}`;
}
