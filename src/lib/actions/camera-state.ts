"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { AuState } from "@/generated/prisma/enums";
import { requireModerator, assertCanAct, accessDeniedMessage } from "@/lib/moderator-access";
import { buildStateOverrideTransition } from "@/lib/camera-state-transition";

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
    const actorId = profile.userId;
    if (!actorId) {
      return { status: "error", message: "Not authenticated." };
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const camera = await tx.camera.findUnique({
        where: { id: cameraId },
        select: { state: true, type: true, stateOverride: true },
      });
      if (!camera) return "not-found" as const;

      const beforePermission = assertCanAct(profile, { state: camera.state, type: camera.type });
      if (!beforePermission.ok) return "forbidden" as const;

      const afterPermission = assertCanAct(profile, { state: newState, type: camera.type });
      if (!afterPermission.ok) return "forbidden" as const;

      if (camera.state === newState) return "unchanged" as const;

      const plan = buildStateOverrideTransition({
        cameraId,
        actorId,
        stateBefore: camera.state,
        stateOverrideBefore: camera.stateOverride,
        newState,
      });

      await tx.camera.update({ where: { id: cameraId }, data: plan.cameraUpdate });
      await tx.historyEvent.create({ data: plan.historyEvent });
      await tx.auditLogEntry.create({ data: plan.auditLogEntry });
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
