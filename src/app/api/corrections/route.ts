import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ModerationState, CorrectionReportStatus } from "@/generated/prisma/enums";
import { correctionSchema } from "@/lib/validation/correction";
import { buildCameraDiff } from "@/lib/correction-diff";
import { getOrCreateReporterIdentity, reporterIdentityCookieHeader } from "@/lib/reporter-identity";
import { checkCorrectionRateLimit } from "@/lib/rate-limit";
import { logVelocitySignal } from "@/lib/velocity-log";
import {
  checkSensitiveSite,
  type SensitiveSiteMatchResult,
  type SensitiveSiteCheckError,
} from "@/lib/sensitive-site-check";
import { requireEnvNumber } from "@/lib/required-env";

const GENERIC_ACCEPTED_BODY = {
  status: "received",
  message: "Thanks, your correction has been received and is under review.",
};

function acceptedResponse(token: string) {
  return NextResponse.json(GENERIC_ACCEPTED_BODY, {
    status: 200,
    headers: { "Set-Cookie": reporterIdentityCookieHeader(token) },
  });
}

export async function POST(request: Request) {
  let token: string | undefined;

  try {
    const identity = await getOrCreateReporterIdentity(request);
    const currentToken = identity.token;
    token = currentToken;

    const rateLimit = await checkCorrectionRateLimit(currentToken);
    const windowMinutes = requireEnvNumber("CORRECTION_RATE_LIMIT_WINDOW_MINUTES");
    const alertThreshold = requireEnvNumber("CORRECTION_VELOCITY_ALERT_THRESHOLD_PER_WINDOW");
    logVelocitySignal({ kind: "correction", scope: "signal", count: rateLimit.counts.signalCount, windowMinutes, alertThreshold });
    logVelocitySignal({ kind: "correction", scope: "global", count: rateLimit.counts.globalCount, windowMinutes, alertThreshold });

    if (!rateLimit.allowed) {
      return acceptedResponse(currentToken);
    }

    const body = await request.json().catch(() => null);
    const parsed = correctionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { status: "invalid", errors: parsed.error.flatten().fieldErrors },
        { status: 400, headers: { "Set-Cookie": reporterIdentityCookieHeader(currentToken) } }
      );
    }

    const camera = await prisma.camera.findUnique({
      where: { id: parsed.data.cameraId, moderationState: ModerationState.verified },
    });
    if (!camera) {
      return acceptedResponse(currentToken);
    }

    const pendingCount = await prisma.correctionReport.count({
      where: { cameraId: camera.id, status: CorrectionReportStatus.pending },
    });
    if (pendingCount >= requireEnvNumber("CORRECTION_MAX_PENDING_PER_CAMERA")) {
      return acceptedResponse(currentToken);
    }

    const diff = buildCameraDiff(camera, parsed.data);
    if (Object.keys(diff).length === 0) {
      return acceptedResponse(currentToken);
    }

    let proposedSensitiveSiteMatches: SensitiveSiteMatchResult[] | null = null;
    let proposedSensitiveSiteCheckErrors: SensitiveSiteCheckError[] | null = null;
    if (diff.lat !== undefined && diff.lng !== undefined) {
      const siteCheck = await checkSensitiveSite({ lat: diff.lat, lng: diff.lng });
      proposedSensitiveSiteMatches = siteCheck.matches;
      proposedSensitiveSiteCheckErrors = siteCheck.checkErrors;
    }

    await prisma.correctionReport.create({
      data: {
        cameraId: camera.id,
        reporterId: currentToken,
        reporterNote: parsed.data.reporterNote,
        proposedLat: diff.lat,
        proposedLng: diff.lng,
        proposedType: diff.type,
        proposedOperator: diff.operator,
        proposedCaptures: diff.captures,
        proposedNotes: diff.notes,
        proposedSensitiveSiteMatches: proposedSensitiveSiteMatches ?? undefined,
        proposedSensitiveSiteCheckErrors: proposedSensitiveSiteCheckErrors ?? undefined,
      },
    });

    return acceptedResponse(currentToken);
  } catch {
    return NextResponse.json(
      { status: "error", message: "Something went wrong. Please try again." },
      {
        status: 500,
        headers: token ? { "Set-Cookie": reporterIdentityCookieHeader(token) } : undefined,
      }
    );
  }
}
