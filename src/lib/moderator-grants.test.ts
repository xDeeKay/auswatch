import { describe, it, expect } from "vitest";
import { AuState, CameraType } from "@/generated/prisma/enums";
import { grantFieldName, parseGrantGrid, diffGrants, summarizeGrants } from "./moderator-grants";
import type { ModeratorGrantModel } from "@/generated/prisma/models";

function existingGrant(overrides: Partial<ModeratorGrantModel> = {}): ModeratorGrantModel {
  return {
    id: "grant-1",
    moderatorProfileId: "profile-1",
    state: AuState.wa,
    cameraType: CameraType.speed,
    canView: true,
    canAct: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("parseGrantGrid", () => {
  it("normalizes a submitted canAct without canView to both true", () => {
    const formData = new FormData();
    formData.set(grantFieldName(AuState.wa, CameraType.speed, "act"), "on");

    const grants = parseGrantGrid(formData);

    expect(grants).toEqual([{ state: AuState.wa, cameraType: CameraType.speed, canView: true, canAct: true }]);
  });

  it("keeps a view-only cell as view-only", () => {
    const formData = new FormData();
    formData.set(grantFieldName(AuState.nsw, CameraType.alpr, "view"), "on");

    const grants = parseGrantGrid(formData);

    expect(grants).toEqual([{ state: AuState.nsw, cameraType: CameraType.alpr, canView: true, canAct: false }]);
  });

  it("omits cells where neither box is checked", () => {
    const formData = new FormData();
    expect(parseGrantGrid(formData)).toEqual([]);
  });

  it("reads every state and camera type combination independently", () => {
    const formData = new FormData();
    formData.set(grantFieldName(AuState.wa, CameraType.speed, "act"), "on");
    formData.set(grantFieldName(AuState.vic, CameraType.cctv, "view"), "on");

    const grants = parseGrantGrid(formData);

    expect(grants).toHaveLength(2);
    expect(grants).toContainEqual({ state: AuState.wa, cameraType: CameraType.speed, canView: true, canAct: true });
    expect(grants).toContainEqual({ state: AuState.vic, cameraType: CameraType.cctv, canView: true, canAct: false });
  });
});

describe("diffGrants", () => {
  it("creates rows for desired cells that don't exist yet", () => {
    const diff = diffGrants([], [{ state: AuState.wa, cameraType: CameraType.speed, canView: true, canAct: true }]);
    expect(diff.toCreate).toEqual([{ state: AuState.wa, cameraType: CameraType.speed, canView: true, canAct: true }]);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toDeleteIds).toEqual([]);
  });

  it("deletes (or never creates) fully-unchecked cells that had an existing row", () => {
    const diff = diffGrants([existingGrant()], []);
    expect(diff.toDeleteIds).toEqual(["grant-1"]);
    expect(diff.toCreate).toEqual([]);
    expect(diff.toUpdate).toEqual([]);
  });

  it("updates a row whose view/act values changed", () => {
    const diff = diffGrants(
      [existingGrant({ canView: true, canAct: false })],
      [{ state: AuState.wa, cameraType: CameraType.speed, canView: true, canAct: true }]
    );
    expect(diff.toUpdate).toEqual([{ id: "grant-1", canView: true, canAct: true }]);
    expect(diff.toCreate).toEqual([]);
    expect(diff.toDeleteIds).toEqual([]);
  });

  it("leaves an unchanged row alone", () => {
    const diff = diffGrants(
      [existingGrant({ canView: true, canAct: false })],
      [{ state: AuState.wa, cameraType: CameraType.speed, canView: true, canAct: false }]
    );
    expect(diff.toCreate).toEqual([]);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toDeleteIds).toEqual([]);
  });

  it("handles a mix of create, update, and delete across different combinations", () => {
    const diff = diffGrants(
      [
        existingGrant({ id: "keep-changed", state: AuState.wa, cameraType: CameraType.speed, canAct: false }),
        existingGrant({ id: "remove-me", state: AuState.nsw, cameraType: CameraType.alpr, canView: true }),
      ],
      [
        { state: AuState.wa, cameraType: CameraType.speed, canView: true, canAct: true },
        { state: AuState.qld, cameraType: CameraType.cctv, canView: true, canAct: false },
      ]
    );
    expect(diff.toUpdate).toEqual([{ id: "keep-changed", canView: true, canAct: true }]);
    expect(diff.toCreate).toEqual([{ state: AuState.qld, cameraType: CameraType.cctv, canView: true, canAct: false }]);
    expect(diff.toDeleteIds).toEqual(["remove-me"]);
  });
});

describe("summarizeGrants", () => {
  it("reports no access for an empty grant list", () => {
    expect(summarizeGrants([])).toBe("No access granted yet");
  });

  it("summarizes view-only and view+act grants", () => {
    const summary = summarizeGrants([
      existingGrant({ state: AuState.wa, cameraType: CameraType.speed, canView: true, canAct: true }),
      existingGrant({ state: AuState.nsw, cameraType: CameraType.alpr, canView: true, canAct: false }),
    ]);
    expect(summary).toContain("Western Australia: Speed Camera (view+act)");
    expect(summary).toContain("New South Wales: ALPR / Plate Reader (view)");
  });
});
