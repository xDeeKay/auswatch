"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ModerationState, ModerationReasonCode } from "@/generated/prisma/enums";
import {
  buildVerifyTransition,
  buildRemoveTransition,
  type ModerationDecisionInput,
  type ModerationTransitionPlan,
} from "@/lib/moderation-transition";

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
    const session = await auth();
    const actorId = session?.user?.id;
    if (!actorId) {
      return { status: "error", message: "Not authenticated." };
    }

    const plan = build({ cameraId, actorId, reasonCode, note });

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.camera.updateMany({
        where: { id: cameraId, moderationState: ModerationState.pending },
        data: plan.cameraUpdate,
      });
      if (result.count === 0) {
        return false;
      }
      await tx.historyEvent.create({ data: plan.historyEvent });
      await tx.moderationAction.create({ data: plan.moderationAction });
      return true;
    });

    if (!updated) {
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
