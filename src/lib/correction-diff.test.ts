import { describe, it, expect } from "vitest";
import { AuState, CameraStatus, CameraType, CaptureType, Deployment, OperatorCategory } from "@/generated/prisma/enums";
import { buildCameraDiff, buildCorrectionDiffRows } from "./correction-diff";
import type { CameraSnapshot, ProposedCameraFields } from "./correction-diff";
import type { ValidatedCorrection } from "@/lib/validation/correction";

const camera: CameraSnapshot = {
  lat: -31.9505,
  lng: 115.8605,
  type: CameraType.alpr,
  operatorCategory: OperatorCategory.state_police,
  operator: "WA Police",
  captures: CaptureType.plates,
  deployment: Deployment.fixed,
  notes: "Mounted on a light pole.",
  state: AuState.wa,
  status: CameraStatus.active,
};

function proposal(overrides: Partial<ValidatedCorrection> = {}): ValidatedCorrection {
  return {
    cameraId: "camera-1",
    reporterNote: "",
    lat: camera.lat,
    lng: camera.lng,
    type: camera.type,
    operatorCategory: camera.operatorCategory,
    operator: camera.operator,
    captures: camera.captures,
    deployment: camera.deployment,
    notes: camera.notes,
    status: camera.status,
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

  it("detects a status change in either direction", () => {
    expect(buildCameraDiff(camera, proposal({ status: CameraStatus.inactive }))).toEqual({ status: CameraStatus.inactive });
    const inactiveCamera: CameraSnapshot = { ...camera, status: CameraStatus.inactive };
    expect(buildCameraDiff(inactiveCamera, proposal({ status: CameraStatus.active }))).toEqual({
      status: CameraStatus.active,
    });
  });

  it("detects a deployment change", () => {
    const diff = buildCameraDiff(camera, proposal({ deployment: Deployment.mobile }));
    expect(diff).toEqual({ deployment: Deployment.mobile });
  });

  it("detects an operatorCategory change", () => {
    const diff = buildCameraDiff(camera, proposal({ operatorCategory: OperatorCategory.local_council }));
    expect(diff).toEqual({ operatorCategory: OperatorCategory.local_council });
  });
});

function noProposal(overrides: Partial<ProposedCameraFields> = {}): ProposedCameraFields {
  return {
    proposedLat: null,
    proposedLng: null,
    proposedType: null,
    proposedOperator: null,
    proposedOperatorCategory: null,
    proposedCaptures: null,
    proposedDeployment: null,
    proposedNotes: null,
    proposedStatus: null,
    ...overrides,
  };
}

describe("buildCorrectionDiffRows", () => {
  it("returns no rows when nothing was proposed", () => {
    expect(buildCorrectionDiffRows(camera, noProposal())).toEqual([]);
  });

  it("returns a deployment row when the proposed deployment differs", () => {
    const rows = buildCorrectionDiffRows(camera, noProposal({ proposedDeployment: Deployment.mobile }));
    expect(rows).toEqual([{ field: "deployment", label: "Deployment", before: "Fixed", after: "Mobile" }]);
  });

  it("returns no deployment row when the proposed deployment matches", () => {
    expect(buildCorrectionDiffRows(camera, noProposal({ proposedDeployment: Deployment.fixed }))).toEqual([]);
  });

  it("returns a location row when lat/lng differ from the live camera", () => {
    const rows = buildCorrectionDiffRows(camera, noProposal({ proposedLat: -31.96, proposedLng: camera.lng }));
    expect(rows).toEqual([
      { field: "location", label: "Location", before: "-31.95050, 115.86050", after: "-31.96000, 115.86050" },
    ]);
  });

  it("returns an operator row when the operator differs", () => {
    const rows = buildCorrectionDiffRows(camera, noProposal({ proposedOperator: "NSW Police" }));
    expect(rows).toEqual([
      { field: "operator", label: "Operator", before: "WA Police", after: "NSW Police" },
    ]);
  });

  it("self-heals: a field a sibling correction already fixed stops appearing as changed", () => {
    const alreadyFixedCamera: CameraSnapshot = { ...camera, operator: "NSW Police" };
    const rows = buildCorrectionDiffRows(alreadyFixedCamera, noProposal({ proposedOperator: "NSW Police" }));
    expect(rows).toEqual([]);
  });

  it("returns an operator category row when the category differs", () => {
    const rows = buildCorrectionDiffRows(
      camera,
      noProposal({ proposedOperatorCategory: OperatorCategory.local_council })
    );
    expect(rows).toEqual([
      {
        field: "operatorCategory",
        label: "Operator category",
        before: "State/Territory Police",
        after: "Local Council",
      },
    ]);
  });

  it("returns a status row when the correction proposes the camera inactive", () => {
    const rows = buildCorrectionDiffRows(camera, noProposal({ proposedStatus: CameraStatus.inactive }));
    expect(rows).toEqual([{ field: "status", label: "Status", before: "Active", after: "Inactive" }]);
  });

  it("returns a status row when the correction proposes an inactive camera active again", () => {
    const inactiveCamera: CameraSnapshot = { ...camera, status: CameraStatus.inactive };
    const rows = buildCorrectionDiffRows(inactiveCamera, noProposal({ proposedStatus: CameraStatus.active }));
    expect(rows).toEqual([{ field: "status", label: "Status", before: "Inactive", after: "Active" }]);
  });

  it("does not return a status row when the proposed status matches the live one", () => {
    const rows = buildCorrectionDiffRows(camera, noProposal({ proposedStatus: CameraStatus.active }));
    expect(rows).toEqual([]);
  });

  it("returns multiple rows for a multi-field correction, in a stable field order", () => {
    const rows = buildCorrectionDiffRows(
      camera,
      noProposal({
        proposedType: CameraType.cctv,
        proposedOperatorCategory: OperatorCategory.local_council,
        proposedOperator: "NSW Police",
      })
    );
    expect(rows.map((r) => r.field)).toEqual(["type", "operatorCategory", "operator"]);
  });
});
