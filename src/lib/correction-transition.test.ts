import { describe, it, expect } from "vitest";
import {
  AuState,
  CameraStatus,
  CameraType,
  CaptureType,
  CorrectionReportStatus,
  HistoryEventType,
  ModerationActionType,
  ModerationReasonCode,
  OperatorCategory,
  SensitiveSiteMatchSource,
} from "@/generated/prisma/enums";
import { buildCorrectionApproveTransition, buildCorrectionRejectTransition } from "./correction-transition";
import type { PendingCorrection } from "./correction-transition";
import type { CameraSnapshot } from "./correction-diff";

const camera: CameraSnapshot & { stateOverride: boolean } = {
  lat: -31.9505,
  lng: 115.8605,
  type: CameraType.alpr,
  operatorCategory: OperatorCategory.state_police,
  operator: "WA Police",
  captures: CaptureType.plates,
  notes: "Mounted on a light pole.",
  state: AuState.wa,
  status: CameraStatus.active,
  stateOverride: false,
};

const now = new Date("2026-09-01T00:00:00.000Z");

function pendingCorrection(overrides: Partial<PendingCorrection> = {}): PendingCorrection {
  return {
    proposedLat: null,
    proposedLng: null,
    proposedType: null,
    proposedOperator: null,
    proposedOperatorCategory: null,
    proposedCaptures: null,
    proposedNotes: null,
    reportedRemoved: false,
    proposedSensitiveSiteMatches: null,
    proposedSensitiveSiteCheckErrors: null,
    ...overrides,
  };
}

const input = {
  correctionId: "correction-1",
  cameraId: "camera-1",
  actorId: "actor-1",
  reasonCode: ModerationReasonCode.verified_accurate,
  note: "looks right",
  moderationActionId: "action-1",
};

describe("buildCorrectionApproveTransition", () => {
  it("only sets the fields that were actually proposed", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedOperator: "NSW Police" }),
      camera,
      input,
      now
    );
    expect(plan.cameraUpdate).toEqual({ operator: "NSW Police" });
  });

  it("copies operatorCategory when proposed", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedOperatorCategory: OperatorCategory.local_council }),
      camera,
      input,
      now
    );
    expect(plan.cameraUpdate).toEqual({ operatorCategory: OperatorCategory.local_council });
  });

  it("sets lat, lng, and the re-derived state together for a location-only correction", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedLat: -31.96, proposedLng: 115.87 }),
      camera,
      input,
      now
    );
    expect(plan.cameraUpdate).toEqual({
      lat: -31.96,
      lng: 115.87,
      state: AuState.wa,
      stateOverride: false,
    });
  });

  it("does not touch state or stateOverride when location did not change", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedOperator: "NSW Police" }),
      camera,
      input,
      now
    );
    expect(plan.cameraUpdate).not.toHaveProperty("state");
    expect(plan.cameraUpdate).not.toHaveProperty("stateOverride");
  });

  it("clears a prior manual state override when the location is corrected", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedLat: -33.8688, proposedLng: 151.2093 }),
      camera,
      input,
      now
    );
    expect(plan.cameraUpdate.state).toBe(AuState.nsw);
    expect(plan.cameraUpdate.stateOverride).toBe(false);
  });

  it("resolves state to null when the corrected location falls outside every state", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedLat: -40, proposedLng: 160 }),
      camera,
      input,
      now
    );
    expect(plan.cameraUpdate.state).toBeNull();
  });

  it("resultingState/resultingType reflect the camera unchanged when nothing relevant was proposed", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedOperator: "NSW Police" }),
      camera,
      input,
      now
    );
    expect(plan.resultingState).toBe(camera.state);
    expect(plan.resultingType).toBe(camera.type);
  });

  it("resultingState reflects the newly-derived state when location changes", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedLat: -33.8688, proposedLng: 151.2093 }),
      camera,
      input,
      now
    );
    expect(plan.resultingState).toBe(AuState.nsw);
  });

  it("resultingType reflects the newly-proposed type when type changes", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedType: CameraType.cctv }),
      camera,
      input,
      now
    );
    expect(plan.resultingType).toBe(CameraType.cctv);
    expect(plan.resultingState).toBe(camera.state);
  });

  it("sets every proposed field for a multi-field correction", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedType: CameraType.cctv, proposedNotes: "Actually CCTV." }),
      camera,
      input,
      now
    );
    expect(plan.cameraUpdate).toEqual({ type: CameraType.cctv, notes: "Actually CCTV." });
  });

  it("leaves newSensitiveSiteMatches empty when location did not change", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedOperator: "NSW Police" }),
      camera,
      input,
      now
    );
    expect(plan.newSensitiveSiteMatches).toEqual([]);
  });

  it("populates newSensitiveSiteMatches from the stored snapshot when location changed", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({
        proposedLat: -31.96,
        proposedLng: 115.87,
        proposedSensitiveSiteMatches: [
          {
            source: SensitiveSiteMatchSource.osm_overpass,
            category: null,
            distanceMeters: 40,
            lat: -31.9601,
            lng: 115.8701,
            detail: "kindergarten",
          },
        ],
        proposedSensitiveSiteCheckErrors: [],
      }),
      camera,
      input,
      now
    );
    expect(plan.newSensitiveSiteMatches).toEqual([
      {
        cameraId: "camera-1",
        source: SensitiveSiteMatchSource.osm_overpass,
        category: null,
        zoneId: undefined,
        distanceMeters: 40,
        detail: "kindergarten",
      },
    ]);
  });

  it("uses the corrected HistoryEventType and builds a human-readable note", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedOperator: "NSW Police" }),
      camera,
      input,
      now
    );
    expect(plan.historyEvent).toBeDefined();
    expect(plan.historyEvent?.eventType).toBe(HistoryEventType.corrected);
    expect(plan.historyEvent?.note).toBe('Operator corrected from "WA Police" to "NSW Police"');
    expect(plan.historyEvent?.cameraId).toBe(input.cameraId);
    expect(plan.historyEvent?.date).toBe(now);
  });

  it("joins multiple field changes in the note with a semicolon", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedOperator: "NSW Police", proposedType: CameraType.cctv }),
      camera,
      input,
      now
    );
    expect(plan.historyEvent?.note).toBe(
      'Type corrected from "ALPR / Plate Reader" to "CCTV Camera"; Operator corrected from "WA Police" to "NSW Police"'
    );
  });

  it("omits historyEvent entirely when the proposed change was already superseded by a sibling correction", () => {
    const alreadyFixedCamera = { ...camera, operator: "NSW Police" };
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedOperator: "NSW Police" }),
      alreadyFixedCamera,
      input,
      now
    );
    expect(plan.historyEvent).toBeUndefined();
  });

  it("sets correctionUpdate to approved with the review timestamp", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedOperator: "NSW Police" }),
      camera,
      input,
      now
    );
    expect(plan.correctionUpdate).toEqual({ status: CorrectionReportStatus.approved, reviewedAt: now });
  });

  it("logs a correction_approve moderation action referencing the correction", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedOperator: "NSW Police" }),
      camera,
      input,
      now
    );
    expect(plan.moderationAction).toEqual({
      id: input.moderationActionId,
      cameraId: input.cameraId,
      correctionReportId: input.correctionId,
      actorId: input.actorId,
      action: ModerationActionType.correction_approve,
      reasonCode: input.reasonCode,
      note: input.note,
    });
  });

  it("logs an audit entry capturing only the changed camera fields, before and after", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedOperator: "NSW Police" }),
      camera,
      input,
      now
    );
    expect(plan.auditLogEntry).toEqual({
      entityType: "camera",
      entityId: input.cameraId,
      action: "camera_correction_approve",
      actorId: input.actorId,
      before: { operator: "WA Police" },
      after: { operator: "NSW Police", correctionReportId: input.correctionId, createdSensitiveSiteMatchIds: [] },
      summary: 'Operator corrected from "WA Police" to "NSW Police"',
      moderationActionId: input.moderationActionId,
    });
  });

  it("sets status to removed when the correction reports the camera removed", () => {
    const plan = buildCorrectionApproveTransition(pendingCorrection({ reportedRemoved: true }), camera, input, now);
    expect(plan.cameraUpdate).toEqual({ status: CameraStatus.removed });
  });

  it("uses the removed HistoryEventType and notes the status change when reporting a removal", () => {
    const plan = buildCorrectionApproveTransition(pendingCorrection({ reportedRemoved: true }), camera, input, now);
    expect(plan.historyEvent?.eventType).toBe(HistoryEventType.removed);
    expect(plan.historyEvent?.note).toBe('Status corrected from "Active" to "Removed"');
  });

  it("does not touch status when the camera is already removed", () => {
    const alreadyRemovedCamera = { ...camera, status: CameraStatus.removed };
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ reportedRemoved: true }),
      alreadyRemovedCamera,
      input,
      now
    );
    expect(plan.cameraUpdate).not.toHaveProperty("status");
    expect(plan.historyEvent).toBeUndefined();
  });

  it("combines a removal with other proposed field changes in one history event", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ reportedRemoved: true, proposedOperator: "NSW Police" }),
      camera,
      input,
      now
    );
    expect(plan.cameraUpdate).toEqual({ status: CameraStatus.removed, operator: "NSW Police" });
    expect(plan.historyEvent?.eventType).toBe(HistoryEventType.removed);
  });

  it("audit entry before/after includes stateOverride when the location changed", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedLat: -31.96, proposedLng: 115.87 }),
      camera,
      input,
      now
    );
    expect(plan.auditLogEntry.before).toEqual({ lat: camera.lat, lng: camera.lng, state: camera.state, stateOverride: false });
    expect(plan.auditLogEntry.after).toEqual({
      lat: -31.96,
      lng: 115.87,
      state: AuState.wa,
      stateOverride: false,
      correctionReportId: input.correctionId,
      createdSensitiveSiteMatchIds: [],
    });
  });
});

describe("buildCorrectionRejectTransition", () => {
  it("has no historyEvent field under any input", () => {
    const plan = buildCorrectionRejectTransition(input, now);
    expect(plan).not.toHaveProperty("historyEvent");
  });

  it("sets correctionUpdate to rejected with the review timestamp", () => {
    const plan = buildCorrectionRejectTransition(input, now);
    expect(plan.correctionUpdate).toEqual({ status: CorrectionReportStatus.rejected, reviewedAt: now });
  });

  it("logs a correction_reject moderation action referencing the correction", () => {
    const plan = buildCorrectionRejectTransition(input, now);
    expect(plan.moderationAction).toEqual({
      id: input.moderationActionId,
      cameraId: input.cameraId,
      correctionReportId: input.correctionId,
      actorId: input.actorId,
      action: ModerationActionType.correction_reject,
      reasonCode: input.reasonCode,
      note: input.note,
    });
  });

  it("logs an audit entry restoring the correction to pending on revert", () => {
    const plan = buildCorrectionRejectTransition(input, now);
    expect(plan.auditLogEntry).toEqual({
      entityType: "correction_report",
      entityId: input.correctionId,
      action: "camera_correction_reject",
      actorId: input.actorId,
      before: { status: "pending", reviewedAt: null },
      after: { status: "rejected", reviewedAt: now.toISOString() },
      summary: "Rejected this correction.",
      moderationActionId: input.moderationActionId,
    });
  });
});
