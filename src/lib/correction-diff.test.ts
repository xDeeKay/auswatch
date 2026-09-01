import { describe, it, expect } from "vitest";
import { CameraType, CaptureType } from "@/generated/prisma/enums";
import { buildCameraDiff } from "./correction-diff";
import type { CameraSnapshot } from "./correction-diff";
import type { ValidatedCorrection } from "@/lib/validation/correction";

const camera: CameraSnapshot = {
  lat: -31.9505,
  lng: 115.8605,
  type: CameraType.alpr,
  operator: "WA Police",
  captures: CaptureType.plates,
  notes: "Mounted on a light pole.",
};

function proposal(overrides: Partial<ValidatedCorrection> = {}): ValidatedCorrection {
  return {
    cameraId: "camera-1",
    reporterNote: "",
    lat: camera.lat,
    lng: camera.lng,
    type: camera.type,
    operator: camera.operator,
    captures: camera.captures,
    notes: camera.notes,
    ...overrides,
  };
}

describe("buildCameraDiff", () => {
  it("returns an empty diff when nothing changed", () => {
    expect(buildCameraDiff(camera, proposal())).toEqual({});
  });

  it("includes only the field that changed for a single-field diff", () => {
    const diff = buildCameraDiff(camera, proposal({ operator: "NSW Police" }));
    expect(diff).toEqual({ operator: "NSW Police" });
  });

  it("includes lat and lng together when only lat changes", () => {
    const diff = buildCameraDiff(camera, proposal({ lat: -31.96 }));
    expect(diff).toEqual({ lat: -31.96, lng: camera.lng });
  });

  it("includes lat and lng together when only lng changes", () => {
    const diff = buildCameraDiff(camera, proposal({ lng: 115.87 }));
    expect(diff).toEqual({ lat: camera.lat, lng: 115.87 });
  });

  it("includes every field that changed for a multi-field diff", () => {
    const diff = buildCameraDiff(
      camera,
      proposal({ type: CameraType.cctv, notes: "Actually a general CCTV camera." })
    );
    expect(diff).toEqual({
      type: CameraType.cctv,
      notes: "Actually a general CCTV camera.",
    });
  });

  it("detects a captures change", () => {
    const diff = buildCameraDiff(camera, proposal({ captures: CaptureType.both }));
    expect(diff).toEqual({ captures: CaptureType.both });
  });
});
