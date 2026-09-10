import type { AuState, CameraType, CaptureType } from "@/generated/prisma/enums";
import type { ValidatedCorrection } from "@/lib/validation/correction";
import { TYPE_LABEL, CAPTURE_LABEL } from "@/lib/camera-labels";

export type CameraSnapshot = {
  lat: number;
  lng: number;
  type: CameraType;
  operator: string;
  captures: CaptureType;
  notes: string;
  state: AuState | null;
};

export type CameraFieldDiff = {
  lat?: number;
  lng?: number;
  type?: CameraType;
  operator?: string;
  captures?: CaptureType;
  notes?: string;
};

export function buildCameraDiff(
  current: CameraSnapshot,
  proposed: ValidatedCorrection
): CameraFieldDiff {
  const diff: CameraFieldDiff = {};

  if (proposed.lat !== current.lat || proposed.lng !== current.lng) {
    diff.lat = proposed.lat;
    diff.lng = proposed.lng;
  }
  if (proposed.type !== current.type) {
    diff.type = proposed.type;
  }
  if (proposed.operator !== current.operator) {
    diff.operator = proposed.operator;
  }
  if (proposed.captures !== current.captures) {
    diff.captures = proposed.captures;
  }
  if (proposed.notes !== current.notes) {
    diff.notes = proposed.notes;
  }

  return diff;
}

export type ProposedCameraFields = {
  proposedLat: number | null;
  proposedLng: number | null;
  proposedType: CameraType | null;
  proposedOperator: string | null;
  proposedCaptures: CaptureType | null;
  proposedNotes: string | null;
};

export type CorrectionDiffRow = { field: string; label: string; before: string; after: string };

export function buildCorrectionDiffRows(
  camera: CameraSnapshot,
  correction: ProposedCameraFields
): CorrectionDiffRow[] {
  const rows: CorrectionDiffRow[] = [];

  if (correction.proposedLat !== null && correction.proposedLng !== null) {
    const before = `${camera.lat.toFixed(5)}, ${camera.lng.toFixed(5)}`;
    const after = `${correction.proposedLat.toFixed(5)}, ${correction.proposedLng.toFixed(5)}`;
    if (before !== after) {
      rows.push({ field: "location", label: "Location", before, after });
    }
  }
  if (correction.proposedType !== null && correction.proposedType !== camera.type) {
    rows.push({
      field: "type",
      label: "Type",
      before: TYPE_LABEL[camera.type],
      after: TYPE_LABEL[correction.proposedType],
    });
  }
  if (correction.proposedOperator !== null && correction.proposedOperator !== camera.operator) {
    rows.push({
      field: "operator",
      label: "Operator",
      before: camera.operator || "Unknown",
      after: correction.proposedOperator || "Unknown",
    });
  }
  if (correction.proposedCaptures !== null && correction.proposedCaptures !== camera.captures) {
    rows.push({
      field: "captures",
      label: "Appears to capture",
      before: CAPTURE_LABEL[camera.captures],
      after: CAPTURE_LABEL[correction.proposedCaptures],
    });
  }
  if (correction.proposedNotes !== null && correction.proposedNotes !== camera.notes) {
    rows.push({
      field: "notes",
      label: "Notes",
      before: camera.notes || "(none)",
      after: correction.proposedNotes || "(none)",
    });
  }

  return rows;
}
