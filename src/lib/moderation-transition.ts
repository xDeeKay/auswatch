import {
  CameraStatus,
  ModerationState,
  HistoryEventType,
  ModerationActionType,
  ModerationReasonCode,
} from "@/generated/prisma/enums";

export type ModerationDecisionInput = {
  cameraId: string;
  actorId: string;
  reasonCode: ModerationReasonCode;
  note: string;
};

export type ModerationTransitionPlan = {
  cameraUpdate: { moderationState: ModerationState; status: CameraStatus };
  historyEvent: { cameraId: string; date: Date; eventType: HistoryEventType; note: string };
  moderationAction: {
    cameraId: string;
    actorId: string;
    action: ModerationActionType;
    reasonCode: ModerationReasonCode;
    note: string;
  };
};

function buildTransition(
  input: ModerationDecisionInput,
  now: Date,
  action: ModerationActionType,
  moderationState: ModerationState,
  status: CameraStatus,
  eventType: HistoryEventType
): ModerationTransitionPlan {
  return {
    cameraUpdate: { moderationState, status },
    historyEvent: { cameraId: input.cameraId, date: now, eventType, note: input.note },
    moderationAction: {
      cameraId: input.cameraId,
      actorId: input.actorId,
      action,
      reasonCode: input.reasonCode,
      note: input.note,
    },
  };
}

export function buildVerifyTransition(
  input: ModerationDecisionInput,
  now: Date = new Date()
): ModerationTransitionPlan {
  return buildTransition(
    input,
    now,
    ModerationActionType.verify,
    ModerationState.verified,
    CameraStatus.active,
    HistoryEventType.active
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
    ModerationState.removed,
    CameraStatus.removed,
    HistoryEventType.removed
  );
}
