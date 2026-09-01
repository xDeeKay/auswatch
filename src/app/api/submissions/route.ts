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

    const body = await request.json().catch(() => null);
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { status: "invalid", errors: parsed.error.flatten().fieldErrors },
        { status: 400, headers: { "Set-Cookie": reporterIdentityCookieHeader(currentToken) } }
      );
    }

    const siteCheck = await checkSensitiveSite({ lat: parsed.data.lat, lng: parsed.data.lng });

    await prisma.$transaction(async (tx) => {
      const camera = await tx.camera.create({
        data: buildCameraCreateData(parsed.data, currentToken),
      });

      await tx.historyEvent.create({
        data: {
          cameraId: camera.id,
          date: new Date(),
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
