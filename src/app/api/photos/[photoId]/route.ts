import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ModerationState, PhotoModerationStatus } from "@/generated/prisma/enums";
import type { AuState, CameraType } from "@/generated/prisma/enums";
import { getPhotoBytes } from "@/lib/photo-storage";
import { requireModerator, canView } from "@/lib/moderator-access";

const NOT_FOUND = new NextResponse(null, { status: 404 });

async function moderatorCanView(state: AuState | null, type: CameraType): Promise<boolean> {
  const access = await requireModerator();
  return access.status === "ok" && canView(access.profile, { state, type });
}

async function streamPhoto(storageKey: string, contentType: string): Promise<NextResponse> {
  const object = await getPhotoBytes(storageKey);
  if (!object) return NOT_FOUND;
  return new NextResponse(Buffer.from(object.data), {
    status: 200,
    headers: { "Content-Type": contentType, "Cache-Control": "private, no-store" },
  });
}

/**
 * Handles both CameraPhoto and CorrectionPhoto ids under one route. A
 * moderator with view access to the camera can always see the photo. Anyone
 * else can only see a CameraPhoto that's both individually approved for
 * public display and attached to a camera that's itself verified -
 * CorrectionPhoto is never served publicly (see the photo-evidence plan).
 * Unauthorized either way returns 404, not 403, so the response itself never
 * reveals whether a photo exists but is unapproved.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await params;

  const cameraPhoto = await prisma.cameraPhoto.findUnique({
    where: { id: photoId },
    include: { camera: { select: { state: true, type: true, moderationState: true } } },
  });

  if (cameraPhoto) {
    const publiclyVisible =
      cameraPhoto.moderationStatus === PhotoModerationStatus.approved &&
      cameraPhoto.camera.moderationState === ModerationState.verified;

    const allowed =
      publiclyVisible || (await moderatorCanView(cameraPhoto.camera.state, cameraPhoto.camera.type));
    if (!allowed) return NOT_FOUND;

    return streamPhoto(cameraPhoto.storageKey, cameraPhoto.contentType);
  }

  const correctionPhoto = await prisma.correctionPhoto.findUnique({
    where: { id: photoId },
    include: { correctionReport: { select: { camera: { select: { state: true, type: true } } } } },
  });

  if (correctionPhoto) {
    const camera = correctionPhoto.correctionReport.camera;
    if (!(await moderatorCanView(camera.state, camera.type))) return NOT_FOUND;
    return streamPhoto(correctionPhoto.storageKey, correctionPhoto.contentType);
  }

  return NOT_FOUND;
}
