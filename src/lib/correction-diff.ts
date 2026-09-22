import type { AuState, CameraStatus, CameraType, CaptureType, OperatorCategory } from "@/generated/prisma/enums";
import type { ValidatedCorrection } from "@/lib/validation/correction";
import { TYPE_LABEL, CAPTURE_LABEL, OPERATOR_CATEGORY_LABEL, STATUS_LABEL } from "@/lib/camera-labels";

export type CameraSnapshot = {
  lat: number;
  lng: number;
  type: CameraType;
  operator: string;
  operatorCategory: OperatorCategory;
  captures: CaptureType;
  notes: string;
  state: AuState | null;
  status: CameraStatus;
};

export type CameraFieldDiff = {
  lat?: number;
  lng?: number;
  type?: CameraType;
  operator?: string;
  operatorCategory?: OperatorCategory;
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
  if (proposed.operatorCategory !== current.operatorCategory) {
    diff.operatorCategory = proposed.operatorCategory;
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
  proposedOperatorCategory: OperatorCategory | null;
  proposedCaptures: CaptureType | null;
  proposedNotes: string | null;
  reportedRemoved: boolean;
};

export type CorrectionDiffRow = { field: string; label: string; before: string; after: string };

export function buildCorrectionDiffRows(
  camera: CameraSnapshot,
  correction: ProposedCameraFields
): CorrectionDiffRow[] {
  const rows: CorrectionDiffRow[] = [];

  if (correction.proposedType !== null && correction.proposedType !== camera.type) {
    rows.push({
      field: "type",
      label: "Type",
      before: TYPE_LABEL[camera.type],
      after: TYPE_LABEL[correction.proposedType],
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
  if (
    correction.proposedOperatorCategory !== null &&
    correction.proposedOperatorCategory !== camera.operatorCategory
  ) {
    rows.push({
      field: "operatorCategory",
      label: "Operator category",
      before: OPERATOR_CATEGORY_LABEL[camera.operatorCategory],
      after: OPERATOR_CATEGORY_LABEL[correction.proposedOperatorCategory],
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
  if (correction.proposedNotes !== null && correction.proposedNotes !== camera.notes) {
    rows.push({
      field: "notes",
      label: "Notes",
      before: camera.notes || "(none)",
      after: correction.proposedNotes || "(none)",
    });
  }
  if (correction.reportedRemoved && camera.status !== "removed") {
    rows.push({
      field: "status",
      label: "Status",
      before: STATUS_LABEL[camera.status],
      after: "Removed",
    });
  }
  if (correction.proposedLat !== null && correction.proposedLng !== null) {
    const before = `${camera.lat.toFixed(5)}, ${camera.lng.toFixed(5)}`;
    const after = `${correction.proposedLat.toFixed(5)}, ${correction.proposedLng.toFixed(5)}`;
    if (before !== after) {
      rows.push({ field: "location", label: "Location", before, after });
    }
  }

  return rows;
}
