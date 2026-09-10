"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { cameraNoteSchema } from "@/lib/validation/camera-note";
import { requireModerator, canView, accessDeniedMessage } from "@/lib/moderator-access";

export type CameraNoteActionResult = { status: "ok" } | { status: "error"; message: string };

export async function addCameraNote(
  cameraId: string,
  formData: FormData
): Promise<CameraNoteActionResult> {
  const parsed = cameraNoteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { status: "error", message: "Note can't be empty." };
  }

  try {
    const access = await requireModerator();
    if (access.status !== "ok") {
      return { status: "error", message: accessDeniedMessage(access) };
    }
    const { profile } = access;
    const authorId = profile.userId;
    if (!authorId) {
      return { status: "error", message: "Not authenticated." };
    }

    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      select: { state: true, type: true },
    });
    if (!camera) {
      return { status: "error", message: "This camera no longer exists." };
    }
    if (!canView(profile, { state: camera.state, type: camera.type })) {
      return { status: "error", message: "You do not have permission to view this camera." };
    }

    await prisma.cameraNote.create({
      data: { cameraId, authorId, body: parsed.data.body },
    });

    revalidatePath(`/moderate/cameras/${cameraId}`);
    return { status: "ok" };
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
