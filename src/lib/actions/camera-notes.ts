"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { cameraNoteSchema } from "@/lib/validation/camera-note";

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
    const session = await auth();
    const authorId = session?.user?.id;
    if (!authorId) {
      return { status: "error", message: "Not authenticated." };
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
