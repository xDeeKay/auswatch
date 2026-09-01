import type { CameraType, CaptureType } from "@/generated/prisma/enums";
import type { ValidatedCorrection } from "@/lib/validation/correction";

export type CameraSnapshot = {
  lat: number;
  lng: number;
  type: CameraType;
  operator: string;
  captures: CaptureType;
  notes: string;
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
