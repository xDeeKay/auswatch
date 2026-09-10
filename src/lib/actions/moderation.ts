"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ModerationState, ModerationReasonCode } from "@/generated/prisma/enums";
import {
  buildVerifyTransition,
  buildRemoveTransition,
  type ModerationDecisionInput,
  type ModerationTransitionPlan,
} from "@/lib/moderation-transition";
import { requireModerator, assertCanAct, accessDeniedMessage } from "@/lib/moderator-access";

export type ModerationActionResult = { status: "ok" } | { status: "error"; message: string };

function parseReasonCode(value: FormDataEntryValue | null): ModerationReasonCode | null {
  if (typeof value !== "string") return null;
  const values: string[] = Object.values(ModerationReasonCode);
  return values.includes(value) ? (value as ModerationReasonCode) : null;
}

async function applyTransition(
  cameraId: string,
  reasonCode: ModerationReasonCode,
  note: string,
  build: (input: ModerationDecisionInput) => ModerationTransitionPlan
): Promise<ModerationActionResult> {
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
        select: { state: true, type: true, moderationState: true },
      });
      if (!camera || camera.moderationState !== ModerationState.pending) {
        return "already-reviewed" as const;
      }

      const permission = assertCanAct(profile, { state: camera.state, type: camera.type });
      if (!permission.ok) {
        return "forbidden" as const;
      }

      const plan = build({ cameraId, actorId, reasonCode, note });

      const result = await tx.camera.updateMany({
        where: { id: cameraId, moderationState: ModerationState.pending },
        data: plan.cameraUpdate,
      });
      if (result.count === 0) {
        return "already-reviewed" as const;
      }
      await tx.historyEvent.create({ data: plan.historyEvent });
      await tx.moderationAction.create({ data: plan.moderationAction });
      return "ok" as const;
    });

    if (outcome === "forbidden") {
      return { status: "error", message: "You do not have permission to act on this ticket." };
    }
    if (outcome === "already-reviewed") {
      return { status: "error", message: "This submission was already reviewed." };
    }

    revalidatePath("/moderate");
    return { status: "ok" };
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}

export async function verifyCamera(cameraId: string, formData: FormData): Promise<ModerationActionResult> {
  const reasonCode = parseReasonCode(formData.get("reasonCode"));
  if (!reasonCode) return { status: "error", message: "Select a reason." };
  const note = String(formData.get("note") ?? "");
  return applyTransition(cameraId, reasonCode, note, buildVerifyTransition);
}

export async function removeCamera(cameraId: string, formData: FormData): Promise<ModerationActionResult> {
  const reasonCode = parseReasonCode(formData.get("reasonCode"));
  if (!reasonCode) return { status: "error", message: "Select a reason." };
  const note = String(formData.get("note") ?? "");
  return applyTransition(cameraId, reasonCode, note, buildRemoveTransition);
}
