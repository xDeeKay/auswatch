import { describe, it, expect } from "vitest";
import { buildVerifyTransition, buildRemoveTransition } from "./moderation-transition";
import {
  CameraStatus,
  ModerationState,
  HistoryEventType,
  ModerationActionType,
  ModerationReasonCode,
} from "@/generated/prisma/enums";

const input = {
  cameraId: "cam-1",
  actorId: "user-1",
  reasonCode: ModerationReasonCode.verified_accurate,
  note: "Looks accurate, plate reader confirmed by nearby streetview imagery.",
  statusBefore: CameraStatus.unconfirmed,
  moderationActionId: "action-1",
};

const now = new Date("2026-08-30T09:00:00.000Z");

describe("buildVerifyTransition", () => {
  const plan = buildVerifyTransition(input, now);

  it("sets moderationState to verified and status to active", () => {
    expect(plan.cameraUpdate).toEqual({
      moderationState: ModerationState.verified,
      status: CameraStatus.active,
    });
  });

  it("never produces a removed status", () => {
    expect(plan.cameraUpdate.status).not.toBe(CameraStatus.removed);
    expect(plan.cameraUpdate.moderationState).not.toBe(ModerationState.removed);
  });

  it("creates an active history event at the given time", () => {
    expect(plan.historyEvent).toEqual({
      cameraId: "cam-1",
      date: now,
      eventType: HistoryEventType.active,
      note: input.note,
    });
  });

  it("logs a verify moderation action with the reason code and actor", () => {
    expect(plan.moderationAction).toEqual({
      id: "action-1",
      cameraId: "cam-1",
      actorId: "user-1",
      action: ModerationActionType.verify,
      reasonCode: ModerationReasonCode.verified_accurate,
      note: input.note,
    });
  });

  it("logs an audit entry capturing the moderation state and status transition", () => {
    expect(plan.auditLogEntry).toEqual({
      entityType: "camera",
      entityId: "cam-1",
      action: "camera_verify",
      actorId: "user-1",
      before: { moderationState: ModerationState.pending, status: CameraStatus.unconfirmed },
      after: { moderationState: ModerationState.verified, status: CameraStatus.active },
      summary: "Verified this submission.",
      moderationActionId: "action-1",
    });
  });
});

describe("buildRemoveTransition", () => {
  const plan = buildRemoveTransition(input, now);

  it("sets moderationState to removed and status to removed", () => {
    expect(plan.cameraUpdate).toEqual({
      moderationState: ModerationState.removed,
      status: CameraStatus.removed,
    });
  });

  it("never produces an active status", () => {
    expect(plan.cameraUpdate.status).not.toBe(CameraStatus.active);
    expect(plan.cameraUpdate.moderationState).not.toBe(ModerationState.verified);
  });

  it("creates a removed history event at the given time", () => {
    expect(plan.historyEvent).toEqual({
      cameraId: "cam-1",
      date: now,
      eventType: HistoryEventType.removed,
      note: input.note,
    });
  });

  it("logs a remove moderation action with the reason code and actor", () => {
    expect(plan.moderationAction).toEqual({
      id: "action-1",
      cameraId: "cam-1",
      actorId: "user-1",
      action: ModerationActionType.remove,
      reasonCode: ModerationReasonCode.verified_accurate,
      note: input.note,
    });
  });

  it("logs an audit entry capturing the moderation state and status transition", () => {
    expect(plan.auditLogEntry).toEqual({
      entityType: "camera",
      entityId: "cam-1",
      action: "camera_remove",
      actorId: "user-1",
      before: { moderationState: ModerationState.pending, status: CameraStatus.unconfirmed },
      after: { moderationState: ModerationState.removed, status: CameraStatus.removed },
      summary: "Removed this submission.",
      moderationActionId: "action-1",
    });
  });
});
