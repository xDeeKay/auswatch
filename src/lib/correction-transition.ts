import {
  AuState,
  CameraType,
  HistoryEventType,
  ModerationActionType,
  ModerationReasonCode,
  CorrectionReportStatus,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import type { CameraSnapshot, ProposedCameraFields } from "@/lib/correction-diff";
import { buildCorrectionDiffRows } from "@/lib/correction-diff";
import type { SensitiveSiteMatchResult, SensitiveSiteCheckError } from "@/lib/sensitive-site-check";
import { deriveAuState } from "@/lib/au-state";

export type CorrectionDecisionInput = {
  correctionId: string;
  cameraId: string;
  actorId: string;
  reasonCode: ModerationReasonCode;
  note: string;
};

export type PendingCorrection = ProposedCameraFields & {
  proposedSensitiveSiteMatches: SensitiveSiteMatchResult[] | null;
  proposedSensitiveSiteCheckErrors: SensitiveSiteCheckError[] | null;
};

type ModerationActionPlan = {
  cameraId: string;
  correctionReportId: string;
  actorId: string;
  action: ModerationActionType;
  reasonCode: ModerationReasonCode;
  note: string;
};

export type CorrectionApproveTransitionPlan = {
  cameraUpdate: Prisma.CameraUpdateInput;
  // Absent when every proposed field was already superseded by a sibling
  // correction (nothing left to describe) - no HistoryEvent, not a blank one.
  historyEvent?: { cameraId: string; date: Date; eventType: HistoryEventType; note: string };
  correctionUpdate: { status: CorrectionReportStatus; reviewedAt: Date };
  moderationAction: ModerationActionPlan;
  newSensitiveSiteMatches: Prisma.SensitiveSiteMatchCreateManyInput[];
  // The camera's state/type after this correction is applied, for the caller
  // to run a permission check against the post-correction values, not just
  // the pre-correction ones.
  resultingState: AuState | null;
  resultingType: CameraType;
};

export type CorrectionRejectTransitionPlan = {
  correctionUpdate: { status: CorrectionReportStatus; reviewedAt: Date };
  moderationAction: ModerationActionPlan;
};

function describeChanges(camera: CameraSnapshot, correction: PendingCorrection): string | null {
  const rows = buildCorrectionDiffRows(camera, correction);
  if (rows.length === 0) return null;
  return rows.map((row) => `${row.label} corrected from "${row.before}" to "${row.after}"`).join("; ");
}

export function buildCorrectionApproveTransition(
  correction: PendingCorrection,
  camera: CameraSnapshot,
  input: CorrectionDecisionInput,
  now: Date = new Date()
): CorrectionApproveTransitionPlan {
  const locationChanged = correction.proposedLat !== null && correction.proposedLng !== null;
  const derivedState = locationChanged
    ? deriveAuState({ lat: correction.proposedLat!, lng: correction.proposedLng! })
    : null;

  const cameraUpdate: Prisma.CameraUpdateInput = {};
  if (correction.proposedLat !== null) cameraUpdate.lat = correction.proposedLat;
  if (correction.proposedLng !== null) cameraUpdate.lng = correction.proposedLng;
  if (locationChanged) {
    cameraUpdate.state = derivedState;
    cameraUpdate.stateOverride = false;
  }
  if (correction.proposedType !== null) cameraUpdate.type = correction.proposedType;
  if (correction.proposedOperator !== null) cameraUpdate.operator = correction.proposedOperator;
  if (correction.proposedCaptures !== null) cameraUpdate.captures = correction.proposedCaptures;
  if (correction.proposedNotes !== null) cameraUpdate.notes = correction.proposedNotes;

  const newSensitiveSiteMatches: Prisma.SensitiveSiteMatchCreateManyInput[] =
    correction.proposedLat !== null && correction.proposedLng !== null
      ? [
          ...(correction.proposedSensitiveSiteMatches ?? []).map((m) => ({
            cameraId: input.cameraId,
            source: m.source,
            category: m.category,
            zoneId: m.zoneId,
            distanceMeters: m.distanceMeters,
            detail: m.detail,
          })),
          ...(correction.proposedSensitiveSiteCheckErrors ?? []).map((e) => ({
            cameraId: input.cameraId,
            source: e.source,
            detail: e.message,
          })),
        ]
      : [];

  const changeDescription = describeChanges(camera, correction);

  const resultingState: AuState | null = locationChanged ? derivedState : camera.state;
  const resultingType: CameraType = correction.proposedType ?? camera.type;

  return {
    cameraUpdate,
    resultingState,
    resultingType,
    historyEvent:
      changeDescription === null
        ? undefined
        : {
            cameraId: input.cameraId,
            date: now,
            eventType: HistoryEventType.corrected,
            note: changeDescription,
          },
    correctionUpdate: { status: CorrectionReportStatus.approved, reviewedAt: now },
    moderationAction: {
      cameraId: input.cameraId,
      correctionReportId: input.correctionId,
      actorId: input.actorId,
      action: ModerationActionType.correction_approve,
      reasonCode: input.reasonCode,
      note: input.note,
    },
    newSensitiveSiteMatches,
  };
}

export function buildCorrectionRejectTransition(
  input: CorrectionDecisionInput,
  now: Date = new Date()
): CorrectionRejectTransitionPlan {
  return {
    correctionUpdate: { status: CorrectionReportStatus.rejected, reviewedAt: now },
    moderationAction: {
      cameraId: input.cameraId,
      correctionReportId: input.correctionId,
      actorId: input.actorId,
      action: ModerationActionType.correction_reject,
      reasonCode: input.reasonCode,
      note: input.note,
    },
  };
}
