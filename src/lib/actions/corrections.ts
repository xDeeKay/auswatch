"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CorrectionReportStatus, ModerationReasonCode, ModerationState } from "@/generated/prisma/enums";
import {
  buildCorrectionApproveTransition,
  buildCorrectionRejectTransition,
  type CorrectionDecisionInput,
} from "@/lib/correction-transition";
import type { SensitiveSiteMatchResult, SensitiveSiteCheckError } from "@/lib/sensitive-site-check";

export type ModerationActionResult = { status: "ok" } | { status: "error"; message: string };

function parseReasonCode(value: FormDataEntryValue | null): ModerationReasonCode | null {
  if (typeof value !== "string") return null;
  const values: string[] = Object.values(ModerationReasonCode);
  return values.includes(value) ? (value as ModerationReasonCode) : null;
}

export async function approveCorrection(
  correctionId: string,
  formData: FormData
): Promise<ModerationActionResult> {
  const reasonCode = parseReasonCode(formData.get("reasonCode"));
  if (!reasonCode) return { status: "error", message: "Select a reason." };
  const note = String(formData.get("note") ?? "");

  try {
    const session = await auth();
    const actorId = session?.user?.id;
    if (!actorId) {
      return { status: "error", message: "Not authenticated." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const correction = await tx.correctionReport.findUnique({ where: { id: correctionId } });
      if (!correction || correction.status !== CorrectionReportStatus.pending) {
        return { ok: false as const, message: "This correction was already reviewed." };
      }

      const camera = await tx.camera.findUnique({ where: { id: correction.cameraId } });
      if (!camera || camera.moderationState !== ModerationState.verified) {
        return {
          ok: false as const,
          message: "This camera is no longer verified. Reject this correction instead of approving it.",
        };
      }

      const input: CorrectionDecisionInput = {
        correctionId,
        cameraId: correction.cameraId,
        actorId,
        reasonCode,
        note,
      };
      const plan = buildCorrectionApproveTransition(
        {
          proposedLat: correction.proposedLat,
          proposedLng: correction.proposedLng,
          proposedType: correction.proposedType,
          proposedOperator: correction.proposedOperator,
          proposedCaptures: correction.proposedCaptures,
          proposedNotes: correction.proposedNotes,
          proposedSensitiveSiteMatches:
            correction.proposedSensitiveSiteMatches as SensitiveSiteMatchResult[] | null,
          proposedSensitiveSiteCheckErrors:
            correction.proposedSensitiveSiteCheckErrors as SensitiveSiteCheckError[] | null,
        },
        camera,
        input
      );

      const updated = await tx.correctionReport.updateMany({
        where: { id: correctionId, status: CorrectionReportStatus.pending },
        data: plan.correctionUpdate,
      });
      if (updated.count === 0) {
        return { ok: false as const, message: "This correction was already reviewed." };
      }

      const updatedCamera = await tx.camera.updateMany({
        where: { id: correction.cameraId, moderationState: ModerationState.verified },
        data: plan.cameraUpdate,
      });
      if (updatedCamera.count === 0) {
        throw new Error("Camera's moderation state changed during review; aborting.");
      }

      if (plan.historyEvent) {
        await tx.historyEvent.create({ data: plan.historyEvent });
      }
      if (plan.newSensitiveSiteMatches.length > 0) {
        await tx.sensitiveSiteMatch.createMany({ data: plan.newSensitiveSiteMatches });
      }
      await tx.moderationAction.create({ data: plan.moderationAction });

      return { ok: true as const, cameraId: correction.cameraId };
    });

    if (!result.ok) {
      return { status: "error", message: result.message };
    }

    revalidatePath("/moderate/corrections");
    revalidatePath(`/moderate/cameras/${result.cameraId}`);
    return { status: "ok" };
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}

export async function rejectCorrection(
  correctionId: string,
  formData: FormData
): Promise<ModerationActionResult> {
  const reasonCode = parseReasonCode(formData.get("reasonCode"));
  if (!reasonCode) return { status: "error", message: "Select a reason." };
  const note = String(formData.get("note") ?? "");

  try {
    const session = await auth();
    const actorId = session?.user?.id;
    if (!actorId) {
      return { status: "error", message: "Not authenticated." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const correction = await tx.correctionReport.findUnique({ where: { id: correctionId } });
      if (!correction) {
        return { ok: false as const, message: "This correction no longer exists." };
      }

      const plan = buildCorrectionRejectTransition({
        correctionId,
        cameraId: correction.cameraId,
        actorId,
        reasonCode,
        note,
      });

      const updated = await tx.correctionReport.updateMany({
        where: { id: correctionId, status: CorrectionReportStatus.pending },
        data: plan.correctionUpdate,
      });
      if (updated.count === 0) {
        return { ok: false as const, message: "This correction was already reviewed." };
      }

      await tx.moderationAction.create({ data: plan.moderationAction });

      return { ok: true as const, cameraId: correction.cameraId };
    });

    if (!result.ok) {
      return { status: "error", message: result.message };
    }

    revalidatePath("/moderate/corrections");
    revalidatePath(`/moderate/cameras/${result.cameraId}`);
    return { status: "ok" };
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
