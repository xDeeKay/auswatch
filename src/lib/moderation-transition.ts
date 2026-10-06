import {
  CameraStatus,
  ModerationState,
  HistoryEventType,
  ModerationActionType,
  ModerationReasonCode,
  AuditActionType,
} from "@/generated/prisma/enums";
import { buildAuditLogEntry, type AuditLogEntryCreateInput } from "@/lib/audit-log-payloads";

export type ModerationDecisionInput = {
  cameraId: string;
  actorId: string;
  reasonCode: ModerationReasonCode;
  note: string;
  /** The camera's status immediately before this decision, for the audit "before" snapshot. */
  statusBefore: CameraStatus;
  /** Pre-generated so the audit entry can reference the ModerationAction row before it's created. */
  moderationActionId: string;
};

export type ModerationTransitionPlan = {
  cameraUpdate: { moderationState: ModerationState; status: CameraStatus };
  /** Absent when the decision leaves the camera's lifecycle unchanged. */
  historyEvent?: { cameraId: string; date: Date; eventType: HistoryEventType; note: string };
  moderationAction: {
    id: string;
    cameraId: string;
    actorId: string;
    action: ModerationActionType;
    reasonCode: ModerationReasonCode;
    note: string;
  };
  auditLogEntry: AuditLogEntryCreateInput<"camera_verify" | "camera_remove">;
};

function buildTransition(
  input: ModerationDecisionInput,
  now: Date,
  action: ModerationActionType,
  auditAction: "camera_verify" | "camera_remove",
  moderationState: ModerationState,
  status: CameraStatus,
  eventType: HistoryEventType | null
): ModerationTransitionPlan {
  return {
    cameraUpdate: { moderationState, status },
    historyEvent: eventType ? { cameraId: input.cameraId, date: now, eventType, note: input.note } : undefined,
    moderationAction: {
      id: input.moderationActionId,
      cameraId: input.cameraId,
      actorId: input.actorId,
      action,
      reasonCode: input.reasonCode,
      note: input.note,
    },
    auditLogEntry: buildAuditLogEntry(
      auditAction,
      input.cameraId,
      input.actorId,
      { moderationState: ModerationState.pending, status: input.statusBefore },
      { moderationState, status },
      auditAction === "camera_verify" ? "Verified this submission." : "Removed this submission.",
      input.moderationActionId
    ),
  };
}

/**
 * A record already known to be inactive (an import the source reports as
 * decommissioned) stays inactive when verified: verifying confirms the record,
 * it doesn't claim the camera is back, and the original inactive event keeps
 * its real date on the timeline.
 */
export function buildVerifyTransition(
  input: ModerationDecisionInput,
  now: Date = new Date()
): ModerationTransitionPlan {
  const staysInactive = input.statusBefore === CameraStatus.inactive;
  return buildTransition(
    input,
    now,
    ModerationActionType.verify,
    AuditActionType.camera_verify,
    ModerationState.verified,
    staysInactive ? CameraStatus.inactive : CameraStatus.active,
    staysInactive ? null : HistoryEventType.active
  );
}

export function buildRemoveTransition(
  input: ModerationDecisionInput,
  now: Date = new Date()
): ModerationTransitionPlan {
  return buildTransition(
    input,
    now,
    ModerationActionType.remove,
    AuditActionType.camera_remove,
    ModerationState.removed,
    CameraStatus.inactive,
    HistoryEventType.inactive
  );
}
