import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HistoryEventType } from "@/generated/prisma/enums";
import { submissionSchema } from "@/lib/validation/submission";
import { buildCameraCreateData } from "@/lib/build-camera-create-data";
import { getOrCreateReporterIdentity, reporterIdentityCookieHeader } from "@/lib/reporter-identity";
import { checkSubmissionRateLimit } from "@/lib/rate-limit";
import { logVelocitySignal } from "@/lib/velocity-log";
import { checkSensitiveSite } from "@/lib/sensitive-site-check";
import { requireEnvNumber } from "@/lib/required-env";
import { collectAndProcessPhotos } from "@/lib/photo-upload";
import { uploadPhoto, buildCameraPhotoKey } from "@/lib/photo-storage";

const GENERIC_ACCEPTED_BODY = {
  status: "received",
  message: "Thanks, your submission has been received and is under review.",
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

    const rateLimit = await checkSubmissionRateLimit(currentToken);
    const windowMinutes = requireEnvNumber("SUBMISSION_RATE_LIMIT_WINDOW_MINUTES");
    const alertThreshold = requireEnvNumber("SUBMISSION_VELOCITY_ALERT_THRESHOLD_PER_WINDOW");
    logVelocitySignal({ kind: "submission", scope: "signal", count: rateLimit.counts.signalCount, windowMinutes, alertThreshold });
    logVelocitySignal({ kind: "submission", scope: "global", count: rateLimit.counts.globalCount, windowMinutes, alertThreshold });

    if (!rateLimit.allowed) {
      return acceptedResponse(currentToken);
    }

    const form = await request.formData().catch(() => null);
    const rawPayload = form?.get("payload");
    const body = typeof rawPayload === "string" ? JSON.parse(rawPayload) : null;
    const parsed = submissionSchema.safeParse(body);
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

    const siteCheck = await checkSensitiveSite({ lat: parsed.data.lat, lng: parsed.data.lng });

    const cameraId = randomUUID();
    const photoIds = photoResult.photos.map(() => randomUUID());
    for (const [i, photo] of photoResult.photos.entries()) {
      await uploadPhoto(buildCameraPhotoKey(cameraId, photoIds[i]!), photo.data, photo.contentType);
    }

    await prisma.$transaction(async (tx) => {
      const camera = await tx.camera.create({
        data: { id: cameraId, ...buildCameraCreateData(parsed.data, currentToken) },
      });

      await tx.historyEvent.create({
        data: {
          cameraId: camera.id,
          date: submittedAt,
          eventType: HistoryEventType.sighted,
          note: "",
        },
      });

      if (siteCheck.matches.length > 0 || siteCheck.checkErrors.length > 0) {
        await tx.sensitiveSiteMatch.createMany({
          data: [
            ...siteCheck.matches.map((m) => ({
              cameraId: camera.id,
              source: m.source,
              category: m.category,
              zoneId: m.zoneId,
              distanceMeters: m.distanceMeters,
              lat: m.lat,
              lng: m.lng,
              detail: m.detail,
            })),
            ...siteCheck.checkErrors.map((e) => ({
              cameraId: camera.id,
              source: e.source,
              detail: e.message,
            })),
          ],
        });
      }

      if (photoResult.photos.length > 0) {
        await tx.cameraPhoto.createMany({
          data: photoResult.photos.map((photo, i) => ({
            id: photoIds[i]!,
            cameraId: camera.id,
            storageKey: buildCameraPhotoKey(camera.id, photoIds[i]!),
            contentType: photo.contentType,
            sizeBytes: photo.data.byteLength,
            width: photo.width,
            height: photo.height,
            gpsDistanceMeters: photo.gpsDistanceMeters,
            capturedAgeHours: photo.capturedAgeHours,
          })),
        });
      }

      return camera;
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
