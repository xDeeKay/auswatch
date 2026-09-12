"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { CorrectionReportStatus, ModerationReasonCode, ModerationState } from "@/generated/prisma/enums";
import {
  buildCorrectionApproveTransition,
  buildCorrectionRejectTransition,
  type CorrectionDecisionInput,
} from "@/lib/correction-transition";
import type { SensitiveSiteMatchResult, SensitiveSiteCheckError } from "@/lib/sensitive-site-check";
import { requireModerator, assertCanAct, accessDeniedMessage } from "@/lib/moderator-access";

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
    const access = await requireModerator();
    if (access.status !== "ok") {
      return { status: "error", message: accessDeniedMessage(access) };
    }
    const { profile } = access;
    const actorId = profile.userId;
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

      const beforePermission = assertCanAct(profile, { state: camera.state, type: camera.type });
      if (!beforePermission.ok) {
        return { ok: false as const, message: beforePermission.message };
      }

      const moderationActionId = randomUUID();
      const input: CorrectionDecisionInput = {
        correctionId,
        cameraId: correction.cameraId,
        actorId,
        reasonCode,
        note,
        moderationActionId,
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

      const afterPermission = assertCanAct(profile, { state: plan.resultingState, type: plan.resultingType });
      if (!afterPermission.ok) {
        return {
          ok: false as const,
          message:
            "This correction would move the camera outside your permitted states/camera types. A moderator with access to the new state or type must review it.",
        };
      }

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
      let createdSensitiveSiteMatchIds: string[] = [];
      if (plan.newSensitiveSiteMatches.length > 0) {
        const created = await tx.sensitiveSiteMatch.createManyAndReturn({
          data: plan.newSensitiveSiteMatches,
          select: { id: true },
        });
        createdSensitiveSiteMatchIds = created.map((m) => m.id);
      }
      await tx.moderationAction.create({ data: plan.moderationAction });
      await tx.auditLogEntry.create({
        data: {
          ...plan.auditLogEntry,
          after: { ...plan.auditLogEntry.after, createdSensitiveSiteMatchIds },
        },
      });

      return { ok: true as const, cameraId: correction.cameraId };
    });

    if (!result.ok) {
      return { status: "error", message: result.message };
    }

    revalidatePath("/moderate");
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
    const access = await requireModerator();
    if (access.status !== "ok") {
      return { status: "error", message: accessDeniedMessage(access) };
    }
    const { profile } = access;
    const actorId = profile.userId;
    if (!actorId) {
      return { status: "error", message: "Not authenticated." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const correction = await tx.correctionReport.findUnique({ where: { id: correctionId } });
      if (!correction) {
        return { ok: false as const, message: "This correction no longer exists." };
      }

      const camera = await tx.camera.findUnique({ where: { id: correction.cameraId } });
      if (!camera) {
        return { ok: false as const, message: "The camera this correction refers to no longer exists." };
      }

      const permission = assertCanAct(profile, { state: camera.state, type: camera.type });
      if (!permission.ok) {
        return { ok: false as const, message: permission.message };
      }

      const plan = buildCorrectionRejectTransition({
        correctionId,
        cameraId: correction.cameraId,
        actorId,
        reasonCode,
        note,
        moderationActionId: randomUUID(),
      });

      const updated = await tx.correctionReport.updateMany({
        where: { id: correctionId, status: CorrectionReportStatus.pending },
        data: plan.correctionUpdate,
      });
      if (updated.count === 0) {
        return { ok: false as const, message: "This correction was already reviewed." };
      }

      await tx.moderationAction.create({ data: plan.moderationAction });
      await tx.auditLogEntry.create({ data: plan.auditLogEntry });

      return { ok: true as const, cameraId: correction.cameraId };
    });

    if (!result.ok) {
      return { status: "error", message: result.message };
    }

    revalidatePath("/moderate");
    revalidatePath(`/moderate/cameras/${result.cameraId}`);
    return { status: "ok" };
  } catch {
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
