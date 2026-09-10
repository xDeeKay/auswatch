"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { AuState, HistoryEventType } from "@/generated/prisma/enums";
import { STATE_LABEL } from "@/lib/au-state-labels";
import { requireModerator, assertCanAct, accessDeniedMessage } from "@/lib/moderator-access";

export type CameraStateActionResult = { status: "ok" } | { status: "error"; message: string };

function parseState(value: FormDataEntryValue | null): AuState | null | undefined {
  if (typeof value !== "string") return undefined;
  if (value === "") return null;
  const values: string[] = Object.values(AuState);
  return values.includes(value) ? (value as AuState) : undefined;
}

export async function overrideCameraState(
  cameraId: string,
  formData: FormData
): Promise<CameraStateActionResult> {
  const newState = parseState(formData.get("state"));
  if (newState === undefined) {
    return { status: "error", message: "Select a valid state, or Unresolved." };
  }

  try {
    const access = await requireModerator();
    if (access.status !== "ok") {
      return { status: "error", message: accessDeniedMessage(access) };
    }
    const { profile } = access;

    const outcome = await prisma.$transaction(async (tx) => {
      const camera = await tx.camera.findUnique({
        where: { id: cameraId },
        select: { state: true, type: true },
      });
      if (!camera) return "not-found" as const;

      const beforePermission = assertCanAct(profile, { state: camera.state, type: camera.type });
      if (!beforePermission.ok) return "forbidden" as const;

      const afterPermission = assertCanAct(profile, { state: newState, type: camera.type });
      if (!afterPermission.ok) return "forbidden" as const;

      if (camera.state === newState) return "unchanged" as const;

      await tx.camera.update({
        where: { id: cameraId },
        data: { state: newState, stateOverride: true },
      });
      await tx.historyEvent.create({
        data: {
          cameraId,
          date: new Date(),
          eventType: HistoryEventType.corrected,
          note: `State manually set to ${newState ? STATE_LABEL[newState] : "Unresolved"} (was ${camera.state ? STATE_LABEL[camera.state] : "Unresolved"}).`,
        },
      });
      return "ok" as const;
    });

    if (outcome === "not-found") {
      return { status: "error", message: "This camera no longer exists." };
    }
    if (outcome === "forbidden") {
      return {
        status: "error",
        message: "You do not have permission to change this camera's state.",
      };
    }
    if (outcome === "unchanged") {
      return { status: "ok" };
    }

    revalidatePath(`/moderate/cameras/${cameraId}`);
    return { status: "ok" };
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
