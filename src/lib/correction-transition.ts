import {
  AuState,
  CameraStatus,
  CameraType,
  HistoryEventType,
  ModerationActionType,
  ModerationReasonCode,
  CorrectionReportStatus,
  AuditActionType,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import type { CameraSnapshot, ProposedCameraFields } from "@/lib/correction-diff";
import { buildCorrectionDiffRows } from "@/lib/correction-diff";
import type { SensitiveSiteMatchResult, SensitiveSiteCheckError } from "@/lib/sensitive-site-check";
import { deriveAuState } from "@/lib/au-state";
import { buildAuditLogEntry, type AuditLogEntryCreateInput } from "@/lib/audit-log-payloads";
import type { CameraFieldsPayload } from "@/lib/audit-log-payloads";

export type CorrectionDecisionInput = {
  correctionId: string;
  cameraId: string;
  actorId: string;
  reasonCode: ModerationReasonCode;
  note: string;
  /** Pre-generated so the audit entry can reference the ModerationAction row before it's created. */
  moderationActionId: string;
};

/** The subset of Camera fields captured in an audit "before"/"after" snapshot, matching the keys `cameraUpdate` may set. */
type CameraSnapshotForAudit = CameraSnapshot & { stateOverride: boolean };

export type PendingCorrection = ProposedCameraFields & {
  proposedSensitiveSiteMatches: SensitiveSiteMatchResult[] | null;
  proposedSensitiveSiteCheckErrors: SensitiveSiteCheckError[] | null;
};

type ModerationActionPlan = {
  id: string;
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
  // createdSensitiveSiteMatchIds starts empty; the action file fills it in
  // after actually creating the SensitiveSiteMatch rows, since their ids
  // aren't known until then.
  auditLogEntry: AuditLogEntryCreateInput<"camera_correction_approve">;
};

export type CorrectionRejectTransitionPlan = {
  correctionUpdate: { status: CorrectionReportStatus; reviewedAt: Date };
  moderationAction: ModerationActionPlan;
  auditLogEntry: AuditLogEntryCreateInput<"camera_correction_reject">;
};

function describeChanges(camera: CameraSnapshot, correction: PendingCorrection): string | null {
  const rows = buildCorrectionDiffRows(camera, correction);
  if (rows.length === 0) return null;
  return rows.map((row) => `${row.label} corrected from "${row.before}" to "${row.after}"`).join("; ");
}

/**
 * Picks only the keys `cameraUpdate` actually sets, pairing each with its
 * pre-change value from `camera`, so the audit "before"/"after" snapshot
 * never claims a field changed that this correction didn't touch.
 */
function pickCameraAuditFields(
  camera: CameraSnapshotForAudit,
  cameraUpdate: Prisma.CameraUpdateInput
): { before: CameraFieldsPayload; after: CameraFieldsPayload } {
  const cameraRecord = camera as unknown as Record<string, unknown>;
  const updateRecord = cameraUpdate as unknown as Record<string, unknown>;
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  for (const key of Object.keys(updateRecord)) {
    before[key] = cameraRecord[key];
    after[key] = updateRecord[key];
  }
  return { before: before as CameraFieldsPayload, after: after as CameraFieldsPayload };
}

export function buildCorrectionApproveTransition(
  correction: PendingCorrection,
  camera: CameraSnapshotForAudit,
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
  if (correction.proposedOperatorCategory !== null) cameraUpdate.operatorCategory = correction.proposedOperatorCategory;
  if (correction.proposedCaptures !== null) cameraUpdate.captures = correction.proposedCaptures;
  if (correction.proposedNotes !== null) cameraUpdate.notes = correction.proposedNotes;
  const reportedRemoved = correction.reportedRemoved && camera.status !== CameraStatus.removed;
  if (reportedRemoved) cameraUpdate.status = CameraStatus.removed;

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

  const { before: fieldsBefore, after: fieldsAfter } = pickCameraAuditFields(camera, cameraUpdate);

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
            eventType: reportedRemoved ? HistoryEventType.removed : HistoryEventType.corrected,
            note: changeDescription,
          },
    correctionUpdate: { status: CorrectionReportStatus.approved, reviewedAt: now },
    moderationAction: {
      id: input.moderationActionId,
      cameraId: input.cameraId,
      correctionReportId: input.correctionId,
      actorId: input.actorId,
      action: ModerationActionType.correction_approve,
      reasonCode: input.reasonCode,
      note: input.note,
    },
    newSensitiveSiteMatches,
    auditLogEntry: buildAuditLogEntry(
      AuditActionType.camera_correction_approve,
      input.cameraId,
      input.actorId,
      fieldsBefore,
      { ...fieldsAfter, correctionReportId: input.correctionId, createdSensitiveSiteMatchIds: [] },
      changeDescription ?? "Approved this correction (no camera fields changed).",
      input.moderationActionId
    ),
  };
}

export function buildCorrectionRejectTransition(
  input: CorrectionDecisionInput,
  now: Date = new Date()
): CorrectionRejectTransitionPlan {
  return {
    correctionUpdate: { status: CorrectionReportStatus.rejected, reviewedAt: now },
    moderationAction: {
      id: input.moderationActionId,
      cameraId: input.cameraId,
      correctionReportId: input.correctionId,
      actorId: input.actorId,
      action: ModerationActionType.correction_reject,
      reasonCode: input.reasonCode,
      note: input.note,
    },
    auditLogEntry: buildAuditLogEntry(
      AuditActionType.camera_correction_reject,
      input.correctionId,
      input.actorId,
      { status: "pending", reviewedAt: null },
      { status: "rejected", reviewedAt: now.toISOString() },
      "Rejected this correction.",
      input.moderationActionId
    ),
  };
}
