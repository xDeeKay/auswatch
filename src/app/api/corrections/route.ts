import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CameraStatus, ModerationState, CorrectionReportStatus } from "@/generated/prisma/enums";
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
import { collectAndProcessPhotos } from "@/lib/photo-upload";
import { uploadPhoto, buildCorrectionPhotoKey } from "@/lib/photo-storage";

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

    const form = await request.formData().catch(() => null);
    const rawPayload = form?.get("payload");
    const body = typeof rawPayload === "string" ? JSON.parse(rawPayload) : null;
    const parsed = correctionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { status: "invalid", errors: parsed.error.flatten().fieldErrors },
        { status: 400, headers: { "Set-Cookie": reporterIdentityCookieHeader(currentToken) } }
      );
    }

    const submittedAt = new Date();
    const photoResult = form
      ? await collectAndProcessPhotos(form, { lat: parsed.data.lat, lng: parsed.data.lng }, submittedAt)
      : { ok: true as const, photos: [] };
    if (!photoResult.ok) {
      return NextResponse.json(
        { status: "invalid", errors: { photos: [photoResult.message] } },
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
    const reportsRemoval = parsed.data.reportedRemoved && camera.status !== CameraStatus.removed;
    if (Object.keys(diff).length === 0 && !reportsRemoval) {
      return acceptedResponse(currentToken);
    }

    let proposedSensitiveSiteMatches: SensitiveSiteMatchResult[] | null = null;
    let proposedSensitiveSiteCheckErrors: SensitiveSiteCheckError[] | null = null;
    if (diff.lat !== undefined && diff.lng !== undefined) {
      const siteCheck = await checkSensitiveSite({ lat: diff.lat, lng: diff.lng });
      proposedSensitiveSiteMatches = siteCheck.matches;
      proposedSensitiveSiteCheckErrors = siteCheck.checkErrors;
    }

    const correctionReportId = randomUUID();
    const photoIds = photoResult.photos.map(() => randomUUID());
    for (const [i, photo] of photoResult.photos.entries()) {
      await uploadPhoto(buildCorrectionPhotoKey(correctionReportId, photoIds[i]!), photo.data, photo.contentType);
    }

    await prisma.correctionReport.create({
      data: {
        id: correctionReportId,
        cameraId: camera.id,
        reporterId: currentToken,
        reporterNote: parsed.data.reporterNote,
        proposedLat: diff.lat,
        proposedLng: diff.lng,
        proposedType: diff.type,
        proposedOperator: diff.operator,
        proposedOperatorCategory: diff.operatorCategory,
        proposedCaptures: diff.captures,
        photos: photoResult.photos.length > 0
          ? {
              create: photoResult.photos.map((photo, i) => ({
                id: photoIds[i]!,
                storageKey: buildCorrectionPhotoKey(correctionReportId, photoIds[i]!),
                contentType: photo.contentType,
                sizeBytes: photo.data.byteLength,
                width: photo.width,
                height: photo.height,
                gpsDistanceMeters: photo.gpsDistanceMeters,
                capturedAgeHours: photo.capturedAgeHours,
              })),
            }
          : undefined,
        proposedNotes: diff.notes,
        reportedRemoved: reportsRemoval,
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
