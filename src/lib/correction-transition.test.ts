import { describe, it, expect } from "vitest";
import {
  CameraType,
  CaptureType,
  CorrectionReportStatus,
  HistoryEventType,
  ModerationActionType,
  ModerationReasonCode,
  SensitiveSiteMatchSource,
} from "@/generated/prisma/enums";
import { buildCorrectionApproveTransition, buildCorrectionRejectTransition } from "./correction-transition";
import type { PendingCorrection } from "./correction-transition";
import type { CameraSnapshot } from "./correction-diff";

const camera: CameraSnapshot = {
  lat: -31.9505,
  lng: 115.8605,
  type: CameraType.alpr,
  operator: "WA Police",
  captures: CaptureType.plates,
  notes: "Mounted on a light pole.",
};

const now = new Date("2026-09-01T00:00:00.000Z");

function pendingCorrection(overrides: Partial<PendingCorrection> = {}): PendingCorrection {
  return {
    proposedLat: null,
    proposedLng: null,
    proposedType: null,
    proposedOperator: null,
    proposedCaptures: null,
    proposedNotes: null,
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

  it("sets both lat and lng together for a location-only correction", () => {
    const plan = buildCorrectionApproveTransition(
      pendingCorrection({ proposedLat: -31.96, proposedLng: 115.87 }),
      camera,
      input,
      now
    );
    expect(plan.cameraUpdate).toEqual({ lat: -31.96, lng: 115.87 });
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
      'Type corrected from "ALPR / plate reader" to "CCTV"; Operator corrected from "WA Police" to "NSW Police"'
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
      cameraId: input.cameraId,
      correctionReportId: input.correctionId,
      actorId: input.actorId,
      action: ModerationActionType.correction_approve,
      reasonCode: input.reasonCode,
      note: input.note,
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
      cameraId: input.cameraId,
      correctionReportId: input.correctionId,
      actorId: input.actorId,
      action: ModerationActionType.correction_reject,
      reasonCode: input.reasonCode,
      note: input.note,
    });
  });
});
